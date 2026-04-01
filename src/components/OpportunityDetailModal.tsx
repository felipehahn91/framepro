import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Trash2, UserMinus, UserPlus, FileText, Calculator, 
  MessageCircle, Mail, Phone, Instagram, MapPin, Loader2,
  Save, Send
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Opportunity {
  id: string;
  pipeline_id: string;
  column_id: string;
  name: string;
  tag: string;
  email: string;
  phone: string;
  value: string;
  instagram: string;
  company: string;
  avatar_url: string;
  address: string;
  observations: string;
  event_date: string;
  is_client: boolean;
  user_id: string;
}

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  onSave: (updatedOpp: Opportunity) => void;
  onDelete: (id: string) => void;
  onOpenCadence?: (opp: Opportunity) => void;
}

const getObservationString = (obs: string | null | undefined) => {
  if (!obs) return '';
  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed)) {
      return parsed.map(n => n.content).join('\n\n');
    }
    return obs;
  } catch {
    return obs;
  }
};

export default function OpportunityDetailModal({ 
  isOpen, onClose, opportunity, onSave, onDelete, onOpenCadence 
}: OpportunityDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Opportunity>>({});
  
  // Estados para os modais de envio
  const [docType, setDocType] = useState<'contract' | 'orcamento' | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);

  useEffect(() => {
    if (opportunity && isOpen) {
      setFormData({
        ...opportunity,
        observations: getObservationString(opportunity.observations)
      });
    }
  }, [opportunity, isOpen]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const cleanedPhone = (formData.phone || '').split('@')[0].replace(/\D/g, '');

      const { data, error } = await supabase
        .from('opportunities')
        .update({
          name: formData.name,
          email: formData.email,
          phone: cleanedPhone,
          instagram: formData.instagram,
          value: formData.value,
          address: formData.address,
          observations: formData.observations,
        })
        .eq('id', opportunity!.id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Dados salvos com sucesso!');
      onSave(data as Opportunity);
    } catch (error) {
      toast.error('Erro ao atualizar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleClient = async () => {
    try {
      const newStatus = !formData.is_client;
      const { data, error } = await supabase
        .from('opportunities')
        .update({ is_client: newStatus })
        .eq('id', opportunity!.id)
        .select()
        .single();

      if (error) throw error;
      
      setFormData(prev => ({ ...prev, is_client: newStatus }));
      onSave(data as Opportunity);
      toast.success(newStatus ? 'Marcado como cliente!' : 'Removido de clientes.');
    } catch (error) {
      toast.error('Erro ao atualizar status.');
    }
  };

  const openSendModal = async (type: 'contract' | 'orcamento') => {
    setDocType(type);
    setLoadingDocs(true);
    try {
      const table = type === 'contract' ? 'contracts' : 'orcamentos';
      const { data, error } = await supabase
        .from(table)
        .select('id, name, share_token')
        .eq('user_id', opportunity?.user_id)
        .order('updated_at', { ascending: false });
        
      if (error && error.code !== '42P01') throw error;
      setDocuments(data || []);
    } catch (e) {
      toast.error(`Erro ao carregar ${type === 'contract' ? 'contratos' : 'orçamentos'}`);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSendDocument = async (doc: any) => {
    let token = doc.share_token;
    
    // Se o documento não tiver um token público gerado, gera um agora
    if (!token) {
      token = crypto.randomUUID();
      const table = docType === 'contract' ? 'contracts' : 'orcamentos';
      await supabase.from(table).update({ share_token: token }).eq('id', doc.id);
    }
    
    const docPath = docType === 'contract' ? 'contratos' : 'orcamentos';
    const url = `${window.location.origin}/${docPath}/public/${token}`;
    const phone = formData.phone?.replace(/\D/g, '');
    
    if (phone) {
      const text = encodeURIComponent(`Olá! Aqui está o link para acessar o documento: ${url}`);
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado! (Lead sem telefone salvo)");
    }
    
    setDocType(null);
  };

  if (!isOpen || !opportunity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[450px] p-0 bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 sm:p-8 relative">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <input 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="text-2xl sm:text-3xl font-extrabold text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full outline-none leading-tight"
              placeholder="Nome do Lead"
            />
            <button 
              onClick={() => { if(confirm('Excluir este lead?')) onDelete(opportunity.id); }} 
              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors shrink-0 ml-2"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
          
          <div className="flex items-center gap-2 mb-8">
            <span className="text-sm text-gray-500 font-medium">Lead</span>
            {formData.tag && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="text-sm text-gray-500 font-medium">{formData.tag}</span>
              </>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-10">
            <button 
              onClick={handleToggleClient}
              className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-xl font-bold transition-all shadow-sm ${formData.is_client ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-[#4ade80] hover:bg-[#22c55e] text-white'}`}
            >
              {formData.is_client ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {formData.is_client ? 'Remover Cliente' : 'Marcar como Cliente'}
            </button>

            <button 
              onClick={() => openSendModal('contract')}
              className="w-full flex items-center gap-3 py-3.5 px-5 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <FileText className="w-5 h-5 text-blue-500" />
              Enviar Contrato
            </button>

            <button 
              onClick={() => openSendModal('orcamento')}
              className="w-full flex items-center gap-3 py-3.5 px-5 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Calculator className="w-5 h-5 text-emerald-500" />
              Enviar Orçamento
            </button>

            <button 
              onClick={() => onOpenCadence && onOpenCadence(opportunity)}
              className="w-full flex items-center gap-3 py-3.5 px-5 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <MessageCircle className="w-5 h-5 text-orange-400" />
              Fazer Follow Up
            </button>
          </div>

          {/* Details */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Detalhes</h3>
            
            <div className="mb-6">
              <label className="text-sm text-gray-500 block mb-1">Valor</label>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-gray-900">R$</span>
                <input 
                  type="number"
                  value={formData.value || ''} 
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  className="text-2xl font-black text-gray-400 placeholder:text-gray-300 bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-4 mb-6">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-500 shrink-0" />
                <input 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="text-base text-gray-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-400"
                  placeholder="simone2306@gmail.com"
                />
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-500 shrink-0" />
                <input 
                  value={formData.phone || ''} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="text-base text-gray-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-400"
                  placeholder="5511974543704"
                />
              </div>
              <div className="flex items-center gap-3">
                <Instagram className="w-5 h-5 text-gray-500 shrink-0" />
                <input 
                  value={formData.instagram || ''} 
                  onChange={e => setFormData({...formData, instagram: e.target.value})}
                  className="text-base text-gray-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-400"
                  placeholder="Instagram (@)"
                />
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="w-5 h-5 text-gray-500 shrink-0" />
                <input 
                  value={formData.address || ''} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="text-base text-gray-700 bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-400"
                  placeholder="Local / Endereço"
                />
              </div>
            </div>

            <div className="mb-6">
              <label className="text-sm text-gray-500 block mb-2">Observações</label>
              <textarea 
                value={formData.observations || ''}
                onChange={e => setFormData({...formData, observations: e.target.value})}
                className="w-full bg-gray-50 rounded-2xl p-4 text-sm text-gray-700 resize-none outline-none focus:ring-2 focus:ring-gray-200 min-h-[140px]"
                placeholder="Anotações sobre o lead..."
              />
            </div>
          </div>

          {/* Sticky Save Button inside the scrollable area at the bottom */}
          <div className="sticky bottom-0 bg-gradient-to-t from-white via-white to-transparent pt-6 pb-2 flex justify-center mt-4">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-8 py-3.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-xl transition-all flex items-center gap-2 active:scale-95"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              Salvar Alterações
            </button>
          </div>

        </div>
      </DialogContent>

      {/* Sub-Modal para Selecionar Documento */}
      {docType && (
        <Dialog open={!!docType} onOpenChange={() => setDocType(null)}>
          <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Selecione o {docType === 'contract' ? 'Contrato' : 'Orçamento'}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {loadingDocs ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
              ) : documents.length > 0 ? (
                documents.map(doc => (
                  <button 
                    key={doc.id}
                    onClick={() => handleSendDocument(doc)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group shadow-sm"
                  >
                    <span className="font-semibold text-gray-800 text-sm truncate pr-4">{doc.name}</span>
                    <Send className="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-gray-500 font-medium">
                    Nenhum {docType === 'contract' ? 'contrato' : 'orçamento'} encontrado no sistema.
                  </p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}