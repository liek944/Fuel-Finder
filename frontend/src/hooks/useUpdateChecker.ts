/**
 * useUpdateChecker Hook
 *
 * On app mount (Capacitor/Android only), checks the GitHub Releases API for a
 * newer version than the one stamped into public/version.json by build-apk.sh.
 * Fires once per session and silently swallows network errors so offline users
 * are unaffected.
 *
 * Version strategy (fully automatic — no code changes needed between releases):
 *   1. Bump versionName in android/app/build.gradle
 *   2. Run build-apk.sh — it writes that version into public/version.json
 *   3. This hook fetches /version.json at runtime to get the current version
 *   4. Compares against the latest GitHub Release tag
 */

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';

const GITHUB_REPO = 'liek944/Fuel-FInder';
const RELEASES_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
const RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

export interface UpdateInfo {
  /** Whether a newer version exists on GitHub Releases */
  updateAvailable: boolean;
  /** The latest version string from GitHub (e.g. "1.1.0") */
  latestVersion: string | null;
  /** Direct link to the GitHub Releases page */
  releaseUrl: string;
  /** Whether the check is still in flight */
  isChecking: boolean;
}

/**
 * Compares two semver strings (major.minor.patch).
 * Returns true if `remote` is strictly greater than `local`.
 */
function isNewerVersion(local: string, remote: string): boolean {
  const parse = (v: string) =>
    v
      .replace(/^v/, '')
      .split('.')
      .map((n) => parseInt(n, 10) || 0);

  const [lMaj, lMin, lPat] = parse(local);
  const [rMaj, rMin, rPat] = parse(remote);

  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPat > lPat;
}

/**
 * Reads the app version stamped into /version.json by build-apk.sh.
 * Falls back to "0.0.0" if the file is missing or malformed (dev mode).
 */
async function getLocalVersion(): Promise<string> {
  try {
    const res = await fetch('/version.json', { cache: 'no-store' });
    if (!res.ok) return '0.0.0';
    const data = await res.json();
    return typeof data.version === 'string' ? data.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
}

/**
 * Hook that checks GitHub Releases once per app session.
 * Only runs when the app is running inside Capacitor (i.e. on Android).
 * Safe to call in web — it will simply return updateAvailable: false.
 */
export function useUpdateChecker(): UpdateInfo {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Only check for updates when running as a native Capacitor app
    if (!Capacitor.isNativePlatform()) return;

    let cancelled = false;

    async function check() {
      setIsChecking(true);
      try {
        // Read both versions in parallel
        const [localVersion, releaseRes] = await Promise.all([
          getLocalVersion(),
          fetch(RELEASES_API, { headers: { Accept: 'application/vnd.github+json' } }),
        ]);

        if (!releaseRes.ok) return;

        const data = await releaseRes.json();
        const tag: string = data.tag_name ?? '';
        const remoteVersion = tag.replace(/^v/, '');

        if (!cancelled && remoteVersion && isNewerVersion(localVersion, remoteVersion)) {
          setLatestVersion(remoteVersion);
          setUpdateAvailable(true);
        }
      } catch {
        // Silently swallow — offline users should not see an error
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    updateAvailable,
    latestVersion,
    releaseUrl: RELEASES_PAGE,
    isChecking,
  };
}

export default useUpdateChecker;
