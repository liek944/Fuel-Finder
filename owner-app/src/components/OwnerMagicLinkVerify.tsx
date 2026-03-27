import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ownerApi } from '../api/ownerApi';
import './OwnerLogin.css';

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
        localStorage.setItem('owner_api_key', result.api_key);
        localStorage.setItem('owner_subdomain', subdomain);
        setStatus('success');
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
          <h1>⛽ Fuel Finder Owner</h1>
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
              <h2 style={{ margin: '0 0 10px', color: '#059669' }}>You Have Been Signed In!</h2>
              <p style={{ color: '#6b7280', marginBottom: '8px' }}>Your login has been verified successfully.</p>
              <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '24px' }}>
                You can safely close this page now.<br />
                If you have the dashboard open on another device, it will update automatically.
              </p>
              <button
                onClick={() => navigate('/owner/dashboard')}
                className="login-button"
                style={{ maxWidth: '300px', margin: '0 auto' }}
              >
                📊 Go to Dashboard
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>❌</div>
              <h2 style={{ margin: '0 0 10px', color: '#dc2626' }}>Verification Failed</h2>
              <p style={{ color: '#6b7280', marginBottom: '20px' }}>{error}</p>
              <button
                onClick={() => navigate('/')}
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
        <p>Fuel Finder Owner</p>
      </footer>
    </div>
  );
};

export default OwnerMagicLinkVerify;
