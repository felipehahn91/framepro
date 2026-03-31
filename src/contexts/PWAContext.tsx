import React, { createContext, useContext, useEffect, useState } from 'react';

type PWAContextType = {
  canInstall: boolean;
  isStandalone: boolean;
  install: () => Promise<void>;
};

const PWAContext = createContext<PWAContextType>({
  canInstall: false,
  isStandalone: false,
  install: async () => {},
});

export const PWAProvider = ({ children }: { children: React.ReactNode }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [canInstall, setCanInstall] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setCanInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setCanInstall(false);
    }
    setDeferredPrompt(null);
  };

  return (
    <PWAContext.Provider value={{ canInstall, isStandalone, install }}>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => useContext(PWAContext);