import { useEffect, useState, createContext, useContext } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Create Auth Context
const AuthContext = createContext();

// Auth Provider Component
const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // Check URL for session_id first (Google OAuth callback)
      const urlFragment = window.location.hash;
      if (urlFragment.includes('session_id=')) {
        const sessionId = urlFragment.split('session_id=')[1].split('&')[0];
        await handleGoogleCallback(sessionId);
        // Clean URL fragment
        window.history.replaceState(null, null, window.location.pathname);
        return;
      }

      // Check existing session
      if (token) {
        try {
          const response = await axios.get(`${API}/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setUser(response.data);
        } catch (error) {
          console.error("Token validation failed:", error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setLoading(false);
    };

    // Add axios interceptor for automatic token inclusion
    const interceptor = axios.interceptors.request.use((config) => {
      if (token && config.url.includes('/api/')) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    initAuth();

    // Cleanup interceptor on unmount
    return () => {
      axios.interceptors.request.eject(interceptor);
    };
  }, [token]);

  const handleGoogleCallback = async (sessionId) => {
    try {
      setLoading(true);
      const response = await axios.post(`${API}/auth/google/callback`, {}, {
        headers: { 'X-Session-ID': sessionId }
      });
      setUser(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Google OAuth callback failed:", error);
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    try {
      const response = await axios.get(`${API}/auth/google`);
      window.location.href = response.data.auth_url;
    } catch (error) {
      console.error("Google OAuth initiation failed:", error);
      return { success: false, error: "Google OAuth failed" };
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API}/auth/login`, {
        email,
        password
      });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      return { success: true };
    } catch (error) {
      console.error("Login failed:", error);
      return { 
        success: false, 
        error: error.response?.data?.detail || "Login failed" 
      };
    }
  };

  const register = async (username, email, password, dateOfBirth) => {
    try {
      const response = await axios.post(`${API}/auth/register`, {
        username,
        email,
        password,
        date_of_birth: dateOfBirth
      });
      const { access_token, user: userData } = response.data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('token', access_token);
      return { success: true };
    } catch (error) {
      console.error("Registration failed:", error);
      return { 
        success: false, 
        error: error.response?.data?.detail || "Registration failed" 
      };
    }
  };

  const forgotPassword = async (email) => {
    try {
      await axios.post(`${API}/auth/forgot-password`, { email });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || "Failed to send reset email" 
      };
    }
  };

  const resetPassword = async (token, newPassword) => {
    try {
      await axios.post(`${API}/auth/reset-password`, {
        token,
        new_password: newPassword
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error.response?.data?.detail || "Password reset failed" 
      };
    }
  };

  const logout = async () => {
    try {
      await axios.post(`${API}/auth/logout`);
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      setToken(null);
      setUser(null);
      localStorage.removeItem('token');
    }
  };

  const value = {
    user,
    token,
    login,
    register,
    loginWithGoogle,
    forgotPassword,
    resetPassword,
    logout,
    loading
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

// Enhanced Login/Registration Component
const AuthForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [authMode, setAuthMode] = useState("login"); // login, register, forgot
  const { login, register, loginWithGoogle, forgotPassword } = useAuth();

  const calculateAge = (birthDate) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    setSuccess("");

    if (authMode === "register") {
      // Age verification
      if (dateOfBirth) {
        const age = calculateAge(dateOfBirth);
        if (age < 18) {
          setError("You must be 18 or older to register");
          setIsLoading(false);
          return;
        }
      }

      const result = await register(username, email, password, dateOfBirth);
      if (!result.success) {
        setError(result.error);
      } else {
        // Registration successful - user will be redirected by ProtectedRoute
        setSuccess("Registration successful! Redirecting...");
      }
    } else if (authMode === "login") {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error);
      } else {
        // Login successful - user will be redirected by ProtectedRoute
        setSuccess("Login successful! Redirecting...");
      }
    } else if (authMode === "forgot") {
      const result = await forgotPassword(email);
      if (result.success) {
        setSuccess("Password reset email sent! Check your inbox.");
      } else {
        setError(result.error);
      }
    }

    setIsLoading(false);
  };

  const handleGoogleLogin = () => {
    loginWithGoogle();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-6">
      <div className="bg-gray-800 rounded-lg p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {authMode === "login" && "Welcome Back"}
            {authMode === "register" && "Create Account"}
            {authMode === "forgot" && "Reset Password"}
          </h1>
          <p className="text-gray-400">Network Checkpoint Monitor</p>
        </div>

        {/* Google OAuth Button */}
        {authMode !== "forgot" && (
          <div className="mb-6">
            <button
              onClick={handleGoogleLogin}
              className="w-full bg-white hover:bg-gray-100 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <img 
                src="https://developers.google.com/identity/images/g-logo.png" 
                alt="Google" 
                className="w-5 h-5"
              />
              Continue with Google
            </button>
            <div className="flex items-center my-4">
              <hr className="flex-1 border-gray-600" />
              <span className="px-3 text-gray-400 text-sm">or</span>
              <hr className="flex-1 border-gray-600" />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {authMode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your username"
                required
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your email"
              required
            />
          </div>

          {authMode !== "forgot" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter your password"
                required
              />
            </div>
          )}

          {authMode === "register" && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Date of Birth <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-400 mt-1">You must be 18 or older to register</p>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
              <p className="text-green-400 text-sm">{success}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            {isLoading ? "Please wait..." : (
              authMode === "login" ? "Sign In" :
              authMode === "register" ? "Create Account" :
              "Send Reset Email"
            )}
          </button>
        </form>

        <div className="mt-6 text-center space-y-2">
          {authMode === "login" && (
            <>
              <button
                onClick={() => setAuthMode("register")}
                className="text-blue-400 hover:text-blue-300 text-sm block w-full"
              >
                Don't have an account? Create one
              </button>
              <button
                onClick={() => setAuthMode("forgot")}
                className="text-gray-400 hover:text-gray-300 text-sm"
              >
                Forgot your password?
              </button>
            </>
          )}
          
          {authMode === "register" && (
            <button
              onClick={() => setAuthMode("login")}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Already have an account? Sign In
            </button>
          )}
          
          {authMode === "forgot" && (
            <button
              onClick={() => setAuthMode("login")}
              className="text-blue-400 hover:text-blue-300 text-sm"
            >
              Back to Sign In
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// Enhanced Dashboard Component
const StatusDashboard = () => {
  const [statusChecks, setStatusChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, logout, token } = useAuth();

  const fetchStatusChecks = async () => {
    try {
      const response = await axios.get(`${API}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatusChecks(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching status checks:", error);
      setLoading(false);
    }
  };

  const createStatusCheck = async (e) => {
    e.preventDefault();
    if (!newClientName.trim()) return;
    
    setIsSubmitting(true);
    try {
      const response = await axios.post(`${API}/status`, {
        client_name: newClientName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log("Status check created:", response.data);
      setNewClientName("");
      await fetchStatusChecks();
    } catch (error) {
      console.error("Error creating status check:", error);
      if (error.response?.status === 401) {
        logout();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchStatusChecks();
      const interval = setInterval(fetchStatusChecks, 30000);
      return () => clearInterval(interval);
    }
  }, [token]);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Enhanced Header with User Info */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Network Checkpoint Monitor
            </h1>
            <div className="flex items-center gap-4">
              <p className="text-gray-400">Welcome back, {user?.username}!</p>
              {user?.oauth_provider && (
                <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded text-xs">
                  ✓ {user.oauth_provider.toUpperCase()}
                </span>
              )}
              {user?.email_verified && (
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs">
                  ✓ Email Verified
                </span>
              )}
              {user?.age_verified && (
                <span className="bg-purple-500/20 text-purple-400 px-2 py-1 rounded text-xs">
                  ✓ Age Verified
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-400">Logged in as</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Status Upload Form */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-700">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Create Status Check</h2>
          <form onSubmit={createStatusCheck} className="flex gap-4">
            <input
              type="text"
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              placeholder="Enter client/service name..."
              className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={isSubmitting}
            />
            <button
              type="submit"
              disabled={isSubmitting || !newClientName.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isSubmitting ? "Uploading..." : "Upload Status"}
            </button>
          </form>
        </div>

        {/* Status Checks Display */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-blue-400">Your Status Checks</h2>
            <button
              onClick={fetchStatusChecks}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-medium transition-colors"
            >
              Refresh
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-4 text-gray-400">Loading your status checks...</p>
            </div>
          ) : statusChecks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">No status checks yet</p>
              <p className="text-gray-500">Create your first status check above!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {statusChecks.map((check) => (
                <div
                  key={check.id}
                  className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-blue-500 transition-colors"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg text-white">
                        {check.client_name}
                      </h3>
                      <p className="text-gray-400 text-sm">ID: {check.id}</p>
                    </div>
                    <div className="text-right">
                      <div className="bg-green-500 text-green-100 px-3 py-1 rounded-full text-sm font-medium">
                        ✓ Active
                      </div>
                      <p className="text-gray-400 text-sm mt-1">
                        {formatTimestamp(check.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-gray-500">
          <p>Your personal monitoring dashboard | {statusChecks.length} status checks</p>
          <p className="text-xs mt-2">Enhanced with Google OAuth, Age & Email Verification</p>
        </div>
      </div>
    </div>
  );
};

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-white text-lg">Loading...</p>
        </div>
      </div>
    );
  }

  return user ? children : <Navigate to="/auth" />;
};

// Main App Component
function App() {
  return (
    <AuthProvider>
      <div className="App">
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<AuthForm />} />
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <StatusDashboard />
              </ProtectedRoute>
            } />
            <Route 
              path="/" 
              element={<Navigate to="/dashboard" />}
            />
          </Routes>
        </BrowserRouter>
      </div>
    </AuthProvider>
  );
}

export default App;