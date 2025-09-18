const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || '/app/media';
    
    // Ensure directory exists
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      console.log(`Upload directory ready: ${uploadPath}`);
    } catch (error) {
      console.error('Error creating upload directory:', error);
      return cb(error);
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueName = `${uuidv4()}${ext}`;
    console.log(`Generated filename: ${uniqueName} for ${file.originalname}`);
    cb(null, uniqueName);
  }
});

// File filter with enhanced validation
const fileFilter = (req, file, cb) => {
  const allowedExtensions = (process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi')
    .split(',')
    .map(ext => ext.trim().toLowerCase());
  
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  console.log(`File filter check: ${file.originalname} (${fileExtension}) against allowed: [${allowedExtensions.join(', ')}]`);
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    const error = new Error(`File type .${fileExtension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`);
    error.code = 'INVALID_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600 // 100MB default
  }
});

// Root endpoint info
router.get('/', (req, res) => {
  res.json({
    service: 'SaggersRule Upload Service',
    version: '2.0.0',
    endpoints: {
      single_upload: 'POST /',
      multiple_upload: 'POST /multiple',
      health: 'GET /health'
    },
    configuration: {
      maxFileSize: `${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 104857600) / 1024 / 1024)}MB`,
      allowedExtensions: (process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi').split(',')
    }
  });
});

// Single file upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received:', {
      hasFile: !!req.file,
      originalName: req.file?.originalname,
      size: req.file?.size
    });

    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload',
        example: 'curl -X POST -F "file=@your-image.jpg" http://localhost:3200/upload'
      });
    }

    const fileInfo = {
      success: true,
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      sizeFormatted: `${Math.round(req.file.size / 1024)}KB`,
      mimetype: req.file.mimetype,
      extension: path.extname(req.file.originalname).toLowerCase(),
      path: req.file.path,
      url: `/media/${req.file.filename}`,
      directUrl: `http://localhost:3036/media/${req.file.filename}`,
      uploadedAt: new Date().toISOString(),
      id: uuidv4()
    };

    console.log('File uploaded successfully:', {
      filename: fileInfo.filename,
      size: fileInfo.sizeFormatted,
      url: fileInfo.url
    });

    res.status(200).json({
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('Upload error:', error);
    
    if (error.code === 'INVALID_FILE_TYPE') {
      return res.status(400).json({
        error: 'Invalid file type',
        message: error.message
      });
    }
    
    res.status(500).json({
      error: 'Upload failed',
      message: error.message,
      code: error.code
    });
  }
});

// Multiple file upload endpoint
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    console.log('Multiple upload request received:', {
      fileCount: req.files?.length || 0
    });

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select files to upload',
        example: 'curl -X POST -F "files=@image1.jpg" -F "files=@image2.jpg" http://localhost:3200/upload/multiple'
      });
    }

    const fileInfos = req.files.map(file => ({
      success: true,
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      sizeFormatted: `${Math.round(file.size / 1024)}KB`,
      mimetype: file.mimetype,
      extension: path.extname(file.originalname).toLowerCase(),
      path: file.path,
      url: `/media/${file.filename}`,
      directUrl: `http://localhost:3036/media/${file.filename}`,
      uploadedAt: new Date().toISOString(),
      id: uuidv4()
    }));

    const totalSize = req.files.reduce((sum, file) => sum + file.size, 0);

    console.log('Multiple files uploaded successfully:', {
      count: req.files.length,
      totalSize: `${Math.round(totalSize / 1024)}KB`
    });

    res.status(200).json({
      message: `${req.files.length} files uploaded successfully`,
      totalFiles: req.files.length,
      totalSize: `${Math.round(totalSize / 1024)}KB`,
      files: fileInfos
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      error: 'Multiple upload failed',
      message: error.message,
      code: error.code
    });
  }
});

// Upload status/info endpoint
router.get('/info', (req, res) => {
  res.json({
    service: 'SaggersRule Upload Service V2.0',
    status: 'operational',
    configuration: {
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600,
      maxFileSizeFormatted: `${Math.round((parseInt(process.env.MAX_FILE_SIZE) || 104857600) / 1024 / 1024)}MB`,
      allowedExtensions: (process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi').split(','),
      uploadPath: process.env.UPLOAD_PATH || '/app/media',
      processedPath: process.env.PROCESSED_PATH || '/app/processed'
    },
    usage: {
      singleUpload: 'POST / with "file" field',
      multipleUpload: 'POST /multiple with "files" field (max 10 files)',
      fileAccess: 'Files available at http://localhost:3036/media/{filename}'
    }
  });
});

module.exports = router;