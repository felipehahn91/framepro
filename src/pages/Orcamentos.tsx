import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, FileText, Loader2, Edit2, Trash2, 
  ExternalLink, Copy, LayoutTemplate, FileUp, 
  User, Clock, Eye, Link as LinkIcon, Activity
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Orcamento {
  id: string;
  name: string;
  type: 'builder' | 'pdf';
  view_count: number;
  share_token: string;
  updated_at: string;
  opportunity_id?: string | null;
  opportunities?: { name: string } | null;
}

interface Opportunity {
  id: string;
  name: string;
}

export default function Orcamentos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [orcamentos, setOrcamentos] = useState<Orcamento[]>([]);
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal Creation
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newType, setNewType] = useState<'builder' | 'pdf' | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Modal Link Lead
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [linkingOrcamento, setLinkingOrcamento] = useState<Orcamento | null>(null);
  const [selectedOppId, setSelectedOppId] = useState("");
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (user) fetchOrcamentos();
  }, [user]);

  const fetchOrcamentos = async () => {
    setLoading(true);
    try {
      const [orcRes, oppRes] = await Promise.all([
        supabase.from('orcamentos').select('*, opportunities(name)').eq('user_id', user?.id).order('updated_at', { ascending: false }),
        supabase.from('opportunities').select('id, name').eq('user_id', user?.id).order('name')
      ]);

      if (orcRes.error && orcRes.error.code !== '42P01') throw orcRes.error;
      if (oppRes.error && oppRes.error.code !== '42P01') throw oppRes.error;
      
      setOrcamentos(orcRes.data || []);
      setOpportunities(oppRes.data || []);
    } catch (error) {
      toast.error("Erro ao carregar orçamentos.");
    } finally {
      setLoading(false);
    }
  };

  const filteredOrcamentos = useMemo(() => {
    if (!searchQuery) return orcamentos;
    return orcamentos.filter(o => 
      o.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.opportunities?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [orcamentos, searchQuery]);

  const handleCreate = async () => {
    if (!newName.trim() || !newType) return toast.error("Preencha o nome e selecione o tipo.");
    
    setCreating(true);
    try {
      const share_token = crypto.randomUUID();
      const initialSections = newType === 'pdf' 
        ? [{ id: crypto.randomUUID(), type: 'pdf', fileUrl: '', ctas: [] }]
        : [{ id: crypto.randomUUID(), type: 'cover', title: newName, subtitle: 'Proposta Comercial', imageUrl: '' }];

      const { data, error } = await supabase
        .from('orcamentos')
        .insert({
          user_id: user?.id,
          name: newName,
          type: newType,
          share_token,
          view_count: 0,
          sections: initialSections,
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Orçamento criado!");
      navigate(`/orcamentos/editar/${data.id}`);
    } catch (error) {
      toast.error("Erro ao criar. Verifique se a tabela 'orcamentos' existe no banco.");
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Excluir este orçamento permanentemente?")) return;
    try {
      await supabase.from('orcamentos').delete().eq('id', id);
      setOrcamentos(prev => prev.filter(o => o.id !== id));
      toast.success("Excluído com sucesso.");
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/orcamentos/public/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado!");
  };

  const handleLinkLead = async () => {
    if (!linkingOrcamento) return;
    setLinking(true);
    try {
      const val = selectedOppId === "none" ? null : selectedOppId;
      const { error } = await supabase
        .from('orcamentos')
        .update({ opportunity_id: val })
        .eq('id', linkingOrcamento.id);

      if (error) throw error;

      toast.success("Vínculo atualizado com sucesso!");
      
      const oppName = val ? opportunities.find(o => o.id === val)?.name : undefined;
      
      setOrcamentos(prev => prev.map(o => 
        o.id === linkingOrcamento.id 
          ? { ...o, opportunity_id: val, opportunities: oppName ? { name: oppName } : null } 
          : o
      ));
      
      setIsLinkModalOpen(false);
    } catch (err) {
      toast.error("Erro ao vincular lead.");
    } finally {
      setLinking(false);
    }
  };

  const openLinkModal = (orc: Orcamento) => {
    setLinkingOrcamento(orc);
    setSelectedOppId(orc.opportunity_id || "none");
    setIsLinkModalOpen(true);
  };

  if (loading) return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Orçamentos</h1>
            <p className="text-sm text-gray-500">Crie propostas interativas e acompanhe as visualizações.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar propostas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
              />
            </div>
            <button 
              onClick={() => { setIsCreateOpen(true); setNewType(null); setNewName(""); }}
              className="px-5 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-all flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Novo Orçamento
            </button>
          </div>
        </div>

        {/* Lista de Orçamentos (Full Width Cards) */}
        <div className="bg-transparent flex-1 pb-6">
          {filteredOrcamentos.length > 0 ? (
            <div className="flex flex-col gap-4">
              {filteredOrcamentos.map(orc => (
                <div key={orc.id} className="flex flex-col lg:flex-row items-start lg:items-center justify-between p-5 border border-gray-200 rounded-2xl bg-white hover:border-orange-300 hover:shadow-md transition-all gap-4">
                  
                  {/* Left Side: Info */}
                  <div className="flex items-center gap-4 flex-1 min-w-0 w-full">
                    <div className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${orc.type === 'pdf' ? 'bg-blue-50 text-blue-500' : 'bg-purple-50 text-purple-500'}`}>
                      {orc.type === 'pdf' ? <FileUp className="w-7 h-7" /> : <LayoutTemplate className="w-7 h-7" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1.5">
                        <h3 className="font-bold text-gray-900 text-lg truncate">{orc.name}</h3>
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${orc.type === 'pdf' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                          {orc.type === 'pdf' ? 'PDF' : 'Construtor'}
                        </span>
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                        <span className="flex items-center gap-1.5">
                          <User className="w-4 h-4" /> 
                          {orc.opportunities?.name ? (
                            <span className="text-gray-900 font-medium">{orc.opportunities.name}</span>
                          ) : (
                            <span className="text-gray-400 italic">Sem lead vinculado</span>
                          )}
                        </span>
                        <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-4 h-4" /> Atualizado em {new Date(orc.updated_at).toLocaleDateString('pt-BR')}
                        </span>
                        <span className="hidden sm:block w-1 h-1 bg-gray-300 rounded-full"></span>
                        <span className="flex items-center gap-1.5 text-orange-600 font-medium bg-orange-50 px-2 py-0.5 rounded-md">
                          <Eye className="w-4 h-4" /> {orc.view_count || 0} views
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Actions */}
                  <div className="flex items-center gap-2 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0 hide-scrollbar">
                    
                    <button 
                      onClick={() => navigate(`/orcamentos/analytics/${orc.id}`)}
                      className="px-4 py-2.5 bg-purple-50 text-purple-600 font-semibold rounded-lg hover:bg-purple-100 transition-all flex items-center gap-2 whitespace-nowrap text-sm border border-purple-100"
                    >
                      <Activity className="w-4 h-4" /> Analytics
                    </button>
                    
                    <button 
                      onClick={() => openLinkModal(orc)}
                      className="px-4 py-2.5 bg-gray-50 text-gray-700 font-semibold rounded-lg hover:bg-gray-100 transition-all flex items-center gap-2 whitespace-nowrap text-sm border border-gray-200"
                    >
                      <LinkIcon className="w-4 h-4" /> Vincular Lead
                    </button>

                    <button 
                      onClick={() => navigate(`/orcamentos/editar/${orc.id}`)}
                      className="px-4 py-2.5 bg-orange-50 text-orange-600 font-semibold rounded-lg hover:bg-orange-100 transition-all flex items-center gap-2 whitespace-nowrap text-sm border border-orange-100"
                    >
                      <Edit2 className="w-4 h-4" /> Editar
                    </button>

                    <button 
                      onClick={() => handleCopyLink(orc.share_token)}
                      className="p-2.5 text-gray-500 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-lg transition-all border border-gray-200"
                      title="Copiar Link"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => window.open(`/orcamentos/public/${orc.share_token}`, '_blank')}
                      className="p-2.5 text-gray-500 hover:text-blue-600 bg-gray-50 hover:bg-blue-50 rounded-lg transition-all border border-gray-200"
                      title="Visualizar Proposta"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => handleDelete(orc.id)}
                      className="p-2.5 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-lg transition-all border border-gray-200"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-2xl flex flex-col items-center justify-center h-full py-20 text-center shadow-sm">
              <div className="w-20 h-20 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum orçamento encontrado</h3>
              <p className="text-sm text-gray-500 max-w-md mb-8">
                {searchQuery ? "Nenhum resultado para a sua busca." : "Crie orçamentos lindíssimos em PDF ou pelo construtor de páginas, envie para seus clientes e saiba quando eles visualizarem."}
              </p>
              {!searchQuery && (
                <button 
                  onClick={() => { setIsCreateOpen(true); setNewType(null); setNewName(""); }}
                  className="px-6 py-3 bg-orange-400 text-white font-semibold rounded-xl hover:bg-orange-500 transition-all shadow-md flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Criar Primeiro Orçamento
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Criação */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-2xl p-0 overflow-hidden bg-white">
          <div className="p-8 pb-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-center">Como você quer criar seu orçamento?</DialogTitle>
              <DialogDescription className="text-center text-base mt-2">
                Escolha a modalidade que melhor se adapta ao seu fluxo de trabalho.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              <div 
                onClick={() => setNewType('builder')}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${newType === 'builder' ? 'border-orange-400 bg-orange-50/50' : 'border-gray-200 hover:border-orange-300'}`}
              >
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                  <LayoutTemplate className={`w-6 h-6 ${newType === 'builder' ? 'text-orange-500' : 'text-gray-400'}`} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Construtor de Páginas</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Crie propostas montando blocos (Capa, Textos, Tabelas de Preço). Ideal para criar orçamentos responsivos rapidamente.
                </p>
              </div>

              <div 
                onClick={() => setNewType('pdf')}
                className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${newType === 'pdf' ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200 hover:border-blue-300'}`}
              >
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-4">
                  <FileUp className={`w-6 h-6 ${newType === 'pdf' ? 'text-blue-500' : 'text-gray-400'}`} />
                </div>
                <h3 className="font-bold text-gray-900 text-lg mb-2">Upload de PDF</h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Suba sua apresentação em PDF já pronta e adicione botões de ação (CTAs) flutuantes por cima para o cliente aprovar.
                </p>
              </div>
            </div>

            {newType && (
              <div className="mt-8 animate-in fade-in slide-in-from-bottom-4">
                <label className="block text-sm font-bold text-gray-900 mb-2">Nome do Orçamento</label>
                <input 
                  type="text" 
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Ex: Proposta Casamento João e Maria"
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                />
              </div>
            )}
          </div>
          
          <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button onClick={() => setIsCreateOpen(false)} className="px-6 py-2.5 text-gray-600 font-semibold hover:bg-gray-200 rounded-lg transition-all">
              Cancelar
            </button>
            <button 
              onClick={handleCreate}
              disabled={!newType || !newName.trim() || creating}
              className="px-8 py-2.5 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              Continuar
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Vincular Lead */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Vincular Lead / Cliente</DialogTitle>
            <DialogDescription>
              Selecione de qual cliente/lead é esta proposta.
            </DialogDescription>
          </DialogHeader>

          <div className="py-6">
            <label className="block text-sm font-bold text-gray-900 mb-2">Selecione o Lead</label>
            <select 
              value={selectedOppId}
              onChange={(e) => setSelectedOppId(e.target.value)}
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all text-gray-700"
            >
              <option value="none">Nenhum (Remover vínculo)</option>
              {opportunities.map(opp => (
                <option key={opp.id} value={opp.id}>{opp.name}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <button 
              onClick={() => setIsLinkModalOpen(false)} 
              className="px-5 py-2.5 text-gray-600 font-semibold hover:bg-gray-100 rounded-lg transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleLinkLead}
              disabled={linking}
              className="px-6 py-2.5 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500 transition-all flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {linking && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Vínculo
            </button>
          </div>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{__html: `
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}} />
    </Layout>
  );
}