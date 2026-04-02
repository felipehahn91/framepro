import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Link as LinkIcon, DollarSign, Calendar, FileSignature, Send, CheckCircle2, Copy, RefreshCw, AlertCircle } from 'lucide-react';
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
    contractTemplateId: 'none'
  });

  const [installmentCount, setInstallmentCount] = useState('1');
  const [installments, setInstallments] = useState<any[]>([]);
  const [clientCanEdit, setClientCanEdit] = useState(false);

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
        contractTemplateId: 'none'
      });
      setInstallmentCount('1');
      setInstallments([{
        dueDate: new Date().toISOString().split('T')[0],
        amount: initialValue
      }]);
      setClientCanEdit(false);
      setGeneratedLink(null);
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
      .is('client_id', null)
      .not('title', 'is', null)
      .neq('title', '')
      .order('created_at', { ascending: false });
      
    if (data) setContracts(data);
  };

  const handleGenerateInstallments = () => {
    const count = parseInt(installmentCount);
    const total = parseFloat(formData.value);
    
    if (isNaN(total) || total <= 0) return toast.error("Informe o valor total do contrato primeiro.");
    if (isNaN(count) || count <= 0 || count > 24) return toast.error("Número de parcelas inválido.");
    
    const baseAmount = Math.floor((total / count) * 100) / 100;
    const remainder = total - (baseAmount * count);
    
    const newInsts = [];
    for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        newInsts.push({
            dueDate: d.toISOString().split('T')[0],
            amount: (i === count - 1 ? Number((baseAmount + remainder).toFixed(2)) : baseAmount).toString()
        });
    }
    setInstallments(newInsts);
  };

  const updateInstallment = (index: number, field: string, value: string) => {
    const newInsts = [...installments];
    newInsts[index] = { ...newInsts[index], [field]: value };
    setInstallments(newInsts);
  };

  const totalInstSum = installments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const isSumValid = Math.abs(Number(formData.value) - totalInstSum) < 0.05;

  const handleGenerateLink = async () => {
    if (!formData.value) return toast.error("O valor é obrigatório para gerar o link.");
    if (!isSumValid) return toast.error("A soma das parcelas deve ser igual ao valor total do contrato.");
    
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
        max_installments: parseInt(installmentCount),
        installments: installments,
        client_can_edit_installments: clientCanEdit,
        contract_template_id: formData.contractTemplateId === 'none' ? null : formData.contractTemplateId
      });

      if (error) {
        if (error.code === '42703') {
          throw new Error("As colunas de parcelas personalizadas não existem no banco de dados. Por favor, execute o comando SQL fornecido pelo Dyad.");
        }
        throw error;
      }

      const link = `${window.location.origin}/fechar/${token}`;
      let phone = opportunity?.phone?.replace(/\D/g, '');
      
      if (phone && !phone.startsWith('55') && phone.length <= 11) {
        phone = `55${phone}`;
      }
      
      const text = `Olá ${opportunity?.name.split(' ')[0]}!\n\nFico muito feliz que vamos fechar negócio! 🎉\n\nAcesse o link seguro abaixo para conferir o plano de pagamento e assinar nosso contrato:\n\n${link}`;

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
          toast.warning("Erro ao enviar pelo WhatsApp. Copie o link abaixo para enviar.");
        }
      } else {
        toast.info("Link gerado. O lead não possui telefone cadastrado.");
      }
    } catch (error: any) {
      console.error(error);
      toast.error(error.message || "Erro ao gerar link de fechamento.");
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
      <DialogContent className="sm:max-w-[550px] bg-white rounded-3xl p-0 overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">
        {generatedLink ? (
          <div className="p-8 text-center flex flex-col items-center animate-in zoom-in-95 duration-300 w-full max-w-full overflow-y-auto">
            <div className="w-16 h-16 bg-green-100 text-green-500 rounded-full flex items-center justify-center mb-6 shrink-0">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-black text-gray-900 mb-2">Link Gerado!</h2>
            <p className="text-gray-500 font-medium mb-8 text-sm">
              O link de fechamento foi gerado com sucesso para <strong className="break-words">{opportunity.name}</strong>.
            </p>

            <div className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 sm:p-4 mb-6 relative flex flex-col sm:flex-row items-center gap-3 overflow-hidden">
              <div className="flex-1 w-full text-xs sm:text-sm font-medium text-gray-600 text-center sm:text-left break-all select-all">
                {generatedLink}
              </div>
              <Button variant="outline" onClick={handleCopyLink} className="shrink-0 h-10 w-full sm:w-auto bg-white hover:bg-gray-100 text-gray-700 font-bold border-gray-200 shadow-sm rounded-lg flex items-center gap-2">
                <Copy className="w-4 h-4" /> Copiar
              </Button>
            </div>

            <Button onClick={onClose} className="w-full bg-gray-900 hover:bg-black text-white rounded-xl h-12 font-bold shrink-0">
              Concluir
            </Button>
          </div>
        ) : (
          <>
            <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
              <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-orange-500" />
                Gerar Link de Fechamento
              </DialogTitle>
              <DialogDescription className="text-sm font-medium mt-2">
                Configure o plano de pagamento e envie para <strong>{opportunity.name}</strong> assinar.
              </DialogDescription>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
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

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-end gap-3">
                  <div className="flex-1 space-y-2">
                    <Label className="font-bold text-gray-700">Quantidade de Parcelas</Label>
                    <Input 
                      type="number" min="1" max="24"
                      value={installmentCount}
                      onChange={e => setInstallmentCount(e.target.value)}
                      className="bg-white border-gray-200 h-10 focus:ring-orange-400"
                    />
                  </div>
                  <Button onClick={handleGenerateInstallments} variant="secondary" className="h-10 font-bold bg-white hover:bg-gray-100 border border-gray-200 text-gray-700 shadow-sm">
                    <RefreshCw className="w-4 h-4 mr-2" /> Distribuir
                  </Button>
                </div>

                <div className="space-y-3 pt-2">
                  <Label className="font-bold text-gray-700">Plano de Pagamento</Label>
                  {installments.map((inst, idx) => (
                    <div key={idx} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center text-sm font-bold text-gray-500 shrink-0">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <Input 
                          type="date" 
                          value={inst.dueDate} 
                          onChange={(e) => updateInstallment(idx, 'dueDate', e.target.value)}
                          className="bg-white border-gray-200 text-sm focus:ring-orange-400 h-10"
                        />
                      </div>
                      <div className="flex-1">
                        <Input 
                          type="number" step="0.01"
                          value={inst.amount} 
                          onChange={(e) => updateInstallment(idx, 'amount', e.target.value)}
                          className="bg-white border-gray-200 text-sm font-bold focus:ring-orange-400 h-10"
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className={`flex items-center justify-between p-3 rounded-xl border font-bold text-sm ${isSumValid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                  <span>Soma das Parcelas: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalInstSum)}</span>
                  {!isSumValid && <span className="flex items-center gap-1"><AlertCircle className="w-4 h-4"/> Diferença: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(formData.value) - totalInstSum)}</span>}
                </div>

                <div className="pt-2 border-t border-gray-200">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <Checkbox 
                      checked={clientCanEdit}
                      onCheckedChange={(c) => setClientCanEdit(c as boolean)}
                      className="border-gray-300 data-[state=checked]:bg-orange-500 data-[state=checked]:border-orange-500"
                    />
                    <div className="flex flex-col">
                      <span className="text-sm font-bold text-gray-800">Permitir que o cliente edite as parcelas</span>
                      <span className="text-xs text-gray-500">Ele poderá alterar datas e valores antes de assinar.</span>
                    </div>
                  </label>
                </div>
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

            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
              <Button variant="outline" onClick={onClose} className="rounded-xl h-11 px-6 font-bold text-gray-600">
                Cancelar
              </Button>
              <Button 
                onClick={handleGenerateLink} 
                disabled={loading || !formData.value || !isSumValid}
                className="bg-green-500 hover:bg-green-600 text-white rounded-xl h-11 px-6 font-bold flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Gerar Link e Enviar
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}