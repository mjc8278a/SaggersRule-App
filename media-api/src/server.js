const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Redis = require('redis');
require('dotenv').config();

const uploadRoutes = require('./routes/upload');
const healthRoutes = require('./routes/health');

const app = express();
const PORT = process.env.PORT || 3200;

// Redis client setup (optional, but ready for use)
let redisClient;
if (process.env.REDIS_URL) {
  try {
    redisClient = Redis.createClient({
      url: process.env.REDIS_URL
    });
    redisClient.on('error', (err) => console.log('Redis Client Error', err));
    redisClient.on('connect', () => console.log('Redis connected successfully'));
    redisClient.connect();
  } catch (error) {
    console.log('Redis connection failed:', error);
  }
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/upload', uploadRoutes);
app.use('/api/upload', uploadRoutes); // Support both direct and proxied access
app.use('/', uploadRoutes); // Fallback for root uploads

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    name: 'SaggersRule Media API',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      upload: '/upload',
      upload_api: '/api/upload'
    }
  });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: `Maximum file size is ${process.env.MAX_FILE_SIZE || '100MB'}`
    });
  }
  
  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'Invalid file',
      message: 'Unexpected file field'
    });
  }
  
  if (error.code === 'ENOENT') {
    return res.status(500).json({
      error: 'File system error',
      message: 'Upload directory not accessible'
    });
  }
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
    availableEndpoints: {
      health: '/health',
      upload: '/upload',
      api_upload: '/api/upload'
    }
  });
});

// Graceful shutdown
const gracefulShutdown = async (signal) => {
  console.log(`${signal} received, shutting down gracefully`);
  
  if (redisClient) {
    try {
      await redisClient.quit();
      console.log('Redis connection closed');
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  }
  
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 SaggersRule Media API V2.0');
  console.log('='.repeat(50));
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Upload path: ${process.env.UPLOAD_PATH || '/app/media'}`);
  console.log(`Processed path: ${process.env.PROCESSED_PATH || '/app/processed'}`);
  console.log(`Max file size: ${process.env.MAX_FILE_SIZE || '104857600'} bytes`);
  console.log(`Allowed extensions: ${process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi'}`);
  console.log('='.repeat(50));
  console.log('✅ API ready for requests');
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`📤 Upload endpoint: http://localhost:${PORT}/upload`);
  console.log('='.repeat(50));
});

module.exports = app;