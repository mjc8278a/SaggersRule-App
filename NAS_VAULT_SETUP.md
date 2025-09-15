# 🏠 NAS Vault Setup Guide for Ugreen DXP4800 Plus

## 📋 Overview
This guide will help you set up MinIO on your Ugreen DXP4800 Plus NAS to create a professional user profile vault system for your Network Checkpoint Monitor.

## 🔧 Prerequisites
- ✅ Ugreen DXP4800 Plus NAS
- ✅ Docker installed on your NAS (via App Center)
- ✅ Network access to your NAS
- ✅ Admin access to your NAS web interface

## 🚀 Step 1: Install MinIO on Your Ugreen NAS

### Option A: Using Docker Command Line (Recommended)

1. **SSH into your Ugreen NAS** or use the terminal in the web interface:
```bash
ssh admin@192.168.1.100  # Replace with your NAS IP
```

2. **Create MinIO directories**:
```bash
mkdir -p ~/minio/data
mkdir -p ~/minio/config
```

3. **Run MinIO container**:
```bash
docker run -d \
  --name minio-profile-vault \
  --restart=always \
  -p 9000:9000 \
  -p 9001:9001 \
  -v ~/minio/data:/data \
  -v ~/minio/config:/root/.minio \
  -e "MINIO_ROOT_USER=admin" \
  -e "MINIO_ROOT_PASSWORD=secure_admin_password" \
  -e "MINIO_BROWSER_REDIRECT_URL=http://192.168.1.100:9001" \
  quay.io/minio/minio server /data --console-address ":9001"
```

### Option B: Using Ugreen App Center (If Available)

1. Open your Ugreen NAS web interface
2. Go to **App Center** → **Docker**
3. Search for "MinIO"
4. Install and configure with the same environment variables as above

## 🌐 Step 2: Configure Network Access

### Port Configuration
- **MinIO API**: Port 9000
- **MinIO Console**: Port 9001
- Make sure these ports are open on your NAS firewall

### Update Your Application Configuration
In your `/app/backend/.env` file, update:
```env
MINIO_ENDPOINT="192.168.1.100:9000"  # Your actual NAS IP
MINIO_ACCESS_KEY="admin" 
MINIO_SECRET_KEY="secure_admin_password"
MINIO_USE_SSL="false"
```

## 🔍 Step 3: Verify MinIO Installation

### Test MinIO Console Access
1. Open browser and go to: `http://192.168.1.100:9001`
2. Login with:
   - **Username**: admin
   - **Password**: secure_admin_password
3. You should see the MinIO console dashboard

### Test API Access
```bash
curl http://192.168.1.100:9000/minio/health/live
```
Should return: `200 OK`

## 📊 Step 4: Bucket Structure
Your vault system will automatically create these buckets:

```
user-profiles/          # Profile pictures and avatars
user-documents/         # User documents and files  
user-attachments/       # Status check attachments
user-backups/          # User data backups
user-monitoring/       # Monitoring reports and logs
system-logs/           # System logs and analytics
```

## 🔐 Step 5: Security Configuration

### Basic Security Setup
1. **Change default credentials** (recommended):
   ```bash
   docker stop minio-profile-vault
   docker rm minio-profile-vault
   
   # Run with new credentials
   docker run -d \
     --name minio-profile-vault \
     --restart=always \
     -p 9000:9000 \
     -p 9001:9001 \
     -v ~/minio/data:/data \
     -e "MINIO_ROOT_USER=your_secure_username" \
     -e "MINIO_ROOT_PASSWORD=your_very_secure_password_123!" \
     quay.io/minio/minio server /data --console-address ":9001"
   ```

2. **Update your application .env file** with new credentials

### Network Security
- Consider setting up SSL/TLS for production use
- Configure firewall rules to restrict access
- Use VPN for remote access if needed

## 🧪 Step 6: Test Your Vault System

### Health Check
Test your vault system health:
```bash
curl http://localhost:8001/api/health
```

Look for the `nas_vault` section in the response:
```json
{
  "nas_vault": {
    "status": "healthy",
    "nas_endpoint": "192.168.1.100:9000",
    "buckets_count": 6,
    "buckets": ["user-profiles", "user-documents", ...]
  }
}
```

### Upload Test
Use your application to:
1. Register/login as a user
2. Upload a profile picture
3. Upload a document  
4. Check the MinIO console to see your files

## 📁 File Organization Structure
Your files will be organized as:
```
user-profiles/
  └── user_123/
      └── profile_pictures/
          └── 2025/01/
              └── 143022_avatar.jpg

user-documents/
  └── user_123/
      └── documents/
          └── general/
              └── 2025/01/
                  └── 143045_document.pdf
```

## 🔧 Troubleshooting

### Common Issues

**1. Cannot connect to MinIO**
- Check if container is running: `docker ps`
- Verify port 9000 is accessible: `telnet 192.168.1.100 9000`
- Check firewall settings on NAS

**2. Permission denied errors**
- Ensure MinIO data directory has correct permissions
- Check Docker container logs: `docker logs minio-profile-vault`

**3. Bucket creation fails**
- Verify MinIO credentials in your application
- Check MinIO console for error messages
- Ensure enough storage space on NAS

### Useful Commands
```bash
# Check MinIO container status
docker ps | grep minio

# View MinIO logs
docker logs minio-profile-vault

# Restart MinIO container
docker restart minio-profile-vault

# Check MinIO data usage
du -sh ~/minio/data
```

## 📈 Monitoring and Maintenance

### Regular Tasks
1. **Monitor storage usage** via MinIO console
2. **Check container health** regularly
3. **Backup MinIO configuration** and data
4. **Update MinIO container** periodically

### Backup Strategy
- Your user data is stored in `~/minio/data`
- Back up this directory regularly
- Consider RAID configuration on your NAS for redundancy

## 🎉 Success!
Once completed, your Network Checkout Monitor will have:
- ✅ Professional file storage on your own NAS
- ✅ Secure user data isolation  
- ✅ Organized file structure
- ✅ Profile pictures, documents, and attachments
- ✅ Automated backups
- ✅ Web-based file management

Your vault system is now ready to store user profile data securely on your Ugreen NAS! 🚀

## 📞 Support
If you encounter issues:
1. Check the troubleshooting section above
2. Review MinIO documentation: https://min.io/docs
3. Check Ugreen NAS documentation for Docker support