import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// NAS Vault Service Hook
const useNASVault = () => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  };

  const uploadToVault = async (file, endpoint, additionalData = {}) => {
    setLoading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    
    Object.keys(additionalData).forEach(key => {
      formData.append(key, additionalData[key]);
    });

    try {
      const response = await axios.post(`${API}/${endpoint}`, formData, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setProgress(percentCompleted);
        }
      });

      setLoading(false);
      setProgress(100);
      return response.data;

    } catch (error) {
      setLoading(false);
      setProgress(0);
      throw error;
    }
  };

  const listVaultFiles = async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.keys(filters).forEach(key => {
        if (filters[key]) params.append(key, filters[key]);
      });

      const response = await axios.get(
        `${API}/vault/files?${params.toString()}`,
        { headers: getAuthHeaders() }
      );

      return response.data.data;
    } catch (error) {
      throw error;
    }
  };

  const downloadFromVault = async (bucket, objectName) => {
    try {
      const response = await axios.get(
        `${API}/vault/download?bucket=${bucket}&object_name=${objectName}`,
        {
          headers: getAuthHeaders(),
          responseType: 'blob'
        }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', objectName.split('/').pop());
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      throw error;
    }
  };

  const deleteFromVault = async (bucket, objectName) => {
    try {
      const response = await axios.delete(
        `${API}/vault/files?bucket=${bucket}&object_name=${objectName}`,
        { headers: getAuthHeaders() }
      );

      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const getStorageSummary = async () => {
    try {
      const response = await axios.get(
        `${API}/vault/storage/summary`,
        { headers: getAuthHeaders() }
      );

      return response.data.data;
    } catch (error) {
      throw error;
    }
  };

  return {
    uploadToVault,
    listVaultFiles,
    downloadFromVault,
    deleteFromVault,
    getStorageSummary,
    loading,
    progress
  };
};

// Profile Picture Vault Component
const ProfilePictureVault = ({ onUploadComplete }) => {
  const [preview, setPreview] = useState(null);
  const [currentPicture, setCurrentPicture] = useState(null);
  const { uploadToVault, loading, progress } = useNASVault();

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    try {
      const result = await uploadToVault(file, 'vault/profile-picture');
      
      alert('Profile picture uploaded to NAS vault successfully!');
      setCurrentPicture(result.data.object_name);
      
      if (onUploadComplete) {
        onUploadComplete(result.data);
      }

    } catch (error) {
      alert('Failed to upload profile picture to vault');
      setPreview(null);
      console.error(error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-blue-400">
        📷 Profile Picture Vault
      </h3>
      
      <div className="space-y-4">
        {preview && (
          <div className="relative">
            <img 
              src={preview} 
              alt="Profile preview"
              className="w-32 h-32 rounded-full object-cover mx-auto border-4 border-blue-500"
            />
            {loading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                <div className="text-white text-sm">{progress}%</div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="profile-picture-input"
            disabled={loading}
          />
          <label
            htmlFor="profile-picture-input"
            className={`inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg cursor-pointer transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {loading ? 'Uploading to NAS...' : '📁 Upload to NAS Vault'}
          </label>
        </div>
        
        {loading && (
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
        
        <p className="text-gray-400 text-sm text-center">
          Stored securely on your Ugreen NAS • Max 10MB
        </p>
      </div>
    </div>
  );
};

// Document Vault Component  
const DocumentVault = ({ onUploadComplete }) => {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [category, setCategory] = useState('general');
  const { uploadToVault, loading } = useNASVault();

  const handleFileSelect = (event) => {
    const files = Array.from(event.target.files);
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Please select files to upload');
      return;
    }

    for (const file of selectedFiles) {
      try {
        const result = await uploadToVault(file, 'vault/documents', { category });
        
        if (onUploadComplete) {
          onUploadComplete(result.data);
        }

      } catch (error) {
        alert(`Failed to upload ${file.name} to vault`);
        console.error(error);
      }
    }

    setSelectedFiles([]);
    alert(`${selectedFiles.length} files uploaded to NAS vault successfully!`);
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <h3 className="text-xl font-semibold mb-4 text-blue-400">
        📄 Document Vault
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="general">General Documents</option>
            <option value="reports">Reports</option>
            <option value="contracts">Contracts</option>
            <option value="certificates">Certificates</option>
            <option value="backups">Backups</option>
          </select>
        </div>
        
        <div>
          <input
            type="file"
            multiple
            onChange={handleFileSelect}
            className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            disabled={loading}
          />
        </div>
        
        {selectedFiles.length > 0 && (
          <div className="space-y-2">
            <p className="text-gray-300">Selected files:</p>
            {selectedFiles.map((file, index) => (
              <div key={index} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                <span className="text-white text-sm">{file.name}</span>
                <span className="text-gray-400 text-xs">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            ))}
          </div>
        )}
        
        <button
          onClick={handleUpload}
          disabled={loading || selectedFiles.length === 0}
          className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-2 px-4 rounded-lg transition-colors"
        >
          {loading ? 'Uploading to NAS...' : `📁 Upload ${selectedFiles.length} file(s) to Vault`}
        </button>
        
        <p className="text-gray-400 text-sm text-center">
          Stored securely on your Ugreen NAS • Max 100MB per file
        </p>
      </div>
    </div>
  );
};

// Vault File Manager Component
const VaultFileManager = () => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [storageStats, setStorageStats] = useState(null);
  const [filters, setFilters] = useState({
    data_type: '',
    category: ''
  });
  
  const { listVaultFiles, downloadFromVault, deleteFromVault, getStorageSummary } = useNASVault();

  useEffect(() => {
    loadFiles();
    loadStorageStats();
  }, [filters]);

  const loadFiles = async () => {
    setLoading(true);
    try {
      const result = await listVaultFiles(filters);
      setFiles(result.files || []);
    } catch (error) {
      alert('Failed to load files from vault');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const loadStorageStats = async () => {
    try {
      const stats = await getStorageSummary();
      setStorageStats(stats);
    } catch (error) {
      console.error('Failed to load storage stats:', error);
    }
  };

  const handleDownload = async (file) => {
    try {
      await downloadFromVault(file.bucket, file.object_name);
    } catch (error) {
      alert('Download failed');
      console.error(error);
    }
  };

  const handleDelete = async (file) => {
    if (!window.confirm(`Are you sure you want to delete ${file.object_name.split('/').pop()}?`)) {
      return;
    }

    try {
      await deleteFromVault(file.bucket, file.object_name);
      alert('File deleted from vault successfully');
      await loadFiles();
      await loadStorageStats();
    } catch (error) {
      alert('Delete failed');
      console.error(error);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold text-blue-400">
          🗄️ NAS Vault Files
        </h3>
        
        {storageStats && (
          <div className="text-right">
            <div className="text-white font-medium">
              {storageStats.total_files} files • {storageStats.total_size_mb} MB
            </div>
            <div className="text-gray-400 text-sm">
              📍 {storageStats.nas_endpoint}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4 flex gap-4">
        <select
          value={filters.data_type}
          onChange={(e) => setFilters({...filters, data_type: e.target.value})}
          className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Types</option>
          <option value="profile_pictures">Profile Pictures</option>
          <option value="documents">Documents</option>
          <option value="status_attachments">Status Attachments</option>
          <option value="backups">Backups</option>
        </select>
        
        <button
          onClick={loadFiles}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded-lg transition-colors"
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading vault files...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {files.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">No files in vault yet</p>
              <p className="text-gray-500">Upload some files to get started!</p>
            </div>
          ) : (
            files.map((file, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h4 className="text-white font-medium">
                      {file.object_name.split('/').pop()}
                    </h4>
                    <div className="text-gray-400 text-sm mt-1">
                      <span>📊 {(file.size / 1024 / 1024).toFixed(2)} MB</span>
                      <span className="ml-4">📅 {new Date(file.last_modified).toLocaleDateString()}</span>
                      <span className="ml-4">🗂️ {file.bucket}</span>
                    </div>
                    <div className="text-gray-500 text-xs mt-1">
                      📍 {file.nas_location}
                    </div>
                  </div>
                  
                  <div className="flex gap-2 ml-4">
                    <button
                      onClick={() => handleDownload(file)}
                      className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded transition-colors"
                    >
                      ⬇️ Download
                    </button>
                    <button
                      onClick={() => handleDelete(file)}
                      className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white text-sm rounded transition-colors"
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// Main NAS Vault Manager Component
const NASVaultManager = () => {
  const [activeTab, setActiveTab] = useState('files');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadComplete = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
        <h2 className="text-2xl font-bold text-white mb-2">
          🏠 NAS Vault Manager
        </h2>
        <p className="text-gray-400">
          Secure file storage on your Ugreen DXP4800 Plus NAS
        </p>
      </div>

      {/* Navigation Tabs */}
      <div className="flex space-x-4">
        <button
          onClick={() => setActiveTab('files')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'files' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          🗄️ My Files
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'profile' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📷 Profile Picture
        </button>
        <button
          onClick={() => setActiveTab('documents')}
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            activeTab === 'documents' 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          📄 Documents
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'files' && (
          <VaultFileManager key={refreshTrigger} />
        )}
        
        {activeTab === 'profile' && (
          <ProfilePictureVault onUploadComplete={handleUploadComplete} />
        )}
        
        {activeTab === 'documents' && (
          <DocumentVault onUploadComplete={handleUploadComplete} />
        )}
      </div>
    </div>
  );
};

export default NASVaultManager;