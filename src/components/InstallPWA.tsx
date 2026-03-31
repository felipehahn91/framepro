import React, { useState, useEffect } from 'react';
import { Download, X, Share, Monitor } from 'lucide-react';
import { toast } from 'sonner';

export const InstallPWA = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verifica se já está instalado/rodando como app
    const checkStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone === true;
    setIsStandalone(checkStandalone);

    // Verifica se é iOS
    const isIPhone = /iPhone|iPad|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    setIsIOS(isIPhone);

    // Captura o evento no Chrome/Android
    const handler = (e: any) => {
      console.log('PWA: Evento beforeinstallprompt disparado');
      e.preventDefault();
      setDeferredPrompt(e);
      
      // Só mostra se não estiver instalado e não tiver sido fechado nesta sessão
      if (!checkStandalone && !sessionStorage.getItem('pwa_prompt_dismissed')) {
        setShowPrompt(true);
      }
    };

    window.addEventListener('beforeinstallprompt', handler);

    // Fallback para iOS (já que eles não disparam o evento acima)
    if (isIPhone && !checkStandalone && !sessionStorage.getItem('pwa_prompt_dismissed')) {
      setShowPrompt(true);
    }

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Se não houver o prompt (ex: Chrome Desktop onde o botão fica na barra de endereço)
      toast.info("Clique no ícone de instalação na barra de endereço do seu navegador.");
      return;
    }
    
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

  // Se já estiver instalado ou o usuário fechou, não mostra nada
  if (isStandalone || !showPrompt) return null;

  return (
    <div className="fixed bottom-6 left-4 right-4 md:left-auto md:right-8 md:w-96 z-[100] animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="bg-gray-900 text-white p-6 rounded-3xl shadow-2xl border border-white/10 relative overflow-hidden ring-1 ring-white/20">
        {/* Efeito visual de luxo */}
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500 rounded-full blur-3xl opacity-30"></div>
        
        <button 
          onClick={dismissPrompt}
          className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-start gap-5">
          <div className="w-14 h-14 bg-orange-500 rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-orange-500/20">
            <Download className="w-7 h-7 text-white" />
          </div>
          
          <div className="flex-1 pr-4">
            <h3 className="font-black text-lg mb-1 tracking-tight">App Frame Pro</h3>
            
            {isIOS ? (
              <div className="space-y-3">
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Instale no seu iPhone para usar offline e ter acesso rápido:
                </p>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3 text-[11px] font-bold text-orange-400 bg-orange-400/10 p-2.5 rounded-xl border border-orange-400/20">
                    <Share className="w-4 h-4 shrink-0" /> 
                    <span>1. Clique no botão de compartilhar</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] font-bold text-orange-400 bg-orange-400/10 p-2.5 rounded-xl border border-orange-400/20">
                    <Monitor className="w-4 h-4 shrink-0" /> 
                    <span>2. Selecione "Adicionar à Tela de Início"</span>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-400 leading-relaxed mb-4 font-medium">
                  Deseja instalar nosso aplicativo para acesso rápido e gerenciar seu negócio direto da tela inicial?
                </p>
                <button 
                  onClick={handleInstallClick}
                  className="w-full py-3 bg-white text-gray-900 font-black rounded-xl text-sm hover:bg-orange-50 hover:text-orange-600 transition-all shadow-md active:scale-95"
                >
                  INSTALAR AGORA
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};