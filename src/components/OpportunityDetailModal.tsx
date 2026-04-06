import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  Trash2, UserMinus, UserPlus, FileText, Calculator, 
  MessageCircle, Mail, Phone, Instagram, MapPin, Loader2,
  Save, Send, X, Search, Link as LinkIcon, Zap
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useAuth } from '@/contexts/AuthContext';
import { UpgradeModal } from './UpgradeModal';

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
  onOpenClosingLink?: (opp: Opportunity) => void;
}

const getObservationString = (obs: string | null | undefined) => {
  if (!obs) return '';
  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed)) {
      return parsed.map((n: any) => n.content).join('\n\n');
    }
    return obs;
  } catch {
    return obs;
  }
};

export default function OpportunityDetailModal({
  isOpen, onClose, opportunity, onSave, onDelete, onOpenCadence, onOpenClosingLink
}: OpportunityDetailModalProps) {
  const { profile } = useAuth();
  const isStarter = profile?.role !== 'admin' && (profile?.plan_type === 'starter' || profile?.plan_type === 'monthly' || !profile?.plan_type);

  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Opportunity>>({});
  
  // Status do Fluxo de Cadência
  const [activeCadence, setActiveCadence] = useState<any>(null);

  // Estados para os modais de envio
  const [docType, setDocType] = useState<'contract' | 'orcamento' | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docSearch, setDocSearch] = useState('');
  
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");

  useEffect(() => {
    if (opportunity && isOpen) {
      let formattedValue = opportunity.value || '';
      let v = formattedValue.replace(/\D/g, '');
      if (v) {
          formattedValue = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) / 100);
      } else {
          formattedValue = '';
      }

      setFormData({
        ...opportunity,
        value: formattedValue,
        observations: getObservationString(opportunity.observations)
      });

      fetchCadenceStatus();
    } else {
      setActiveCadence(null);
    }
  }, [opportunity, isOpen]);

  const fetchCadenceStatus = async () => {
    if (!opportunity?.id) return;
    const { data: queueData } = await supabase
      .from('cadencia_queue')
      .select('*')
      .eq('opportunity_id', opportunity.id);

    if (queueData && queueData.length > 0) {
      const pending = queueData.filter((q: any) => q.status === 'pending');
      if (pending.length > 0) {
        const flowId = pending[0].flow_id;
        const flowItems = queueData.filter((q: any) => q.flow_id === flowId);
        const completedCount = flowItems.filter((q: any) => q.status === 'completed' || q.status === 'failed').length;
        const totalCount = flowItems.length;
        const nextItem = pending.sort((a:any, b:any) => new Date(a.scheduled_for).getTime() - new Date(b.scheduled_for).getTime())[0];

        const { data: flowData } = await supabase.from('cadencia_flows').select('name').eq('id', flowId).maybeSingle();

        setActiveCadence({
           flowId,
           flowName: flowData?.name || 'Fluxo Automático',
           completedCount,
           totalCount,
           nextDate: nextItem.scheduled_for
        });
      } else {
        setActiveCadence(null);
      }
    } else {
      setActiveCadence(null);
    }
  };

  const handleCancelCadence = async () => {
    if (!confirm('Deseja realmente cancelar os envios automáticos para este lead?')) return;
    try {
      await supabase
        .from('cadencia_queue')
        .delete()
        .eq('opportunity_id', opportunity!.id)
        .eq('status', 'pending');
      
      toast.success('Fluxo de cadência cancelado.');
      setActiveCadence(null);
    } catch(e) {
      toast.error('Erro ao cancelar fluxo.');
    }
  };

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
      onClose();
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
    setDocSearch('');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = opportunity?.user_id || sessionData.session?.user.id;

      if (!currentUserId) throw new Error('Usuário não autenticado');

      if (type === 'orcamento') {
        const { data, error } = await supabase
          .from('orcamentos')
          .select('id, name, share_token')
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        setDocuments(data || []);
      } else {
        const { data, error } = await supabase
          .from('contracts')
          .select('id, share_token, opportunities(name)')
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        
        const formattedData = (data || []).map((doc: any) => ({
          id: doc.id,
          share_token: doc.share_token,
          name: doc.opportunities?.name ? `Contrato: ${doc.opportunities.name}` : 'Contrato (Sem cliente)'
        }));
        
        setDocuments(formattedData);
      }
    } catch (e: any) {
      console.error(e);
      toast.error(`Erro ao carregar ${type === 'contract' ? 'contratos' : 'orçamentos'}`);
    } finally {
      setLoadingDocs(false);
    }
  };

  const handleSendDocument = async (doc: any) => {
    let token = doc.share_token;
    
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

  const filteredDocs = documents.filter(d => d.name.toLowerCase().includes(docSearch.toLowerCase()));

  if (!isOpen || !opportunity) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="sm:max-w-[850px] p-0 bg-white rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogTitle className="sr-only">Detalhes da Oportunidade</DialogTitle>
        <DialogDescription className="sr-only">Visualize ou edite os detalhes do lead.</DialogDescription>
        
        {/* Container Principal: 2 Colunas */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden h-full">
          
          {/* ESQUERDA - Info Principais */}
          <div className="flex-1 flex flex-col overflow-y-auto custom-scrollbar p-6 md:p-8">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 font-medium">Lead</span>
                  {formData.tag && (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span>
                      <span className="bg-orange-50 text-orange-600 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider">
                        {formData.tag}
                      </span>
                    </>
                  )}
               </div>
               {/* Mobile Delete Button */}
               <button onClick={() => { if(confirm('Excluir este lead?')) onDelete(opportunity.id); }} className="md:hidden p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                 <Trash2 className="w-4 h-4" />
               </button>
            </div>

            {/* Nome */}
            <input 
              value={formData.name || ''} 
              onChange={e => setFormData({...formData, name: e.target.value})}
              className="text-3xl sm:text-4xl font-extrabold text-gray-900 bg-transparent border-none p-0 focus:ring-0 w-full outline-none leading-tight mb-8"
              placeholder="Nome do Lead"
            />

            {/* Valor */}
            <div className="mb-6 p-5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 transition-all">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Valor da Oportunidade</label>
              <div className="flex items-center gap-2">
                <input 
                  type="text"
                  value={formData.value || ''} 
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (!v) { setFormData({...formData, value: ''}); return; }
                    const formatted = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v) / 100);
                    setFormData({...formData, value: formatted});
                  }}
                  className="text-3xl font-black text-gray-900 bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-300"
                  placeholder="R$ 0,00"
                />
              </div>
            </div>

            {/* Observações */}
            <div className="flex flex-col flex-1 min-h-[200px]">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest block mb-2">Anotações e Histórico</label>
              <textarea 
                value={formData.observations || ''}
                onChange={e => setFormData({...formData, observations: e.target.value})}
                className="w-full flex-1 bg-gray-50 rounded-2xl p-5 text-sm text-gray-700 resize-none outline-none focus:ring-2 focus:ring-orange-400 border border-gray-100 shadow-sm min-h-[150px] leading-relaxed"
                placeholder="Detalhes do cliente, histórico de conversas, preferências..."
              />
            </div>
          </div>

          {/* DIREITA - Ações e Contatos */}
          <div className="w-full md:w-[340px] bg-gray-50/80 border-l border-gray-100 flex flex-col overflow-y-auto custom-scrollbar shrink-0">
            <div className="p-6 md:p-8 space-y-8">
              
              {/* Header Right Col (Desktop Delete) */}
              <div className="hidden md:flex justify-end">
                <button onClick={() => { if(confirm('Excluir este lead?')) onDelete(opportunity.id); }} className="flex items-center gap-2 text-xs font-bold text-red-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors">
                  <Trash2 className="w-4 h-4" /> Excluir Lead
                </button>
              </div>

              {/* Status Cadência */}
              {activeCadence && (
                <div className="bg-orange-50 border border-orange-100 rounded-xl p-4 shadow-sm">
                  <h3 className="text-[11px] font-bold text-orange-600 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" /> Cadência Ativa
                  </h3>
                  <p className="text-sm font-bold text-gray-900 mb-1">{activeCadence.flowName}</p>
                  
                  <div className="flex items-center justify-between text-xs text-gray-600 font-medium mb-3">
                    <span>Etapa {activeCadence.completedCount + 1} de {activeCadence.totalCount}</span>
                    <span>{activeCadence.totalCount - activeCadence.completedCount} pendentes</span>
                  </div>
                  
                  <div className="w-full bg-orange-200/50 rounded-full h-1.5 mb-3 overflow-hidden">
                    <div 
                      className="bg-orange-500 h-full rounded-full transition-all" 
                      style={{ width: `${(activeCadence.completedCount / activeCadence.totalCount) * 100}%` }}
                    />
                  </div>

                  <p className="text-[10px] text-gray-500 mb-3 font-medium">
                    Próximo envio: {new Date(activeCadence.nextDate).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>

                  <button 
                    onClick={handleCancelCadence}
                    className="w-full py-2 bg-white border border-red-100 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <X className="w-3.5 h-3.5" /> Cancelar Envios
                  </button>
                </div>
              )}

              {/* Ações Rápidas */}
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Ações Rápidas</h3>
                <div className="space-y-3">
                  
                  {/* Novo Botão de Fechar Negócio (Link) */}
                  <button
                    onClick={() => {
                      if (isStarter) {
                        setUpgradeFeature("Link de Fechamento");
                        setUpgradeModalOpen(true);
                        return;
                      }
                      onClose();
                      if (onOpenClosingLink) onOpenClosingLink(opportunity);
                    }}
                    className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl font-bold bg-green-500 text-white hover:bg-green-600 transition-all shadow-md group"
                  >
                    <LinkIcon className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                    Gerar Link de Fechamento
                  </button>

                  <button 
                    onClick={handleToggleClient}
                    className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl font-bold transition-all shadow-sm border ${formData.is_client ? 'bg-red-50 text-red-600 border-red-200 hover:bg-red-100' : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200'}`}
                  >
                    <div className="flex items-center gap-3">
                      {formData.is_client ? <UserMinus className="w-5 h-5" /> : <UserPlus className="w-5 h-5" />}
                      {formData.is_client ? 'Remover Cliente' : 'Marcar como Cliente'}
                    </div>
                  </button>

                  <button 
                    onClick={() => openSendModal('orcamento')}
                    className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm group"
                  >
                    <Calculator className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                    Enviar Orçamento
                  </button>

                  <button 
                    onClick={() => openSendModal('contract')}
                    className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm group"
                  >
                    <FileText className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                    Enviar Contrato
                  </button>

                  {!activeCadence && (
                    <button 
                      onClick={() => {
                        if (isStarter) {
                          setUpgradeFeature("Fluxo de Cadência");
                          setUpgradeModalOpen(true);
                          return;
                        }
                        if (onOpenCadence) onOpenCadence(opportunity);
                      }}
                      className="w-full flex items-center gap-3 py-3.5 px-4 rounded-xl font-bold bg-white border border-gray-200 text-gray-700 hover:border-orange-300 hover:bg-orange-50 transition-all shadow-sm group"
                    >
                      <MessageCircle className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                      Fazer Follow Up
                    </button>
                  )}
                </div>
              </div>

              {/* Contato e Endereço */}
              <div>
                <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Informações de Contato</h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 transition-all group">
                    <Mail className="w-4 h-4 text-gray-400 group-focus-within:text-orange-400 shrink-0" />
                    <input 
                      value={formData.email || ''} 
                      onChange={e => setFormData({...formData, email: e.target.value})}
                      className="text-sm text-gray-700 font-medium bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-300 placeholder:font-normal"
                      placeholder="E-mail"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 transition-all group">
                    <Phone className="w-4 h-4 text-gray-400 group-focus-within:text-orange-400 shrink-0" />
                    <input 
                      value={formData.phone || ''} 
                      onChange={e => setFormData({...formData, phone: e.target.value})}
                      className="text-sm text-gray-700 font-medium bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-300 placeholder:font-normal"
                      placeholder="Telefone / WhatsApp"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 transition-all group">
                    <Instagram className="w-4 h-4 text-gray-400 group-focus-within:text-orange-400 shrink-0" />
                    <input 
                      value={formData.instagram || ''} 
                      onChange={e => setFormData({...formData, instagram: e.target.value})}
                      className="text-sm text-gray-700 font-medium bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-300 placeholder:font-normal"
                      placeholder="Instagram (@)"
                    />
                  </div>
                  <div className="flex items-center gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm focus-within:ring-2 focus-within:ring-orange-400 transition-all group">
                    <MapPin className="w-4 h-4 text-gray-400 group-focus-within:text-orange-400 shrink-0" />
                    <input 
                      value={formData.address || ''} 
                      onChange={e => setFormData({...formData, address: e.target.value})}
                      className="text-sm text-gray-700 font-medium bg-transparent border-none p-0 focus:ring-0 outline-none w-full placeholder:text-gray-300 placeholder:font-normal"
                      placeholder="Localização / Endereço"
                    />
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Footer / Salvar */}
        <div className="p-4 border-t border-gray-100 bg-white flex justify-end gap-3 shrink-0 relative z-10">
          <button 
            onClick={onClose}
            className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          <button 
            onClick={handleSave}
            disabled={loading}
            className="px-8 py-2.5 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Alterações
          </button>
        </div>
      </DialogContent>

      {/* Sub-Modal para Selecionar Documento com Pesquisa */}
      {docType && (
        <Dialog open={!!docType} onOpenChange={(open) => { if(!open) { setDocType(null); setDocSearch(''); } }}>
          <DialogContent className="sm:max-w-[450px] bg-white rounded-3xl p-6 shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Selecione o {docType === 'contract' ? 'Contrato' : 'Orçamento'}
              </DialogTitle>
              <DialogDescription className="sr-only">Selecione o documento que deseja enviar ao lead.</DialogDescription>
            </DialogHeader>
            
            <div className="mt-4">
              <div className="relative mb-4">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  autoFocus
                  type="text" 
                  placeholder={`Pesquisar ${docType === 'contract' ? 'contrato' : 'orçamento'}...`}
                  value={docSearch}
                  onChange={e => setDocSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none transition-all"
                />
              </div>

              <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {loadingDocs ? (
                  <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
                ) : filteredDocs.length > 0 ? (
                  filteredDocs.map(doc => (
                    <button 
                      key={doc.id}
                      onClick={() => handleSendDocument(doc)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group shadow-sm"
                    >
                      <span className="font-semibold text-gray-800 text-sm truncate pr-4">{doc.name}</span>
                      <Send className="w-4 h-4 text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                    </button>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-gray-500 font-medium">
                      Nenhum {docType === 'contract' ? 'contrato' : 'orçamento'} encontrado.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
      
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={upgradeFeature}
      />
    </Dialog>
  );
}