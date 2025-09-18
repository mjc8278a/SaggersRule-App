# SaggersRule V2.0 Deployment Guide

Complete deployment guide for SaggersRule media stack with production-tested configurations.

## 🚀 V2.0 Deployment Features

- ✅ **Production-tested configuration** with real-world fixes
- ✅ **Fixed Docker networking** for reliable container communication
- ✅ **Enhanced health monitoring** for all services
- ✅ **Proper Nginx configuration** with DNS resolver
- ✅ **Validated deployment process** with comprehensive testing

## Prerequisites

### System Requirements
- **Docker Engine**: 20.10+ 
- **Docker Compose**: 2.0+
- **Operating System**: Linux (Ubuntu, Debian, CentOS, NAS OS)
- **RAM**: Minimum 2GB available
- **Storage**: 10GB+ for media files
- **Network**: Ports 3200, 3036, 6379 available

### NAS Compatibility
- **Synology DSM**: 7.0+
- **QNAP QTS**: 5.0+
- **Docker Package**: Installed and running
- **SSH Access**: Enabled for command-line deployment

## Deployment Methods

### Method 1: Quick Deployment (Recommended)

```bash
# Clone the repository
git clone https://github.com/mjc8278a/SaggersRule-App.git
cd SaggersRule-App

# Deploy immediately
docker-compose up -d --build

# Verify deployment
docker-compose ps
```

### Method 2: Custom Configuration

```bash
# Clone and configure
git clone https://github.com/mjc8278a/SaggersRule-App.git
cd SaggersRule-App

# Copy and edit environment
cp .env.example .env
nano .env  # Edit as needed

# Create directories explicitly
mkdir -p media-storage processed-media

# Deploy with custom config
docker-compose up -d --build
```

## NAS-Specific Deployment

### Synology NAS Deployment

1. **Enable SSH and Docker**:
   ```bash
   # SSH into your Synology NAS
   ssh admin@your-synology-ip
   ```

2. **Deploy to Docker directory**:
   ```bash
   cd /volume1/docker/
   git clone https://github.com/mjc8278a/SaggersRule-App.git SaggersRule
   cd SaggersRule
   ```

3. **Run deployment**:
   ```bash
   docker-compose up -d --build
   ```

4. **Configure DSM Firewall**:
   - Control Panel → Security → Firewall
   - Create rules for ports 3200, 3036

### QNAP NAS Deployment

1. **SSH Access**:
   ```bash
   ssh admin@your-qnap-ip
   ```

2. **Deploy to Container directory**:
   ```bash
   cd /share/Container/
   git clone https://github.com/mjc8278a/SaggersRule-App.git SaggersRule
   cd SaggersRule
   ```

3. **Deploy**:
   ```bash
   docker-compose up -d --build
   ```

4. **Configure Network & Virtual Switch**:
   - Network & Virtual Switch → Port Forwarding
   - Add rules for ports 3200, 3036

## V2.0 Configuration Details

### Docker Compose Configuration

The V2.0 docker-compose.yml includes these critical fixes:

```yaml
# Fixed networking - all containers use saggersrule-network
networks:
  saggersrule-network:
    driver: bridge

# Enhanced health checks with proper timing
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3200/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s  # Critical for proper startup
```

### Nginx Configuration (V2.0 Fixes)

Key improvements in `nginx/conf.d/default.conf`:

```nginx
# Critical fix: Docker DNS resolver
resolver 127.0.0.11 valid=30s;

# Fixed port - changed from 80 to 3036
server {
    listen 3036;
    
    # Fixed proxy routing
    location /api/ {
        proxy_pass http://media-api:3200/;
        # ... additional proxy settings
    }
}
```

## Validation Process

### 1. Container Health Check

```bash
# Check all containers are running
docker-compose ps

# Expected output:
# NAME                     STATUS
# saggersrule-media-api    Up (healthy)
# saggersrule-media-server Up (healthy)  
# saggersrule-redis        Up (healthy)
```

### 2. Service Health Validation

```bash
# Test API health
curl http://localhost:3200/health
# Expected: {"status":"healthy","timestamp":"..."}

# Test Nginx health
curl http://localhost:3036/health  
# Expected: "nginx healthy"

# Test Redis
docker exec saggersrule-redis redis-cli ping
# Expected: "PONG"
```

### 3. File Upload Testing

```bash
# Create test file
echo "test content" > test.txt

# Upload test
curl -X POST -F "file=@test.txt" http://localhost:3200/upload
# Expected: {"message":"File uploaded successfully","file":{...}}

# Verify file access via Nginx
curl http://localhost:3036/media/[uploaded-filename]
# Expected: File content returned
```

### 4. Network Connectivity Test

```bash
# Test inter-container communication
docker exec saggersrule-media-api ping redis
# Expected: Successful ping responses

# Test DNS resolution
docker exec saggersrule-media-server nslookup media-api
# Expected: Successful DNS resolution
```

## Environment Configuration

### Default Configuration (.env.example)

```bash
# Node.js API Configuration
NODE_ENV=production
PORT=3200

# File Upload Settings  
UPLOAD_PATH=/app/media
PROCESSED_PATH=/app/processed
MAX_FILE_SIZE=104857600

# Redis Configuration
REDIS_URL=redis://redis:6379

# File Type Settings
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp,mp4,mov,avi
```

### Custom Configuration Options

