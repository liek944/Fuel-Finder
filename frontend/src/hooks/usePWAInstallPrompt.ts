import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface UsePWAInstallPromptResult {
  showInstallButton: boolean;
  isIOS: boolean;
  showIOSInstructions: boolean;
  handleInstallClick: () => void;
  closeIOSInstructions: () => void;
}

export function usePWAInstallPrompt(): UsePWAInstallPromptResult {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  useEffect(() => {
    const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(iOS);
    console.log('🔍 PWA Install Button - Platform:', iOS ? 'iOS' : 'Other');

    const isStandalone = window.matchMedia('(display-mode: standalone)').matches 
      || (window.navigator as any).standalone 
      || document.referrer.includes('android-app://');

    console.log('🔍 PWA Install Button - Is Standalone:', isStandalone);

    if (isStandalone) {
      console.log('✅ PWA already installed, hiding button');
      return;
    }

    if (iOS) {
      console.log('📱 iOS detected - showing install button with instructions');
      setShowInstallButton(true);
      return;
    }

    if ((window as any).deferredPrompt) {
      console.log('✅ Found globally captured install prompt!');
      setDeferredPrompt((window as any).deferredPrompt);
      setShowInstallButton(true);
    }

    const handler = (e: Event) => {
      console.log('✅ beforeinstallprompt event fired - PWA installable!');
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    console.log('👂 Listening for beforeinstallprompt event...');

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
      await deferredPrompt.prompt();

      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        console.log('✅ User accepted the install prompt');
        setShowInstallButton(false);
      } else {
        console.log('❌ User dismissed the install prompt');
      }

      setDeferredPrompt(null);
    } catch (error) {
      console.error('❌ Error during installation:', error);
    }
  };

  const closeIOSInstructions = () => {
    setShowIOSInstructions(false);
  };

  return {
    showInstallButton,
    isIOS,
    showIOSInstructions,
    handleInstallClick,
    closeIOSInstructions,
  };
}
