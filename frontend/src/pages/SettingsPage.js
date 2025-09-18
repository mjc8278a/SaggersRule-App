import React, { useState, useEffect } from 'react';
import { Settings, Server, Database, HardDrive, Network, Info } from 'lucide-react';
import { ApiService } from '../services/api';

const SettingsPage = ({ apiStatus }) => {
  const [detailedHealth, setDetailedHealth] = useState(null);
  const [uploadConfig, setUploadConfig] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const [health, config] = await Promise.all([
        ApiService.getDetailedHealth(),
        ApiService.getUploadInfo()
      ]);
      
      setDetailedHealth(health);
      setUploadConfig(config);
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card">
          <div style={{ textAlign: 'center', padding: '2rem' }}>
            <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
            <p>Loading system information...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <Settings size={24} color="#3b82f6" />
          <h2 style={{ margin: 0, color: '#1e293b' }}>System Settings & Information</h2>
        </div>

        {/* API Status Section */}
        <div className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={18} />
            API Status
          </h3>
          
          <div className="settings-item">
            <div>
              <div className="settings-label">Service Status</div>
              <div style={{ fontSize: '0.875rem', color: '#6b7280', marginTop: '0.25rem' }}>
                Current API connection status
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div 
                className={`status-indicator ${
                  apiStatus?.status === 'healthy' ? 'status-healthy' : 'status-error'
                }`}
              ></div>
              <span className="settings-value">
                {apiStatus?.status === 'healthy' ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {detailedHealth && (
            <>
              <div className="settings-item">
                <div className="settings-label">Service Version</div>
                <div className="settings-value">{detailedHealth.version}</div>
              </div>

              <div className="settings-item">
                <div className="settings-label">Uptime</div>
                <div className="settings-value">
                  {Math.floor(detailedHealth.uptime / 3600)}h {Math.floor((detailedHealth.uptime % 3600) / 60)}m
                </div>
              </div>

              <div className="settings-item">
                <div className="settings-label">Environment</div>
                <div className="settings-value">{detailedHealth.environment}</div>
              </div>
            </>
          )}
        </div>

        {/* System Information */}
        {detailedHealth?.system && (
          <div className="settings-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Info size={18} />
              System Information
            </h3>
            
            <div className="settings-item">
              <div className="settings-label">Node.js Version</div>
              <div className="settings-value">{detailedHealth.system.nodeVersion}</div>
            </div>

            <div className="settings-item">
              <div className="settings-label">Platform</div>
              <div className="settings-value">
                {detailedHealth.system.platform} ({detailedHealth.system.architecture})
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-label">Process ID</div>
              <div className="settings-value">{detailedHealth.system.pid}</div>
            </div>
          </div>
        )}

        {/* Memory Usage */}
        {detailedHealth?.memory && (
          <div className="settings-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HardDrive size={18} />
              Memory Usage
            </h3>
            
            <div className="settings-item">
              <div className="settings-label">Heap Used</div>
              <div className="settings-value">
                {Math.round(detailedHealth.memory.heapUsed / 1024 / 1024)}MB
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-label">Heap Total</div>
              <div className="settings-value">
                {Math.round(detailedHealth.memory.heapTotal / 1024 / 1024)}MB
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-label">RSS Memory</div>
              <div className="settings-value">
                {Math.round(detailedHealth.memory.rss / 1024 / 1024)}MB
              </div>
            </div>
          </div>
        )}

        {/* Upload Configuration */}
        {uploadConfig && (
          <div className="settings-section">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Database size={18} />
              Upload Configuration
            </h3>
            
            <div className="settings-item">
              <div className="settings-label">Maximum File Size</div>
              <div className="settings-value">
                {ApiService.formatFileSize(uploadConfig.configuration?.maxFileSize || 104857600)}
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-label">Allowed Extensions</div>
              <div className="settings-value">
                {uploadConfig.configuration?.allowedExtensions?.join(', ') || 'Not configured'}
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-label">Upload Path</div>
              <div className="settings-value">
                {uploadConfig.configuration?.uploadPath || '/app/media'}
              </div>
            </div>

            <div className="settings-item">
              <div className="settings-label">Processed Path</div>
              <div className="settings-value">
                {uploadConfig.configuration?.processedPath || '/app/processed'}
              </div>
            </div>
          </div>
        )}

        {/* Network Configuration */}
        <div className="settings-section">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Network size={18} />
            Network Configuration
          </h3>
          
          <div className="settings-item">
            <div className="settings-label">API Port</div>
            <div className="settings-value">3200</div>
          </div>

          <div className="settings-item">
            <div className="settings-label">Media Server Port</div>
            <div className="settings-value">3036</div>
          </div>

          <div className="settings-item">
            <div className="settings-label">Redis Port</div>
            <div className="settings-value">6379</div>
          </div>

          <div className="settings-item">
            <div className="settings-label">Frontend Port</div>
            <div className="settings-value">3000</div>
          </div>
        </div>

        {/* Actions */}
        <div className="settings-section">
          <h3>Actions</h3>
          
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button 
              onClick={loadSettings} 
              className="btn btn-primary"
            >
              Refresh Information
            </button>
            
            <a 
              href="http://localhost:3200/health" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              View Raw API Health
            </a>
            
            <a 
              href="http://localhost:3036/health" 
              target="_blank" 
              rel="noopener noreferrer"
              className="btn btn-secondary"
            >
              View Nginx Health
            </a>
          </div>
        </div>

        {/* Version Information */}
        <div style={{ 
          marginTop: '2rem', 
          padding: '1rem', 
          background: '#f8fafc', 
          borderRadius: '0.5rem',
          fontSize: '0.875rem',
          color: '#6b7280'
        }}>
          <strong>SaggersRule Media Manager V2.0</strong><br />
          Production-ready media upload and management system for NAS deployment.<br />
          Built with React frontend, Node.js API, Nginx server, and Redis cache.
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;