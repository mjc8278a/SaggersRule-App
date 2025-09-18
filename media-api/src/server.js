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

// Redis client setup
let redisClient;
try {
  redisClient = Redis.createClient({
    url: process.env.REDIS_URL || 'redis://localhost:6379'
  });
  redisClient.on('error', (err) => console.log('Redis Client Error', err));
  redisClient.connect();
} catch (error) {
  console.log('Redis connection failed:', error);
}

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(cors({
  origin: process.env.CORS_ORIGINS?.split(',') || '*',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/health', healthRoutes);
app.use('/upload', uploadRoutes);
app.use('/', uploadRoutes); // Fallback for root uploads

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
  
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found'
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  if (redisClient) {
    await redisClient.quit();
  }
  process.exit(0);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SaggersRule Media API running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  console.log(`Upload path: ${process.env.UPLOAD_PATH}`);
  console.log(`Processed path: ${process.env.PROCESSED_PATH}`);
});

module.exports = app;