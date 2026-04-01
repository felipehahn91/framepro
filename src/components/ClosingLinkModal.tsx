import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link as LinkIcon, DollarSign, Calendar, FileSignature, Send, CheckCircle2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { sendTextMessage } from '@/lib/evolution';

interface ClosingLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: any | null;
}

export default function ClosingLinkModal({ isOpen, onClose, opportunity }: ClosingLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    value: '',
    eventDate: '',
    installments: '1',
    contractTemplateId: 'none'
  });

  useEffect(() => {
    if (opportunity && isOpen) {
      let initialValue = opportunity.value || '';
      if (typeof initialValue === 'string') {
          const numericStr = initialValue.replace(/\D/g, '');
          if (numericStr) {
              initialValue = (Number(numericStr) / 100).toFixed(2);
          }
      }

      setFormData({
        value: initialValue,
        eventDate: opportunity.event_date || '',
        installments: '1',
        contractTemplateId: 'none'
      });
      setGeneratedLink(null);
      fetchContracts();
    }
  }, [opportunity, isOpen]);

  const fetchContracts = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user.id) return;
    
    // Busca APENAS contratos que são modelos (client_id é nulo E possuem título)
    const { data } = await supabase
      .from('contracts')
      .select('id, title')
      .eq('user_id', session.session.user.id)
      .is('client_id', null)
      .not('title', 'is', null)
      .neq('title', '')
      .order('created_at', { ascending: false });
      
    if (data) setContracts(data);
  };

  const handleGenerateLink = async () => {
    if (!formData.value) return toast.error("O valor é obrigatório para gerar o link.");
    
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Usuário não autenticado");

      const token = crypto.randomUUID();
      
      const { error } = await supabase.from('closing_links').insert({
        user_id: userId,
        opportunity_id: opportunity.id,
        token: token,
        value: parseFloat(formData.value),
        event_date: formData.eventDate || null,
        max_installments: parseInt(formData.installments),
        contract_template_id: formData.contractTemplateId === 'none' ? null : formData.contractTemplateId
      });

      if (error) throw error;

      const link = `${window.location.origin}/fechar/${token}`;
      const phone = opportunity?.phone?.replace(/\D/g, '');
      const text = `Olá ${opportunity?.name.split(' ')[0]}!\n\nFico muito feliz que vamos fechar negócio! 🎉\n\nAcesse o link seguro abaixo para preencher seus dados, escolher a forma de pagamento e assinar nosso contrato:\n\n${link}`;

      setGeneratedLink(link);
      
      if (phone) {
        try {
          const { data: waInstance } = await supabase
            .from('whatsapp_instances')
            .select('instance_name')
            .eq('user_id', userId)
            .eq('status', 'connected')
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (waInstance) {
            await sendTextMessage(waInstance.instance_name, phone, text);
            toast.success("Link gerado e enviado via WhatsApp automaticamente!");
          } else {
            toast.warning("WhatsApp não conectado. Copie o link para enviar manualmente.");
          }
        } catch (err) {
          console.error("Erro Evolution:", err);
          toast.warning("Erro ao enviar pelo WhatsApp. Copie o link abaixo para enviar.");
        }
      } else {
        toast.info("Link gerado. O lead não possui telefone cadastrado.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar link de fechamento.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast.success("Link copiado para a área de transferência!");
    }
  };

  if (!opportunity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl p-0 overflow-hidden shadow-2xl">
        {generatedLink ? (
          <div className="p-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Link Gerado!</h2>
            <p className="text-gray-500 font-medium mb-8 text-sm">
              O link de fechamento foi gerado com sucesso para <strong>{opportunity.name}</strong>.
            </p>

            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 relative group flex items-center gap-3">
              <div className="truncate flex-1 text-sm font-medium text-gray-600 text-left select-all">
                {generatedLink}
              </div>
              <Button size="icon" variant="ghost" onClick={handleCopyLink} className="shrink-0 h-8 w-8 hover:bg-gray-200 text-gray-500 hover:text-gray-900">
                <Copy className="w-4 h-4" />
              </Button>
            </div>

            <Button onClick={onClose} className="w-full bg-gray-900 hover:bg-black text-white rounded-xl h-12 font-bold">
              Concluir
            </Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-orange-500" />
                Gerar Link de Fechamento
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-2">
                Envie um link seguro para <strong>{opportunity.name}</strong> preencher os dados, escolher a forma de pagamento e assinar o contrato.
              </DialogDescription>
            </div>

            <div className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700 flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-gray-400" /> Valor Total (R$)
                  </Label>
                  <Input 
                    type="number" 
                    placeholder="0.00"
                    value={formData.value}
                    onChange={e => setFormData({...formData, value: e.target.value})}
                    className="bg-gray-50 border-gray-200 focus:ring-orange-400 font-bold text-lg h-12"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-bold text-gray-700 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-gray-400" /> Data do Evento
                  </Label>
                  <Input 
                    type="date"
                    value={formData.eventDate}
                    onChange={e => setFormData({...formData, eventDate: e.target.value})}
                    className="bg-gray-50 border-gray-200 focus:ring-orange-400 h-12"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700">Parcelamento Máximo Permitido</Label>
                <Select value={formData.installments} onValueChange={(val) => setFormData({...formData, installments: val})}>
                  <SelectTrigger className="bg-gray-50 border-gray-200 h-12 focus:ring-orange-400">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Apenas à vista (1x)</SelectItem>
                    <SelectItem value="2">Até 2x sem juros</SelectItem>
                    <SelectItem value="3">Até 3x sem juros</SelectItem>
                    <SelectItem value="5">Até 5x sem juros</SelectItem>
                    <SelectItem value="10">Até 10x sem juros</SelectItem>
                    <SelectItem value="12">Até 12x sem juros</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">O cliente poderá escolher no formulário quantas parcelas deseja, dentro deste limite.</p>
              </div>

              <div className="space-y-2">
                <Label className="font-bold text-gray-700 flex items-center gap-1.5">
                  <FileSignature className="w-4 h-4 text-gray-400" /> Modelo de Contrato Base
                </Label>
                <Select value={formData.contractTemplateId} onValueChange={(val) => setFormData({...formData, contractTemplateId: val})}>
                  <SelectTrigger className="bg-gray-50 border-gray-200 h-12 focus:ring-orange-400">
                    <SelectValue placeholder="Selecione um modelo..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Contrato em branco (apenas assinaturas)</SelectItem>
                    {contracts.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        Modelo: {c.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">As variáveis mágicas serão preenchidas com os dados informados pelo cliente.</p>
              </div>
            </div>

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6 font-bold text-gray-600">
                Cancelar
              </Button>
              <Button 
                onClick={handleGenerateLink} 
                disabled={loading || !formData.value}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-11 px-6 font-bold flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gerar Link e Enviar WhatsApp
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}