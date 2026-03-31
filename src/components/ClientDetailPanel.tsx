import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, Mail, Phone, Instagram, Calendar, FileText, 
  Send, Clock, Edit2, Loader2, User 
} from 'lucide-react';
import { toast } from 'sonner';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  instagram: string;
  created_at: string;
  pipeline_id: string | null;
  is_client: boolean;
  observations: string;
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

// Helper para converter as observações antigas ou novas em um array de notas
const parseNotes = (obs: string | null | undefined): Note[] => {
  if (!obs) return [];
  try {
    const parsed = JSON.parse(obs);
    if (Array.isArray(parsed)) return parsed;
    // Se for um JSON válido mas não array, tratamos como texto legado
    return [{ id: 'legacy', content: obs, created_at: new Date().toISOString() }];
  } catch (e) {
    // Se der erro no parse, é porque é um texto antigo comum
    return [{ id: 'legacy', content: obs, created_at: new Date().toISOString() }];
  }
};

export default function ClientDetailPanel({ isOpen, onClose, client, onUpdate, onEditClick }: ClientDetailPanelProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'notes'>('notes');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const getInitials = (name: string) => name ? name.substring(0, 2).toUpperCase() : "CL";

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return new Intl.DateTimeFormat('pt-BR', { 
      day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' 
    }).format(date);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Painel Lateral */}
      <div className="relative w-full sm:w-[400px] max-w-[100vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-50">
        
        {/* Header */}
        <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50 shrink-0">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center font-bold text-xl shadow-sm border border-orange-200">
                {getInitials(client.name)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 leading-tight">{client.name}</h2>
                <p className="text-sm text-gray-500 mt-0.5">Cliente desde {new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <button 
              onClick={onClose} 
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-2 mt-4">
            <button 
              onClick={() => onEditClick(client)}
              className="flex-1 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              <Edit2 className="w-4 h-4" /> Editar Perfil
            </button>
            {client.phone && (
              <button 
                onClick={() => window.open(`https://wa.me/${client.phone.replace(/\D/g, '')}`, '_blank')}
                className="flex-1 py-2 text-sm font-medium text-white bg-green-500 border border-green-600 rounded-lg hover:bg-green-600 transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Phone className="w-4 h-4" /> WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`py-4 text-sm font-semibold border-b-2 transition-colors mr-6 ${activeTab === 'notes' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Anotações & Feed
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`py-4 text-sm font-semibold border-b-2 transition-colors ${activeTab === 'details' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
          >
            Detalhes do Contato
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/30">
          
          {activeTab === 'details' && (
            <div className="p-6 space-y-6 animate-in fade-in">
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Informações de Contato</h3>
                <div className="bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                  <div className="flex items-center gap-3 p-3 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">E-mail</p>
                      <p className="text-sm font-semibold text-gray-900">{client.email || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Telefone / WhatsApp</p>
                      <p className="text-sm font-semibold text-gray-900">{client.phone || 'Não informado'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Instagram className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Instagram</p>
                      <p className="text-sm font-semibold text-gray-900">{client.instagram || 'Não informado'}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Sistema</h3>
                <div className="bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
                  <div className="flex items-center gap-3 p-3 border-b border-gray-50">
                    <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center text-orange-400">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Origem do Cadastro</p>
                      <p className="text-sm font-semibold text-gray-900">{client.pipeline_id ? 'Funil de Vendas' : 'Criação Manual'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3">
                    <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-400">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-medium">Data de Registro</p>
                      <p className="text-sm font-semibold text-gray-900">{new Date(client.created_at).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'notes' && (
            <div className="p-6 flex flex-col h-full animate-in fade-in">
              {/* Input Area */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-6 focus-within:ring-2 focus-within:ring-orange-400 transition-all shrink-0">
                <textarea 
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Adicione uma anotação, resumo de reunião ou observação..."
                  className="w-full p-4 text-sm text-gray-700 outline-none resize-none min-h-[100px]"
                />
                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-100">
                  <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Fica salvo no histórico
                  </span>
                  <button 
                    onClick={handleAddNote}
                    disabled={!newNote.trim() || isSubmitting}
                    className="px-4 py-2 bg-orange-400 text-white text-sm font-semibold rounded-lg hover:bg-orange-500 disabled:opacity-50 transition-colors flex items-center gap-2"
                  >
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    Salvar
                  </button>
                </div>
              </div>

              {/* Feed Timeline */}
              <div className="flex-1 relative">
                {notes.length > 0 ? (
                  <div className="absolute left-4 top-2 bottom-0 w-0.5 bg-gray-200"></div>
                ) : (
                  <div className="text-center py-10">
                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Clock className="w-5 h-5 text-gray-400" />
                    </div>
                    <p className="text-sm font-medium text-gray-900">Nenhuma anotação ainda</p>
                    <p className="text-xs text-gray-500 mt-1">O histórico de conversas aparecerá aqui.</p>
                  </div>
                )}

                <div className="space-y-6 relative z-10">
                  {notes.map((note) => (
                    <div key={note.id} className="relative pl-10">
                      <div className="absolute left-[11px] top-1 w-2.5 h-2.5 bg-orange-400 rounded-full ring-4 ring-gray-50"></div>
                      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-500">{formatDate(note.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}