const express = require('express');
const multer = require('multer');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');

const app = express();
const port = process.env.PORT || 3001; // CORRECTED: Default to 3001, not 3200

console.log('🚀 Starting SaggersRule Media API - Port 3200 Setup');
console.log(`📡 Server will bind to internal port: ${port}`);
console.log(`🌐 External access via: http://localhost:3200`);

// Middleware
app.use(helmet());
app.use(cors({ credentials: true, origin: true }));
app.use(express.json());

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, process.env.UPLOAD_PATH || '/app/media/uploads');
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomUUID()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE) || 100 * 1024 * 1024 }, // 100MB
    fileFilter: (req, file, cb) => {
        const allowed = (process.env.ALLOWED_EXTENSIONS || 'jpg,jpeg,png,gif,webp,mp4,mov,avi').split(',');
        const ext = path.extname(file.originalname).toLowerCase().substring(1);
        cb(null, allowed.includes(ext));
    }
});

// Upload endpoint for SaggersRule
app.post('/upload', upload.array('media', 10), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const uploadedFiles = req.files.map(file => ({
            originalName: file.originalname,
            filename: file.filename,
            size: file.size,
            mimetype: file.mimetype,
            uploadedTo: 'saggersrule-media-api'
        }));

        console.log(`✅ SaggersRule: Uploaded ${uploadedFiles.length} files to media storage`);

        res.json({
            success: true,
            message: `${uploadedFiles.length} file(s) uploaded to SaggersRule media storage`,
            files: uploadedFiles,
            api_port: port,
            external_port: 3200
        });

    } catch (error) {
        console.error('❌ SaggersRule upload error:', error);
        res.status(500).json({ error: 'Upload failed' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy',
        service: 'SaggersRule Media API',
        internal_port: port,
        external_port: 3200,
        timestamp: new Date().toISOString()
    });
});

// Get media info
app.get('/media/:type/:id', async (req, res) => {
    try {
        const { type, id } = req.params;
        const metadataPath = path.join(process.env.PROCESSED_PATH || '/app/processed', `${type}s`, `${id}.json`);
        const metadata = await fs.readFile(metadataPath, 'utf8');
        res.json(JSON.parse(metadata));
    } catch (error) {
        res.status(404).json({ error: 'Media not found' });
    }
});

// List all media
app.get('/media', async (req, res) => {
    try {
        const processedPath = process.env.PROCESSED_PATH || '/app/processed';
        const images = await fs.readdir(path.join(processedPath, 'images')).catch(() => []);
        const videos = await fs.readdir(path.join(processedPath, 'videos')).catch(() => []);
        
        res.json({
            internal_port: port,
            external_port: 3200,
            total_images: images.filter(f => f.endsWith('.jpg')).length,
            total_videos: videos.filter(f => f.endsWith('.mp4')).length,
            service: 'SaggersRule Media Storage'
        });
    } catch (error) {
        res.status(500).json({ error: 'Failed to list media' });
    }
});

// Error handling
app.use((error, req, res, next) => {
    console.error('❌ SaggersRule server error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, '0.0.0.0', () => {
    console.log(`✅ SaggersRule Media API running internally on port ${port}`);
    console.log(`🌐 External access: http://localhost:3200`);
    console.log(`📁 Upload path: ${process.env.UPLOAD_PATH || '/app/media/uploads'}`);
    console.log(`📊 Health check: http://localhost:3200/health`);
});