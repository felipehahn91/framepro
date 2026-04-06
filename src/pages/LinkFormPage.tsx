import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { useSEO } from "@/hooks/use-seo";

export default function LinkFormPage() {
  const { id } = useParams();
  const [formConfig, setFormConfig] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '', email: '', phone: '', instagram: '', date: '', local: '', description: ''
  });

  useSEO({
    title: formConfig ? formConfig.name : "Formulário de Contato",
    description: "Preencha os dados para solicitar um orçamento ou contato.",
  });

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const { data, error } = await supabase.rpc('get_public_link_form', { p_id: id });
        if (error || !data) throw error || new Error("Not found");
        setFormConfig(data);
      } catch (error) {
        toast.error('Formulário não encontrado ou indisponível.');
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchForm();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return toast.error('O nome é obrigatório.');

    setSubmitting(true);
    try {
      // Chama a função RPC segura que criamos no SQL
      const { error } = await supabase.rpc('submit_link_form', {
        p_form_id: id,
        p_name: formData.name,
        p_email: formData.email || null,
        p_phone: formData.phone || null,
        p_instagram: formData.instagram || null,
        p_date: formData.date || null,
        p_local: formData.local || null,
        p_desc: formData.description || null
      });

      if (error) throw error;
      setSuccess(true);
      
      if (formConfig.whatsapp_number) {
        setTimeout(() => {
          const cleanPhone = formConfig.whatsapp_number.replace(/\D/g, '');
          const text = encodeURIComponent(formConfig.whatsapp_text || `Olá, acabei de preencher o formulário: ${formConfig.name}`);
          window.location.href = `https://wa.me/${cleanPhone}?text=${text}`;
        }, 2000);
      }
    } catch (error) {
      toast.error('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;

  if (!formConfig) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <h2 className="text-xl font-bold mb-2">Formulário Indisponível</h2>
        <p className="text-gray-500">Este link não é mais válido.</p>
      </div>
    </div>
  );

  if (success) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full text-center bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
        <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Enviado com sucesso!</h2>
        <p className="text-gray-500">Agradecemos o contato. Em breve retornaremos.{formConfig.whatsapp_number && " Redirecionando para o WhatsApp..."}</p>
      </div>
    </div>
  );

  const fields = formConfig.fields || {};

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 flex justify-center">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="px-8 pt-10 pb-8 text-center bg-gradient-to-b from-orange-50/50 to-white">
          <div className="w-12 h-12 bg-orange-400 rounded-xl flex items-center justify-center shadow-sm mx-auto mb-4">
            <span className="text-white font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{formConfig.name}</h1>
          <p className="mt-2 text-sm text-gray-500">Preencha os dados abaixo para solicitar um orçamento ou contato.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="px-8 pb-10 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Nome Completo *</label>
            <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all" />
          </div>

          {fields.email && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">E-mail</label>
              <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all" />
            </div>
          )}

          {fields.phone && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Telefone / WhatsApp</label>
              <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all" />
            </div>
          )}

          {fields.instagram && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instagram (@)</label>
              <input value={formData.instagram} onChange={e => setFormData({...formData, instagram: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all" />
            </div>
          )}

          {fields.date && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data do Evento</label>
              <input type="date" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all" />
            </div>
          )}

          {fields.local && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Local do Evento</label>
              <input value={formData.local} onChange={e => setFormData({...formData, local: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all" />
            </div>
          )}

          {fields.description && (
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detalhes / Observações</label>
              <textarea rows={4} value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all resize-none" />
            </div>
          )}

          <button type="submit" disabled={submitting} className="w-full mt-8 bg-orange-400 hover:bg-orange-500 text-white font-bold py-3.5 rounded-xl transition-colors flex items-center justify-center shadow-md">
            {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Enviar Solicitação'}
          </button>
        </form>
      </div>
    </div>
  );
}