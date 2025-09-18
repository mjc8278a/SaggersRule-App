# SaggersRule Media Stack

A Docker-based media processing and serving stack with Node.js API, Nginx static file server, and Redis caching.

## Architecture

- **Media API** (Node.js/Express) - Port 3200: Handles file uploads and processing
- **Media Server** (Nginx) - Port 3036: Serves static files and proxies API requests
- **Redis** - Port 6333/6379: Caching and job queuing

## Features

- ✅ File upload handling (images & videos)
- ✅ Static file serving via Nginx
- ✅ Redis for caching/queuing
- ✅ Health checks for all services
- ✅ Support for multiple media formats
- ✅ 100MB max file size limit
- ✅ Docker Compose deployment

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
   git clone <your-repo-url>
   cd saggersrule
   ```

2. **Create environment file:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Create necessary directories:**
   ```bash
   mkdir -p media-storage processed-media
   ```

4. **Deploy the stack:**
   ```bash
   docker compose down -v
   docker compose up -d --build
   ```

### Validation

1. **Check container health:**
   ```bash
   docker compose ps
   ```

2. **Test API health:**
   ```bash
   curl http://localhost:3200/health
   curl http://localhost:3036/health
   ```

3. **Test file upload:**
   ```bash
   curl -X POST -F "file=@test-image.jpg" http://localhost:3200/upload
   ```

4. **Access uploaded file:**
   ```bash
   curl http://localhost:3036/media/uploads/test-image.jpg
   ```

## API Endpoints

### Health Check
- `GET /health` - API health status

### File Upload
- `POST /upload` - Upload media files
- Returns: `{"url": "/media/uploads/filename.ext", "message": "File uploaded successfully"}`

### Static Files
- `GET /media/*` - Access uploaded files via Nginx

## URLs

- **API Direct Access:** `http://localhost:3200/`
- **Static Content:** `http://localhost:3036/media/`
- **Redis (Internal):** `redis://redis:6379`
- **Redis (Host Access):** `localhost:6333`

## Directory Structure

```
/
├── docker-compose.yml      # Main deployment file
├── media-api/             # Node.js API service
│   ├── Dockerfile
│   ├── package.json
│   └── src/
├── nginx/                 # Nginx configuration
│   └── conf.d/
│       └── default.conf
├── media-storage/         # Uploaded files (gitignored)
├── processed-media/       # Processed outputs (gitignored)
└── .env.example          # Environment template
```

## Configuration

Key environment variables in `.env`:

```bash
NODE_ENV=production
PORT=3200
UPLOAD_PATH=/app/media/uploads
PROCESSED_PATH=/app/processed
REDIS_URL=redis://redis:6379
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp,mp4,mov,avi
MAX_FILE_SIZE=104857600
```

## Troubleshooting

### Container Issues
```bash
# View logs
docker compose logs media-api
docker compose logs media-server
docker compose logs redis

# Restart services
docker compose restart media-api
docker compose restart media-server
```

### Storage Issues
- Ensure `media-storage/` and `processed-media/` directories exist
- Check disk space: `df -h`
- Verify file permissions

### Network Issues
- Check port availability: `netstat -tlnp | grep :3200`
- Verify firewall settings
- Test internal connectivity: `docker compose exec media-api ping redis`

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

For production deployment on NAS or server:

1. **Security:** Configure proper authentication and HTTPS
2. **Monitoring:** Set up log aggregation and health monitoring
3. **Backups:** Regular backups of configuration and processed media
4. **Updates:** Establish update procedures for Docker images

## Support

For issues and support:
- Check the troubleshooting section
- Review Docker logs
- Ensure all prerequisites are met