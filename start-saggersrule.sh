#!/bin/bash

echo "🚀 Starting SaggersRule Application with Media Services"
echo "======================================================="

# Create required directories
mkdir -p /app/media-storage/uploads
mkdir -p /app/processed-media/images
mkdir -p /app/processed-media/videos
mkdir -p /app/logs

# Start all services
sudo supervisorctl start all

# Check status
echo ""
echo "📊 Service Status:"
sudo supervisorctl status

echo ""
echo "🔗 Service URLs:"
echo "• Frontend:          https://pickup-point-2.preview.emergentagent.com"
echo "• Backend API:       http://localhost:8001/api/"
echo "• Media Upload API:  http://localhost:3200/upload"
echo "• Media Server:      http://localhost:3036/media/"
echo "• Health Checks:"
echo "  - Media API:       http://localhost:3200/health"
echo "  - Media Server:    http://localhost:3036/health"
echo "  - Backend:         http://localhost:8001/api/"
echo ""
echo "✅ SaggersRule is ready! Your containers are running as supervisor services."
echo "📝 Use 'sudo supervisorctl status' to check service status"
echo "📁 Upload directory: /app/media-storage/uploads"
echo "📁 Processed media:  /app/processed-media/"