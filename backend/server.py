from fastapi import FastAPI, APIRouter, HTTPException, Response, Request, Depends, status, UploadFile, File, Form
from fastapi.responses import JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import aiohttp
import json
import aiofiles

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# NAS Configuration with validation
NAS_MEDIA_API_URL = os.environ.get('NAS_MEDIA_API_URL', 'http://localhost:3200')
NAS_MEDIA_SERVER_URL = os.environ.get('NAS_MEDIA_SERVER_URL', 'http://localhost:3036')

# Validate URLs
def validate_url(url: str, name: str) -> str:
    """Validate and clean URL format"""
    if not url:
        raise ValueError(f"{name} is not set")
    
    # Remove any whitespace
    url = url.strip()
    
    # Ensure http:// or https:// prefix
    if not url.startswith(('http://', 'https://')):
        url = f"http://{url}"
    
    # Remove trailing slashes
    url = url.rstrip('/')
    
    logger.info(f"{name} validated as: {url}")
    return url

# Validate NAS URLs on startup
try:
    NAS_MEDIA_API_URL = validate_url(NAS_MEDIA_API_URL, "NAS_MEDIA_API_URL")
    NAS_MEDIA_SERVER_URL = validate_url(NAS_MEDIA_SERVER_URL, "NAS_MEDIA_SERVER_URL")
    logger.info(f"NAS Configuration loaded - API: {NAS_MEDIA_API_URL}, Server: {NAS_MEDIA_SERVER_URL}")
except Exception as e:
    logger.error(f"NAS URL configuration error: {e}")
    raise

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Models
class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    postal_code: Optional[str] = None
    interests: List[str] = []
    is_18_plus: bool = False
    is_verified: bool = False
    followers_count: int = 0
    following_count: int = 0
    posts_count: int = 0
    is_admin: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    picture: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    postal_code: Optional[str] = None
    interests: List[str] = []
    is_18_plus: bool = False

class UserUpdate(BaseModel):
    name: Optional[str] = None
    bio: Optional[str] = None
    age: Optional[int] = None
    location: Optional[str] = None
    postal_code: Optional[str] = None
    interests: Optional[List[str]] = None
    picture: Optional[str] = None

