import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  X, Trash2, UserMinus, UserPlus, FileText, Calculator, 
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
      <DialogContent className="sm:max-w-[450px] p-0 bg-white rounded-3xl overflow-hidden shadow-2xl">
        <div className="p-8">
          
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <input 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="text-2xl font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full outline-none"
              placeholder="Nome do Lead"
            />
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => { if(confirm('Excluir este lead?')) onDelete(opportunity.id); }} className="p-1.5 text-red-500 hover:bg-red-50 rounded-md transition-colors">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-3 mb-8">
            {formData.tag && (
              <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-md text-xs font-semibold">
                {formData.tag}
              </span>
            )}
            <span className="text-gray-500 text-xs font-medium">Lead</span>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 mb-8">
            <button 
              onClick={handleToggleClient}
              className={`w-full flex items-center justify-center gap-3 py-3 rounded-xl font-bold transition-all shadow-sm ${formData.is_client ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-green-500 hover:bg-green-600 text-white'}`}
            >
              {formData.is_client ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
              {formData.is_client ? 'Remover Cliente' : 'Marcar como Cliente'}
            </button>

            <button 
              onClick={() => openSendModal('contract')}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <FileText className="w-5 h-5 text-blue-500" />
              Enviar Contrato
            </button>

            <button 
              onClick={() => openSendModal('orcamento')}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <Calculator className="w-5 h-5 text-emerald-500" />
              Enviar Orçamento
            </button>

            <button 
              onClick={() => onOpenCadence && onOpenCadence(opportunity)}
              className="w-full flex items-center gap-3 py-3 px-4 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
            >
              <MessageCircle className="w-5 h-5 text-orange-500" />
              Fazer Follow Up
            </button>
          </div>

          <div className="border-t border-gray-100 my-6"></div>

          {/* Details */}
          <div>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-4">Detalhes</h3>
            
            <div className="mb-4">
              <label className="text-xs text-gray-500 block mb-1">Valor</label>
              <div className="flex items-center gap-1">
                <span className="text-lg font-bold text-gray-900">R$</span>
                <input 
                  type="number"
                  value={formData.value || ''} 
                  onChange={e => setFormData({...formData, value: e.target.value})}
                  className="text-lg font-bold text-gray-900 bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                  placeholder="0,00"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3 text-gray-600">
                <Mail className="w-4 h-4 shrink-0" />
                <input 
                  value={formData.email || ''} 
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="text-sm bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                  placeholder="E-mail"
                />
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Phone className="w-4 h-4 shrink-0" />
                <input 
                  value={formData.phone || ''} 
                  onChange={e => setFormData({...formData, phone: e.target.value})}
                  className="text-sm bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                  placeholder="WhatsApp / Telefone"
                />
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <Instagram className="w-4 h-4 shrink-0" />
                <input 
                  value={formData.instagram || ''} 
                  onChange={e => setFormData({...formData, instagram: e.target.value})}
                  className="text-sm bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                  placeholder="Instagram (@)"
                />
              </div>
              <div className="flex items-center gap-3 text-gray-600">
                <MapPin className="w-4 h-4 shrink-0" />
                <input 
                  value={formData.address || ''} 
                  onChange={e => setFormData({...formData, address: e.target.value})}
                  className="text-sm bg-transparent border-none p-0 focus:ring-0 outline-none w-full"
                  placeholder="Local / Endereço"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="text-xs text-gray-500 block mb-2">Observações</label>
              <textarea 
                value={formData.observations || ''}
                onChange={e => setFormData({...formData, observations: e.target.value})}
                className="w-full bg-gray-50 rounded-xl p-4 text-sm text-gray-700 resize-none outline-none focus:ring-2 focus:ring-orange-400 min-h-[100px]"
                placeholder="Anotações sobre o lead..."
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={loading}
              className="px-6 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Alterações
            </button>
          </div>
        </div>
      </DialogContent>

      {/* Sub-Modal para Selecionar Documento */}
      {docType && (
        <Dialog open={!!docType} onOpenChange={() => setDocType(null)}>
          <DialogContent className="sm:max-w-[400px] bg-white rounded-2xl p-6">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold">
                Selecione o {docType === 'contract' ? 'Contrato' : 'Orçamento'}
              </DialogTitle>
            </DialogHeader>
            <div className="mt-4 max-h-[60vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {loadingDocs ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-500" /></div>
              ) : documents.length > 0 ? (
                documents.map(doc => (
                  <button 
                    key={doc.id}
                    onClick={() => handleSendDocument(doc)}
                    className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-300 hover:bg-orange-50 transition-all text-left group"
                  >
                    <span className="font-semibold text-gray-800 text-sm truncate pr-4">{doc.name}</span>
                    <Send className="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                  </button>
                ))
              ) : (
                <p className="text-center py-6 text-sm text-gray-500">
                  Nenhum {docType === 'contract' ? 'contrato' : 'orçamento'} encontrado no sistema.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}