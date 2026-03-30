import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";

// Reaproveitando o componente de preview do builder
const PreviewBlock = ({ section }: { section: any }) => {
  if (section.type === 'cover') {
    return (
      <div className="relative w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center p-8 border border-gray-200">
        {section.imageUrl && <img src={section.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
        <div className="relative z-10 bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/50 max-w-lg w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{section.title}</h1>
          <p className="text-gray-600">{section.subtitle}</p>
        </div>
      </div>
    );
  }
  if (section.type === 'text') {
    return (
      <div className="w-full bg-white p-8 rounded-2xl border border-gray-200 prose max-w-none">
        <div dangerouslySetInnerHTML={{ __html: section.content?.replace(/\n/g, '<br/>') || '' }} />
      </div>
    );
  }
  if (section.type === 'pricing') {
    const total = section.items?.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0) || 0;
    return (
      <div className="w-full bg-white p-8 rounded-2xl border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{section.title}</h2>
        <div className="space-y-3">
          {section.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
              <span className="text-gray-700">{item.name}</span>
              <span className="font-semibold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price) || 0)}</span>
            </div>
          ))}
          {section.items?.length > 0 && (
            <div className="flex justify-between items-center py-4 mt-4 border-t-2 border-gray-900">
              <span className="font-bold text-lg text-gray-900">Total</span>
              <span className="font-bold text-xl text-orange-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};

export default function OrcamentoPublicView() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [orcamento, setOrcamento] = useState<any>(null);

  useEffect(() => {
    if (token) fetchOrcamento();
  }, [token]);

  const fetchOrcamento = async () => {
    try {
      // 1. Busca os dados
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error) throw error;
      setOrcamento(data);

      // 2. Incrementa view count (silenciosamente)
      supabase.from('orcamentos').update({ view_count: (data.view_count || 0) + 1 }).eq('id', data.id).then();

    } catch (error) {
      toast.error("Proposta não encontrada.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
  if (!orcamento) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><AlertCircle className="w-16 h-16 text-gray-300 mb-4" /><h2 className="text-2xl font-bold">Proposta Indisponível</h2><p className="text-gray-500">O link acessado é inválido ou expirou.</p></div>;

  const isPDFMode = orcamento.type === 'pdf';
  const sections = orcamento.sections || [];

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col">
      {isPDFMode ? (
        // Visualização Modo PDF
        <div className="flex-1 w-full h-screen relative flex flex-col">
          {sections[0]?.fileUrl ? (
            <iframe src={`${sections[0].fileUrl}#toolbar=0`} className="w-full flex-1 border-0" title="Proposta PDF" />
          ) : (
            <div className="flex-1 flex items-center justify-center">O arquivo PDF não foi encontrado.</div>
          )}
          
          {/* CTAs Fixed na base da tela para o cliente */}
          {sections[0]?.ctas?.length > 0 && sections[0]?.fileUrl && (
            <div className="fixed bottom-6 left-0 right-0 flex justify-center z-50 pointer-events-none px-4">
              <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-gray-200 flex flex-wrap justify-center gap-4 pointer-events-auto max-w-2xl w-full">
                {sections[0].ctas.map((cta: any, i: number) => (
                  <button 
                    key={i} 
                    onClick={() => {
                      if(cta.link) {
                        const finalLink = cta.link.startsWith('http') ? cta.link : `https://${cta.link}`;
                        window.open(finalLink, '_blank');
                      }
                    }}
                    className={`px-8 py-3.5 rounded-xl font-bold text-white shadow-md hover:-translate-y-1 transition-all flex-1 text-center min-w-[200px] ${cta.color || 'bg-green-500'}`}
                  >
                    {cta.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Visualização Modo Construtor
        <div className="py-12 px-4 sm:px-6 w-full flex justify-center">
          <div className="w-full max-w-[800px] bg-white shadow-2xl rounded-3xl min-h-[1056px] flex flex-col p-8 sm:p-12 space-y-8">
            {sections.map((s: any) => (
              <PreviewBlock key={s.id} section={s} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}