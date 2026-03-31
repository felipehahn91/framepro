import React from 'react';
import { usePWA } from '@/contexts/PWAContext';
import { Smartphone, Download, Sparkles, X } from 'lucide-react';

export const PWABanner = () => {
  const { canInstall, isStandalone, install } = usePWA();
  const [dismissed, setDismissed] = React.useState(false);

  // Não mostra se já for app, se não puder instalar ou se o usuário fechou o banner
  if (isStandalone || !canInstall || dismissed) return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-orange-500 to-orange-600 rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-orange-200 mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Elementos Decorativos */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32"></div>
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 rounded-full blur-2xl -ml-16 -mb-16"></div>
      
      <button 
        onClick={() => setDismissed(true)}
        className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors z-10"
      >
        <X className="w-5 h-5" />
      </button>

      <div className="relative z-10 flex flex-col md:flex-row items-center gap-6 md:gap-10">
        <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shrink-0 shadow-inner border border-white/30">
          <Smartphone className="w-10 h-10 text-white drop-shadow-md" />
        </div>

        <div className="flex-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
            <span className="bg-white/20 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/20 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Novidade
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Frame Pro no seu Celular</h2>
          <p className="text-orange-50 font-medium text-sm sm:text-base max-w-xl opacity-90">
            Instale nossa plataforma agora para ter acesso instantâneo, notificações em tempo real e uma experiência muito mais rápida e fluida.
          </p>
        </div>

        <button 
          onClick={install}
          className="w-full md:w-auto px-8 py-4 bg-white text-orange-600 font-black rounded-2xl shadow-lg hover:shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 whitespace-nowrap"
        >
          <Download className="w-5 h-5" /> INSTALAR AGORA
        </button>
      </div>
    </div>
  );
};