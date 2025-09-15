from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, Response, Request, UploadFile, File, BackgroundTasks
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import RedirectResponse, StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import httpx
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone
from passlib.context import CryptContext
import jwt
from jwt import PyJWTError
import secrets
import io

# Import NAS Vault Service
from vault_service import nas_vault, check_nas_connectivity


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT settings
SECRET_KEY = os.environ.get("JWT_SECRET", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

# Security
security = HTTPBearer()

# Enhanced User Models
class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    date_of_birth: Optional[str] = None  # Format: YYYY-MM-DD

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class PasswordResetRequest(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    token: str
    new_password: str

class EmailVerification(BaseModel):
    token: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    username: str
    email: EmailStr
    password_hash: Optional[str] = None
    date_of_birth: Optional[datetime] = None
    age_verified: bool = False
    email_verified: bool = False
    verification_token: Optional[str] = None
    verification_token_expires: Optional[datetime] = None
    password_reset_token: Optional[str] = None
    password_reset_token_expires: Optional[datetime] = None
    oauth_provider: Optional[str] = None  # 'google', 'facebook', 'twitter'
    oauth_id: Optional[str] = None
    session_token: Optional[str] = None
    session_expires: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_active: bool = True

class UserResponse(BaseModel):
    id: str
    username: str
    email: EmailStr
    age_verified: bool
    email_verified: bool
    oauth_provider: Optional[str]
    created_at: datetime
    is_active: bool

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

class SessionUser(BaseModel):
    id: str
    email: str
    name: str
    picture: str
    session_token: str

# Status Check Models (updated with user_id)
class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    user_id: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Helper Functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def generate_verification_token():
    return secrets.token_urlsafe(32)

def calculate_age(birth_date: datetime) -> int:
    today = datetime.now(timezone.utc)
    return today.year - birth_date.year - ((today.month, today.day) < (birth_date.month, birth_date.day))

async def get_current_user_from_session(request: Request):
    """Get user from session token (cookie or header)"""
    session_token = None
    
    # Try to get session token from cookie first
    if 'session_token' in request.cookies:
        session_token = request.cookies['session_token']
    # Fallback to Authorization header
    elif 'authorization' in request.headers:
        auth_header = request.headers['authorization']
        if auth_header.startswith('Bearer '):
            session_token = auth_header.split(' ')[1]
    
    if not session_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No session token provided"
        )
    
    # Find user by session token
    user_doc = await db.users.find_one({
        "session_token": session_token,
        "session_expires": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired session"
        )
    
    return User(**user_doc)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Legacy JWT token validation for backward compatibility"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except PyJWTError:
        raise credentials_exception
    
    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise credentials_exception
    return User(**user)

# Google OAuth Routes (Emergent Integration)
@api_router.get("/auth/google")
async def google_oauth_login():
    """Redirect to Google OAuth"""
    redirect_url = "http://localhost:3000/dashboard"  # Where user lands after auth
    auth_url = f"https://auth.emergentagent.com/?redirect={redirect_url}"
    return {"auth_url": auth_url}

@api_router.post("/auth/google/callback")
async def google_oauth_callback(request: Request, response: Response):
    """Handle Google OAuth callback"""
    session_id = request.headers.get('X-Session-ID')
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Get session data from Emergent auth service
    async with httpx.AsyncClient() as client:
        auth_response = await client.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id}
        )
        
        if auth_response.status_code != 200:
            raise HTTPException(status_code=400, detail="Invalid session")
        
        session_data = auth_response.json()
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": session_data["email"]})
    
    if existing_user:
        # Update existing user with OAuth info
        user = User(**existing_user)
        user.oauth_provider = "google"
        user.oauth_id = session_data["id"]
        user.email_verified = True  # Google emails are verified
        user.session_token = session_data["session_token"]
        user.session_expires = datetime.now(timezone.utc) + timedelta(days=7)
        
        await db.users.update_one(
            {"id": user.id},
            {"$set": user.dict()}
        )
    else:
        # Create new user from Google OAuth
        user = User(
            username=session_data["name"],
            email=session_data["email"],
            oauth_provider="google",
            oauth_id=session_data["id"],
            email_verified=True,
            age_verified=False,  # Still need to verify age
            session_token=session_data["session_token"],
            session_expires=datetime.now(timezone.utc) + timedelta(days=7)
        )
        
        await db.users.insert_one(user.dict())
    
    # Set session cookie
    response.set_cookie(
        key="session_token",
        value=session_data["session_token"],
        max_age=7 * 24 * 60 * 60,  # 7 days
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )
    
    return UserResponse(**user.dict())

