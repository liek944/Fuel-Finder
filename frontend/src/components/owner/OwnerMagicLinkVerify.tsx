import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ownerApi } from '../../api/ownerApi';
import './OwnerLogin.css';

/**
 * OwnerMagicLinkVerify
 * Handles the verification of magic link tokens from email
 * URL: /owner/verify/:token
 */
const OwnerMagicLinkVerify: React.FC<{ subdomain: string }> = ({ subdomain }) => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    } else {
      setStatus('error');
      setError('Invalid link - no token found');
    }
  }, [token]);

  const verifyToken = async (linkToken: string) => {
    try {
      const result = await ownerApi.verifyMagicLink(linkToken, subdomain);

      if (result.success && result.api_key) {
        // Store credentials
        localStorage.setItem('owner_api_key', result.api_key);
        localStorage.setItem('owner_subdomain', subdomain);

        setStatus('success');

        // Redirect to dashboard after brief delay
        setTimeout(() => {
          navigate('/owner/dashboard');
        }, 1500);
      } else {
        setStatus('error');
        setError(result.message || 'Verification failed');
      }
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'Failed to verify link');
    }
  };

  return (
    <div className="owner-login-container">
      <div className="owner-login-card">
        <div className="owner-login-header">
          <h1>🏪 Owner Portal</h1>
        </div>

        <div style={{ padding: '40px 30px', textAlign: 'center' }}>
          {status === 'verifying' && (
            <>
              <div className="spinner" style={{ margin: '0 auto 20px', width: '40px', height: '40px' }} />
              <h2 style={{ margin: '0 0 10px', color: '#1f2937' }}>Verifying your login...</h2>
              <p style={{ color: '#6b7280' }}>Please wait a moment</p>
            </>
          )}

          {status === 'success' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>✅</div>
              <h2 style={{ margin: '0 0 10px', color: '#059669' }}>Login Successful!</h2>
              <p style={{ color: '#6b7280' }}>Redirecting to your dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
              <h2 style={{ margin: '0 0 10px', color: '#dc2626' }}>Verification Failed</h2>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
              <button
                onClick={() => navigate('/owner/login')}
                className="login-button"
                style={{ maxWidth: '300px', margin: '0 auto' }}
              >
                🔙 Back to Login
              </button>
            </>
          )}
        </div>
      </div>

      <footer className="login-footer">
        <p>Fuel Finder Owner Management System</p>
      </footer>
    </div>
  );
};

export default OwnerMagicLinkVerify;
