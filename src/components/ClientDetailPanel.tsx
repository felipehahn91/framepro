import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { 
  X, Mail, Phone, Instagram, Calendar, FileText, 
  Send, Clock, Edit2, Loader2, User, Building2 
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" onClick={onClose} />

      <div className="relative w-full sm:w-[450px] max-w-[100vw] bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 z-50">
        
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
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 px-6 shrink-0">
          <button 
            onClick={() => setActiveTab('notes')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors mr-8 ${activeTab === 'notes' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Anotações
          </button>
          <button 
            onClick={() => setActiveTab('details')}
            className={`py-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Dados do Contato
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
        </div>
      </div>
    </div>
  );
}