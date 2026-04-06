import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Webhook, CheckCircle2, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

interface WebhookIntegrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  formId: string | null;
  formName: string;
}

export default function WebhookIntegrationModal({ isOpen, onClose, formId, formName }: WebhookIntegrationModalProps) {
  if (!formId) return null;

  // A URL aponta para a Edge Function que acabamos de criar
  const webhookUrl = `https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/webhook-lead?form_id=${formId}`;

  const jsonExample = `{
  "name": "João da Silva",
  "email": "joao@email.com",
  "phone": "5511999999999",
  "instagram": "@joaosilva",
  "notes": "Veio da campanha de Casamento 2024"
}`;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado para a área de transferência!");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] bg-white rounded-3xl p-0 overflow-hidden shadow-2xl">
        <div className="px-6 py-6 border-b border-gray-100 bg-blue-50/50">
          <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Webhook className="w-5 h-5 text-blue-500" />
            Integração via Webhook
          </DialogTitle>
          <DialogDescription className="text-sm font-medium mt-2 text-gray-600">
            Conecte o formulário <strong>{formName}</strong> com Meta Ads, RD Station, Typeform ou qualquer outra ferramenta usando Zapier ou Make.com.
          </DialogDescription>
        </div>

        <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
          
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">1. Sua URL de Webhook Exclusiva</label>
            <p className="text-xs text-gray-500 mb-2">Cole esta URL no Zapier (Webhooks by Zapier) ou Make.com (HTTP Request) usando o método <strong>POST</strong>.</p>
            <div className="flex items-center gap-2">
              <Input readOnly value={webhookUrl} className="bg-gray-50 font-mono text-xs text-blue-600 h-11" />
              <Button onClick={() => handleCopy(webhookUrl)} variant="outline" className="h-11 px-4 shrink-0 shadow-sm">
                <Copy className="w-4 h-4 mr-2" /> Copiar
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-900">2. Formato dos Dados (JSON)</label>
            <p className="text-xs text-gray-500 mb-2">Mapeie os campos do Meta Ads para este formato JSON no corpo (Body) da requisição:</p>
            <div className="relative">
              <pre className="bg-gray-900 text-green-400 p-4 rounded-xl text-xs font-mono overflow-x-auto">
                {jsonExample}
              </pre>
              <Button 
                size="icon" 
                variant="secondary" 
                onClick={() => handleCopy(jsonExample)} 
                className="absolute top-2 right-2 h-8 w-8 bg-white/10 hover:bg-white/20 text-white border-none"
              >
                <Copy className="w-3.5 h-3.5" />
              </Button>
            </div>
            <p className="text-[11px] text-gray-500 mt-2">
              * Apenas o campo <code className="bg-gray-100 px-1 rounded">name</code> é obrigatório. Os demais são opcionais.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <h4 className="font-bold text-blue-900 text-sm mb-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> Como testar no Make.com
            </h4>
            <ol className="text-xs text-blue-800 space-y-1.5 list-decimal list-inside ml-1">
              <li>Crie um módulo <strong>Facebook Lead Ads</strong> (New Lead).</li>
              <li>Adicione um módulo <strong>HTTP</strong> (Make a request).</li>
              <li>Cole a URL acima, escolha o método <strong>POST</strong>.</li>
              <li>Em Body type escolha <strong>Raw</strong>, Content type <strong>JSON (application/json)</strong>.</li>
              <li>Cole o JSON acima e substitua os valores pelas variáveis do Facebook.</li>
            </ol>
          </div>

        </div>

        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex justify-end">
          <Button onClick={onClose} className="bg-gray-900 text-white hover:bg-black rounded-xl px-8 font-bold">
            Entendi, Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}