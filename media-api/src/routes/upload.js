const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || '/app/media/uploads';
    
    // Ensure directory exists
    try {
      await fs.mkdir(uploadPath, { recursive: true });
    } catch (error) {
      console.error('Error creating upload directory:', error);
    }
    
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique filename
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedExtensions = (process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi').split(',');
  const fileExtension = path.extname(file.originalname).toLowerCase().slice(1);
  
  if (allowedExtensions.includes(fileExtension)) {
    cb(null, true);
  } else {
    cb(new Error(`File type .${fileExtension} is not allowed. Allowed types: ${allowedExtensions.join(', ')}`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 104857600 // 100MB default
  }
});

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const fileInfo = {
      originalName: req.file.originalname,
      filename: req.file.filename,
      size: req.file.size,
      mimetype: req.file.mimetype,
      path: req.file.path,
      url: `/media/uploads/${req.file.filename}`,
      uploadedAt: new Date().toISOString()
    };

    // Optional: Process image files (create thumbnails, optimize, etc.)
    if (req.file.mimetype.startsWith('image/')) {
      try {
        await processImage(req.file);
        fileInfo.processed = true;
      } catch (error) {
        console.error('Image processing error:', error);
        fileInfo.processed = false;
        fileInfo.processingError = error.message;
      }
    }

    res.status(200).json({
      message: 'File uploaded successfully',
      file: fileInfo
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Multiple file upload endpoint
router.post('/multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        error: 'No files uploaded',
        message: 'Please select files to upload'
      });
    }

    const fileInfos = req.files.map(file => ({
      originalName: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
      path: file.path,
      url: `/media/uploads/${file.filename}`,
      uploadedAt: new Date().toISOString()
    }));

    res.status(200).json({
      message: `${req.files.length} files uploaded successfully`,
      files: fileInfos
    });

  } catch (error) {
    console.error('Multiple upload error:', error);
    res.status(500).json({
      error: 'Upload failed',
      message: error.message
    });
  }
});

// Process image function
async function processImage(file) {
  const processedPath = process.env.PROCESSED_PATH || '/app/processed';
  
  // Ensure processed directory exists
  await fs.mkdir(processedPath, { recursive: true });
  
  // Create thumbnail
  const thumbnailPath = path.join(processedPath, `thumb_${file.filename}`);
  
  await sharp(file.path)
    .resize(200, 200, {
      fit: 'cover',
      position: 'center'
    })
    .jpeg({ quality: 80 })
    .toFile(thumbnailPath);
    
  console.log(`Thumbnail created: ${thumbnailPath}`);
}

module.exports = router;