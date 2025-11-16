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
  const [apiKey, setApiKey] = useState('');
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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Trim API key to remove accidental whitespace
      const trimmedApiKey = apiKey.trim();

      // Verify API key by fetching dashboard via ownerApi
      await ownerApi.getDashboard(trimmedApiKey, subdomain);

      // Store trimmed API key securely
      localStorage.setItem('owner_api_key', trimmedApiKey);
      localStorage.setItem('owner_subdomain', subdomain);
      
      // Redirect to dashboard
      navigate('/owner/dashboard');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your API key.');
    } finally {
      setLoading(false);
    }
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

        <form onSubmit={handleLogin} className="login-form">
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

        <div className="help-section">
          <hr />
          <p className="help-text">
            <strong>Need help?</strong><br />
            Contact the administrator if you don't have your API key or need assistance.
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
          🔒 Secure connection • Your API key is never stored on our servers
        </p>
      </footer>
    </div>
  );
};

export default OwnerLogin;
