const express = require('express');
const router = express.Router();

// Basic health check endpoint
router.get('/', (req, res) => {
  const healthData = {
    status: 'healthy',
    service: 'SaggersRule Media API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024)
    },
    environment: process.env.NODE_ENV || 'development'
  };
  
  res.status(200).json(healthData);
});

// Detailed health check
router.get('/detailed', (req, res) => {
  const healthData = {
    status: 'healthy',
    service: 'SaggersRule Media API',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    configuration: {
      port: process.env.PORT || 3200,
      uploadPath: process.env.UPLOAD_PATH || '/app/media',
      processedPath: process.env.PROCESSED_PATH || '/app/processed',
      maxFileSize: process.env.MAX_FILE_SIZE || '104857600',
      allowedExtensions: process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi',
      redisUrl: process.env.REDIS_URL ? 'configured' : 'not configured'
    },
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      architecture: process.arch,
      pid: process.pid
    }
  };
  
  res.status(200).json(healthData);
});

// Readiness check (for Kubernetes/Docker health checks)
router.get('/ready', (req, res) => {
  // Add any readiness checks here (database connectivity, etc.)
  res.status(200).json({
    status: 'ready',
    timestamp: new Date().toISOString()
  });
});

// Liveness check (for Kubernetes/Docker health checks)
router.get('/live', (req, res) => {
  res.status(200).json({
    status: 'alive',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;