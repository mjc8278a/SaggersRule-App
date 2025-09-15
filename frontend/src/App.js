import { useEffect, useState } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const StatusDashboard = () => {
  const [statusChecks, setStatusChecks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newClientName, setNewClientName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchStatusChecks = async () => {
    try {
      const response = await axios.get(`${API}/status`);
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
      });
      console.log("Status check created:", response.data);
      setNewClientName("");
      await fetchStatusChecks(); // Refresh the list
    } catch (error) {
      console.error("Error creating status check:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    fetchStatusChecks();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStatusChecks, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
            Network Checkpoint Monitor
          </h1>
          <p className="text-gray-400">Real-time status monitoring on Port 3200</p>
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
            <h2 className="text-xl font-semibold text-blue-400">Status Checks History</h2>
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
              <p className="mt-4 text-gray-400">Loading status checks...</p>
            </div>
          ) : statusChecks.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg">No status checks yet</p>
              <p className="text-gray-500">Upload your first status check above!</p>
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
          <p>Running on Port 3200 | {statusChecks.length} total status checks</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<StatusDashboard />}>
            <Route index element={<StatusDashboard />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;