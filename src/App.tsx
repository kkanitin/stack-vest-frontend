import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import RouteFallback from './components/RouteFallback';
import './App.css';

// Route components are code-split so heavy deps (Recharts) load only on the routes that use them.
const LoginPage = lazy(() => import('./pages/LoginPage'));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const Visualization = lazy(() => import('./components/Visualization'));
const DCASimulation = lazy(() => import('./components/DCASimulation'));
const HeatmapPage = lazy(() => import('./pages/HeatmapPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1 } },
});

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
    <QueryClientProvider client={queryClient}>
    <GoogleOAuthProvider clientId={googleClientId}>
      <AuthProvider>
        <ErrorBoundary variant="page">
        <ToastProvider>
        <Router>
          <Suspense fallback={<RouteFallback variant="page" />}>
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
          </Suspense>
        </Router>
        </ToastProvider>
        </ErrorBoundary>
      </AuthProvider>
    </GoogleOAuthProvider>
    </QueryClientProvider>
  );
}

export default App;
