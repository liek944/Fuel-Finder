import React from 'react';
import '../styles/PWAInstallButton.css';
import { usePWAInstallPrompt } from '../hooks/usePWAInstallPrompt';

const PWAInstallButton: React.FC = () => {
  const {
    showInstallButton,
    showIOSInstructions,
    handleInstallClick,
    closeIOSInstructions,
  } = usePWAInstallPrompt();

  // Check if it's iOS
  // Check if already installed
  // For iOS devices, show install button if not in standalone mode
  // Check if event was already captured globally (before React mounted)
  // For other browsers, listen for beforeinstallprompt event
  // Check if installation criteria are met
  // Show iOS instructions

  if (!showInstallButton) {
    return null;
  }

  return (
    <>
      <button 
        className="pwa-install-button"
        onClick={handleInstallClick}
        aria-label="Install Fuel Finder App"
      >
        <svg 
          width="20" 
          height="20" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        <span>Install App</span>
      </button>

      {showIOSInstructions && (
        <div className="ios-install-modal-overlay" onClick={closeIOSInstructions}>
          <div className="ios-install-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ios-install-header">
              <h3>Install Fuel Finder</h3>
              <button 
                className="ios-install-close"
                onClick={closeIOSInstructions}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="ios-install-content">
              <p>To install this app on your iOS device:</p>
              <ol>
                <li>
                  <span className="ios-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  Tap the <strong>Share</strong> button at the bottom of your browser
                </li>
                <li>
                  <span className="ios-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="12" y1="8" x2="12" y2="16" />
                      <line x1="8" y1="12" x2="16" y2="12" />
                    </svg>
                  </span>
                  Scroll down and tap <strong>"Add to Home Screen"</strong>
                </li>
                <li>
                  <span className="ios-icon">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                  Tap <strong>"Add"</strong> in the top right corner
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PWAInstallButton;
