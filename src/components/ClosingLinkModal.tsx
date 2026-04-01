import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Link as LinkIcon, DollarSign, Calendar, FileSignature, Send } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface ClosingLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: any | null;
}

export default function ClosingLinkModal({ isOpen, onClose, opportunity }: ClosingLinkModalProps) {
  const [loading, setLoading] = useState(false);
  const [contracts, setContracts] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    value: '',
    eventDate: '',
    installments: '1',
    contractTemplateId: 'none'
  });

  useEffect(() => {
    if (opportunity && isOpen) {
      setFormData({
        value: opportunity.value || '',
        eventDate: opportunity.event_date || '',
        installments: '1',
        contractTemplateId: 'none'
      });
      fetchContracts();
    }
  }, [opportunity, isOpen]);

  const fetchContracts = async () => {
    const { data: session } = await supabase.auth.getSession();
    if (!session.session?.user.id) return;
    
    const { data } = await supabase
      .from('contracts')
      .select('id, title')
      .eq('user_id', session.session.user.id)
      .is('client_id', null) // Busca APENAS contratos marcados como Template!
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
      const text = encodeURIComponent(
        `Olá ${opportunity?.name.split(' ')[0]}!\n\nFico muito feliz que vamos fechar negócio! 🎉\n\nAcesse o link seguro abaixo para preencher seus dados, escolher a forma de pagamento e assinar nosso contrato:\n\n${link}`
      );

      toast.success("Link gerado com sucesso!");
      
      if (phone) {
        window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
      } else {
        navigator.clipboard.writeText(link);
        toast.info("Link copiado para a área de transferência (Lead sem telefone).");
      }
      
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao gerar link de fechamento.");
    } finally {
      setLoading(false);
    }
  };

  if (!opportunity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl p-0 overflow-hidden shadow-2xl">
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
                    Modelo: {c.title || 'Sem Título'}
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
      </DialogContent>
    </Dialog>
  );
}