import { useState, useEffect } from 'react';

let deferredPrompt = null;

// Listen for PWA install prompt globally before React mounts
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Dispatch custom event so hook can react
  window.dispatchEvent(new Event('pwa-installable'));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  window.dispatchEvent(new Event('pwa-installed'));
});

/**
 * usePWAInstall - React hook for PWA installation
 * Returns { isInstallable, isInstalled, installApp }
 */
const usePWAInstall = () => {
  const [isInstallable, setIsInstallable] = useState(!!deferredPrompt);
  const [isInstalled, setIsInstalled] = useState(false);
  const [installOutcome, setInstallOutcome] = useState(null);

  useEffect(() => {
    // Check if already running as installed PWA
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;
    setIsInstalled(isStandalone);

    const onInstallable = () => setIsInstallable(true);
    const onInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
    };

    window.addEventListener('pwa-installable', onInstallable);
    window.addEventListener('pwa-installed', onInstalled);

    return () => {
      window.removeEventListener('pwa-installable', onInstallable);
      window.removeEventListener('pwa-installed', onInstalled);
    };
  }, []);

  const installApp = async () => {
    if (!deferredPrompt) {
      // Fallback: show manual instructions
      alert('To install Smart Kisan:\n\n📱 Android Chrome: Tap the menu (⋮) → "Add to Home screen"\n🍎 iPhone Safari: Tap Share (□↑) → "Add to Home Screen"');
      return;
    }
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      setInstallOutcome(outcome);
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }
      deferredPrompt = null;
    } catch (err) {
      console.warn('[PWA] Install prompt error:', err);
    }
  };

  return { isInstallable, isInstalled, installOutcome, installApp };
};

export default usePWAInstall;
