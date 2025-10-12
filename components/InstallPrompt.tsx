import React, { useState, useEffect } from 'react';

interface InstallPromptProps {
  translations: {
    installTitle: string;
    installMessage: string;
    installButton: string;
    installLater: string;
  };
}

export const InstallPrompt: React.FC<InstallPromptProps> = ({ translations }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Check if user has dismissed before
      const dismissed = localStorage.getItem('installPromptDismissed');
      const dismissedDate = dismissed ? parseInt(dismissed) : 0;
      const now = Date.now();
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      
      // Show prompt if never dismissed or dismissed more than 7 days ago
      if (!dismissed || (now - dismissedDate > sevenDays)) {
        // Wait 30 seconds before showing
        setTimeout(() => setShowPrompt(true), 30000);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    localStorage.setItem('installPromptDismissed', Date.now().toString());
    setShowPrompt(false);
  };

  if (!showPrompt || !deferredPrompt) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-white rounded-lg shadow-2xl border border-gray-200 p-4 z-50 animate-slide-up">
      <div className="flex items-start gap-3">
        <div className="text-3xl">📱</div>
        <div className="flex-1">
          <h3 className="font-bold text-gray-900 mb-1">{translations.installTitle}</h3>
          <p className="text-sm text-gray-600 mb-3">{translations.installMessage}</p>
          <div className="flex gap-2">
            <button
              onClick={handleInstall}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              {translations.installButton}
            </button>
            <button
              onClick={handleDismiss}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors text-sm"
            >
              {translations.installLater}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

