import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, Mail, Phone, Instagram, Calendar, FileText, 
  Send, Clock, Edit2, Loader2, User, Building2, Search, Calculator, MessageCircle, Eye, CheckCircle2, AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  company: string;
  avatar_url: string;
  created_at: string;
  pipeline_id: string | null;
  is_client: boolean;
  observations: string;
  user_id: string;
}

interface ClientDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  client: Client | null;
  onUpdate: (updatedClient: Client) => void;
  onEditClick: (client: Client) => void;
}

interface Note {
  id: string;
  content: string;
  created_at: string;
}

const parseNotes = (obs: string | null | undefined): Note[] => {
  if (!obs) return [];
  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed)) return parsed;
    return [{ id: 'legacy', content: obs, created_at: new Date().toISOString() }];
  } catch (e) {
    return [{ id: 'legacy', content: obs, created_at: new Date().toISOString() }];
  }
};

export default function ClientDetailPanel({ isOpen, onClose, client, onUpdate, onEditClick }: ClientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes' | 'contracts'>('notes');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para os modais de envio
  const [docType, setDocType] = useState<'contract' | 'orcamento' | null>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [docSearch, setDocSearch] = useState('');

  // Estados para Aba de Contratos
  const [clientContracts, setClientContracts] = useState<any[]>([]);
  const [loadingContracts, setLoadingContracts] = useState(false);

  useEffect(() => {
    if (isOpen && client && activeTab === 'contracts') {
      fetchClientContracts();
    }
  }, [isOpen, client, activeTab]);

  const fetchClientContracts = async () => {
    if (!client) return;
    setLoadingContracts(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('client_id', client.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setClientContracts(data || []);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar contratos do cliente.");
    } finally {
      setLoadingContracts(false);
    }
  };

  if (!isOpen || !client) return null;

  const notes = parseNotes(client.observations);

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    setIsSubmitting(true);

    try {
      const newNoteObj: Note = {
        id: crypto.randomUUID(),
        content: newNote.trim(),
        created_at: new Date().toISOString(),
      };

      const updatedNotes = [newNoteObj, ...notes];
      const newObservationsString = JSON.stringify(updatedNotes);

      const { data, error } = await supabase
        .from('opportunities')
        .update({ observations: newObservationsString })
        .eq('id', client.id)
        .select()
        .single();

      if (error) throw error;

      onUpdate(data as Client);
      setNewNote('');
      toast.success('Anotação adicionada!');
    } catch (error) {
      toast.error('Erro ao salvar anotação.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openSendModal = async (type: 'contract' | 'orcamento') => {
    setDocType(type);
    setLoadingDocs(true);
    setDocSearch('');
    
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUserId = client.user_id || sessionData.session?.user.id;

      if (!currentUserId) throw new Error('Usuário não autenticado');

      if (type === 'orcamento') {
        const { data, error } = await supabase
          .from('orcamentos')
          .select('id, name, share_token')
          .eq('user_id', currentUserId)
          .order('updated_at', { ascending: false });
          
        if (error) throw error;
        setDocuments(data || []);
      } else {
        const { data, error } = await supabase
          .from('contracts')
          .select('id, share_token, opportunities(name)')
          .eq('user_id', currentUserId)
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
    const phone = client.phone?.replace(/\D/g, '');
    
    if (phone) {
      const text = encodeURIComponent(`Olá! Aqui está o link para acessar o documento: ${url}`);
      window.open(`https://wa.me/${phone}?text=${text}`, '_blank');
    } else {
      navigator.clipboard.writeText(url);
      toast.success("Link copiado! (Cliente sem telefone salvo)");
    }
    
    setDocType(null);
  };

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : "CL";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  const filteredDocs = documents.filter(d => d.name.toLowerCase().includes(docSearch.toLowerCase()));

  return (
    <>
      <div className="fixed inset-0 z-[60] flex justify-end">
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

        <div className="relative w-full sm:w-[450px] max-w-[100vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-[65]">
          
          {/* Header com Avatar e Empresa */}
          <div className="px-6 py-8 border-b border-gray-100 bg-gray-50/50 shrink-0">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-4">
                <Avatar className="w-16 h-16 border-2 border-white shadow-md">
                  <AvatarImage src={client.avatar_url} />
                  <AvatarFallback className="bg-orange-400 text-white font-bold text-xl">
                    {getInitials(client.name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="text-xl font-bold text-gray-900 leading-tight">{client.name}</h2>
                  {client.company && (
                    <p className="text-sm font-semibold text-orange-500 flex items-center gap-1.5 mt-0.5">
                      <Building2 className="w-3.5 h-3.5" /> {client.company}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-1 uppercase font-bold tracking-wider">Cliente ativo</p>
                </div>
              </div>
              <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-100 shadow-sm">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex gap-2">
              <button 
                onClick={() => onEditClick(client)}
                className="flex-1 py-2.5 text-sm font-bold text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Edit2 className="w-4 h-4" /> Editar Perfil
              </button>
              {client.phone && (
                <button 
                  onClick={() => window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank')}
                  className="flex-1 py-2.5 text-sm font-bold text-white bg-green-500 border border-green-600 rounded-xl hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
                >
                  <Phone className="w-4 h-4" /> WhatsApp
                </button>
              )}
            </div>

            {/* Novos Botões de Ações Rápidas (Orçamentos / Contratos) */}
            <div className="flex gap-2 mt-2">
              <button 
                onClick={() => openSendModal('orcamento')}
                className="flex-1 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Calculator className="w-3.5 h-3.5" /> Enviar Orçamento
              </button>
              <button 
                onClick={() => openSendModal('contract')}
                className="flex-1 py-2 text-xs font-bold text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-orange-50 hover:text-orange-600 hover:border-orange-300 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
              >
                <FileText className="w-3.5 h-3.5" /> Enviar Contrato
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-6 shrink-0 gap-6">
            <button 
              onClick={() => setActiveTab('notes')}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'notes' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Anotações
            </button>
            <button 
              onClick={() => setActiveTab('contracts')}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'contracts' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Contratos
            </button>
            <button 
              onClick={() => setActiveTab('details')}
              className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Contato
            </button>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-50/20">
            {activeTab === 'details' && (
              <div className="p-6 space-y-6 animate-in fade-in">
                <div className="bg-white rounded-2xl border border-gray-100 p-2 shadow-sm">
                  <div className="flex items-center gap-3 p-4 border-b border-gray-50">
                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-500"><Mail className="w-5 h-5" /></div>
                    <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">E-mail</p><p className="text-sm font-semibold text-gray-800">{client.email || 'Não informado'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-4 border-b border-gray-50">
                    <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center text-green-500"><Phone className="w-5 h-5" /></div>
                    <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Telefone</p><p className="text-sm font-semibold text-gray-800">{client.phone || 'Não informado'}</p></div>
                  </div>
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-9 h-9 rounded-xl bg-pink-50 flex items-center justify-center text-pink-500"><Instagram className="w-5 h-5" /></div>
                    <div><p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Instagram</p><p className="text-sm font-semibold text-gray-800">{client.instagram || 'Não informado'}</p></div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'notes' && (
              <div className="p-6 flex flex-col h-full animate-in fade-in">
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8 focus-within:ring-2 focus-within:ring-orange-400 transition-all shrink-0">
                  <textarea 
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Nova anotação..."
                    className="w-full p-4 text-sm text-gray-700 outline-none resize-none min-h-[100px]"
                  />
                  <div className="bg-gray-50 px-4 py-3 flex justify-end border-t border-gray-100">
                    <button 
                      onClick={handleAddNote}
                      disabled={!newNote.trim() || isSubmitting}
                      className="px-6 py-2 bg-orange-400 text-white text-sm font-bold rounded-xl hover:bg-orange-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />} Salvar
                    </button>
                  </div>
                </div>

                <div className="space-y-6 relative">
                  {notes.length > 0 ? (
                    notes.map((note) => (
                      <div key={note.id} className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-3.5 h-3.5 text-gray-300" />
                          <span className="text-[11px] font-bold text-gray-400 uppercase">{formatDate(note.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 text-gray-400"><p className="text-sm">Nenhuma anotação registrada.</p></div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'contracts' && (
              <div className="p-6 space-y-4 animate-in fade-in">
                {loadingContracts ? (
                  <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
                ) : clientContracts.length > 0 ? (
                  clientContracts.map(contract => (
                    <div key={contract.id} className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-orange-200 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900 text-sm">Contrato</h4>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          contract.signature_status === 'Assinado 2/2' ? 'bg-green-50 text-green-600 border border-green-100' : 'bg-yellow-50 text-yellow-600 border border-yellow-100'
                        }`}>
                          {contract.signature_status || 'Pendente'}
                        </span>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Valor</span>
                          <span className="font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Data</span>
                          <span className="font-medium text-gray-700">{new Date(contract.start_date).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => window.open(`/contratos/public/${contract.share_token}`, '_blank')}
                        className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-xl transition-colors flex justify-center items-center gap-2 border border-gray-200"
                      >
                        <Eye className="w-4 h-4" /> Visualizar / PDF
                      </button>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12 bg-white border border-gray-100 rounded-2xl">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-500">Nenhum contrato gerado para este cliente.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sub-Modal para Selecionar Documento com Pesquisa */}
      {docType && (
        <Dialog open={!!docType} onOpenChange={(open) => { if(!open) { setDocType(null); setDocSearch(''); } }}>
          <DialogContent className="sm:max-w-[450px] bg-white rounded-3xl p-6 shadow-2xl z-[70]">
            <DialogHeader>
              <DialogTitle className="text-lg font-bold text-gray-900">
                Selecione o {docType === 'contract' ? 'Contrato' : 'Orçamento'}
              </DialogTitle>
              <DialogDescription className="sr-only">Selecione o documento que deseja enviar ao cliente.</DialogDescription>
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
                      className="w-full flex items-center justify-between p-4 rounded-xl border border-gray-200 hover:border-orange-400 hover:bg-orange-50 transition-all text-left group shadow-sm"
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
    </>
  );
}