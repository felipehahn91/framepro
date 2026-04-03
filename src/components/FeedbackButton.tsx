import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquarePlus, Bug, Lightbulb, Send, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export function FeedbackButton() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState('feedback');
  const [content, setContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim()) {
      return toast.error('Por favor, descreva seu feedback.');
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id,
        user_email: user?.email,
        type,
        content,
        page_url: window.location.href
      });

      if (error) throw error;

      toast.success('Seu feedback foi enviado com sucesso! Agradecemos a sua ajuda.');
      setIsOpen(false);
      setContent('');
    } catch (error) {
      console.error(error);
      toast.error('Ocorreu um erro ao enviar seu feedback.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-gray-900 text-white rounded-full shadow-lg flex items-center justify-center z-50 hover:bg-black transition-transform active:scale-95"
        title="Enviar Feedback"
      >
        <MessageSquarePlus className="w-6 h-6" />
      </button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg bg-white rounded-2xl p-0">
          <DialogHeader className="p-6 pb-4">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <MessageSquarePlus className="w-5 h-5 text-orange-500" />
              Deixe seu Feedback
            </DialogTitle>
            <DialogDescription>
              Sua opinião é muito importante para melhorarmos o sistema.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 pb-6 space-y-4">
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="w-full h-12">
                <SelectValue placeholder="Selecione o tipo de feedback" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feedback">
                  <div className="flex items-center gap-2">
                    <MessageSquarePlus className="w-4 h-4" /> Feedback Geral
                  </div>
                </SelectItem>
                <SelectItem value="suggestion">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Sugestão de Melhoria
                  </div>
                </SelectItem>
                <SelectItem value="bug">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4" /> Reportar um Bug
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>

            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Descreva em detalhes o que aconteceu, o que você esperava que acontecesse, ou sua ideia..."
              className="min-h-[150px] text-sm"
              rows={6}
            />
          </div>
          <DialogFooter className="p-6 bg-gray-50 rounded-b-2xl">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-2">
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              Enviar Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}