import axios from 'axios';

// API base URL - will use proxy in development, direct URL in production
const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'http://localhost:3036/api' 
  : '/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout for file uploads
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    console.log(`API Response: ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    console.error('API Response Error:', error);
    
    if (error.code === 'ECONNABORTED') {
      error.message = 'Request timeout - please try again';
    } else if (error.response?.status === 413) {
      error.message = 'File too large - please select a smaller file';
    } else if (error.response?.status >= 500) {
      error.message = 'Server error - please try again later';
    } else if (!error.response) {
      error.message = 'Network error - please check your connection';
    }
    
    return Promise.reject(error);
  }
);

export const ApiService = {
  // Health check
  async getHealth() {
    try {
      const response = await api.get('/health');
      return response.data;
    } catch (error) {
      // Try direct API if proxy fails
      try {
        const directResponse = await axios.get('http://localhost:3200/health', { timeout: 5000 });
        return directResponse.data;
      } catch (directError) {
        throw error;
      }
    }
  },

  // Get detailed health info
  async getDetailedHealth() {
    const response = await api.get('/health/detailed');
    return response.data;
  },

  // Upload single file
  async uploadFile(file, onProgress = null) {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    const response = await api.post('/upload', formData, config);
    return response.data;
  },

  // Upload multiple files
  async uploadMultipleFiles(files, onProgress = null) {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    const response = await api.post('/upload/multiple', formData, config);
    return response.data;
  },

  // Get upload info/configuration
  async getUploadInfo() {
    const response = await api.get('/upload/info');
    return response.data;
  },

  // Get file URL for display
  getFileUrl(filename) {
    return process.env.NODE_ENV === 'production' 
      ? `http://localhost:3036/media/${filename}`
      : `/media/${filename}`;
  },

  // Validate file before upload
  validateFile(file, maxSize = 104857600, allowedTypes = []) {
    const errors = [];

    if (file.size > maxSize) {
      errors.push(`File size (${Math.round(file.size / 1024 / 1024)}MB) exceeds maximum allowed size (${Math.round(maxSize / 1024 / 1024)}MB)`);
    }

    if (allowedTypes.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!allowedTypes.includes(fileExtension)) {
        errors.push(`File type .${fileExtension} is not allowed. Allowed types: ${allowedTypes.join(', ')}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Format file size
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  // Check if file is image
  isImage(file) {
    return file.type.startsWith('image/');
  },

  // Check if file is video
  isVideo(file) {
    return file.type.startsWith('video/');
  }
};

export default ApiService;