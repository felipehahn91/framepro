
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, CheckCircle2 } from 'lucide-react';

const LinkFormPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [formConfig, setFormConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    instagram: '',
    date: '',
    local: '',
    description: ''
  });

  useEffect(() => {
    const fetchForm = async () => {
      try {
        const record = await pb.collection('link_forms').getOne(id, { $autoCancel: false });
        setFormConfig(record);
      } catch (error) {
        console.error(error);
        toast.error('Formulário não encontrado ou indisponível.');
      } finally {
        setLoading(false);
      }
    };
    fetchForm();
  }, [id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('O nome é obrigatório.');
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create the submission record
      await pb.collection('link_form_submissions').create({
        linkFormId: formConfig.id,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        instagram: formData.instagram,
        date: formData.date || null,
        local: formData.local,
        description: formData.description
      }, { $autoCancel: false });

      // 2. Create the opportunity in the pipeline
      await pb.collection('opportunities').create({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        whatsapp: formData.phone,
        instagram: formData.instagram,
        date: formData.date || null,
        local: formData.local,
        notes: formData.description,
        tipoFoto: formConfig.tipoFoto,
        pipelineId: formConfig.pipelineId,
        columnId: formConfig.columnId,
        userId: formConfig.userId,
        status: 'Novo',
        isClient: false
      }, { $autoCancel: false });

      setSuccess(true);
      
      // Optional: Redirect to WhatsApp if configured
      if (formConfig.whatsappNumber) {
        setTimeout(() => {
          const cleanPhone = formConfig.whatsappNumber.replace(/\D/g, '');
          const text = encodeURIComponent(formConfig.whatsappText || `Olá, acabei de preencher o formulário: ${formConfig.name}`);
          window.location.href = `https://wa.me/${cleanPhone}?text=${text}`;
        }, 2000);
      }

    } catch (error) {
      console.error(error);
      toast.error('Erro ao enviar formulário. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!formConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center p-8">
          <h2 className="text-2xl font-bold mb-2">Formulário Indisponível</h2>
          <p className="text-muted-foreground">Este link não é mais válido.</p>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="max-w-md w-full text-center p-8 border-border/50 shadow-lg">
          <CheckCircle2 className="w-16 h-16 mx-auto text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Enviado com sucesso!</h2>
          <p className="text-muted-foreground">
            Agradecemos o contato. Em breve retornaremos.
            {formConfig.whatsappNumber && " Redirecionando para o WhatsApp..."}
          </p>
        </Card>
      </div>
    );
  }

  const fields = formConfig.fields || {};

  return (
    <>
      <Helmet>
        <title>{formConfig.name}</title>
      </Helmet>
      <div className="min-h-screen bg-muted/30 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
        <Card className="max-w-xl w-full shadow-xl border-border/50">
          <CardHeader className="text-center pb-8">
            <CardTitle className="text-3xl font-bold">{formConfig.name}</CardTitle>
            <CardDescription className="mt-2 text-base">
              Preencha os dados abaixo para solicitar um orçamento ou contato.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">Nome Completo *</Label>
                <Input 
                  id="name" 
                  required 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  className="bg-background"
                />
              </div>

              {fields.email && (
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={formData.email} 
                    onChange={e => setFormData({...formData, email: e.target.value})} 
                    className="bg-background"
                  />
                </div>
              )}

              {fields.phone && (
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone / WhatsApp</Label>
                  <Input 
                    id="phone" 
                    type="tel" 
                    value={formData.phone} 
                    onChange={e => setFormData({...formData, phone: e.target.value})} 
                    className="bg-background"
                  />
                </div>
              )}

              {fields.instagram && (
                <div className="space-y-2">
                  <Label htmlFor="instagram">Instagram (@)</Label>
                  <Input 
                    id="instagram" 
                    value={formData.instagram} 
                    onChange={e => setFormData({...formData, instagram: e.target.value})} 
                    className="bg-background"
                  />
                </div>
              )}

              {fields.date && (
                <div className="space-y-2">
                  <Label htmlFor="date">Data do Evento</Label>
                  <Input 
                    id="date" 
                    type="date" 
                    value={formData.date} 
                    onChange={e => setFormData({...formData, date: e.target.value})} 
                    className="bg-background"
                  />
                </div>
              )}

              {fields.local && (
                <div className="space-y-2">
                  <Label htmlFor="local">Local do Evento</Label>
                  <Input 
                    id="local" 
                    value={formData.local} 
                    onChange={e => setFormData({...formData, local: e.target.value})} 
                    className="bg-background"
                  />
                </div>
              )}

              {fields.description && (
                <div className="space-y-2">
                  <Label htmlFor="description">Detalhes / Observações</Label>
                  <Textarea 
                    id="description" 
                    rows={4} 
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    className="bg-background resize-none"
                  />
                </div>
              )}

              <Button type="submit" className="w-full mt-6" size="lg" disabled={submitting}>
                {submitting ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : null}
                Enviar Solicitação
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
};

export default LinkFormPage;
