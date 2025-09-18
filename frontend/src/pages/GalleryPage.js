import React, { useState, useEffect } from 'react';
import { Image, Play, Download, Calendar } from 'lucide-react';

const GalleryPage = () => {
  const [mediaFiles, setMediaFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    // In a real implementation, you would fetch the media files from the API
    // For now, we'll simulate this with some example data
    const loadMediaFiles = () => {
      // This would typically be an API call to get all uploaded files
      // For demo purposes, we'll use localStorage to simulate persistence
      const storedFiles = localStorage.getItem('saggersrule_uploads');
      if (storedFiles) {
        try {
          setMediaFiles(JSON.parse(storedFiles));
        } catch (error) {
          console.error('Error parsing stored files:', error);
        }
      }
      setLoading(false);
    };

    loadMediaFiles();
  }, []);

  const isImage = (filename) => {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    return imageExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const isVideo = (filename) => {
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.webm'];
    return videoExtensions.some(ext => filename.toLowerCase().endsWith(ext));
  };

  const getFileUrl = (filename) => {
    return `http://localhost:3036/media/${filename}`;
  };

  const openModal = (file) => {
    setSelectedFile(file);
  };

  const closeModal = () => {
    setSelectedFile(null);
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Loading gallery...</p>
          </div>
        </div>
      </div>
    );
  }

  if (mediaFiles.length === 0) {
    return (
      <div className="container">
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <Image size={24} color="#3b82f6" />
            <h2 style={{ margin: 0, color: '#1e293b' }}>Media Gallery</h2>
          </div>
          
          <div style={{ textAlign: 'center', padding: '3rem 2rem' }}>
            <Image size={64} color="#d1d5db" style={{ margin: '0 auto 1rem' }} />
            <h3 style={{ color: '#6b7280', marginBottom: '0.5rem' }}>No media files yet</h3>
            <p style={{ color: '#9ca3af' }}>Upload some files to see them in your gallery</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Image size={24} color="#3b82f6" />
            <h2 style={{ margin: 0, color: '#1e293b' }}>Media Gallery</h2>
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>
            {mediaFiles.length} file{mediaFiles.length !== 1 ? 's' : ''}
          </div>
        </div>

        <div className="gallery-grid">
          {mediaFiles.map((file, index) => (
            <div key={index} className="media-item" onClick={() => openModal(file)}>
              {isImage(file.filename || file.originalName) ? (
                <img 
                  src={getFileUrl(file.filename)} 
                  alt={file.originalName}
                  className="media-preview"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xMDAgNzVMMTI1IDEwMEgxMTJWMTI1SDg4VjEwMEg3NUwxMDAgNzVaIiBmaWxsPSIjOUNBM0FGIi8+Cjwvc3ZnPgo=';
                  }}
                />
              ) : isVideo(file.filename || file.originalName) ? (
                <div className="media-preview" style={{ 
                  background: '#1f2937', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Play size={48} color="white" />
                </div>
              ) : (
                <div className="media-preview" style={{ 
                  background: '#f3f4f6', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center' 
                }}>
                  <Image size={48} color="#9ca3af" />
                </div>
              )}
              
              <div className="media-info">
                <div className="media-name" title={file.originalName}>
                  {file.originalName.length > 25 
                    ? file.originalName.substring(0, 25) + '...' 
                    : file.originalName}
                </div>
                <div className="media-details">
                  <span>{file.sizeFormatted || '-- KB'}</span>
                  <span>
                    {file.uploadedAt 
                      ? new Date(file.uploadedAt).toLocaleDateString()
                      : 'Unknown date'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for viewing files */}
      {selectedFile && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            padding: '1rem'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              background: 'white',
              borderRadius: '0.75rem',
              padding: '1.5rem',
              maxWidth: '90vw',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              gap: '1rem'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>{selectedFile.originalName}</h3>
              <button onClick={closeModal} className="btn btn-secondary">
                ×
              </button>
            </div>
            
            {isImage(selectedFile.filename) ? (
              <img 
                src={getFileUrl(selectedFile.filename)}
                alt={selectedFile.originalName}
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '60vh', 
                  objectFit: 'contain',
                  borderRadius: '0.5rem'
                }}
              />
            ) : isVideo(selectedFile.filename) ? (
              <video 
                controls
                style={{ 
                  maxWidth: '100%', 
                  maxHeight: '60vh',
                  borderRadius: '0.5rem'
                }}
              >
                <source src={getFileUrl(selectedFile.filename)} />
                Your browser does not support the video tag.
              </video>
            ) : (
              <div style={{ 
                padding: '2rem', 
                textAlign: 'center', 
                background: '#f8fafc',
                borderRadius: '0.5rem'
              }}>
                <Image size={48} color="#9ca3af" style={{ margin: '0 auto 1rem' }} />
                <p>Preview not available for this file type</p>
              </div>
            )}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem', color: '#6b7280' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Calendar size={14} />
                <span>
                  {selectedFile.uploadedAt 
                    ? new Date(selectedFile.uploadedAt).toLocaleString()
                    : 'Unknown date'}
                </span>
              </div>
              <a 
                href={getFileUrl(selectedFile.filename)}
                download={selectedFile.originalName}
                className="btn btn-primary"
                style={{ fontSize: '0.875rem', padding: '0.5rem 1rem' }}
              >
                <Download size={14} />
                Download
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GalleryPage;