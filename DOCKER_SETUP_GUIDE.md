# 🐳 Docker Setup Guide - Network Checkpoint Monitor with NAS Vault

## 📋 Quick Start

### 1. Prerequisites
- ✅ Docker installed
- ✅ Docker Compose installed
- ✅ Port 3000, 3200, 8001, 9000, 9001 available

### 2. One-Command Startup
```bash
chmod +x start-system.sh
./start-system.sh
```

## 🌟 What You Get

### **Complete Application Stack:**
- 🏠 **MinIO NAS Vault**: S3-compatible object storage for user files
- 🗄️ **MongoDB**: User data and status checks
- ⚡ **FastAPI Backend**: Authentication, APIs, and vault integration  
- 📱 **React Frontend**: Modern UI with dual-port access
- 🔀 **Nginx Proxy**: Load balancing and routing

### **Access Points:**
- **Main App**: http://192.168.42.56:3000
- **ISP Port**: http://192.168.42.56:3200
- **Backend API**: http://192.168.42.56:8001
- **NAS Vault Console**: http://192.168.42.56:9001

## 🏗️ Manual Setup

### Step 1: Start All Services
```bash
docker-compose up --build -d
```

### Step 2: Check Service Health
```bash
docker-compose ps
docker-compose logs -f
```

### Step 3: Access MinIO Console
1. Go to http://192.168.42.56:9001
2. Login with:
   - **Username**: admin
   - **Password**: secure_admin_password_2024

## 📁 Service Details

### MinIO NAS Vault
- **Container**: network-monitor-minio
- **Ports**: 9000 (API), 9001 (Console)
- **Data**: Persistent volumes for user profile data
- **Buckets**: Auto-created for different data types

### MongoDB Database
- **Container**: network-monitor-mongodb
- **Port**: 27017
- **Database**: network_monitor
- **Auth**: admin/admin_password_2024

### FastAPI Backend
- **Container**: network-monitor-backend  
- **Port**: 8001
- **Features**: JWT auth, NAS vault, Google OAuth
- **Health Check**: http://192.168.42.56:8001/api/health

### React Frontend
- **Container**: network-monitor-frontend
- **Ports**: 3000 (main), 3200 (ISP)
- **Features**: Authentication, file uploads, NAS vault UI

## 🔧 Management Commands

### View Logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f minio
```

### Restart Services
```bash
# All services
docker-compose restart

# Specific service
docker-compose restart backend
```

### Stop/Start System
```bash
# Stop all
docker-compose down

# Start all
docker-compose up -d

# Fresh start (removes data)
docker-compose down -v
docker-compose up --build -d
```

### Service Status
```bash
docker-compose ps
```

## 🧪 Testing Your Setup

### 1. Backend Health Check
```bash
curl http://192.168.42.56:8001/api/health
```

### 2. Register Test User
```bash
curl -X POST http://192.168.42.56:8001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@example.com", 
    "password": "password123",
    "date_of_birth": "1990-01-01"
  }'
```

### 3. Test File Upload
1. Access http://192.168.42.56:3000
2. Register/login
3. Go to "NAS Vault" tab
4. Upload a profile picture or document
5. Check MinIO console to see files

## 🔐 Security Configuration

### Change Default Passwords
Edit `docker-compose.yml`:
```yaml
# MinIO credentials
MINIO_ROOT_USER: your_secure_username
MINIO_ROOT_PASSWORD: your_very_secure_password

# MongoDB credentials
MONGO_INITDB_ROOT_USERNAME: your_mongo_user
MONGO_INITDB_ROOT_PASSWORD: your_mongo_password

# JWT Secret
JWT_SECRET: your_super_secret_jwt_key
```

### Network Security
- Consider using SSL/TLS in production
- Set up firewall rules
- Use environment variables for secrets

## 🐛 Troubleshooting

### Services Not Starting
```bash
# Check logs
docker-compose logs

# Check system resources
docker system df
docker system prune -f
```

### Port Conflicts
```bash
# Check what's using ports
netstat -tlnp | grep :3000
netstat -tlnp | grep :8001
netstat -tlnp | grep :9000
```

### MinIO Connection Issues
```bash
# Check MinIO container
docker exec -it network-monitor-minio sh
mc admin info local
```

### Frontend Not Loading
```bash
# Check frontend container
docker exec -it network-monitor-frontend sh
yarn start
```

## 📊 Monitoring

### Resource Usage
```bash
docker stats
```

### Disk Usage
```bash
docker system df
docker volume ls
```

### Container Health
```bash
docker-compose ps
docker inspect network-monitor-backend --format='{{.State.Health.Status}}'
```

## 🔄 Updates and Maintenance

### Update Images
```bash
docker-compose pull
docker-compose up --build -d
```

### Backup Data
```bash
# Backup MinIO data
docker cp network-monitor-minio:/data ./minio-backup

# Backup MongoDB data  
docker exec network-monitor-mongodb mongodump --out /backup
docker cp network-monitor-mongodb:/backup ./mongodb-backup
```

### Clean Up
```bash
# Remove unused images
docker image prune -f

# Remove unused volumes
docker volume prune -f

# Full cleanup
docker system prune -a -f
```

## 🎯 Next Steps

1. **Customize Configuration**: Update credentials and settings
2. **Set Up SSL**: Add HTTPS certificates  
3. **Configure Backups**: Automate data backups
4. **Monitor Performance**: Set up logging and metrics
5. **Scale Services**: Add replicas for high availability

## 🆘 Support

If you encounter issues:
1. Check the logs: `docker-compose logs -f`
2. Verify all services are healthy: `docker-compose ps` 
3. Test individual components
4. Check network connectivity between containers

Your Network Checkpoint Monitor with NAS Vault is now ready! 🚀