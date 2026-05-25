import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOwnerTheme, ThemeConfig } from '../../contexts/OwnerThemeContext';
import './OwnerLogin.css';
import { ownerApi } from '../../api/ownerApi';

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
  const [orgRequired, setOrgRequired] = useState(false);

  // Login method state — magic link is the default
  const [loginMethod, setLoginMethod] = useState<'magic' | 'apikey'>('magic');

  // Magic link state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // API key state
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

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
      setOrgRequired(false);
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

      // B: Auto-select if only one organisation exists and nothing was saved
      const saved = localStorage.getItem('owner_subdomain');
      if (domains.length === 1 && !saved) {
        setSubdomain(domains[0].domain);
      }
    } catch (err) {
      console.error('Failed to fetch domains:', err);
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
      setOrgRequired(true);
      setError('Please select your organisation from the list above first.');
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
      // C: Contextual error messages
      const raw: string = err.message || '';
      if (raw.includes('not found') || raw.includes('404') || raw.includes('No owner') || raw.includes('not registered')) {
        setError(
          `We couldn't find an account for ${email.trim()} in this organisation. ` +
          `Double-check your email address or contact your administrator.`
        );
      } else if (raw.includes('domain') || raw.includes('organisation') || raw.includes('subdomain')) {
        setError(
          `Organisation mismatch — make sure you've selected the correct organisation above, ` +
          `then try again.`
        );
      } else {
        setError(raw || 'Failed to send login link. Please try again.');
      }
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
          setError('Login link expired. Please request a new one.');
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
      setOrgRequired(true);
      setError('Please select your organisation from the list above first.');
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
      // C: Contextual error messages
      const raw: string = err.message || '';
      if (raw.includes('401') || raw.includes('403') || raw.includes('Unauthorized') || raw.includes('Invalid')) {
        setError(
          `Invalid API key — check for extra spaces at the start or end, ` +
          `then try again. You can use the 👁 button to reveal what you've typed.`
        );
      } else if (raw.includes('domain') || raw.includes('organisation') || raw.includes('subdomain')) {
        setError(
          `Organisation mismatch — your API key may belong to a different organisation. ` +
          `Try selecting a different one above.`
        );
      } else if (raw.includes('404') || raw.includes('not found')) {
        setError(
          `This API key wasn't found. Make sure you copied the full key from your dashboard.`
        );
      } else {
        setError(raw || 'Login failed. Please check your API key and try again.');
      }
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

        {/* Organisation Selection */}
        <div style={{ padding: '0 24px', marginBottom: '16px' }}>
          <label
            htmlFor="subdomain-select"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: orgRequired ? '#c53030' : '#6b7280',
              marginBottom: '6px',
            }}
          >
            {/* B: Visual required indicator */}
            Select Your Organisation
            {!subdomain && <span style={{ color: '#c53030', fontSize: '11px', fontWeight: 500 }}>— required</span>}
          </label>
          {domainsLoading ? (
            <div style={{ padding: '10px', textAlign: 'center', color: '#9ca3af', fontSize: '14px' }}>
              Loading organisations...
            </div>
          ) : availableDomains.length > 0 ? (
            <select
              id="subdomain-select"
              value={subdomain}
              onChange={(e) => {
                setSubdomain(e.target.value);
                setError(null);
                setOrgRequired(false);
              }}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: `2px solid ${orgRequired ? '#fc8181' : subdomain ? '#48bb78' : '#e5e7eb'}`,
                fontSize: '15px',
                background: subdomain ? '#f0fff4' : '#f9fafb',
                color: '#1f2937',
                appearance: 'auto',
                cursor: 'pointer',
                transition: 'border-color 0.2s, background 0.2s',
              }}
            >
              <option value="">— Select organisation —</option>
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
                setOrgRequired(false);
              }}
              placeholder="Enter your organisation domain"
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '10px',
                border: `2px solid ${orgRequired ? '#fc8181' : '#e5e7eb'}`,
                fontSize: '15px',
                background: '#f9fafb',
                color: '#1f2937',
              }}
            />
          )}
          {/* B: Prompt to select org if highlighted */}
          {orgRequired && (
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#c53030' }}>
              ↑ Choose your organisation before signing in
            </p>
          )}
        </div>

        {/* Email sent success state */}
        {emailSent ? (
          <div style={{ padding: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📧</div>
            <h3 style={{ margin: '0 0 12px', color: '#059669', fontSize: '20px' }}>Check Your Email!</h3>
            <p style={{ color: '#4b5563', marginBottom: '8px', lineHeight: '1.6' }}>
              We've sent a sign-in link to <strong>{email}</strong>.
            </p>
            {/* D: Clear instruction — open the link on this device */}
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 16px',
                margin: '16px 0',
                fontSize: '14px',
                color: '#1e40af',
                textAlign: 'left',
                lineHeight: '1.6',
              }}
            >
              <strong>📱 Tip:</strong> Open the email on <em>this device</em> and tap the link — you'll be
              signed in here automatically.
            </div>
            <p style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '20px' }}>
              ⏱️ Link expires in 15 minutes
            </p>
            {/* Subtle polling indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#6b7280',
                fontSize: '13px',
                marginBottom: '20px',
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }}
              />
              Waiting for you to click the link…
            </div>
            <button
              onClick={handleTryAgain}
              className="login-button"
              style={{ background: '#6b7280', maxWidth: '220px', margin: '0 auto', display: 'flex' }}
            >
              Send a New Link
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
                  fontWeight: 600,
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                📧 Email Link
                {/* D: "Recommended" badge on magic link */}
                {loginMethod !== 'magic' && (
                  <span
                    style={{
                      marginLeft: '6px',
                      fontSize: '10px',
                      background: '#d1fae5',
                      color: '#065f46',
                      padding: '1px 6px',
                      borderRadius: '9999px',
                      fontWeight: 600,
                      verticalAlign: 'middle',
                    }}
                  >
                    Recommended
                  </span>
                )}
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
                  fontSize: '14px',
                  transition: 'all 0.2s',
                }}
              >
                🔑 API Key
              </button>
            </div>

            {/* Magic Link Form */}
            {loginMethod === 'magic' && (
              <form onSubmit={handleMagicLinkRequest} className="login-form">
                {/* D: Short explainer so users know what will happen */}
                <p
                  style={{
                    fontSize: '14px',
                    color: '#4b5563',
                    margin: '0 0 18px',
                    lineHeight: '1.55',
                    padding: '0 2px',
                  }}
                >
                  Enter your email and we'll send a one-tap sign-in link — no password needed.
                </p>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                    autoFocus
                    className="api-key-input"
                    style={{ fontFamily: 'inherit' }}
                  />
                  <small className="form-hint">
                    Use the email address registered with your organisation
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
                  style={!subdomain ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <span>📧</span>
                      Send Sign-in Link
                    </>
                  )}
                </button>
                {!subdomain && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                    Select an organisation above to continue
                  </p>
                )}
              </form>
            )}

            {/* API Key Form */}
            {loginMethod === 'apikey' && (
              <form onSubmit={handleApiKeyLogin} className="login-form">
                <div className="form-group">
                  <label htmlFor="apiKey">API Key</label>
                  {/* A: Wrapper to position the show/hide toggle inside the input */}
                  <div style={{ position: 'relative' }}>
                    <input
                      id="apiKey"
                      type={showApiKey ? 'text' : 'password'}
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Paste your API key here"
                      required
                      autoComplete="off"
                      className="api-key-input"
                      style={{ paddingRight: '48px' }}
                    />
                    {/* A: Show/hide toggle button */}
                    <button
                      type="button"
                      onClick={() => setShowApiKey((v) => !v)}
                      title={showApiKey ? 'Hide key' : 'Show key'}
                      style={{
                        position: 'absolute',
                        right: '12px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '18px',
                        lineHeight: 1,
                        color: '#9ca3af',
                        padding: '4px',
                        borderRadius: '4px',
                      }}
                    >
                      {showApiKey ? '🙈' : '👁️'}
                    </button>
                  </div>
                  <small className="form-hint">
                    Your API key was provided by the administrator — copy and paste it to avoid errors
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
                  style={!subdomain ? { opacity: 0.55, cursor: 'not-allowed' } : {}}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Signing in…
                    </>
                  ) : (
                    <>
                      <span>🔐</span>
                      Sign in to Dashboard
                    </>
                  )}
                </button>
                {!subdomain && (
                  <p style={{ textAlign: 'center', fontSize: '12px', color: '#9ca3af', marginTop: '8px' }}>
                    Select an organisation above to continue
                  </p>
                )}

                {/* D: Nudge toward magic link */}
                <p
                  style={{
                    textAlign: 'center',
                    fontSize: '13px',
                    color: '#6b7280',
                    marginTop: '16px',
                    marginBottom: 0,
                  }}
                >
                  Don't have your key handy?{' '}
                  <button
                    type="button"
                    onClick={() => { setLoginMethod('magic'); setError(null); }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#059669',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      fontSize: '13px',
                      textDecoration: 'underline',
                    }}
                  >
                    Use email link instead
                  </button>
                </p>
              </form>
            )}
          </>
        )}

        <div className="help-section">
          <hr />
          <p className="help-text">
            <strong>Need help?</strong>
            <br />
            Contact the administrator if you need assistance.
          </p>
          {ownerInfo && ownerInfo.email && (
            <p className="contact-info">📧 {ownerInfo.email}</p>
          )}
        </div>
      </div>

      <footer className="login-footer">
        <p>Fuel Finder Owner</p>
        <p className="security-note">🔒 Secure connection • Your credentials are protected</p>
      </footer>
    </div>
  );
};

export default OwnerLogin;
