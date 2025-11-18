import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import "./styles/responsive.css";
import App from "./App";
import reportWebVitals from "./reportWebVitals";
import { SettingsProvider } from "./contexts/SettingsContext";
import { MapSelectionProvider } from "./contexts/MapSelectionContext";
import { FilterProvider } from "./contexts/FilterContext";

// Capture beforeinstallprompt event BEFORE React mounts
// This ensures we don't miss the event if it fires early
window.addEventListener("beforeinstallprompt", (e) => {
  console.log("✅ beforeinstallprompt event captured globally!");
  e.preventDefault();
  // Store it globally so PWAInstallButton can access it
  (window as any).deferredPrompt = e;
});

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement,
);
root.render(
  <React.StrictMode>
    <SettingsProvider>
      <FilterProvider>
        <MapSelectionProvider>
          <App />
        </MapSelectionProvider>
      </FilterProvider>
    </SettingsProvider>
  </React.StrictMode>,
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker for PWA offline support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log(
          "✅ Service Worker registered successfully:",
          registration.scope,
        );

        // Check for updates periodically
        setInterval(() => {
          registration.update();
        }, 60000); // Check every minute

        // Listen for service worker updates
        registration.addEventListener('updatefound', () => {
          console.log('🔄 New service worker found, updating...');
          const newWorker = registration.installing;
          
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('✅ New service worker installed, reloading page...');
                // Force reload to use new service worker
                window.location.reload();
              }
            });
          }
        });

        // Handle service worker controller change
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          console.log('🔄 Service worker controller changed, reloading...');
          window.location.reload();
        });
      })
      .catch((err) => {
        // Avoid crashing if registration fails
        console.warn("❌ Service worker registration failed:", err);
      });
  });
}
