# 🚀 SaggersRule NAS Setup - FIXED Configuration

## ✅ Corrected Configuration Details

### **Port Configuration:**
- **Media API**: `3200:3200` (External 3200 → Internal 3200)
- **Media Server**: `3036:3036` (External 3036 → Internal 3036)  
- **Directory**: `/volume1/docker/apps/saggersrule-media`

## 📁 Complete Setup Commands

### **Step 1: SSH into NAS**
```bash
ssh admin@192.168.42.56
```

### **Step 2: Create Directory Structure**
```bash
sudo mkdir -p /volume1/docker/apps/saggersrule-media/{media-api,media-processor,media-storage/uploads,processed-media/{images,videos},logs}
cd /volume1/docker/apps/saggersrule-media
```

### **Step 3: Download Fixed Files**
```bash
# Download corrected docker-compose file
wget https://raw.githubusercontent.com/mjc8278a/SaggersRule-App/main/FIXED-docker-compose-3200-3036.yaml -O docker-compose.yaml

# Download corrected media API server
wget https://raw.githubusercontent.com/mjc8278a/SaggersRule-App/main/FIXED-server-3200.js -O media-api/server.js

# Download corrected nginx config  
wget https://raw.githubusercontent.com/mjc8278a/SaggersRule-App/main/FIXED-nginx-3036.conf -O nginx-custom.conf

# Download media processor (unchanged)
wget https://raw.githubusercontent.com/mjc8278a/SaggersRule-App/main/nas-setup/media-processor/media_processor.py -O media-processor/media_processor.py
```

### **Step 4: Start Services**
```bash
sudo docker compose up -d
```

### **Step 5: Verify Services**
```bash
# Check container status
sudo docker compose ps

# Test endpoints
curl http://192.168.42.56:3200/health
curl http://192.168.42.56:3036/health

# View logs
sudo docker compose logs -f
```

## 🎯 Expected Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Media Upload** | `http://192.168.42.56:3200/upload` | File upload endpoint |
| **Media Server** | `http://192.168.42.56:3036/media/` | Processed media files |
| **Health Checks** | `http://192.168.42.56:3200/health` | API status |
| **Health Checks** | `http://192.168.42.56:3036/health` | Media server status |

## 🔧 Management Commands

```bash
# Navigate to project directory
cd /volume1/docker/apps/saggersrule-media

# Start services
sudo docker compose up -d

# Stop services  
sudo docker compose down

# Restart specific service
sudo docker compose restart media-api

# View logs
sudo docker compose logs -f media-api
sudo docker compose logs -f nginx

# Check status
sudo docker compose ps
```

## ✅ Success Indicators

You'll know everything is working when:

1. ✅ All containers show "Up" status: `sudo docker compose ps`
2. ✅ Health endpoints return 200: 
   - `curl http://192.168.42.56:3200/health`
   - `curl http://192.168.42.56:3036/health`
3. ✅ Port mapping shows correct configuration:
   - `0.0.0.0:3200->3200/tcp`
   - `0.0.0.0:3036->3036/tcp`

## 🔄 Backend Integration

Update your SaggersRule backend `.env` file:
```env
NAS_MEDIA_API_URL="http://192.168.42.56:3200"
NAS_MEDIA_SERVER_URL="http://192.168.42.56:3036"
```

**🎉 This configuration fixes the port mapping issue from yesterday and uses the correct directory structure!**