# Traditional Registration with Age Verification
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Check if username already exists
    existing_username = await db.users.find_one({"username": user_data.username})
    if existing_username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already taken"
        )
    
    # Verify age if provided
    age_verified = False
    birth_date = None
    if user_data.date_of_birth:
        try:
            birth_date = datetime.strptime(user_data.date_of_birth, "%Y-%m-%d")
            age = calculate_age(birth_date)
            if age >= 18:
                age_verified = True
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Must be 18 or older to register"
                )
        except ValueError:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
    
    # Create new user
    hashed_password = get_password_hash(user_data.password)
    verification_token = generate_verification_token()
    
    user = User(
        username=user_data.username,
        email=user_data.email,
        password_hash=hashed_password,
        date_of_birth=birth_date,
        age_verified=age_verified,
        verification_token=verification_token,
        verification_token_expires=datetime.now(timezone.utc) + timedelta(hours=24)
    )
    
    # Save to database
    await db.users.insert_one(user.dict())
    
    # TODO: Send verification email here
    # send_verification_email(user.email, verification_token)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.dict())
    )

@api_router.post("/auth/verify-email")
async def verify_email(verification: EmailVerification):
    """Verify user email with token"""
    user_doc = await db.users.find_one({
        "verification_token": verification.token,
        "verification_token_expires": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Update user as verified
    await db.users.update_one(
        {"id": user_doc["id"]},
        {
            "$set": {
                "email_verified": True,
                "verification_token": None,
                "verification_token_expires": None
            }
        }
    )
    
    return {"message": "Email verified successfully"}

@api_router.post("/auth/resend-verification")
async def resend_verification(email_request: PasswordResetRequest):
    """Resend email verification"""
    user_doc = await db.users.find_one({"email": email_request.email})
    
    if not user_doc:
        # Don't reveal if email exists
        return {"message": "If email exists, verification email sent"}
    
    if user_doc.get("email_verified"):
        return {"message": "Email already verified"}
    
    # Generate new verification token
    verification_token = generate_verification_token()
    await db.users.update_one(
        {"id": user_doc["id"]},
        {
            "$set": {
                "verification_token": verification_token,
                "verification_token_expires": datetime.now(timezone.utc) + timedelta(hours=24)
            }
        }
    )
    
    # TODO: Send verification email
    # send_verification_email(user_doc["email"], verification_token)
    
    return {"message": "Verification email sent"}

@api_router.post("/auth/forgot-password")
async def forgot_password(email_request: PasswordResetRequest):
    """Request password reset"""
    user_doc = await db.users.find_one({"email": email_request.email})
    
    if not user_doc:
        # Don't reveal if email exists
        return {"message": "If email exists, password reset email sent"}
    
    # Generate password reset token
    reset_token = generate_verification_token()
    await db.users.update_one(
        {"id": user_doc["id"]},
        {
            "$set": {
                "password_reset_token": reset_token,
                "password_reset_token_expires": datetime.now(timezone.utc) + timedelta(hours=1)
            }
        }
    )
    
    # TODO: Send password reset email
    # send_password_reset_email(user_doc["email"], reset_token)
    
    return {"message": "Password reset email sent"}

@api_router.post("/auth/reset-password")
async def reset_password(reset_data: PasswordReset):
    """Reset password with token"""
    user_doc = await db.users.find_one({
        "password_reset_token": reset_data.token,
        "password_reset_token_expires": {"$gt": datetime.now(timezone.utc)}
    })
    
    if not user_doc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset token"
        )
    
    # Update password
    new_password_hash = get_password_hash(reset_data.new_password)
    await db.users.update_one(
        {"id": user_doc["id"]},
        {
            "$set": {
                "password_hash": new_password_hash,
                "password_reset_token": None,
                "password_reset_token_expires": None
            }
        }
    )
    
    return {"message": "Password reset successfully"}

@api_router.post("/auth/login", response_model=Token)
async def login(user_data: UserLogin):
    # Find user by email
    user_doc = await db.users.find_one({"email": user_data.email})
    if not user_doc or not user_doc.get("password_hash") or not verify_password(user_data.password, user_doc["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password"
        )
    
    user = User(**user_doc)
    
    # Create access token
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.id}, expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user.dict())
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(request: Request):
    """Get current user info from session or JWT"""
    try:
        # Try session-based auth first
        current_user = await get_current_user_from_session(request)
    except HTTPException:
        # Fallback to JWT auth
        try:
            auth_header = request.headers.get('authorization', '')
            if not auth_header.startswith('Bearer '):
                raise HTTPException(status_code=401, detail="No valid authentication")
            
            token = auth_header.split(' ')[1]
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            
            user_doc = await db.users.find_one({"id": user_id})
            if not user_doc:
                raise HTTPException(status_code=401, detail="User not found")
            
            current_user = User(**user_doc)
        except:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    
    return UserResponse(**current_user.dict())

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user and clear session"""
    try:
        current_user = await get_current_user_from_session(request)
        
        # Clear session token from database
        await db.users.update_one(
            {"id": current_user.id},
            {
                "$set": {
                    "session_token": None,
                    "session_expires": None
                }
            }
        )
    except:
        pass  # If session invalid, still clear cookie
    
    # Clear session cookie
    response.delete_cookie(
        key="session_token",
        path="/",
        secure=True,
        samesite="none"
    )
    
    return {"message": "Logged out successfully"}

# Protected Status Check Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World - Network Checkpoint Monitor API with Enhanced Authentication"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(
    input: StatusCheckCreate, 
    request: Request
):
    # Try session-based auth first, then fall back to JWT
    try:
        current_user = await get_current_user_from_session(request)
    except HTTPException:
        # Fallback to JWT token auth
        auth_header = request.headers.get('authorization', '')
        if not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="No valid authentication")
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            user_doc = await db.users.find_one({"id": user_id})
            if not user_doc:
                raise HTTPException(status_code=401, detail="User not found")
            current_user = User(**user_doc)
        except:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    
    status_dict = input.dict()
    status_dict["user_id"] = current_user.id
    status_obj = StatusCheck(**status_dict)
    await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(request: Request):
    # Try session-based auth first, then fall back to JWT
    try:
        current_user = await get_current_user_from_session(request)
    except HTTPException:
        # Fallback to JWT token auth
        auth_header = request.headers.get('authorization', '')
        if not auth_header.startswith('Bearer '):
            raise HTTPException(status_code=401, detail="No valid authentication")
        
        token = auth_header.split(' ')[1]
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            user_id = payload.get("sub")
            user_doc = await db.users.find_one({"id": user_id})
            if not user_doc:
                raise HTTPException(status_code=401, detail="User not found")
            current_user = User(**user_doc)
        except:
            raise HTTPException(status_code=401, detail="Invalid authentication")
    
    # Only return status checks for the current user
    status_checks = await db.status_checks.find({"user_id": current_user.id}).to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# NAS Vault API Endpoints
@api_router.post("/vault/profile-picture")
async def upload_profile_picture_to_vault(
    file: UploadFile = File(...),
    request: Request = None,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Upload profile picture to NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        result = await nas_vault.upload_profile_picture(user_id, file)
        
        # Update user record with profile picture info
        await db.users.update_one(
            {"id": user_id},
            {"$set": {
                "profile_picture": result["object_name"],
                "profile_picture_updated": datetime.now(timezone.utc)
            }}
        )
        
        return {
            "status": "success",
            "message": "Profile picture uploaded to NAS vault",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/vault/documents")
async def upload_document_to_vault(
    file: UploadFile = File(...),
    category: str = "general",
    request: Request = None
):
    """Upload document to NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        result = await nas_vault.upload_document(user_id, file, category)
        
        return {
            "status": "success", 
            "message": "Document uploaded to NAS vault",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/vault/status/{status_id}/attachments")
async def upload_status_attachment_to_vault(
    status_id: str,
    file: UploadFile = File(...),
    request: Request = None
):
    """Upload status check attachment to NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        result = await nas_vault.upload_status_attachment(user_id, status_id, file)
        
        # Link attachment to status check
        await db.status_checks.update_one(
            {"id": status_id, "user_id": user_id},
            {"$push": {
                "attachments": {
                    "object_name": result["object_name"],
                    "bucket": result["bucket"],
                    "filename": file.filename,
                    "size": result["size"],
                    "nas_location": result["nas_location"],
                    "uploaded_at": result["upload_time"]
                }
            }}
        )
        
        return {
            "status": "success",
            "message": "Status attachment uploaded to NAS vault", 
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/vault/files")
async def list_vault_files(
    data_type: Optional[str] = None,
    category: Optional[str] = None, 
    limit: int = 100,
    request: Request = None
):
    """List user files from NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        files = await nas_vault.list_user_files(user_id, data_type, category, limit)
        
        return {
            "status": "success",
            "data": {
                "files": files,
                "total_count": len(files),
                "user_id": user_id,
                "nas_endpoint": nas_vault.minio_endpoint
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/vault/download")
async def download_file_from_vault(
    bucket: str,
    object_name: str,
    request: Request = None
):
    """Download file from NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        file_data = await nas_vault.download_file(user_id, bucket, object_name)
        
        # Extract filename
        filename = object_name.split('/')[-1]
        
        return StreamingResponse(
            io.BytesIO(file_data),
            media_type='application/octet-stream',
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.delete("/vault/files")
async def delete_file_from_vault(
    bucket: str,
    object_name: str,
    request: Request = None
):
    """Delete file from NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        result = await nas_vault.delete_file(user_id, bucket, object_name)
        
        return {
            "status": "success",
            "message": "File deleted from NAS vault",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.get("/vault/storage/summary")
async def get_vault_storage_summary(request: Request = None):
    """Get user storage summary from NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        summary = await nas_vault.get_user_storage_summary(user_id)
        
        return {
            "status": "success",
            "data": summary
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@api_router.post("/vault/backup")
async def create_user_backup_on_vault(
    backup_type: str = "manual",
    request: Request = None,
    background_tasks: BackgroundTasks = BackgroundTasks()
):
    """Create user data backup on NAS vault"""
    current_user = await get_current_user_info(request)
    user_id = current_user.id
    
    try:
        # Create backup data (simplified - in production, this would compress user data)
        backup_data = {
            "user_id": user_id,
            "backup_type": backup_type,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "user_data": current_user.dict(),
            "status_checks_count": await db.status_checks.count_documents({"user_id": user_id})
        }
        
        import json
        import zipfile
        import tempfile
        
        # Create ZIP backup
        with tempfile.NamedTemporaryFile() as temp_file:
            with zipfile.ZipFile(temp_file.name, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                zip_file.writestr("user_data.json", json.dumps(backup_data, indent=2))
            
            temp_file.seek(0)
            backup_bytes = temp_file.read()
        
        result = await nas_vault.create_user_backup(user_id, backup_bytes, backup_type)
        
        return {
            "status": "success",
            "message": "User backup created on NAS vault",
            "data": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    """Initialize NAS vault system on startup"""
    try:
        await nas_vault.initialize_vault()
        logger.info("✅ NAS Vault System ready!")
    except Exception as e:
        logger.error(f"❌ Failed to initialize NAS Vault: {e}")

# Health check endpoint
@api_router.get("/health")
async def health_check():
    """Enhanced health check including NAS connectivity"""
    nas_status = await check_nas_connectivity()
    
    return {
        "status": "healthy", 
        "timestamp": datetime.now(timezone.utc),
        "features": [
            "Google OAuth",
            "Age Verification", 
            "Email Verification",
            "Password Reset",
            "Session Management",
            "NAS Vault Storage"
        ],
        "nas_vault": nas_status
    }

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()