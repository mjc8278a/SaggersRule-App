from minio import Minio
from minio.error import S3Error
from fastapi import HTTPException, UploadFile
from typing import List, Optional, Dict, Any
import os
import io
import uuid
from datetime import datetime, timedelta, timezone
import asyncio
from concurrent.futures import ThreadPoolExecutor
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class NASVaultService:
    """
    Professional NAS Vault Service for Ugreen DXP4800 Plus
    Provides secure, organized storage for user profile data
    """
    
    def __init__(self):
        # MinIO Configuration for Ugreen NAS
        self.minio_endpoint = os.getenv("MINIO_ENDPOINT", "192.168.1.100:9000")  # Your NAS IP
        self.access_key = os.getenv("MINIO_ACCESS_KEY", "admin")
        self.secret_key = os.getenv("MINIO_SECRET_KEY", "secure_admin_password")
        self.secure = os.getenv("MINIO_USE_SSL", "false").lower() == "true"
        
        # Initialize MinIO client
        self.client = Minio(
            endpoint=self.minio_endpoint,
            access_key=self.access_key,
            secret_key=self.secret_key,
            secure=self.secure
        )
        
        # Bucket configuration for different data types
        self.buckets = {
            'profile_pictures': 'user-profiles',
            'documents': 'user-documents', 
            'attachments': 'user-attachments',
            'backups': 'user-backups',
            'monitoring_data': 'user-monitoring',
            'system_logs': 'system-logs'
        }
        
        # Thread pool for async operations
        self.executor = ThreadPoolExecutor(max_workers=10)
        
        logger.info(f"NAS Vault Service initialized for endpoint: {self.minio_endpoint}")
    
    async def initialize_vault(self):
        """Initialize all required buckets on NAS"""
        logger.info("Initializing NAS Vault System...")
        
        try:
            # Test connection first
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self.client.list_buckets
            )
            logger.info("✅ MinIO connection successful")
            
            for data_type, bucket_name in self.buckets.items():
                try:
                    await asyncio.get_event_loop().run_in_executor(
                        self.executor,
                        self._create_bucket_if_not_exists,
                        bucket_name
                    )
                    logger.info(f"✅ Bucket '{bucket_name}' ready for {data_type}")
                except Exception as e:
                    logger.error(f"❌ Failed to initialize bucket {bucket_name}: {e}")
            
            logger.info("🎉 NAS Vault System initialized successfully!")
            
        except Exception as e:
            logger.warning(f"⚠️ NAS Vault in demo mode - MinIO not available: {e}")
            logger.info("🔧 To enable NAS storage, set up MinIO as described in NAS_VAULT_SETUP.md")
    
    def _create_bucket_if_not_exists(self, bucket_name: str):
        """Create bucket if it doesn't exist (blocking operation)"""
        try:
            if not self.client.bucket_exists(bucket_name):
                self.client.make_bucket(bucket_name)
                logger.info(f"Created bucket: {bucket_name}")
            else:
                logger.info(f"Bucket already exists: {bucket_name}")
        except S3Error as e:
            logger.error(f"Error with bucket {bucket_name}: {e}")
            raise Exception(f"Failed to ensure bucket {bucket_name}: {str(e)}")
    
    def _get_user_prefix(self, user_id: str, data_type: str, category: Optional[str] = None) -> str:
        """Generate organized prefix for user data"""
        date_partition = datetime.now().strftime("%Y/%m")
        
        if category:
            return f"{user_id}/{data_type}/{category}/{date_partition}/"
        else:
            return f"{user_id}/{data_type}/{date_partition}/"
    
    def _generate_object_name(self, user_id: str, data_type: str, filename: str, category: Optional[str] = None) -> str:
        """Generate organized object name"""
        prefix = self._get_user_prefix(user_id, data_type, category)
        timestamp = datetime.now().strftime("%H%M%S")
        safe_filename = filename.replace(' ', '_').replace('/', '_')
        return f"{prefix}{timestamp}_{safe_filename}"
    
    async def upload_profile_picture(self, user_id: str, file: UploadFile) -> Dict[str, Any]:
        """Upload user profile picture to NAS vault"""
        if not file.content_type or not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        if file.size and file.size > 10 * 1024 * 1024:  # 10MB limit
            raise HTTPException(status_code=400, detail="Image too large (max 10MB)")
        
        try:
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Generate object name
            object_name = self._generate_object_name(user_id, 'profile_pictures', file.filename)
            bucket = self.buckets['profile_pictures']
            
            # Prepare metadata
            metadata = {
                'x-amz-meta-user-id': user_id,
                'x-amz-meta-data-type': 'profile_picture',
                'x-amz-meta-original-filename': file.filename,
                'x-amz-meta-upload-timestamp': datetime.now(timezone.utc).isoformat(),
                'x-amz-meta-file-size': str(file_size),
                'x-amz-meta-content-type': file.content_type
            }
            
            # Upload to NAS
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._upload_object_with_metadata,
                bucket,
                object_name,
                io.BytesIO(file_content),
                file_size,
                file.content_type,
                metadata
            )
            
            logger.info(f"✅ Profile picture uploaded for user {user_id}: {object_name}")
            
            return {
                "object_name": object_name,
                "bucket": bucket,
                "size": file_size,
                "content_type": file.content_type,
                "upload_time": datetime.now(timezone.utc).isoformat(),
                "nas_location": f"{self.minio_endpoint}/{bucket}/{object_name}",
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to upload profile picture for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    async def upload_document(self, user_id: str, file: UploadFile, category: str = "general") -> Dict[str, Any]:
        """Upload user document to NAS vault"""
        if file.size and file.size > 100 * 1024 * 1024:  # 100MB limit
            raise HTTPException(status_code=400, detail="File too large (max 100MB)")
        
        try:
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Generate object name
            object_name = self._generate_object_name(user_id, 'documents', file.filename, category)
            bucket = self.buckets['documents']
            
            # Prepare metadata
            metadata = {
                'x-amz-meta-user-id': user_id,
                'x-amz-meta-data-type': 'document',
                'x-amz-meta-category': category,
                'x-amz-meta-original-filename': file.filename,
                'x-amz-meta-upload-timestamp': datetime.now(timezone.utc).isoformat(),
                'x-amz-meta-file-size': str(file_size),
                'x-amz-meta-content-type': file.content_type or 'application/octet-stream'
            }
            
            # Upload to NAS
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._upload_object_with_metadata,
                bucket,
                object_name,
                io.BytesIO(file_content),
                file_size,
                file.content_type or 'application/octet-stream',
                metadata
            )
            
            logger.info(f"✅ Document uploaded for user {user_id}: {object_name}")
            
            return {
                "object_name": object_name,
                "bucket": bucket,
                "size": file_size,
                "content_type": file.content_type,
                "category": category,
                "upload_time": datetime.now(timezone.utc).isoformat(),
                "nas_location": f"{self.minio_endpoint}/{bucket}/{object_name}",
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to upload document for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    async def upload_status_attachment(self, user_id: str, status_id: str, file: UploadFile) -> Dict[str, Any]:
        """Upload status check attachment to NAS vault"""
        if file.size and file.size > 50 * 1024 * 1024:  # 50MB limit
            raise HTTPException(status_code=400, detail="Attachment too large (max 50MB)")
        
        try:
            # Read file content
            file_content = await file.read()
            file_size = len(file_content)
            
            # Generate object name with status ID
            object_name = self._generate_object_name(user_id, 'status_attachments', file.filename, status_id)
            bucket = self.buckets['attachments']
            
            # Prepare metadata
            metadata = {
                'x-amz-meta-user-id': user_id,
                'x-amz-meta-data-type': 'status_attachment',
                'x-amz-meta-status-id': status_id,
                'x-amz-meta-original-filename': file.filename,
                'x-amz-meta-upload-timestamp': datetime.now(timezone.utc).isoformat(),
                'x-amz-meta-file-size': str(file_size),
                'x-amz-meta-content-type': file.content_type or 'application/octet-stream'
            }
            
            # Upload to NAS
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._upload_object_with_metadata,
                bucket,
                object_name,
                io.BytesIO(file_content),
                file_size,
                file.content_type or 'application/octet-stream',
                metadata
            )
            
            logger.info(f"✅ Status attachment uploaded for user {user_id}, status {status_id}: {object_name}")
            
            return {
                "object_name": object_name,
                "bucket": bucket,
                "size": file_size,
                "content_type": file.content_type,
                "status_id": status_id,
                "upload_time": datetime.now(timezone.utc).isoformat(),
                "nas_location": f"{self.minio_endpoint}/{bucket}/{object_name}",
                "metadata": metadata
            }
            
        except Exception as e:
            logger.error(f"❌ Failed to upload status attachment for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")
    
    def _upload_object_with_metadata(self, bucket: str, object_name: str, data: io.BytesIO, 
                                   size: int, content_type: str, metadata: Dict[str, str]):
        """Upload object with metadata to MinIO (blocking operation)"""
        return self.client.put_object(
            bucket_name=bucket,
            object_name=object_name,
            data=data,
            length=size,
            content_type=content_type,
            metadata=metadata
        )
    
    async def download_file(self, user_id: str, bucket: str, object_name: str) -> bytes:
        """Download file with user permission verification"""
        # Verify user owns this object
        if not object_name.startswith(f"{user_id}/"):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only access your own files"
            )
        
        try:
            response = await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._get_object,
                bucket,
                object_name
            )
            
            file_data = response.read()
            logger.info(f"✅ File downloaded for user {user_id}: {object_name}")
            return file_data
            
        except S3Error as e:
            if e.code == 'NoSuchKey':
                raise HTTPException(status_code=404, detail="File not found")
            logger.error(f"❌ Download failed for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Download failed: {str(e)}")
    
    def _get_object(self, bucket: str, object_name: str):
        """Get object from MinIO (blocking operation)"""
        return self.client.get_object(bucket, object_name)
    
    async def list_user_files(self, user_id: str, data_type: Optional[str] = None, 
                            category: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """List files for a user with filtering"""
        all_files = []
        
        # Determine which buckets to search
        if data_type and data_type in self.buckets:
            buckets_to_search = [self.buckets[data_type]]
        else:
            buckets_to_search = list(self.buckets.values())
        
        for bucket in buckets_to_search:
            try:
                # Build prefix
                prefix = f"{user_id}/"
                if data_type:
                    prefix += f"{data_type}/"
                if category:
                    prefix += f"{category}/"
                
                objects = await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self._list_objects,
                    bucket,
                    prefix
                )
                
                for obj in objects:
                    # Get metadata if available
                    try:
                        stat = await asyncio.get_event_loop().run_in_executor(
                            self.executor,
                            self.client.stat_object,
                            bucket,
                            obj.object_name
                        )
                        metadata = stat.metadata if hasattr(stat, 'metadata') else {}
                    except:
                        metadata = {}
                    
                    file_info = {
                        "object_name": obj.object_name,
                        "bucket": bucket,
                        "size": obj.size,
                        "last_modified": obj.last_modified.isoformat() if obj.last_modified else None,
                        "etag": obj.etag,
                        "content_type": getattr(obj, 'content_type', metadata.get('x-amz-meta-content-type', 'application/octet-stream')),
                        "nas_location": f"{self.minio_endpoint}/{bucket}/{obj.object_name}",
                        "metadata": metadata
                    }
                    all_files.append(file_info)
                
            except Exception as e:
                logger.error(f"Error listing files in bucket {bucket}: {e}")
                continue
        
        # Sort by last modified (newest first) and apply limit
        all_files.sort(key=lambda x: x["last_modified"] or "", reverse=True)
        return all_files[:limit]
    
    def _list_objects(self, bucket: str, prefix: str):
        """List objects from MinIO (blocking operation)"""
        try:
            objects = self.client.list_objects(
                bucket_name=bucket,
                prefix=prefix,
                recursive=True
            )
            return list(objects)
        except S3Error as e:
            logger.error(f"Error listing objects in {bucket} with prefix {prefix}: {e}")
            return []
    
    async def delete_file(self, user_id: str, bucket: str, object_name: str) -> Dict[str, Any]:
        """Delete file with user permission verification"""
        # Verify user owns this object
        if not object_name.startswith(f"{user_id}/"):
            raise HTTPException(
                status_code=403,
                detail="Access denied: You can only delete your own files"
            )
        
        try:
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._remove_object,
                bucket,
                object_name
            )
            
            logger.info(f"✅ File deleted for user {user_id}: {object_name}")
            
            return {
                "message": "File deleted successfully",
                "object_name": object_name,
                "bucket": bucket,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
                "nas_location": f"{self.minio_endpoint}/{bucket}/{object_name}"
            }
            
        except S3Error as e:
            if e.code == 'NoSuchKey':
                raise HTTPException(status_code=404, detail="File not found")
            logger.error(f"❌ Delete failed for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Delete failed: {str(e)}")
    
    def _remove_object(self, bucket: str, object_name: str):
        """Remove object from MinIO (blocking operation)"""
        return self.client.remove_object(bucket, object_name)
    
    async def get_user_storage_summary(self, user_id: str) -> Dict[str, Any]:
        """Get comprehensive storage summary for user"""
        summary = {
            "user_id": user_id,
            "total_files": 0,
            "total_size": 0,
            "nas_endpoint": self.minio_endpoint,
            "buckets": {},
            "data_types": {},
            "generated_at": datetime.now(timezone.utc).isoformat()
        }
        
        for data_type, bucket in self.buckets.items():
            try:
                objects = await asyncio.get_event_loop().run_in_executor(
                    self.executor,
                    self._list_objects,
                    bucket,
                    f"{user_id}/"
                )
                
                bucket_size = sum(obj.size for obj in objects)
                bucket_count = len(objects)
                
                summary["buckets"][bucket] = {
                    "file_count": bucket_count,
                    "total_size": bucket_size,
                    "data_type": data_type
                }
                
                if bucket_count > 0:
                    summary["data_types"][data_type] = {
                        "file_count": bucket_count,
                        "total_size": bucket_size,
                        "bucket": bucket
                    }
                
                summary["total_files"] += bucket_count
                summary["total_size"] += bucket_size
                
            except Exception as e:
                logger.error(f"Error getting storage summary for {bucket}: {e}")
                continue
        
        # Add human-readable sizes
        summary["total_size_mb"] = round(summary["total_size"] / (1024 * 1024), 2)
        summary["total_size_gb"] = round(summary["total_size"] / (1024 * 1024 * 1024), 2)
        
        return summary
    
    async def create_user_backup(self, user_id: str, backup_data: bytes, backup_type: str = "full") -> Dict[str, Any]:
        """Create backup of user data on NAS"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            object_name = f"{user_id}/backups/{backup_type}/backup_{timestamp}.zip"
            bucket = self.buckets['backups']
            
            # Prepare metadata
            metadata = {
                'x-amz-meta-user-id': user_id,
                'x-amz-meta-data-type': 'backup',
                'x-amz-meta-backup-type': backup_type,
                'x-amz-meta-backup-timestamp': datetime.now(timezone.utc).isoformat(),
                'x-amz-meta-file-size': str(len(backup_data))
            }
            
            # Upload backup to NAS
            await asyncio.get_event_loop().run_in_executor(
                self.executor,
                self._upload_object_with_metadata,
                bucket,
                object_name,
                io.BytesIO(backup_data),
                len(backup_data),
                'application/zip',
                metadata
            )
            
            logger.info(f"✅ Backup created for user {user_id}: {object_name}")
            
            return {
                "object_name": object_name,
                "bucket": bucket,
                "size": len(backup_data),
                "backup_type": backup_type,
                "backup_time": datetime.now(timezone.utc).isoformat(),
                "nas_location": f"{self.minio_endpoint}/{bucket}/{object_name}"
            }
            
        except Exception as e:
            logger.error(f"❌ Backup failed for user {user_id}: {e}")
            raise HTTPException(status_code=500, detail=f"Backup failed: {str(e)}")

# Initialize the service
nas_vault = NASVaultService()

# Health check function
async def check_nas_connectivity() -> Dict[str, Any]:
    """Check connectivity to NAS MinIO service"""
    try:
        # Test basic connectivity
        buckets = await asyncio.get_event_loop().run_in_executor(
            nas_vault.executor,
            nas_vault.client.list_buckets
        )
        
        return {
            "status": "healthy",
            "nas_endpoint": nas_vault.minio_endpoint,
            "buckets_count": len(buckets),
            "buckets": [bucket.name for bucket in buckets],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
    except Exception as e:
        logger.error(f"❌ NAS connectivity check failed: {e}")
        return {
            "status": "unhealthy",
            "error": str(e),
            "nas_endpoint": nas_vault.minio_endpoint,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }