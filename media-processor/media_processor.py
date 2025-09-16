#!/usr/bin/env python3
"""
SaggersRule Media Processor
Handles image and video compression and optimization
"""

import os
import time
import json
import asyncio
import logging
from pathlib import Path
from PIL import Image
import uuid
from datetime import datetime

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/app/logs/media_processor.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

class MediaProcessor:
    def __init__(self):
        self.upload_dir = Path('/app/media/uploads')
        self.processed_dir = Path('/app/processed')
        self.images_dir = self.processed_dir / 'images'
        self.videos_dir = self.processed_dir / 'videos'
        
        # Create directories
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.images_dir.mkdir(parents=True, exist_ok=True)
        self.videos_dir.mkdir(parents=True, exist_ok=True)
        
        logger.info("🚀 SaggersRule Media Processor started")
        logger.info(f"📁 Upload directory: {self.upload_dir}")
        logger.info(f"📁 Processed directory: {self.processed_dir}")

    def process_image(self, input_path: Path) -> dict:
        """Process and compress image"""
        try:
            with Image.open(input_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Get original size
                original_size = input_path.stat().st_size
                
                # Resize if too large (maintain aspect ratio)
                max_size = (1920, 1080)
                if img.size[0] > max_size[0] or img.size[1] > max_size[1]:
                    img.thumbnail(max_size, Image.Resampling.LANCZOS)
                
                # Generate new filename
                new_id = str(uuid.uuid4())
                output_path = self.images_dir / f"{new_id}.jpg"
                
                # Save with high quality compression
                img.save(output_path, 'JPEG', quality=85, optimize=True, progressive=True)
                
                # Get compressed size
                compressed_size = output_path.stat().st_size
                compression_ratio = (1 - compressed_size / original_size) * 100
                
                # Create metadata
                metadata = {
                    'id': new_id,
                    'original_filename': input_path.name,
                    'processed_filename': f"{new_id}.jpg",
                    'type': 'image',
                    'original_size': original_size,
                    'compressed_size': compressed_size,
                    'compression_ratio': f"{compression_ratio:.1f}%",
                    'dimensions': img.size,
                    'processed_at': datetime.utcnow().isoformat(),
                    'quality': 85
                }
                
                # Save metadata
                metadata_path = self.images_dir / f"{new_id}.json"
                with open(metadata_path, 'w') as f:
                    json.dump(metadata, f, indent=2)
                
                logger.info(f"✅ Image processed: {input_path.name} -> {new_id}.jpg ({compression_ratio:.1f}% compression)")
                return metadata
                
        except Exception as e:
            logger.error(f"❌ Error processing image {input_path}: {e}")
            return None

    def process_video(self, input_path: Path) -> dict:
        """Process and compress video (placeholder for now)"""
        try:
            # For now, just move the video and create metadata
            # In production, you'd use ffmpeg for compression
            
            original_size = input_path.stat().st_size
            new_id = str(uuid.uuid4())
            output_path = self.videos_dir / f"{new_id}.mp4"
            
            # Simple copy for now (would be ffmpeg compression in production)
            import shutil
            shutil.copy2(input_path, output_path)
            
            metadata = {
                'id': new_id,
                'original_filename': input_path.name,
                'processed_filename': f"{new_id}.mp4",
                'type': 'video',
                'original_size': original_size,
                'compressed_size': original_size,
                'compression_ratio': "0.0%",
                'processed_at': datetime.utcnow().isoformat(),
                'note': 'Video compression not implemented yet'
            }
            
            # Save metadata
            metadata_path = self.videos_dir / f"{new_id}.json"
            with open(metadata_path, 'w') as f:
                json.dump(metadata, f, indent=2)
            
            logger.info(f"✅ Video processed: {input_path.name} -> {new_id}.mp4")
            return metadata
            
        except Exception as e:
            logger.error(f"❌ Error processing video {input_path}: {e}")
            return None

    def process_uploads(self):
        """Process all files in upload directory"""
        if not self.upload_dir.exists():
            return
        
        processed_count = 0
        for file_path in self.upload_dir.iterdir():
            if file_path.is_file():
                file_ext = file_path.suffix.lower()
                
                if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.webp']:
                    result = self.process_image(file_path)
                    if result:
                        processed_count += 1
                        file_path.unlink()  # Remove original file
                
                elif file_ext in ['.mp4', '.mov', '.avi']:
                    result = self.process_video(file_path)
                    if result:
                        processed_count += 1
                        file_path.unlink()  # Remove original file
                
                else:
                    logger.warning(f"⚠️ Unsupported file type: {file_path}")
        
        if processed_count > 0:
            logger.info(f"📊 Processed {processed_count} files")

    async def run(self):
        """Main processing loop"""
        logger.info("🔄 Starting media processing loop...")
        
        while True:
            try:
                self.process_uploads()
                await asyncio.sleep(5)  # Check every 5 seconds
                
            except Exception as e:
                logger.error(f"❌ Error in processing loop: {e}")
                await asyncio.sleep(10)  # Wait longer on error

if __name__ == "__main__":
    processor = MediaProcessor()
    asyncio.run(processor.run())