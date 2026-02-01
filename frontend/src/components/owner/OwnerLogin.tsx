import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerTheme, ThemeConfig } from '../../contexts/OwnerThemeContext';
import './OwnerLogin.css';
import { ownerApi } from '../../api/ownerApi';

interface OwnerLoginProps {
  subdomain: string;
}

interface OwnerInfo {
  name: string;
  domain: string;
  contact_person: string;
  email: string;
  phone?: string;
  theme_config?: ThemeConfig;
}

const OwnerLogin: React.FC<OwnerLoginProps> = ({ subdomain }) => {
  // Login method state
  const [loginMethod, setLoginMethod] = useState<'magic' | 'apikey'>('magic');
  
  // Magic link state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  
  // API key state
  const [apiKey, setApiKey] = useState('');
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);
  
  const navigate = useNavigate();
  const { applyTheme } = useOwnerTheme();

  // Fetch public owner info on mount
  useEffect(() => {
    fetchOwnerInfo();
  }, [subdomain]);

  const fetchOwnerInfo = async () => {
    try {
      const data = await ownerApi.getOwnerInfo(subdomain);
      setOwnerInfo(data);
      if (data.theme_config && Object.keys(data.theme_config).length > 0) {
        console.log('🎨 Applying owner theme:', data.name);
        applyTheme(data.theme_config);
      }
    } catch (err) {
      console.error('Failed to fetch owner info:', err);
    }
  };

  // Handle magic link request
  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await ownerApi.requestMagicLink(email.trim(), subdomain);
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  // Handle API key login
  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const trimmedApiKey = apiKey.trim();
      await ownerApi.getDashboard(trimmedApiKey, subdomain);
      localStorage.setItem('owner_api_key', trimmedApiKey);
      localStorage.setItem('owner_subdomain', subdomain);
      navigate('/owner/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  // Reset to try again
  const handleTryAgain = () => {
    setEmailSent(false);
    setEmail('');
    setError(null);
  };

  return (
    <div className="owner-login-container">
      <div className="owner-login-card">
        <div className="owner-login-header">
          {ownerInfo?.theme_config?.logoUrl ? (
            <div className="owner-logo">
              <img src={ownerInfo.theme_config.logoUrl} alt={ownerInfo.name} />
            </div>
          ) : (
            <h1>🏪 Owner Portal</h1>
          )}
          {ownerInfo && (
            <div className="owner-info-badge">
              <h2>{ownerInfo.theme_config?.brandName || ownerInfo.name}</h2>
            </div>
          )}
        </div>

        {/* Email sent success state */}
        {emailSent ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '20px' }}>📧</div>
            <h3 style={{ margin: '0 0 15px', color: '#059669' }}>Check Your Email!</h3>
            <p style={{ color: '#4b5563', marginBottom: '20px', lineHeight: '1.6' }}>
              We've sent a login link to <strong>{email}</strong>.
              <br />
              Click the link in the email to sign in.
            </p>
            <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '20px' }}>
              ⏱️ Link expires in 15 minutes
            </p>
            <button
              onClick={handleTryAgain}
              className="login-button"
              style={{ background: '#6b7280', maxWidth: '200px' }}
            >
              Send Another Link
            </button>
          </div>
        ) : (
          <>
            {/* Login method toggle */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', marginBottom: '20px' }}>
              <button
                type="button"
                onClick={() => { setLoginMethod('magic'); setError(null); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: loginMethod === 'magic' ? '#f0fdf4' : 'transparent',
                  borderBottom: loginMethod === 'magic' ? '2px solid #059669' : '2px solid transparent',
                  color: loginMethod === 'magic' ? '#059669' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                📧 Email Link
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('apikey'); setError(null); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: loginMethod === 'apikey' ? '#f0fdf4' : 'transparent',
                  borderBottom: loginMethod === 'apikey' ? '2px solid #059669' : '2px solid transparent',
                  color: loginMethod === 'apikey' ? '#059669' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                🔑 API Key
              </button>
            </div>

            {/* Magic Link Form */}
            {loginMethod === 'magic' && (
              <form onSubmit={handleMagicLinkRequest} className="login-form">
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your registered email"
                    required
                    autoComplete="email"
                    className="api-key-input"
                  />
                  <small className="form-hint">
                    We'll send you a secure login link
                  </small>
                </div>

                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !email.trim()}
                  className="login-button"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Sending...
                    </>
                  ) : (
                    <>
                      <span>📧</span>
                      Send Login Link
                    </>
                  )}
                </button>
              </form>
            )}

            {/* API Key Form */}
            {loginMethod === 'apikey' && (
              <form onSubmit={handleApiKeyLogin} className="login-form">
                <div className="form-group">
                  <label htmlFor="apiKey">API Key</label>
                  <input
                    id="apiKey"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your API key"
                    required
                    autoComplete="off"
                    className="api-key-input"
                  />
                  <small className="form-hint">
                    Your API key was provided by the administrator
                  </small>
                </div>

                {error && (
                  <div className="error-message">
                    <span className="error-icon">⚠️</span>
                    {error}
                  </div>
                )}

                <button 
                  type="submit" 
                  disabled={loading || !apiKey.trim()}
                  className="login-button"
                >
                  {loading ? (
                    <>
                      <span className="spinner"></span>
                      Logging in...
                    </>
                  ) : (
                    <>
                      <span>🔐</span>
                      Login to Dashboard
                    </>
                  )}
                </button>
              </form>
            )}
          </>
        )}

        <div className="help-section">
          <hr />
          <p className="help-text">
            <strong>Need help?</strong><br />
            Contact the administrator if you need assistance.
          </p>
          {ownerInfo && ownerInfo.email && (
            <p className="contact-info">
              📧 {ownerInfo.email}
            </p>
          )}
        </div>
      </div>

      <footer className="login-footer">
        <p>Fuel Finder Owner Management System</p>
        <p className="security-note">
          🔒 Secure connection • Your credentials are protected
        </p>
      </footer>
    </div>
  );
};

export default OwnerLogin;
