import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Save, Loader2, Trash2, User, Phone, Mail, Instagram, MapPin, Calendar, DollarSign, FileText, Tag, Clock, XCircle, Building2, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [pendingCadences, setPendingCadences] = useState<any[]>([]);
  const [loadingCadences, setLoadingCadences] = useState(false);

  const [notes, setNotes] = useState<any[]>([]);
  const [newNote, setNewNote] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
      setAvatarPreview(opportunity.avatar_url || null);
      setAvatarFile(null);
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

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let avatarUrl = formData.avatar_url || null;

      if (avatarFile && opportunity) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `opp_${Date.now()}.${fileExt}`;
        const filePath = `shared/avatars/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('contract_images')
          .upload(filePath, avatarFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('contract_images')
            .getPublicUrl(filePath);
          avatarUrl = publicUrl;
        }
      }

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
          company: formData.company,
          avatar_url: avatarUrl,
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
      
      toast.success('Dados atualizados!');
      onSave(data as Opportunity);
      onClose();
    } catch (error) {
      toast.error('Erro ao atualizar os dados.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !opportunity) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-3xl shadow-2xl flex flex-col animate-in zoom-in-95 max-h-[95vh] overflow-hidden">
        
        <div className="px-6 py-6 border-b border-gray-100 flex items-start justify-between bg-gray-50/50">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-14 h-14 border-2 border-white shadow-sm">
                <AvatarImage src={avatarPreview || ''} />
                <AvatarFallback className="bg-orange-100 text-orange-500 font-bold">
                  {formData.name?.substring(0,2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-1.5 bg-orange-400 text-white rounded-full border border-white hover:bg-orange-500 transition-colors"
              >
                <Camera className="w-3 h-3" />
              </button>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{formData.name}</h2>
              <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">{formData.is_client ? 'Perfil do Cliente' : 'Lead em Prospecção'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-1.5">Nome do Lead</label>
              <input 
                value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-1.5">Empresa</label>
              <div className="relative">
                <Building2 className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  value={formData.company || ''} onChange={e => setFormData({...formData, company: e.target.value})}
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
                  placeholder="Nome da empresa"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-1.5">WhatsApp</label>
              <input 
                value={formData.phone || ''} onChange={e => setFormData({...formData, phone: e.target.value})}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase mb-1.5">Tag / Tipo</label>
              <select 
                value={formData.tag || ''} onChange={e => setFormData({...formData, tag: e.target.value})}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none"
              >
                <option value="">Sem Tag</option>
                {PHOTO_TYPES.map(pt => <option key={pt.value} value={pt.value}>{pt.label}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <label className="flex items-center gap-2 text-sm font-bold text-gray-800 mb-4">Anotações e Histórico</label>
            <div className="space-y-4 mb-6 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {notes.map((note: any) => (
                <div key={note.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p className="text-[10px] font-bold text-gray-400 mb-1 uppercase tracking-wider">{new Date(note.created_at).toLocaleString()}</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{note.content}</p>
                </div>
              ))}
            </div>
            <textarea
              value={newNote} onChange={e => setNewNote(e.target.value)} rows={2}
              className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-orange-400 outline-none resize-none"
              placeholder="Adicione um comentário..."
            />
          </div>
        </div>

        <div className="px-6 py-5 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between">
          <button onClick={() => { if(confirm('Excluir?')) onDelete(opportunity.id); }} className="text-red-500 font-bold text-sm hover:underline">Excluir Registro</button>
          <div className="flex gap-3">
            <button onClick={onClose} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
            <button onClick={handleSave} disabled={loading} className="px-8 py-2.5 bg-orange-400 text-white font-bold rounded-xl shadow-md hover:bg-orange-500 transition-all flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}