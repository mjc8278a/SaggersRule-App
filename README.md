# SaggersRule Media Stack V2.0

A production-ready Docker-based media processing and serving stack with Node.js API, Nginx static file server, and Redis caching.

## 🚀 What's New in V2.0

- ✅ **Fixed Docker networking** - All containers properly connected
- ✅ **Corrected Nginx configuration** - Proper DNS resolver and proxy routing
- ✅ **Enhanced health checks** - Comprehensive monitoring for all services
- ✅ **Improved port management** - Clean port mapping without conflicts
- ✅ **Production validation** - Tested deployment process with real-world fixes
- ✅ **Git integration** - Ready for version control and collaboration

## Architecture

- **Media API** (Node.js/Express) - Port 3200: Handles file uploads and processing
- **Media Server** (Nginx) - Port 3036: Serves static files and proxies API requests
- **Redis** - Port 6379: Caching and job queuing

## Features

- ✅ File upload handling (images & videos)
- ✅ Static file serving via Nginx with optimized caching
- ✅ Redis for caching/queuing
- ✅ Comprehensive health checks for all services
- ✅ Support for multiple media formats
- ✅ 100MB max file size limit
- ✅ Docker Compose deployment with proper networking
- ✅ CORS support for cross-origin requests
- ✅ Production-ready error handling

## Supported File Types

**Images:** jpg, jpeg, png, gif, webp  
**Videos:** mp4, mov, avi

## Quick Start

### Prerequisites

- Docker & Docker Compose
- At least 2GB available RAM
- 10GB+ storage space

### Deployment

1. **Clone the repository:**
   ```bash
   git clone https://github.com/mjc8278a/SaggersRule-App.git
   cd SaggersRule-App
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration if needed
   ```

3. **Create necessary directories:**
   ```bash
   mkdir -p media-storage processed-media
   ```

4. **Deploy the stack:**
   ```bash
   docker-compose up -d --build
   ```

### Validation

1. **Check container health:**
   ```bash
   docker-compose ps
   ```

2. **Test service health:**
   ```bash
   # Test API health
   curl http://localhost:3200/health
   
   # Test Nginx health  
   curl http://localhost:3036/health
   
   # Test Redis
   docker exec saggersrule-redis redis-cli ping
   ```

3. **Test file upload:**
   ```bash
   curl -X POST -F "file=@test-image.jpg" http://localhost:3200/upload
   ```

4. **Access uploaded file:**
   ```bash
   curl http://localhost:3036/media/filename.jpg
   ```

## API Endpoints

### Health Check
- `GET /health` - API health status

### File Upload
- `POST /upload` - Upload media files
- `POST /api/upload` - Upload via Nginx proxy
- Returns: `{"url": "/media/filename.ext", "message": "File uploaded successfully"}`

### Static Files
- `GET /media/*` - Access uploaded files via Nginx

## URLs

- **API Direct Access:** `http://localhost:3200/`
- **API via Nginx:** `http://localhost:3036/api/`
- **Static Content:** `http://localhost:3036/media/`
- **Redis (Internal):** `redis://redis:6379`

## Directory Structure

```
/volume1/docker/SaggersRule/
├── docker-compose.yml      # Main deployment file
├── media-api/             # Node.js API service
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── nginx/                 # Nginx configuration
│   └── conf.d/
│       └── default.conf
├── media-storage/         # Uploaded files (created automatically)
├── processed-media/       # Processed outputs (created automatically)
└── .env.example          # Environment template
```

## Configuration

Key environment variables in `.env`:

```bash
NODE_ENV=production
PORT=3200
UPLOAD_PATH=/app/media
PROCESSED_PATH=/app/processed
REDIS_URL=redis://redis:6379
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp,mp4,mov,avi
MAX_FILE_SIZE=104857600
```

## V2.0 Improvements & Fixes

### Docker Networking
- ✅ Removed duplicate network entries
- ✅ All containers connected to `saggersrule-network`
- ✅ Proper inter-container communication

### Nginx Configuration
- ✅ Added Docker DNS resolver (127.0.0.11)
- ✅ Changed listen port from 80 to 3036
- ✅ Fixed proxy_pass directive for correct API routing
- ✅ Enhanced CORS handling
- ✅ Improved health check endpoints

### Health Monitoring
- ✅ Health checks for all services (API, Nginx, Redis)
- ✅ Proper startup timing with start_period
- ✅ Comprehensive validation endpoints

### Port Management
- ✅ Clean port mapping: 3200 (API), 3036 (Nginx), 6379 (Redis)
- ✅ No conflicts with standard ports
- ✅ Production-ready configuration

## Troubleshooting

### Container Issues
```bash
# View logs
docker-compose logs media-api
docker-compose logs media-server
docker-compose logs redis

# Restart services
docker-compose restart media-api
docker-compose restart media-server
```

### Network Issues
- Check port availability: `netstat -tlnp | grep :3200`
- Verify container networking: `docker network ls`
- Test internal connectivity: `docker exec saggersrule-media-api ping redis`

### File Access Issues
- Ensure `media-storage/` directory exists and is writable
- Check file permissions: `ls -la media-storage/`
- Verify Nginx can access mounted volumes

## Development

### Local Development
1. Install Node.js dependencies:
   ```bash
   cd media-api
   npm install
   ```

2. Start development server:
   ```bash
   npm run dev
   ```

### Adding Features
- API endpoints: Edit `media-api/src/routes/`
- Nginx config: Edit `nginx/conf.d/default.conf`
- Docker config: Edit `docker-compose.yml`

## Production Deployment

### NAS Deployment (Synology/QNAP)

1. **SSH into your NAS:**
   ```bash
   cd /volume1/docker/  # Synology
   # or
   cd /share/Container/  # QNAP
   ```

2. **Clone and deploy:**
   ```bash
   git clone https://github.com/mjc8278a/SaggersRule-App.git SaggersRule
   cd SaggersRule
   docker-compose up -d --build
   ```

3. **Configure firewall:** Open ports 3200, 3036 in your NAS firewall

### Security Considerations
- Configure HTTPS with reverse proxy
- Set up authentication for public access
- Regular security updates for Docker images
- Monitor file upload directories

## Backup Strategy

```bash
# Backup configuration
tar -czf saggersrule-config-$(date +%Y%m%d).tar.gz \
  docker-compose.yml nginx/ media-api/

# Backup media files (optional - can be large)
tar -czf saggersrule-media-$(date +%Y%m%d).tar.gz media-storage/
```

## Version History

### V2.0 (Current)
- Production-tested deployment
- Fixed Docker networking issues
- Enhanced Nginx configuration with DNS resolver
- Comprehensive health checks
- Improved error handling and validation

### V1.0
- Initial Docker-based implementation
- Basic API and Nginx setup
- File upload functionality

## Support

For issues and support:
- Check the troubleshooting section
- Review Docker logs: `docker-compose logs`
- Ensure all prerequisites are met
- Verify network connectivity and firewall settings

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**SaggersRule V2.0** - Production-ready media processing stack for your NAS! 🚀