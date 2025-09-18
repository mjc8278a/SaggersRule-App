import React, { useState, useEffect } from 'react';
import FileUpload from '../components/FileUpload';
import { ApiService } from '../services/api';
import { Upload, Info, AlertCircle } from 'lucide-react';

const UploadPage = () => {
  const [uploadConfig, setUploadConfig] = useState(null);
  const [recentUploads, setRecentUploads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUploadConfig();
  }, []);

  const loadUploadConfig = async () => {
    try {
      const config = await ApiService.getUploadInfo();
      setUploadConfig(config.configuration);
    } catch (error) {
      console.error('Failed to load upload config:', error);
      setError('Failed to load upload configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadComplete = (result) => {
    // Add to recent uploads
    if (result.file) {
      setRecentUploads(prev => [result.file, ...prev.slice(0, 4)]);
    } else if (result.files) {
      setRecentUploads(prev => [...result.files, ...prev].slice(0, 5));
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Loading upload configuration...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Upload size={24} color="#3b82f6" />
          <h2 style={{ margin: 0, color: '#1e293b' }}>Upload Media Files</h2>
        </div>

        {error ? (
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: '0.5rem',
            padding: '1rem',
            background: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            marginBottom: '1rem'
          }}>
            <AlertCircle size={20} color="#ef4444" />
            <span>{error}</span>
          </div>
        ) : (
          <FileUpload 
            onUploadComplete={handleUploadComplete}
            uploadConfig={uploadConfig}
          />
        )}

        {/* Upload Configuration Info */}
        {uploadConfig && (
          <div style={{ 
            marginTop: '2rem',
            padding: '1rem',
            background: '#f8fafc',
            borderRadius: '0.5rem',
            border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <Info size={16} color="#64748b" />
              <span style={{ fontWeight: '500', color: '#374151' }}>Upload Limits</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', fontSize: '0.875rem' }}>
              <div>
                <strong>Max File Size:</strong><br />
                {ApiService.formatFileSize(uploadConfig.maxFileSize)}
              </div>
              <div>
                <strong>Allowed Types:</strong><br />
                {uploadConfig.allowedExtensions?.join(', ')}
              </div>
              <div>
                <strong>Upload Path:</strong><br />
                <code>{uploadConfig.uploadPath}</code>
              </div>
            </div>
          </div>
        )}

        {/* Recent Uploads */}
        {recentUploads.length > 0 && (
          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#374151' }}>Recent Uploads</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              {recentUploads.map((file, index) => (
                <div key={index} className="card" style={{ padding: '1rem' }}>
                  {file.extension && ['.jpg', '.jpeg', '.png', '.gif', '.webp'].includes(file.extension.toLowerCase()) ? (
                    <img 
                      src={ApiService.getFileUrl(file.filename)} 
                      alt={file.originalName}
                      style={{ 
                        width: '100%', 
                        height: '120px', 
                        objectFit: 'cover', 
                        borderRadius: '0.375rem',
                        marginBottom: '0.75rem'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div style={{ 
                      width: '100%', 
                      height: '120px', 
                      background: '#f3f4f6', 
                      borderRadius: '0.375rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '0.75rem'
                    }}>
                      <Upload size={32} color="#9ca3af" />
                    </div>
                  )}
                  <div className="media-name">{file.originalName}</div>
                  <div className="media-details">
                    <span>{file.sizeFormatted}</span>
                    <span>{new Date(file.uploadedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadPage;