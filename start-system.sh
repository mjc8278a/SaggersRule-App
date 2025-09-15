#!/bin/bash

echo "🚀 Starting Network Checkpoint Monitor with NAS Vault"
echo "=============================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Stop any existing containers
echo -e "${YELLOW}🛑 Stopping existing containers...${NC}"
docker-compose down

# Remove old containers and volumes (optional - uncomment if you want a fresh start)
# echo -e "${YELLOW}🧹 Cleaning up old containers and volumes...${NC}"
# docker-compose down -v
# docker system prune -f

# Build and start all services
echo -e "${BLUE}🏗️  Building and starting all services...${NC}"
docker-compose up --build -d

# Wait for services to start
echo -e "${BLUE}⏳ Waiting for services to initialize...${NC}"
sleep 30

# Check service health
echo -e "${BLUE}🔍 Checking service health...${NC}"

# Check MinIO
if curl -s http://localhost:9000/minio/health/live > /dev/null; then
    echo -e "${GREEN}✅ MinIO (NAS Vault): Healthy${NC}"
    echo -e "   📍 Console: http://192.168.42.56:9001"
    echo -e "   🔑 Username: admin"
    echo -e "   🔑 Password: secure_admin_password_2024"
else
    echo -e "${RED}❌ MinIO (NAS Vault): Not responding${NC}"
fi

# Check MongoDB
if docker exec network-monitor-mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB: Healthy${NC}"
else
    echo -e "${RED}❌ MongoDB: Not responding${NC}"
fi

# Check Backend
if curl -s http://localhost:8001/api/health > /dev/null; then
    echo -e "${GREEN}✅ Backend API: Healthy${NC}"
    echo -e "   📍 Health: http://192.168.42.56:8001/api/health"
else
    echo -e "${RED}❌ Backend API: Not responding${NC}"
fi

# Check Frontend
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ Frontend: Healthy${NC}"
    echo -e "   📍 Main App: http://192.168.42.56:3000"
    echo -e "   🌐 ISP Access: http://192.168.42.56:3200"
else
    echo -e "${RED}❌ Frontend: Not responding${NC}"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}🎉 Network Checkpoint Monitor Started!${NC}"
echo ""
echo -e "${BLUE}📱 Access your application:${NC}"
echo -e "   🌟 Main Application: ${GREEN}http://192.168.42.56:3000${NC}"
echo -e "   🌐 ISP Access Port: ${GREEN}http://192.168.42.56:3200${NC}"
echo -e "   ⚙️  Backend API: ${GREEN}http://192.168.42.56:8001${NC}"
echo -e "   🏠 NAS Vault Console: ${GREEN}http://192.168.42.56:9001${NC}"
echo ""
echo -e "${BLUE}🔧 Management Commands:${NC}"
echo -e "   View logs: ${YELLOW}docker-compose logs -f${NC}"
echo -e "   Stop system: ${YELLOW}docker-compose down${NC}"
echo -e "   Restart system: ${YELLOW}docker-compose restart${NC}"
echo -e "   View status: ${YELLOW}docker-compose ps${NC}"
echo ""
echo -e "${BLUE}📊 Service Status:${NC}"
docker-compose ps

echo ""
echo "=============================================="