import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, CheckCircle, AlertCircle, X } from 'lucide-react';
import { ApiService } from '../services/api';

const FileUpload = ({ onUploadComplete, uploadConfig }) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const onDrop = useCallback((acceptedFiles) => {
    setError(null);
    setUploadResult(null);
    
    // Validate files
    const validFiles = [];
    const errors = [];

    acceptedFiles.forEach(file => {
      const validation = ApiService.validateFile(
        file, 
        uploadConfig?.maxFileSize, 
        uploadConfig?.allowedExtensions
      );
      
      if (validation.isValid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.errors.join(', ')}`);
      }
    });

    if (errors.length > 0) {
      setError(errors.join('\n'));
      return;
    }

    setSelectedFiles(validFiles);
  }, [uploadConfig]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    disabled: uploading,
  });

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      let result;
      
      if (selectedFiles.length === 1) {
        result = await ApiService.uploadFile(selectedFiles[0], setProgress);
      } else {
        result = await ApiService.uploadMultipleFiles(selectedFiles, setProgress);
      }

      setUploadResult(result);
      setSelectedFiles([]);
      
      if (onUploadComplete) {
        onUploadComplete(result);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      setError(error.response?.data?.message || error.message || 'Upload failed');
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(files => files.filter((_, i) => i !== index));
  };

  const clearAll = () => {
    setSelectedFiles([]);
    setUploadResult(null);
    setError(null);
  };

  return (
    <div className="upload-container">
      <div 
        {...getRootProps()} 
        className={`upload-zone ${isDragActive ? 'drag-over' : ''} ${uploading ? 'uploading' : ''}`}
      >
        <input {...getInputProps()} />
        
        <Upload className="upload-icon" size={48} />
        
        <div className="upload-text">
          {uploading ? 'Uploading...' : 
           isDragActive ? 'Drop files here' : 
           'Drag & drop files here, or click to select'}
        </div>
        
        <div className="upload-subtext">
          {uploadConfig ? (
            <>
              Max size: {ApiService.formatFileSize(uploadConfig.maxFileSize || 104857600)} | 
              Allowed: {uploadConfig.allowedExtensions?.join(', ') || 'jpg, png, gif, mp4, mov, avi'}
            </>
          ) : (
            'Loading configuration...'
          )}
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="selected-files">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4>Selected Files ({selectedFiles.length})</h4>
            <button onClick={clearAll} className="btn btn-secondary" type="button">
              Clear All
            </button>
          </div>
          
          {selectedFiles.map((file, index) => (
            <div key={index} className="file-preview">
              {ApiService.isImage(file) ? (
                <img 
                  src={URL.createObjectURL(file)} 
                  alt={file.name}
                  onLoad={() => URL.revokeObjectURL(file)}
                />
              ) : (
                <div style={{ 
                  width: '60px', 
                  height: '60px', 
                  background: '#f3f4f6', 
                  borderRadius: '0.375rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <File size={24} color="#6b7280" />
                </div>
              )}
              
              <div className="file-info">
                <div className="file-name">{file.name}</div>
                <div className="file-size">{ApiService.formatFileSize(file.size)}</div>
              </div>
              
              <button 
                onClick={() => removeFile(index)}
                className="btn btn-danger"
                style={{ padding: '0.5rem' }}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          ))}
          
          <button 
            onClick={handleUpload} 
            disabled={uploading || selectedFiles.length === 0}
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '1rem' }}
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} file${selectedFiles.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}

      {/* Progress Bar */}
      {uploading && (
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      )}

      {/* Upload Result */}
      {uploadResult && (
        <div className="upload-result" style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#ecfdf5', 
          border: '1px solid #10b981',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle size={20} color="#10b981" />
          <div>
            <strong>{uploadResult.message}</strong>
            {uploadResult.file && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {uploadResult.file.filename} ({uploadResult.file.sizeFormatted})
              </div>
            )}
            {uploadResult.files && (
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                {uploadResult.totalFiles} files uploaded ({uploadResult.totalSize})
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="upload-error" style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#fef2f2', 
          border: '1px solid #ef4444',
          borderRadius: '0.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          <AlertCircle size={20} color="#ef4444" style={{ marginTop: '0.125rem', flexShrink: 0 }} />
          <div>
            <strong>Upload Failed</strong>
            <div style={{ fontSize: '0.875rem', marginTop: '0.25rem', whiteSpace: 'pre-line' }}>
              {error}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;