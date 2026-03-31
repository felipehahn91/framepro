import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Save, Loader2, Trash2, User, Phone, Mail, Instagram, MapPin, Calendar, DollarSign, FileText, Tag, Clock, XCircle } from 'lucide-react';

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
  address: string;
  observations: string;
  event_date: string;
  is_client: boolean;
}

interface OpportunityDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  opportunity: Opportunity | null;
  onSave: (updatedOpp: Opportunity) => void;
  onDelete: (id: string) => void;
  onCadenceUpdated?: () => void;
}

const PHOTO_TYPES = [
  { value: 'Casamento', label: '💍 Casamento' },
  { value: 'Gestante', label: '🤰 Gestante' },
  { value: 'Corporativo', label: '💼 Corporativo' },
  { value: 'Retrato', label: '👤 Retrato' },
  { value: 'Newborn', label: '👶 Newborn' },
  { value: 'Infantil', label: '👧 Infantil' },
  { value: 'Ensaio feminino', label: '👩 Ensaio feminino' },
  { value: 'Smash the cake', label: '🎂 Smash the cake' }
];

export default function OpportunityDetailModal({ isOpen, onClose, opportunity, onSave, onDelete, onCadenceUpdated }: OpportunityDetailModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<Partial<Opportunity>>({});
  
  // Estados da Cadência
  const [pendingCadences, setPendingCadences] = useState<any[]>([]);
  const [loadingCadences, setLoadingCadences] = useState(false);

  // Estados de Anotações (JSON)
  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');

  const parseNotes = (obs: string | null | undefined) => {
    if (!obs) return [];
    try {
      const parsed = JSON.parse(obs);
      if (Array.isArray(parsed)) return parsed;
      return [{ id: 'legacy', content: obs, created_at: new Date().toISOString() }];
    } catch (e) {
      return [{ id: 'legacy', content: obs, created_at: new Date().toISOString() }];
    }
  };

  useEffect(() => {
    if (opportunity && isOpen) {
      setFormData(opportunity);
      setNotes(parseNotes(opportunity.observations));
      setNewNote('');
      fetchCadences();
    }
  }, [opportunity, isOpen]);

  const fetchCadences = async () => {
    if (!opportunity) return;
    setLoadingCadences(true);
    try {
      const { data } = await supabase
        .from('cadencia_queue')
        .select('*')
        .eq('opportunity_id', opportunity.id)
        .eq('status', 'pending')
        .order('scheduled_for', { ascending: true });
        
      setPendingCadences(data || []);
    } catch (error) {
      console.error('Erro ao buscar cadências:', error);
    } finally {
      setLoadingCadences(false);
    }
  };

  const handleCancelCadences = async () => {
    if (!opportunity) return;
    if (!confirm("Tem certeza que deseja cancelar todos os envios automáticos pendentes para este lead?")) return;
    
    setLoadingCadences(true);
    try {
      await supabase
        .from('cadencia_queue')
        .update({ status: 'cancelled' })
        .eq('opportunity_id', opportunity.id)
        .eq('status', 'pending');
        
      toast.success("Envios automáticos cancelados com sucesso.");
      fetchCadences();
      if (onCadenceUpdated) onCadenceUpdated();
    } catch (error) {
      toast.error("Erro ao cancelar cadências.");
      setLoadingCadences(false);
    }
  };

  if (!isOpen || !opportunity) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let finalObservations = JSON.stringify(notes);
      if (newNote.trim()) {
        const newNoteObj = {
          id: crypto.randomUUID(),
          content: newNote.trim(),
          created_at: new Date().toISOString(),
        };
        finalObservations = JSON.stringify([newNoteObj, ...notes]);
      }

      const { data, error } = await supabase
        .from('opportunities')
        .update({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          instagram: formData.instagram,
          value: formData.value,
          address: formData.address,
          event_date: formData.event_date,
          observations: finalObservations,
          tag: formData.tag
        })
        .eq('id', opportunity.id)
        .select()
        .single();

      if (error) throw error;
      
      toast.success('Dados atualizados com sucesso!');
      onSave(data as Opportunity);
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar os dados.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir esta oportunidade?')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('opportunities').delete().eq('id', opportunity.id);
      if (error) throw error;
      
      toast.success('Oportunidade excluída.');
      onDelete(opportunity.id);
      onClose();
    } catch (error) {
      toast.error('Erro ao excluir oportunidade.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col animate-in fade-in zoom-in-95 max-h-[95vh] overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-5 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center shrink-0">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{formData.name}</h2>
              <p className="text-sm text-gray-500">Detalhes da Oportunidade</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-sm transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body / Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* Seção de Automação de Cadência */}
          <div className="col-span-1 sm:col-span-2 bg-orange-50/50 p-4 rounded-xl border border-orange-100">
            <h3 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-500" /> Automação de Cadência
            </h3>
            
            {loadingCadences ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando status...
              </div>
            ) : pendingCadences.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-3 rounded-lg border border-orange-100 shadow-sm">
                <div>
                  <p className="text-sm text-gray-800">
                    Há <strong>{pendingCadences.length}</strong> mensagem(ns) agendada(s) para este lead.
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Próximo envio: {new Date(pendingCadences[0].scheduled_for).toLocaleString('pt-BR')}
                  </p>
                </div>
                <button
                  onClick={handleCancelCadences}
                  className="px-3 py-1.5 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-md font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <XCircle className="w-3.5 h-3.5" /> Cancelar Envios
                </button>
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                Nenhuma cadência ativa no momento. Você pode iniciar uma no botão "Cadência" no quadro principal.
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            {/* Nome */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <User className="w-4 h-4 text-gray-400" /> Nome do Lead
              </label>
              <input 
                name="name" value={formData.name || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>

            {/* Tag / Tipo de Foto */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Tag className="w-4 h-4 text-gray-400" /> Tipo de Foto (Tag)
              </label>
              <select 
                name="tag" value={formData.tag || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              >
                <option value="">Sem Tag</option>
                {PHOTO_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </div>

            {/* Telefone */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Phone className="w-4 h-4 text-gray-400" /> Telefone / WhatsApp
              </label>
              <input 
                name="phone" value={formData.phone || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>

            {/* E-mail */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Mail className="w-4 h-4 text-gray-400" /> E-mail
              </label>
              <input 
                name="email" type="email" value={formData.email || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>

            {/* Instagram */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Instagram className="w-4 h-4 text-gray-400" /> Instagram (@)
              </label>
              <input 
                name="instagram" value={formData.instagram || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>

            {/* Valor */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <DollarSign className="w-4 h-4 text-gray-400" /> Valor da Proposta
              </label>
              <input 
                name="value" value={formData.value || ''} onChange={handleChange} placeholder="0.00"
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>

            {/* Data do Evento */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <Calendar className="w-4 h-4 text-gray-400" /> Data do Evento
              </label>
              <input 
                name="event_date" type="date" value={formData.event_date || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>

            {/* Local */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1.5">
                <MapPin className="w-4 h-4 text-gray-400" /> Local do Evento
              </label>
              <input 
                name="address" value={formData.address || ''} onChange={handleChange}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>
          </div>

          {/* Observações e Histórico */}
          <div className="col-span-1 sm:col-span-2 bg-gray-50 p-5 rounded-xl border border-gray-100">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">
              <FileText className="w-4 h-4 text-orange-500" /> Histórico e Observações
            </label>
            
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {notes.length > 0 ? (
                notes.map((note: any) => (
                   <div key={note.id} className="bg-white p-3.5 rounded-lg border border-gray-200 shadow-sm">
                     <p className="text-[11px] font-bold text-gray-400 mb-1.5 uppercase tracking-wider">
                       {new Date(note.created_at).toLocaleString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                     </p>
                     <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                   </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">Nenhuma observação registrada.</p>
              )}
            </div>

            <textarea
              value={newNote} onChange={e => setNewNote(e.target.value)} rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow resize-none"
              placeholder="Adicione uma nova anotação ou atualização..."
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center justify-between shrink-0">
          <button 
            onClick={handleDelete} 
            disabled={loading}
            className="px-4 py-2 text-red-600 font-semibold rounded-lg hover:bg-red-50 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <Trash2 className="w-4 h-4" /> Excluir
          </button>

          <div className="flex items-center gap-3">
            <button 
              onClick={onClose} 
              disabled={loading}
              className="px-6 py-2 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50 bg-white"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSave} 
              disabled={loading}
              className="px-6 py-2 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-50 flex items-center gap-2 shadow-sm"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} 
              Salvar Alterações
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}