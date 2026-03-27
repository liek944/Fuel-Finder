import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerTheme, ThemeConfig } from '../contexts/OwnerThemeContext';
import './OwnerLogin.css';
import { ownerApi } from '../api/ownerApi';

interface OwnerInfo {
  name: string;
  domain: string;
  contact_person: string;
  email: string;
  phone?: string;
  theme_config?: ThemeConfig;
}

interface OwnerDomain {
  name: string;
  domain: string;
}

const OwnerLogin: React.FC = () => {
  // Subdomain selection
  const [availableDomains, setAvailableDomains] = useState<OwnerDomain[]>([]);
  const [domainsLoading, setDomainsLoading] = useState(true);
  const [subdomain, setSubdomain] = useState(() => localStorage.getItem('owner_subdomain') || '');

  // Login method state
  const [loginMethod, setLoginMethod] = useState<'magic' | 'apikey'>('magic');
  
  // Magic link state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // API key state
  const [apiKey, setApiKey] = useState('');
  
  // Common state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ownerInfo, setOwnerInfo] = useState<OwnerInfo | null>(null);
  
  const navigate = useNavigate();
  const { applyTheme } = useOwnerTheme();

  // Check if already logged in
  useEffect(() => {
    const existingKey = localStorage.getItem('owner_api_key');
    const existingSub = localStorage.getItem('owner_subdomain');
    if (existingKey && existingSub) {
      navigate('/owner/dashboard');
    }
  }, []);

  // Fetch available domains on mount
  useEffect(() => {
    fetchDomains();
  }, []);

  // Fetch owner info when subdomain changes
  useEffect(() => {
    if (subdomain) {
      fetchOwnerInfo();
    } else {
      setOwnerInfo(null);
    }
  }, [subdomain]);

  const fetchDomains = async () => {
    try {
      setDomainsLoading(true);
      const domains = await ownerApi.getDomains();
      setAvailableDomains(domains);
      
      // If we have a saved subdomain, keep it; otherwise don't auto-select
    } catch (err) {
      console.error('Failed to fetch domains:', err);
      // Fallback: let user type manually
    } finally {
      setDomainsLoading(false);
    }
  };

  const fetchOwnerInfo = async () => {
    if (!subdomain) return;
    try {
      const data = await ownerApi.getOwnerInfo(subdomain);
      setOwnerInfo(data);
      if (data.theme_config && Object.keys(data.theme_config).length > 0) {
        applyTheme(data.theme_config);
      }
    } catch (err) {
      console.error('Failed to fetch owner info:', err);
    }
  };

  // Handle magic link request
  const handleMagicLinkRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain) {
      setError('Please select your organization first');
      return;
    }
    setLoading(true);
    setError(null);

    try {
      const result = await ownerApi.requestMagicLink(email.trim(), subdomain);
      if (result.sessionToken) {
        setSessionToken(result.sessionToken);
      }
      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send login link');
    } finally {
      setLoading(false);
    }
  };

  // Poll for magic link status
  useEffect(() => {
    if (!emailSent || !sessionToken) return;

    const POLL_INTERVAL_MS = 3000;
    const MAX_POLL_TIME_MS = 15 * 60 * 1000;
    const startTime = Date.now();

    const pollStatus = async () => {
      try {
        const result = await ownerApi.checkMagicLinkStatus(sessionToken, subdomain);
        
        if (result.status === 'verified' && result.api_key) {
          localStorage.setItem('owner_api_key', result.api_key);
          localStorage.setItem('owner_subdomain', subdomain);
          
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          navigate('/owner/dashboard');
          return;
        }
        
        if (result.status === 'expired' || result.status === 'not_found') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError('Magic link expired. Please request a new one.');
          setEmailSent(false);
          setSessionToken(null);
          return;
        }
        
        if (Date.now() - startTime > MAX_POLL_TIME_MS) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (err) {
        console.warn('Polling error:', err);
      }
    };

    pollingIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, [emailSent, sessionToken, subdomain, navigate]);

  // Handle API key login
  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subdomain) {
      setError('Please select your organization first');
      return;
    }
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

  const handleTryAgain = () => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setEmailSent(false);
    setSessionToken(null);
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
            <h1>⛽ Fuel Finder Owner</h1>
          )}
          {ownerInfo && (
            <div className="owner-info-badge">
              <h2>{ownerInfo.theme_config?.brandName || ownerInfo.name}</h2>
            </div>
          )}
        </div>

        {/* Organization Selection */}
        <div style={{ padding: '0 24px', marginBottom: '16px' }}>
          <label
            htmlFor="subdomain-select"
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 500,
              color: '#6b7280',
              marginBottom: '6px',
            }}
          >
            Select Your Organization
          </label>
          {domainsLoading ? (
            <div style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              Loading organizations...
            </div>
          ) : availableDomains.length > 0 ? (
            <select
              id="subdomain-select"
              value={subdomain}
              onChange={(e) => {
                setSubdomain(e.target.value);
                setError(null);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '15px',
                background: '#f9fafb',
                color: '#1f2937',
                appearance: 'auto',
                cursor: 'pointer',
              }}
            >
              <option value="">— Select organization —</option>
              {availableDomains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.name}
                </option>
              ))}
            </select>
          ) : (
            /* Fallback: manual text input if API fails */
            <input
              id="subdomain-input"
              type="text"
              value={subdomain}
              onChange={(e) => {
                setSubdomain(e.target.value.trim().toLowerCase());
                setError(null);
              }}
              placeholder="Enter your organization domain"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: '1px solid #e5e7eb',
                fontSize: '15px',
                background: '#f9fafb',
                color: '#1f2937',
              }}
            />
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
                  transition: 'all 0.2s',
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
                  transition: 'all 0.2s',
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
                  disabled={loading || !email.trim() || !subdomain}
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
                  disabled={loading || !apiKey.trim() || !subdomain}
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
        <p>Fuel Finder Owner</p>
        <p className="security-note">
          🔒 Secure connection • Your credentials are protected
        </p>
      </footer>
    </div>
  );
};

export default OwnerLogin;
