/**
 * UpdateDialog Component
 *
 * A non-blocking modal that appears when a newer APK version is available on
 * GitHub Releases. The user can dismiss it ("Later") or tap "Update Now" to
 * open the releases page in their device browser via Capacitor Browser.
 *
 * Design notes:
 *  - Slide-up animation so it doesn't feel like an interruption.
 *  - "Later" is intentionally de-emphasized; we never force an update.
 *  - Uses the @capacitor/browser plugin to open the URL natively.
 */

import { useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import './UpdateDialog.css';

interface UpdateDialogProps {
  latestVersion: string;
  releaseUrl: string;
  onDismiss: () => void;
}

async function openUrl(url: string) {
  // Use Capacitor Browser plugin if available (native Android), otherwise window.open
  if (Capacitor.isNativePlatform()) {
    try {
      // Dynamic import so web bundle never fails if plugin isn't installed
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
    } catch {
      window.open(url, '_blank');
    }
  } else {
    window.open(url, '_blank');
  }
}

export default function UpdateDialog({
  latestVersion,
  releaseUrl,
  onDismiss,
}: UpdateDialogProps) {
  const handleUpdate = useCallback(async () => {
    await openUrl(releaseUrl);
    onDismiss();
  }, [releaseUrl, onDismiss]);

  return (
    <div className="update-backdrop" role="dialog" aria-modal="true" aria-labelledby="update-title">
      <div className="update-dialog">
        {/* Icon */}
        <div className="update-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2Z"
              fill="url(#update-gradient)"
            />
            <path
              d="M16 11l-4-4-4 4M12 7v10"
              stroke="#fff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="update-gradient" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
                <stop stopColor="#22c55e" />
                <stop offset="1" stopColor="#16a34a" />
              </linearGradient>
            </defs>
          </svg>
        </div>

        {/* Text */}
        <h2 id="update-title" className="update-title">Update Available</h2>
        <p className="update-body">
          A new version of <strong>Fuel Finder</strong> is ready.{' '}
          <span className="update-version-badge">v{latestVersion}</span> brings improvements
          and fixes to keep your experience smooth.
        </p>

        {/* Actions */}
        <div className="update-actions">
          <button className="update-btn-later" onClick={onDismiss}>
            Later
          </button>
          <button className="update-btn-primary" onClick={handleUpdate}>
            Update Now
          </button>
        </div>
      </div>
    </div>
  );
}
