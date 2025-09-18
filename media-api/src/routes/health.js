const express = require('express');
const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0'
  };
  
  res.status(200).json(healthData);
});

// Detailed health check
router.get('/detailed', (req, res) => {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    config: {
      port: process.env.PORT,
      uploadPath: process.env.UPLOAD_PATH,
      processedPath: process.env.PROCESSED_PATH,
      maxFileSize: process.env.MAX_FILE_SIZE,
      allowedExtensions: process.env.ALLOWED_EXTENSIONS
    }
  };
  
  res.status(200).json(healthData);
});

module.exports = router;