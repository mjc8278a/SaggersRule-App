import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import UploadPage from './pages/UploadPage';
import GalleryPage from './pages/GalleryPage';
import SettingsPage from './pages/SettingsPage';
import { ApiService } from './services/api';
import './App.css';

function App() {
  const [apiStatus, setApiStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkApiStatus();
  }, []);

  const checkApiStatus = async () => {
    try {
      const status = await ApiService.getHealth();
      setApiStatus(status);
    } catch (error) {
      console.error('API connection failed:', error);
      setApiStatus({ status: 'error', message: 'API connection failed' });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner"></div>
        <p>Connecting to SaggersRule Media API...</p>
      </div>
    );
  }

  return (
    <Router>
      <div className="app">
        <Header apiStatus={apiStatus} onRefreshStatus={checkApiStatus} />
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<UploadPage />} />
            <Route path="/gallery" element={<GalleryPage />} />
            <Route path="/settings" element={<SettingsPage apiStatus={apiStatus} />} />
          </Routes>
        </main>

        <footer className="footer">
          <div className="container">
            <p>&copy; 2024 SaggersRule Media Manager V2.0 - Built for NAS deployment</p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;