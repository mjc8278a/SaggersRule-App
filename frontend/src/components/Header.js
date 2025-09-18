import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Server, Upload, Image, Settings, RefreshCw } from 'lucide-react';

const Header = ({ apiStatus, onRefreshStatus }) => {
  const location = useLocation();

  const getStatusIndicator = () => {
    if (!apiStatus) return { className: 'status-unknown', text: 'Unknown' };
    
    if (apiStatus.status === 'healthy') {
      return { className: 'status-healthy', text: 'Online' };
    } else {
      return { className: 'status-error', text: 'Offline' };
    }
  };

  const status = getStatusIndicator();

  return (
    <header className="header">
      <div className="container">
        <div className="header-content">
          <div className="header-title">
            <Server size={32} />
            <div>
              <h1>SaggersRule</h1>
              <p className="header-subtitle">Media Management System V2.0</p>
            </div>
          </div>

          <nav>
            <ul className="nav-links">
              <li>
                <Link 
                  to="/" 
                  className={location.pathname === '/' ? 'active' : ''}
                >
                  <Upload size={16} />
                  Upload
                </Link>
              </li>
              <li>
                <Link 
                  to="/gallery" 
                  className={location.pathname === '/gallery' ? 'active' : ''}
                >
                  <Image size={16} />
                  Gallery
                </Link>
              </li>
              <li>
                <Link 
                  to="/settings" 
                  className={location.pathname === '/settings' ? 'active' : ''}
                >
                  <Settings size={16} />
                  Settings
                </Link>
              </li>
            </ul>
          </nav>

          <div className="header-status">
            <div className={`status-indicator ${status.className}`}></div>
            <span>API {status.text}</span>
            <button 
              onClick={onRefreshStatus} 
              className="btn btn-secondary"
              style={{ 
                padding: '0.5rem', 
                marginLeft: '0.5rem',
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                color: 'white'
              }}
              title="Refresh API Status"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;