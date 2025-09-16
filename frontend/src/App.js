import React, { useState, useEffect, createContext, useContext } from "react";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "./App.css";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth Context
const AuthContext = createContext();

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const checkAuth = async () => {
    try {
      const response = await axios.get(`${API}/auth/me`, { 
        withCredentials: true 
      });
      setUser(response.data);
      setIsAuthenticated(true);
    } catch (error) {
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const login = (redirectUrl = window.location.origin + "/dashboard") => {
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`, {}, { withCredentials: true });
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      setUser,
      loading,
      isAuthenticated,
      login,
      logout,
      checkAuth
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Session Handler Component
const SessionHandler = () => {
  const { checkAuth } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const handleSessionId = async () => {
      const fragment = location.hash;
      const sessionIdMatch = fragment.match(/session_id=([^&]+)/);
      
      if (sessionIdMatch && !processing) {
        setProcessing(true);
        const sessionId = sessionIdMatch[1];
        
        try {
          const response = await axios.post(`${API}/auth/session-data`, {}, {
            headers: { 'X-Session-ID': sessionId },
            withCredentials: true
          });
          
          if (response.data.requires_onboarding) {
            navigate('/onboarding');
          } else {
            navigate('/dashboard');
          }
          
          // Clean URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          await checkAuth();
        } catch (error) {
          console.error('Session processing error:', error);
          navigate('/');
        } finally {
          setProcessing(false);
        }
      }
    };

    handleSessionId();
  }, [location.hash, navigate, checkAuth, processing]);

  if (processing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white text-lg">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return null;
};

// Landing Page
const LandingPage = () => {
  const { login, isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            SaggersRule
          </h1>
          <p className="text-xl md:text-2xl text-blue-200 max-w-3xl mx-auto">
            The ultimate community for sagging culture. Connect, share, and celebrate your style.
          </p>
        </header>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mb-12 max-w-6xl mx-auto">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">📸</div>
            <h3 className="text-xl font-semibold text-white mb-2">Share Your Style</h3>
            <p className="text-blue-200">Post photos and videos of your sagging outfits</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-white mb-2">Connect</h3>
            <p className="text-blue-200">Follow others, like posts, and build your community</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">🎉</div>
            <h3 className="text-xl font-semibold text-white mb-2">Events</h3>
            <p className="text-blue-200">Join local meetups and style events</p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <button 
            onClick={() => login()}
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white px-8 py-4 rounded-full text-xl font-semibold hover:from-pink-600 hover:to-purple-700 transform hover:scale-105 transition-all duration-200 shadow-lg"
          >
            Join SaggersRule
          </button>
          <p className="text-blue-200 mt-4 text-sm">18+ only community</p>
        </div>
      </div>
    </div>
  );
};

// Onboarding Page
const OnboardingPage = () => {
  const { user, checkAuth } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    age: '',
    bio: '',
    location: '',
    postal_code: '',
    interests: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    if (parseInt(formData.age) < 18) {
      setError('You must be 18 or older to join SaggersRule');
      setLoading(false);
      return;
    }

    try {
      await axios.post(`${API}/users/complete-onboarding`, {
        ...formData,
        age: parseInt(formData.age)
      }, { withCredentials: true });
      
      await checkAuth();
      navigate('/dashboard');
    } catch (error) {
      setError(error.response?.data?.detail || 'Failed to complete onboarding');
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = (interest) => {
    setFormData(prev => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter(i => i !== interest)
        : [...prev.interests, interest]
    }));
  };

  const interests = [
    'Street Fashion', 'Hip Hop Culture', 'Urban Style', 'Photography',
    'Music', 'Dance', 'Art', 'Fashion Design', 'Social Events', 'Dating'
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-2">Welcome to SaggersRule!</h1>
          <p className="text-blue-200 mb-8">Let's set up your profile</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-red-500/20 border border-red-400 text-red-300 px-4 py-3 rounded">
                {error}
              </div>
            )}

            <div>
              <label className="block text-white text-sm font-medium mb-2">
                Age (Required - Must be 18+)
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300"
                placeholder="Enter your age"
                required
                min="18"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300"
                placeholder="Tell us about yourself..."
                rows="3"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Location</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300"
                placeholder="City, Country"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-2">Postal Code</label>
              <input
                type="text"
                value={formData.postal_code}
                onChange={(e) => setFormData({...formData, postal_code: e.target.value})}
                className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-300"
                placeholder="12345 or ABC 123"
              />
            </div>

            <div>
              <label className="block text-white text-sm font-medium mb-4">Interests</label>
              <div className="grid grid-cols-2 gap-2">
                {interests.map(interest => (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => handleInterestToggle(interest)}
                    className={`px-3 py-2 text-sm rounded-lg border transition-all ${
                      formData.interests.includes(interest)
                        ? 'bg-purple-600 border-purple-400 text-white'
                        : 'bg-white/10 border-white/20 text-blue-200 hover:bg-white/20'
                    }`}
                  >
                    {interest}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all disabled:opacity-50"
            >
              {loading ? 'Setting up...' : 'Complete Setup'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

// Dashboard Page
const Dashboard = () => {
  const { user, logout } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreatePost, setShowCreatePost] = useState(false);

  useEffect(() => {
    if (user && !user.is_18_plus) {
      window.location.href = '/onboarding';
      return;
    }
    fetchPosts();
  }, [user]);

  const fetchPosts = async () => {
    try {
      const response = await axios.get(`${API}/posts`, { withCredentials: true });
      setPosts(response.data);
    } catch (error) {
      console.error('Error fetching posts:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <h1 className="text-2xl font-bold text-purple-600">SaggersRule</h1>
            <div className="flex items-center space-x-4">
              <span className="text-gray-600">Welcome, {user.name}</span>
              <button
                onClick={logout}
                className="text-red-600 hover:text-red-800"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Create Post Section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center space-x-4">
            <img
              src={user.picture || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=8b5cf6&color=fff`}
              alt={user.name}
              className="w-12 h-12 rounded-full"
            />
            <button
              onClick={() => setShowCreatePost(true)}
              className="flex-1 text-left px-4 py-3 bg-gray-100 rounded-full text-gray-500 hover:bg-gray-200 transition-colors"
            >
              Share your sagging style...
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        <div className="space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto"></div>
            </div>
          ) : posts.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📸</div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">No posts yet</h3>
              <p className="text-gray-600">Be the first to share your sagging style!</p>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm">
                <div className="p-6">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-white font-semibold">
                      {post.user_id.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">User</p>
                      <p className="text-sm text-gray-500">
                        {new Date(post.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-gray-800 mb-4">{post.content}</p>
                  
                  {/* Media Display */}
                  {post.media_urls && post.media_urls.length > 0 && (
                    <div className="mb-4">
                      <div className="grid grid-cols-1 gap-2">
                        {post.media_urls.map((url, index) => (
                          <div key={index} className="rounded-lg overflow-hidden">
                            {url.includes('/images/') ? (
                              <img 
                                src={url} 
                                alt="Sagging style" 
                                className="w-full h-auto max-h-96 object-cover"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              />
                            ) : (
                              <video 
                                controls 
                                className="w-full h-auto max-h-96"
                                onError={(e) => {
                                  e.target.style.display = 'none';
                                }}
                              >
                                <source src={url} type="video/mp4" />
                                Your browser does not support video playback.
                              </video>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {post.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {post.hashtags.map(tag => (
                        <span key={tag} className="text-purple-600 text-sm">#{tag}</span>
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-6 text-gray-500">
                    <button className="flex items-center space-x-2 hover:text-red-500">
                      <span>❤️</span>
                      <span>{post.likes_count}</span>
                    </button>
                    <button className="flex items-center space-x-2 hover:text-blue-500">
                      <span>💬</span>
                      <span>{post.comments_count}</span>
                    </button>
                    <button className="flex items-center space-x-2 hover:text-green-500">
                      <span>🔄</span>
                      <span>{post.shares_count}</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Post Modal */}
      {showCreatePost && (
        <CreatePostModal 
          onClose={() => setShowCreatePost(false)} 
          onPostCreated={fetchPosts}
        />
      )}
    </div>
  );
};

// Create Post Modal
const CreatePostModal = ({ onClose, onPostCreated }) => {
  const [content, setContent] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedFiles(files);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);
    setUploadProgress(0);

    try {
      let mediaUrls = [];

      // Upload files if any
      if (selectedFiles.length > 0) {
        const formData = new FormData();
        selectedFiles.forEach(file => {
          formData.append('files', file);
        });

        setUploadProgress(30);
        const uploadResponse = await axios.post(`${API}/upload`, formData, {
          withCredentials: true,
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(30 + (progress * 0.5)); // 30-80% for upload
          }
        });

        if (uploadResponse.data.success) {
          mediaUrls = uploadResponse.data.files.map(file => 
            `${uploadResponse.data.nas_server_url}/media/${file.mimetype.startsWith('image') ? 'images' : 'videos'}/${file.filename.split('.')[0]}.${file.mimetype.startsWith('image') ? 'jpg' : 'mp4'}`
          );
        }
      }

      setUploadProgress(80);

      // Create post
      await axios.post(`${API}/posts`, {
        content,
        hashtags: hashtags.split(',').map(tag => tag.trim()).filter(tag => tag),
        media_urls: mediaUrls
      }, { withCredentials: true });
      
      setUploadProgress(100);
      onPostCreated();
      onClose();
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-semibold mb-4">Share Your Sagging Style</h2>
        
        <form onSubmit={handleSubmit}>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Tell us about your sagging style..."
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
            rows="4"
            required
          />
          
          <input
            type="text"
            value={hashtags}
            onChange={(e) => setHashtags(e.target.value)}
            placeholder="Hashtags (comma separated)"
            className="w-full p-3 border border-gray-300 rounded-lg mb-4"
          />

          {/* File Upload */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Add Photos/Videos
            </label>
            <input
              type="file"
              multiple
              accept="image/*,video/*"
              onChange={handleFileSelect}
              className="w-full p-2 border border-gray-300 rounded-lg"
            />
            
            {/* File Preview */}
            {selectedFiles.length > 0 && (
              <div className="mt-3 space-y-2">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">
                        {file.type.startsWith('image/') ? '🖼️' : '🎥'}
                      </span>
                      <span className="text-sm text-gray-600">
                        {file.name} ({(file.size / 1024 / 1024).toFixed(1)}MB)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
            </div>
          )}
          
          <div className="flex space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Posting...
                </>
              ) : 'Post'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// Admin Dashboard
const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [pendingPosts, setPendingPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.is_admin) {
      fetchAdminData();
    }
  }, [user]);

  const fetchAdminData = async () => {
    try {
      const [statsRes, postsRes] = await Promise.all([
        axios.get(`${API}/admin/stats`, { withCredentials: true }),
        axios.get(`${API}/admin/posts/pending`, { withCredentials: true })
      ]);
      
      setStats(statsRes.data);
      setPendingPosts(postsRes.data);
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const approvePost = async (postId) => {
    try {
      await axios.post(`${API}/admin/posts/${postId}/approve`, {}, { withCredentials: true });
      setPendingPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error approving post:', error);
    }
  };

  const deletePost = async (postId) => {
    try {
      await axios.delete(`${API}/admin/posts/${postId}`, { withCredentials: true });
      setPendingPosts(prev => prev.filter(post => post.id !== postId));
    } catch (error) {
      console.error('Error deleting post:', error);
    }
  };

  if (!user?.is_admin) {
    return <div>Access denied</div>;
  }

  if (loading) {
    return <div>Loading admin dashboard...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Admin Dashboard</h1>
      
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-purple-600">{stats.total_users}</div>
            <div className="text-sm text-gray-600">Total Users</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-blue-600">{stats.total_posts}</div>
            <div className="text-sm text-gray-600">Total Posts</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-orange-600">{stats.pending_posts}</div>
            <div className="text-sm text-gray-600">Pending Posts</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-green-600">{stats.verified_users}</div>
            <div className="text-sm text-gray-600">Verified Users</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-indigo-600">{stats.recent_users}</div>
            <div className="text-sm text-gray-600">New Users (7d)</div>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <div className="text-2xl font-bold text-pink-600">{stats.recent_posts}</div>
            <div className="text-sm text-gray-600">New Posts (7d)</div>
          </div>
        </div>
      )}

      {/* Pending Posts */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold mb-4">Pending Posts ({pendingPosts.length})</h2>
        
        {pendingPosts.length === 0 ? (
          <p className="text-gray-600">No posts pending approval</p>
        ) : (
          <div className="space-y-4">
            {pendingPosts.map(post => (
              <div key={post.id} className="border border-gray-200 rounded-lg p-4">
                <p className="mb-2">{post.content}</p>
                <p className="text-sm text-gray-500 mb-3">
                  Posted: {new Date(post.created_at).toLocaleString()}
                </p>
                <div className="flex space-x-2">
                  <button
                    onClick={() => approvePost(post.id)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children, requireAdmin = false }) => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (requireAdmin && !user?.is_admin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Main App Component
function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <SessionHandler />
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/onboarding" element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            } />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/admin" element={
              <ProtectedRoute requireAdmin={true}>
                <AdminDashboard />
              </ProtectedRoute>
            } />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;