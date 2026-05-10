import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';
import heroImg from '../assets/hero.png';

const LoginPage: React.FC = () => {
  const { login, isAuthenticated } = useAuth();
  const [error, setError] = React.useState<string | null>(null);
  const navigate = useNavigate();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSuccess = (credentialResponse: CredentialResponse) => {
    setError(null);
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
      navigate('/dashboard');
    }
  };

  const handleError = () => {
    console.error('Google Login Failed');
    setError('Login failed. Please check if your origin is registered in Google Cloud Console.');
  };

  return (
    <section id="center">
      <div className="hero">
        <img src={heroImg} width="170" height="179" alt="StackVest logo" className="brand-logo" />
      </div>
      <div>
        <h1>Welcome to StackVest</h1>
        <p>Please sign in to continue</p>
      </div>

      {error && (
        <div style={{ color: 'var(--error)', marginTop: '1rem', textAlign: 'center', maxWidth: '300px', fontSize: '14px', fontWeight: '500' }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: '2rem', display: 'flex', justifyContent: 'center' }}>
        <GoogleLogin
          onSuccess={handleSuccess}
          onError={handleError}
          useOneTap
        />
      </div>
    </section>
  );
};

export default LoginPage;