class Post(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    content: str
    media_urls: List[str] = []
    hashtags: List[str] = []
    outfit_tags: List[str] = []
    likes_count: int = 0
    comments_count: int = 0
    shares_count: int = 0
    is_approved: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class PostCreate(BaseModel):
    content: str
    media_urls: List[str] = []
    hashtags: List[str] = []
    outfit_tags: List[str] = []

class Session(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    session_token: str
    expires_at: datetime
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheck(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

# Authentication functions
async def get_current_user(request: Request) -> Optional[User]:
    """Get current user from session token in cookies or header"""
    session_token = None
    
    # First check cookies
    session_token = request.cookies.get("session_token")
    
    # If not in cookies, check Authorization header
    if not session_token:
        auth_header = request.headers.get("authorization")
        if auth_header and auth_header.startswith("Bearer "):
            session_token = auth_header.split(" ")[1]
    
    if not session_token:
        return None
    
    # Find session in database
    session = await db.sessions.find_one({"session_token": session_token})
    if not session:
        return None
    
    # Handle timezone-aware comparison
    expires_at = session["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    
    if datetime.now(timezone.utc) > expires_at:
        # Session expired
        await db.sessions.delete_one({"_id": session["_id"]})
        return None
    
    # Get user
    user_data = await db.users.find_one({"id": session["user_id"]})
    if not user_data:
        return None
    
    return User(**user_data)

async def require_auth(request: Request) -> User:
    """Require authentication"""
    user = await get_current_user(request)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required")
    return user

async def require_admin(request: Request) -> User:
    """Require admin authentication"""
    user = await require_auth(request)
    if not user.is_admin:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# File upload service
async def upload_to_nas(files: List[UploadFile]) -> List[dict]:
    """Upload files to NAS media storage"""
    uploaded_files = []
    
    # Create session with specific configuration to avoid proxy issues
    timeout = aiohttp.ClientTimeout(total=300)  # 5 minute timeout
    connector = aiohttp.TCPConnector(
        limit=10,
        limit_per_host=5,
        use_dns_cache=False,  # Disable DNS cache
        keepalive_timeout=30,
        enable_cleanup_closed=True
    )
    
    async with aiohttp.ClientSession(
        timeout=timeout,
        connector=connector,
        trust_env=False  # Ignore proxy environment variables
    ) as session:
        for file in files:
            try:
                logger.info(f"Starting upload for {file.filename} to {NAS_MEDIA_API_URL}")
                
                # Reset file pointer
                await file.seek(0)
                
                # Prepare form data
                data = aiohttp.FormData()
                
                # Read file content
                file_content = await file.read()
                logger.info(f"Read {len(file_content)} bytes from {file.filename}")
                
                data.add_field('media', file_content, filename=file.filename, content_type=file.content_type)
                
                # Upload to NAS with explicit URL
                upload_url = f"{NAS_MEDIA_API_URL}/upload"
                logger.info(f"Uploading to URL: {upload_url}")
                
                async with session.post(upload_url, data=data) as response:
                    logger.info(f"Upload response status: {response.status}")
                    
                    if response.status == 200:
                        result = await response.json()
                        logger.info(f"Upload result: {result}")
                        
                        if result.get('success') and result.get('files'):
                            # Handle both old and new API response formats
                            files_list = result.get('files', [])
                            uploaded_files.extend(files_list)
                            logger.info(f"Successfully uploaded {file.filename}")
                        else:
                            error_msg = f"NAS upload failed for {file.filename}: {result}"
                            logger.error(error_msg)
                            raise HTTPException(status_code=500, detail=error_msg)
                    else:
                        error_text = await response.text()
                        error_msg = f"NAS upload error (status {response.status}): {error_text}"
                        logger.error(error_msg)
                        raise HTTPException(status_code=500, detail=error_msg)
                        
            except aiohttp.ClientError as e:
                error_msg = f"Network error uploading {file.filename}: {str(e)}"
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
            except Exception as e:
                error_msg = f"Upload error for {file.filename}: {str(e)}"
                logger.error(error_msg)
                raise HTTPException(status_code=500, detail=error_msg)
    
    return uploaded_files

# Authentication Routes
@api_router.post("/auth/session-data")
async def process_session_id(request: Request, response: Response):
    """Process session ID from Emergent Auth"""
    session_id = request.headers.get("X-Session-ID")
    if not session_id:
        raise HTTPException(status_code=400, detail="Session ID required")
    
    # Call Emergent Auth API
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(
                "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                headers={"X-Session-ID": session_id}
            ) as resp:
                if resp.status != 200:
                    raise HTTPException(status_code=400, detail="Invalid session ID")
                
                auth_data = await resp.json()
        except Exception as e:
            raise HTTPException(status_code=400, detail="Failed to validate session")
    
    # Check if user exists
    existing_user = await db.users.find_one({"email": auth_data["email"]})
    
    if existing_user:
        user = User(**existing_user)
    else:
        # Create new user
        user_data = {
            "id": str(uuid.uuid4()),
            "email": auth_data["email"],
            "name": auth_data["name"],
            "picture": auth_data.get("picture"),
            "is_18_plus": False,  # Will be set during onboarding
            "created_at": datetime.now(timezone.utc),
            "updated_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(user_data)
        user = User(**user_data)
    
    # Create session
    session_token = auth_data["session_token"]
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    
    session_data = {
        "id": str(uuid.uuid4()),
        "user_id": user.id,
        "session_token": session_token,
        "expires_at": expires_at,
        "created_at": datetime.now(timezone.utc)
    }
    await db.sessions.insert_one(session_data)
    
    # Set HTTP-only cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,  # 7 days
        httponly=True,
        secure=True,
        samesite="none",
        path="/"
    )
    
    return {
        "user": user,
        "session_token": session_token,
        "requires_onboarding": not user.is_18_plus
    }

@api_router.post("/auth/logout")
async def logout(request: Request, response: Response):
    """Logout user"""
    session_token = request.cookies.get("session_token")
    if session_token:
        await db.sessions.delete_many({"session_token": session_token})
    
    response.delete_cookie("session_token", path="/")
    return {"message": "Logged out successfully"}

@api_router.get("/auth/me")
async def get_me(user: User = Depends(require_auth)):
    """Get current user info"""
    return user

# Media upload endpoints
@api_router.post("/upload")
async def upload_media(
    files: List[UploadFile] = File(...),
    user: User = Depends(require_auth)
):
    """Upload media files to NAS storage"""
    logger.info(f"Upload request from user {user.id} with {len(files)} files")
    
    if not user.is_18_plus:
        logger.warning(f"User {user.id} not 18+ - upload denied")
        raise HTTPException(status_code=403, detail="Complete onboarding first")
    
    # Validate file types
    allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/mov', 'video/avi']
    for file in files:
        logger.info(f"Validating file {file.filename} with content type {file.content_type}")
        if file.content_type not in allowed_types:
            logger.error(f"File type {file.content_type} not allowed for {file.filename}")
            raise HTTPException(status_code=400, detail=f"File type {file.content_type} not allowed")
    
    try:
        logger.info(f"Starting NAS upload process with URL: {NAS_MEDIA_API_URL}")
        # Upload to NAS
        uploaded_files = await upload_to_nas(files)
        
        logger.info(f"Upload successful - {len(uploaded_files)} files processed")
        
        # Return file information
        return {
            "success": True,
            "message": f"Uploaded {len(uploaded_files)} file(s)",
            "files": uploaded_files,
            "nas_server_url": NAS_MEDIA_SERVER_URL
        }
        
    except HTTPException as e:
        logger.error(f"HTTP exception during upload: {e.detail}")
        raise
    except Exception as e:
        logger.error(f"Unexpected error during media upload: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@api_router.get("/media/{media_type}/{media_id}")
async def get_media_info(media_type: str, media_id: str):
    """Get media information from NAS"""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{NAS_MEDIA_API_URL}/media/{media_type}/{media_id}") as response:
                if response.status == 200:
                    return await response.json()
                else:
                    raise HTTPException(status_code=404, detail="Media not found")
    except Exception as e:
        logger.error(f"Media info error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to get media info")

# User Routes
@api_router.post("/users/complete-onboarding")
async def complete_onboarding(
    onboarding_data: UserUpdate,
    user: User = Depends(require_auth)
):
    """Complete user onboarding with age verification"""
    if not onboarding_data.age or onboarding_data.age < 18:
        raise HTTPException(status_code=400, detail="Must be 18 or older to use this platform")
    
    update_data = onboarding_data.dict(exclude_unset=True)
    update_data["is_18_plus"] = True
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": update_data}
    )
    
    # Return updated user
    updated_user_data = await db.users.find_one({"id": user.id})
    return User(**updated_user_data)

@api_router.put("/users/profile")
async def update_profile(
    profile_data: UserUpdate,
    user: User = Depends(require_auth)
):
    """Update user profile"""
    update_data = profile_data.dict(exclude_unset=True)
    update_data["updated_at"] = datetime.now(timezone.utc)
    
    await db.users.update_one(
        {"id": user.id},
        {"$set": update_data}
    )
    
    updated_user_data = await db.users.find_one({"id": user.id})
    return User(**updated_user_data)

@api_router.get("/users/{user_id}")
async def get_user_profile(user_id: str):
    """Get user profile by ID"""
    user_data = await db.users.find_one({"id": user_id})
    if not user_data:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Return public profile only
    return {
        "id": user_data["id"],
        "name": user_data["name"],
        "picture": user_data.get("picture"),
        "bio": user_data.get("bio"),
        "location": user_data.get("location"),
        "postal_code": user_data.get("postal_code"),
        "interests": user_data.get("interests", []),
        "followers_count": user_data.get("followers_count", 0),
        "following_count": user_data.get("following_count", 0),
        "posts_count": user_data.get("posts_count", 0),
        "is_verified": user_data.get("is_verified", False),
        "created_at": user_data["created_at"]
    }

# Post Routes
@api_router.post("/posts", response_model=Post)
async def create_post(
    post_data: PostCreate,
    user: User = Depends(require_auth)
):
    """Create a new post"""
    if not user.is_18_plus:
        raise HTTPException(status_code=403, detail="Complete onboarding first")
    
    post_dict = post_data.dict()
    post_dict["user_id"] = user.id
    post_dict["id"] = str(uuid.uuid4())
    post_dict["created_at"] = datetime.now(timezone.utc)
    post_dict["updated_at"] = datetime.now(timezone.utc)
    
    post_obj = Post(**post_dict)
    await db.posts.insert_one(post_obj.dict())
    
    # Update user posts count
    await db.users.update_one(
        {"id": user.id},
        {"$inc": {"posts_count": 1}}
    )
    
    return post_obj

@api_router.get("/posts", response_model=List[Post])
async def get_posts(skip: int = 0, limit: int = 20):
    """Get approved posts feed"""
    posts = await db.posts.find(
        {"is_approved": True}
    ).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return [Post(**post) for post in posts]

@api_router.get("/posts/{post_id}", response_model=Post)
async def get_post(post_id: str):
    """Get single post"""
    post_data = await db.posts.find_one({"id": post_id})
    if not post_data:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return Post(**post_data)

@api_router.get("/users/{user_id}/posts", response_model=List[Post])
async def get_user_posts(user_id: str, skip: int = 0, limit: int = 20):
    """Get user's posts"""
    posts = await db.posts.find({
        "user_id": user_id,
        "is_approved": True
    }).sort("created_at", -1).skip(skip).limit(limit).to_list(length=limit)
    
    return [Post(**post) for post in posts]

# Admin Routes
@api_router.get("/admin/stats")
async def get_admin_stats(admin: User = Depends(require_admin)):
    """Get admin analytics"""
    total_users = await db.users.count_documents({})
    total_posts = await db.posts.count_documents({})
    pending_posts = await db.posts.count_documents({"is_approved": False})
    verified_users = await db.users.count_documents({"is_verified": True})
    
    # Recent activity
    recent_users = await db.users.count_documents({
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
    })
    recent_posts = await db.posts.count_documents({
        "created_at": {"$gte": datetime.now(timezone.utc) - timedelta(days=7)}
    })
    
    return {
        "total_users": total_users,
        "total_posts": total_posts,
        "pending_posts": pending_posts,
        "verified_users": verified_users,
        "recent_users": recent_users,
        "recent_posts": recent_posts
    }

@api_router.get("/admin/posts/pending")
async def get_pending_posts(admin: User = Depends(require_admin)):
    """Get posts pending approval"""
    posts = await db.posts.find({"is_approved": False}).sort("created_at", -1).to_list(100)
    return [Post(**post) for post in posts]

@api_router.post("/admin/posts/{post_id}/approve")
async def approve_post(post_id: str, admin: User = Depends(require_admin)):
    """Approve a post"""
    result = await db.posts.update_one(
        {"id": post_id},
        {"$set": {"is_approved": True, "updated_at": datetime.now(timezone.utc)}}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post approved"}

@api_router.delete("/admin/posts/{post_id}")
async def delete_post(post_id: str, admin: User = Depends(require_admin)):
    """Delete a post"""
    result = await db.posts.delete_one({"id": post_id})
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Post not found")
    
    return {"message": "Post deleted"}

# Legacy routes (keep for compatibility)
@api_router.get("/")
async def root():
    return {"message": "SaggersRule API - Social Community for Sagging Culture"}

@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    status_dict = input.dict()
    status_obj = StatusCheck(**status_dict)
    _ = await db.status_checks.insert_one(status_obj.dict())
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    status_checks = await db.status_checks.find().to_list(1000)
    return [StatusCheck(**status_check) for status_check in status_checks]

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()