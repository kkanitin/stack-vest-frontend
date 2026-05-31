import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './context/AuthContext';
import LoginPage from './pages/LoginPage';
import LandingPage from './pages/LandingPage';
import Visualization from './components/Visualization';
import DCASimulation from './components/DCASimulation';
import HeatmapPage from './pages/HeatmapPage';
import WatchlistPage from './pages/WatchlistPage';
import ProtectedRoute from './components/ProtectedRoute';
import NotFoundPage from './pages/NotFoundPage';
import './App.css';

function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Defensive check for missing client ID to avoid blank page/crashes
  if (!googleClientId || googleClientId === 'your-google-client-id.apps.googleusercontent.com') {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h1 style={{ color: 'var(--error)' }}>Missing Google Client ID</h1>
        <p>Please configure <code>VITE_GOOGLE_CLIENT_ID</code> in <code>.env.local</code> and restart the dev server.</p>
        <p>Current value: <code>{googleClientId || 'undefined'}</code></p>
      </div>
    );
  }

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <LandingPage />
                </ProtectedRoute>
              } 
            >
              <Route index element={<Navigate to="visualization" replace />} />
              <Route path="visualization" element={<Visualization />} />
              <Route path="dca" element={<DCASimulation />} />
              <Route path="visualization/heatmap" element={<HeatmapPage />} />
              <Route path="watchlist" element={<WatchlistPage />} />
            </Route>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Router>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
