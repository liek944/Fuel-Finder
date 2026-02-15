import React, { useState, useEffect, useRef } from 'react';
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
  const [loginMethod, setLoginMethod] = useState<'magic' | 'apikey' | 'sms'>('magic');
  
  // Magic link state
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // API key state
  const [apiKey, setApiKey] = useState('');

  // SMS OTP state
  const [phone, setPhone] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  
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
      const result = await ownerApi.requestMagicLink(email.trim(), subdomain);
      // Store session token for cross-device polling
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

  // Poll for magic link status (cross-device login)
  useEffect(() => {
    if (!emailSent || !sessionToken) return;

    const POLL_INTERVAL_MS = 3000; // 3 seconds
    const MAX_POLL_TIME_MS = 15 * 60 * 1000; // 15 minutes (token expiry)
    const startTime = Date.now();

    const pollStatus = async () => {
      try {
        const result = await ownerApi.checkMagicLinkStatus(sessionToken, subdomain);
        
        if (result.status === 'verified' && result.api_key) {
          // Success! Phone clicked the link - auto-login on PC
          console.log('🎉 Cross-device login detected!');
          localStorage.setItem('owner_api_key', result.api_key);
          localStorage.setItem('owner_subdomain', subdomain);
          
          // Clear polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          
          navigate('/owner/dashboard');
          return;
        }
        
        if (result.status === 'expired' || result.status === 'not_found') {
          // Token expired or not found - stop polling
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
          setError('Magic link expired. Please request a new one.');
          setEmailSent(false);
          setSessionToken(null);
          return;
        }
        
        // Check if we've exceeded max poll time
        if (Date.now() - startTime > MAX_POLL_TIME_MS) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      } catch (err) {
        // Silently ignore poll errors - we'll retry
        console.warn('Polling error:', err);
      }
    };

    // Start polling
    pollingIntervalRef.current = setInterval(pollStatus, POLL_INTERVAL_MS);
    
    // Cleanup on unmount or when deps change
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
    // Clear polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setEmailSent(false);
    setSessionToken(null);
    setEmail('');
    setError(null);
  };

  // Handle SMS OTP request
  const handleSmsOtpRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await ownerApi.requestSmsOtp(phone.trim(), subdomain);
      setOtpSent(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send SMS code');
    } finally {
      setLoading(false);
    }
  };

  // Handle SMS OTP verification
  const handleSmsOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await ownerApi.verifySmsOtp(phone.trim(), otpCode.trim(), subdomain);
      if (result.api_key) {
        localStorage.setItem('owner_api_key', result.api_key);
        localStorage.setItem('owner_subdomain', subdomain);
        navigate('/owner/dashboard');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  // Reset SMS OTP state
  const handleSmsRetry = () => {
    setOtpSent(false);
    setOtpCode('');
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
                onClick={() => { setLoginMethod('sms'); setError(null); }}
                style={{
                  flex: 1,
                  padding: '12px',
                  border: 'none',
                  background: loginMethod === 'sms' ? '#f0fdf4' : 'transparent',
                  borderBottom: loginMethod === 'sms' ? '2px solid #059669' : '2px solid transparent',
                  color: loginMethod === 'sms' ? '#059669' : '#6b7280',
                  cursor: 'pointer',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                📱 SMS Code
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

            {/* SMS OTP Form */}
            {loginMethod === 'sms' && (
              !otpSent ? (
                <form onSubmit={handleSmsOtpRequest} className="login-form">
                  <div className="form-group">
                    <label htmlFor="phone">Phone Number</label>
                    <input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+639XXXXXXXXX"
                      required
                      autoComplete="tel"
                      className="api-key-input"
                    />
                    <small className="form-hint">
                      We'll send a 6-digit code to your phone
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
                    disabled={loading || !phone.trim()}
                    className="login-button"
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span>📱</span>
                        Send Code
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleSmsOtpVerify} className="login-form">
                  <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                    <div style={{ fontSize: '36px', marginBottom: '10px' }}>📱</div>
                    <p style={{ color: '#4b5563', fontSize: '14px' }}>
                      Code sent to <strong>{phone}</strong>
                    </p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="otpCode">Enter 6-Digit Code</label>
                    <input
                      id="otpCode"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={otpCode}
                      onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                      placeholder="000000"
                      required
                      autoComplete="one-time-code"
                      className="api-key-input"
                      style={{ textAlign: 'center', fontSize: '24px', letterSpacing: '8px' }}
                    />
                    <small className="form-hint">
                      ⏱️ Code expires in 5 minutes
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
                    disabled={loading || otpCode.length !== 6}
                    className="login-button"
                  >
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Verifying...
                      </>
                    ) : (
                      <>
                        <span>🔐</span>
                        Verify & Login
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleSmsRetry}
                    style={{
                      marginTop: '10px',
                      background: 'none',
                      border: 'none',
                      color: '#6b7280',
                      cursor: 'pointer',
                      fontSize: '14px',
                      textDecoration: 'underline',
                    }}
                  >
                    Send a new code
                  </button>
                </form>
              )
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
