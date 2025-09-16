#!/usr/bin/env python3
"""
Simple HTTP server for serving media files on port 3036
"""

import os
import asyncio
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

app = FastAPI(title="SaggersRule Media Server")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

MEDIA_DIR = Path("/app/processed-media")

@app.get("/health")
async def health_check():
    return {"status": "healthy", "service": "SaggersRule Media Server"}

@app.get("/media/images/{filename}")
async def serve_image(filename: str):
    """Serve processed images"""
    file_path = MEDIA_DIR / "images" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Image not found")
    return FileResponse(file_path)

@app.get("/media/videos/{filename}")
async def serve_video(filename: str):
    """Serve processed videos"""
    file_path = MEDIA_DIR / "videos" / filename
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Video not found")
    return FileResponse(file_path)

@app.get("/")
async def root():
    return {"message": "SaggersRule Media Server - Use /media/ path to access files"}

if __name__ == "__main__":
    # Ensure media directories exist
    MEDIA_DIR.mkdir(exist_ok=True)
    (MEDIA_DIR / "images").mkdir(exist_ok=True)
    (MEDIA_DIR / "videos").mkdir(exist_ok=True)
    
    print("🚀 Starting SaggersRule Media Server on port 3036")
    uvicorn.run(app, host="0.0.0.0", port=3036, log_level="info")