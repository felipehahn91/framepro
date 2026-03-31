import React, { useState, useEffect } from 'react';
import { Download, X, Share, PlusSquare } from 'lucide-react';

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    // Verifica se é iOS
    const isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIPhone);

    // Captura o evento de instalação (Chrome/Android/Edge)
    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      // Mostra apenas se o usuário ainda não fechou nesta sessão
      if (!sessionStorage.getItem('pwa_prompt_dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Se for iOS e não estiver em modo standalone (já instalado)
    if (isIPhone && !(navigator as any).standalone) {
      if (!sessionStorage.getItem('pwa_prompt_dismissed')) {
        setShowPrompt(true);
      }
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  const dismissPrompt = () => {
    setShowPrompt(false);
    sessionStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-gray-900 text-white p-5 rounded-2xl shadow-2xl border border-white/10 relative overflow-hidden">
        {/* Decoração de fundo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-20"></div>
        
        <button 
          onClick={dismissPrompt}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg">
            <Download className="w-6 h-6 text-white" />
          </div>
          
          <div className="flex-1 pr-6">
            <h3 className="font-bold text-base mb-1">Instalar Frame Pro</h3>
            
            {isIOS ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-400 leading-relaxed">
                  Para uma melhor experiência, adicione o app à sua tela inicial:
                </p>
                <div className="flex items-center gap-2 text-[11px] font-bold text-orange-400 bg-orange-400/10 p-2 rounded-lg">
                  <Share className="w-3.5 h-3.5" /> 
                  <span>Clique em "Compartilhar" e "Adicionar à Tela de Início"</span>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  Instale nosso aplicativo para acessar o CRM de forma mais rápida e offline.
                </p>
                <button 
                  onClick={handleInstallClick}
                  className="w-full py-2.5 bg-white text-gray-900 font-bold rounded-xl text-sm hover:bg-gray-100 transition-all shadow-sm active:scale-95"
                >
                  Instalar agora
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};