import React, { useState, useEffect } from 'react';
import '../styles/PWAInstallButton.css';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    console.log('🔍 PWA Install Button - Platform:', iOS ? 'iOS' : 'Other');

    // Check if already installed
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    console.log('🔍 PWA Install Button - Is Standalone:', isStandalone);

    if (isStandalone) {
      console.log('✅ PWA already installed, hiding button');
      // App is already installed, don't show button
      return;
    }

    // For iOS devices, show install button if not in standalone mode
    if (iOS) {
      console.log('📱 iOS detected - showing install button with instructions');
      setShowInstallButton(true);
      return;
    }

    // Check if event was already captured globally (before React mounted)
    if ((window as any).deferredPrompt) {
      console.log('✅ Found globally captured install prompt!');
      setDeferredPrompt((window as any).deferredPrompt);
      setShowInstallButton(true);
    }

    // For other browsers, listen for beforeinstallprompt event
    const handler = (e: Event) => {
      console.log('✅ beforeinstallprompt event fired - PWA installable!');
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    console.log('👂 Listening for beforeinstallprompt event...');

    // Check if installation criteria are met
    if ('getInstalledRelatedApps' in navigator) {
      (navigator as any).getInstalledRelatedApps().then((relatedApps: any[]) => {
        console.log('🔍 Related apps check:', relatedApps.length === 0 ? 'None installed' : `${relatedApps.length} found`);
        if (relatedApps.length === 0) {
          setShowInstallButton(true);
        }
      }).catch((err: any) => {
        console.warn('⚠️ getInstalledRelatedApps error:', err);
      });
    } else {
      console.log('ℹ️ getInstalledRelatedApps not supported');
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstallClick = async () => {
    console.log('🖱️ Install button clicked');
    
    if (isIOS) {
      console.log('📱 Showing iOS installation instructions');
      // Show iOS instructions
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) {
      console.warn('⚠️ No deferred prompt available - PWA may not be installable yet');
      console.log('💡 Make sure you are on HTTPS and the app meets PWA criteria');
      return;
    }

    try {
      console.log('🚀 Showing install prompt...');
      // Show the install prompt
      await deferredPrompt.prompt();

      // Wait for the user to respond to the prompt
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
        setShowInstallButton(false);
      } else {
        console.log('❌ User dismissed the install prompt');
      }

      // Clear the deferredPrompt
      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Error during installation:', error);
    }
  };

  const closeIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

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