```bash
# Performance tuning
NODE_ENV=production
LOG_LEVEL=info

# Security settings
CORS_ORIGINS=http://localhost:3036,https://yourdomain.com
JWT_SECRET=your-secret-key

# Storage settings
MAX_FILE_SIZE=209715200  # 200MB
CLEANUP_INTERVAL=86400   # 24 hours
```

## Troubleshooting Guide

### Common Issues & Solutions

#### 1. Container Won't Start

**Problem**: Container exits immediately or fails to start

**Solution**:
```bash
# Check logs
docker-compose logs media-api

# Common fixes:
# - Ensure ports aren't in use: netstat -tlnp | grep 3200
# - Check disk space: df -h
# - Verify permissions: ls -la media-storage/
```

#### 2. Health Checks Failing

**Problem**: Containers show as unhealthy

**Solution**:
```bash
# Check specific health status
docker inspect saggersrule-media-api | grep -A 10 Health

# Manual health check
docker exec saggersrule-media-api curl -f http://localhost:3200/health

# Fix: Increase start_period in docker-compose.yml if needed
```

#### 3. File Upload Errors

**Problem**: Upload requests fail with 413 or 500 errors

**Solution**:
```bash
# Check Nginx config
docker exec saggersrule-media-server cat /etc/nginx/conf.d/default.conf | grep client_max_body_size

# Check API logs
docker-compose logs media-api

# Verify storage permissions
ls -la media-storage/
chmod 755 media-storage/
```

#### 4. Network Connectivity Issues

**Problem**: Containers can't communicate

**Solution**:
```bash
# Verify network exists
docker network ls | grep saggersrule

# Check container network membership
docker inspect saggersrule-media-api | grep -A 10 Networks

# Recreate network if needed
docker-compose down
docker network prune
docker-compose up -d --build
```

## Performance Optimization

### Resource Limits

Add to docker-compose.yml for production:

```yaml
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

### Nginx Optimization

For high-traffic scenarios:

```nginx
# Add to nginx/conf.d/default.conf
worker_processes auto;
worker_connections 1024;

# Enable caching
proxy_cache_path /tmp/nginx_cache levels=1:2 keys_zone=my_cache:10m max_size=10g 
                 inactive=60m use_temp_path=off;
```

## Security Hardening

### Production Security

1. **SSL/TLS Setup**:
   ```bash
   # Use reverse proxy with SSL termination
   # Recommended: Nginx Proxy Manager, Traefik, or Cloudflare
   ```

2. **Authentication**:
   ```bash
   # Add environment variables for API keys
   API_KEY=your-secure-api-key
   ADMIN_PASSWORD=your-admin-password
   ```

3. **Firewall Configuration**:
   ```bash
   # Restrict access to necessary ports only
   ufw allow 3036/tcp  # Public access
   ufw deny 3200/tcp   # Block direct API access
   ufw deny 6379/tcp   # Block direct Redis access
   ```

## Backup and Recovery

### Automated Backup Script

```bash
#!/bin/bash
# backup-saggersrule.sh

BACKUP_DIR="/volume1/backups/saggersrule"
DATE=$(date +%Y%m%d-%H%M%S)

mkdir -p $BACKUP_DIR

# Backup configuration
tar -czf $BACKUP_DIR/config-$DATE.tar.gz \
  docker-compose.yml nginx/ media-api/ .env

# Backup media files (optional - can be large)
tar -czf $BACKUP_DIR/media-$DATE.tar.gz media-storage/

echo "Backup completed: $BACKUP_DIR"
```

### Recovery Process

```bash
# Stop services
docker-compose down

# Restore configuration
tar -xzf backup/config-YYYYMMDD-HHMMSS.tar.gz

# Restore media files
tar -xzf backup/media-YYYYMMDD-HHMMSS.tar.gz

# Restart services
docker-compose up -d --build
```

## Monitoring and Logging

### Log Management

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f media-api
docker-compose logs -f media-server

# Log rotation (add to crontab)
0 2 * * * docker system prune -f
```

### Health Monitoring

```bash
#!/bin/bash
# health-monitor.sh - Add to crontab

# Check services
if ! curl -f http://localhost:3200/health > /dev/null 2>&1; then
    echo "API health check failed" | mail -s "SaggersRule Alert" admin@yourdomain.com
fi

if ! curl -f http://localhost:3036/health > /dev/null 2>&1; then
    echo "Nginx health check failed" | mail -s "SaggersRule Alert" admin@yourdomain.com
fi
```

## Scaling and High Availability

### Load Balancing

For high-traffic scenarios:

```yaml
# docker-compose.yml
services:
  media-api:
    scale: 3  # Run 3 instances
    
  nginx-lb:
    image: nginx:alpine
    volumes:
      - ./nginx-lb.conf:/etc/nginx/nginx.conf
    ports:
      - "80:80"
```

### Database Persistence

For Redis persistence:

```yaml
redis:
  image: redis:alpine
  command: redis-server --appendonly yes
  volumes:
    - redis-data:/data
```

---

## Support

### Getting Help

- **GitHub Issues**: https://github.com/mjc8278a/SaggersRule-App/issues
- **Documentation**: Check README.md and CHANGELOG.md
- **Community**: Share deployment experiences and solutions

### Reporting Deployment Issues

Include in your issue report:
1. **System Information**: OS, Docker version, NAS model
2. **Deployment Method**: Which method you used
3. **Error Messages**: Full error logs
4. **Configuration**: Sanitized docker-compose.yml and .env
5. **Steps Taken**: What you've already tried

---

**SaggersRule V2.0** - Production-ready deployment made simple! 🚀