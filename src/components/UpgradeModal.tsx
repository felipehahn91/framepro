import React from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Sparkles, ArrowRight } from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
}

export function UpgradeModal({ isOpen, onClose, featureName }: UpgradeModalProps) {
  const navigate = useNavigate();

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl p-0 overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-orange-500 to-amber-500 p-8 text-center text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <div className="relative z-10 flex flex-col items-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm border border-white/30 shadow-inner">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black mb-2">Faça o Upgrade para o Plus!</DialogTitle>
            <DialogDescription className="text-white/90 text-sm font-medium">
              Desbloqueie todo o poder do seu CRM.
            </DialogDescription>
          </div>
        </div>

        <div className="p-8 text-center space-y-6">
          <div className="bg-orange-50 rounded-2xl p-4 border border-orange-100">
            <p className="text-sm font-semibold text-gray-700">
              A funcionalidade <span className="font-bold text-orange-600">"{featureName}"</span> é exclusiva para assinantes do plano <span className="font-black text-gray-900 uppercase">Plus</span> ou <span className="font-black text-gray-900 uppercase">Founder</span>.
            </p>
          </div>
          
          <p className="text-sm text-gray-500 font-medium">
            Integração com WhatsApp, Google Calendar, PagHiper e Fluxo de Cadência automático disponíveis imediatamente após o upgrade!
          </p>

          <DialogFooter className="flex-col gap-2 sm:gap-0 mt-6 pt-4 border-t border-gray-100">
            <button 
              onClick={() => { onClose(); navigate('/pricing'); }}
              className="w-full py-3.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-colors flex items-center justify-center gap-2 shadow-lg"
            >
              Fazer Upgrade Agora <ArrowRight className="w-4 h-4" />
            </button>
            <button 
              onClick={onClose}
              className="w-full py-3 text-gray-500 font-semibold hover:bg-gray-50 rounded-xl transition-colors"
            >
              Agora não
            </button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}
