# SaggersRule Deployment Guide

## NAS Deployment Instructions

This guide helps you deploy the SaggersRule media stack on your NAS or any Docker-capable server.

### Prerequisites

- NAS with Docker support (Synology, QNAP, etc.)
- Docker & Docker Compose installed
- At least 2GB RAM available
- 10GB+ storage space for media files

### Directory Structure on NAS

Create the following directory structure on your NAS:

```bash
/volume1/docker/SaggersRule/
├── docker-compose.yml
├── .env
├── media-api/
├── nginx/
├── media-storage/          # Will be created automatically
└── processed-media/        # Will be created automatically
```

### Step-by-Step Deployment

#### 1. Clone Repository to NAS

```bash
# SSH into your NAS or use File Station
cd /volume1/docker/
git clone https://github.com/yourusername/saggersrule.git SaggersRule
cd SaggersRule
```

#### 2. Configure Environment

```bash
# Copy environment template
cp .env.example .env

# Edit configuration (adjust paths for your NAS)
nano .env
```

**Important NAS-specific settings:**

```bash
# Update paths to match your NAS structure
UPLOAD_PATH=/app/media/uploads
PROCESSED_PATH=/app/processed

# Optional: Adjust for your NAS resources
MAX_FILE_SIZE=104857600  # 100MB
```

#### 3. Create Storage Directories

```bash
# Create directories for media files
mkdir -p media-storage/uploads
mkdir -p processed-media
chmod -R 755 media-storage processed-media
```

#### 4. Deploy the Stack

```bash
# Stop any existing containers
docker compose down -v

# Build and start services
docker compose up -d --build
```

#### 5. Verify Deployment

```bash
# Check container status
docker compose ps

# Should see 3 running containers:
# - saggersrule-media-api
# - saggersrule-media-server  
# - saggersrule-redis
```

#### 6. Test Services

```bash
# Test API health
curl http://your-nas-ip:3200/health

# Test Nginx health
curl http://your-nas-ip:3036/health

# Test file upload (with a test image)
curl -X POST -F "file=@test-image.jpg" http://your-nas-ip:3200/upload

# Access uploaded file
curl http://your-nas-ip:3036/media/uploads/[uploaded-filename]
```

### Port Configuration

Default ports used:
- **3200**: Media API (Node.js)
- **3036**: Media Server (Nginx)
- **6333**: Redis (host access for debugging)

### NAS-Specific Considerations

#### Synology NAS

1. **Docker Package**: Install Docker package from Package Center
2. **File Station**: Use File Station for file management
3. **DSM Firewall**: Configure firewall rules for ports 3200, 3036
4. **Resource Monitor**: Monitor CPU/RAM usage

#### QNAP NAS

1. **Container Station**: Install Container Station
2. **File Manager**: Use File Manager for directory operations
3. **Network & Virtual Switch**: Configure port forwarding
4. **Resource Monitor**: Monitor system resources

### Storage Management

#### Cleanup Old Files

```bash
# Remove old uploaded files (older than 30 days)
find ./media-storage/uploads -type f -mtime +30 -delete

# Remove old processed files
find ./processed-media -type f -mtime +30 -delete
```

#### Backup Strategy

```bash
# Backup configuration
tar -czf saggersrule-config-$(date +%Y%m%d).tar.gz \
  docker-compose.yml .env nginx/ media-api/

# Backup media files (optional - can be large)
tar -czf saggersrule-media-$(date +%Y%m%d).tar.gz media-storage/
```

### Maintenance

#### Update Services

```bash
# Pull latest images
docker compose pull

# Recreate containers
docker compose up -d --force-recreate
```

#### View Logs

```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs media-api
docker compose logs media-server
docker compose logs redis
```

#### Restart Services

```bash
# Restart all services
docker compose restart

# Restart specific service
docker compose restart media-api
```

### Troubleshooting

#### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   netstat -tlnp | grep :3200
   
   # Modify ports in docker-compose.yml if needed
   ```

2. **Permission Denied**
   ```bash
   # Fix directory permissions
   sudo chown -R 1000:1000 media-storage processed-media
   chmod -R 755 media-storage processed-media
   ```

3. **Container Won't Start**
   ```bash
   # Check container logs
   docker compose logs media-api
   
   # Check disk space
   df -h
   ```

4. **File Upload Fails**
   ```bash
   # Check upload directory exists and is writable
   ls -la media-storage/
   
   # Check file size limits in nginx config
   grep client_max_body_size nginx/conf.d/default.conf
   ```

### Security Considerations

#### Production Deployment

1. **Reverse Proxy**: Use Nginx Proxy Manager or similar
2. **SSL Certificates**: Configure HTTPS with Let's Encrypt
3. **Authentication**: Add authentication layer if public-facing
4. **Firewall**: Restrict access to necessary ports only
5. **Updates**: Keep Docker images updated regularly

#### Sample Nginx Proxy Manager Config

```nginx
# Proxy Host Configuration
server_name: media.yourdomain.com
scheme: http
forward_hostname: your-nas-ip
forward_port: 3036
```

### Performance Optimization

#### For High Load

```yaml
# docker-compose.yml additions
services:
  media-api:
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

#### Redis Persistence

```yaml
redis:
  image: redis:alpine
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data
```

### Monitoring

#### Health Checks

Set up automated health checks:

```bash
#!/bin/bash
# health-check.sh
curl -f http://localhost:3200/health || exit 1
curl -f http://localhost:3036/health || exit 1
```

#### Log Rotation

Configure log rotation to prevent disk space issues:

```bash
# Add to crontab
0 2 * * * docker system prune -f
```

This deployment guide should help you successfully deploy SaggersRule on your NAS with confidence!