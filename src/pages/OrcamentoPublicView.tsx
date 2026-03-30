import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertCircle, ImageIcon, Video } from "lucide-react";

// --- PREVIEW BLOCK PÚBLICO COM ESTILOS ---
const PreviewBlock = ({ section }: { section: any }) => {
  const styles = section.styles || {};
  
  const baseStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor || 'transparent',
    backgroundImage: styles.backgroundImage ? `url(${styles.backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: styles.textColor || 'inherit',
    padding: `${styles.padding || 40}px`,
  };

  if (section.type === 'cover') {
    return (
      <div style={{...baseStyle, padding: 0}} className="relative w-full aspect-video flex flex-col items-center justify-center text-center overflow-hidden">
        {styles.backgroundImage && <div className="absolute inset-0 bg-black/40 z-0"></div>}
        <div className="relative z-10 p-8 max-w-2xl w-full">
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: styles.textColor || '#111827' }}>
            {section.title}
          </h1>
          <p className="text-lg md:text-2xl opacity-90" style={{ color: styles.textColor || '#4B5563' }}>
            {section.subtitle}
          </p>
        </div>
      </div>
    );
  }

  if (section.type === 'text') {
    return (
      <div style={baseStyle} className="w-full prose max-w-none text-lg leading-relaxed">
        {section.content ? (
          <div dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} />
        ) : null}
      </div>
    );
  }

  if (section.type === 'pricing') {
    const total = section.items?.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0) || 0;
    return (
      <div style={baseStyle} className="w-full">
        <h2 className="text-3xl font-bold mb-10" style={{ color: styles.textColor || '#111827' }}>
          {section.title}
        </h2>
        <div className="space-y-4">
          {section.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-gray-200/50 last:border-0">
              <span className="text-xl opacity-90">{item.name}</span>
              <span className="font-bold text-xl">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price) || 0)}</span>
            </div>
          ))}
          {section.items?.length > 0 && (
            <div className="flex justify-between items-center py-8 mt-8 border-t-2 border-current">
              <span className="font-bold text-2xl">Total</span>
              <span className="font-bold text-4xl" style={{ color: styles.textColor ? 'inherit' : '#f97316' }}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (section.type === 'two-columns') {
    return (
      <div style={baseStyle} className={`w-full flex flex-col ${section.imagePosition === 'right' ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}>
        <div className="flex-1 space-y-6 w-full">
          <h2 className="text-4xl font-bold leading-tight" style={{ color: styles.textColor || '#111827' }}>{section.title}</h2>
          <div className="prose max-w-none opacity-90 text-lg leading-relaxed">
            {section.content && <div dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} />}
          </div>
        </div>
        <div className="flex-1 w-full">
          {section.imageUrl && (
            <img src={section.imageUrl} alt="Seção" className="w-full rounded-2xl shadow-2xl object-cover aspect-video md:aspect-[4/3]" />
          )}
        </div>
      </div>
    );
  }

  if (section.type === 'gallery') {
    return (
      <div style={baseStyle} className="w-full">
        {section.title && <h2 className="text-3xl font-bold mb-10 text-center">{section.title}</h2>}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {section.images?.map((img: string, i: number) => (
            <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md group">
              <img src={img} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={`Galeria ${i}`} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === 'video') {
    return (
      <div style={baseStyle} className="w-full flex flex-col items-center">
        {section.title && <h2 className="text-3xl font-bold mb-10 text-center">{section.title}</h2>}
        {section.videoUrl && (
          <div className="w-full max-w-5xl aspect-video rounded-3xl overflow-hidden shadow-2xl bg-black">
            <iframe 
              src={section.videoUrl.replace('watch?v=', 'embed/').replace('vimeo.com/', 'player.vimeo.com/video/')} 
              className="w-full h-full border-0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
            />
          </div>
        )}
      </div>
    );
  }

  if (section.type === 'separator') {
    return (
      <div style={{ ...baseStyle, padding: `${section.height || 40}px 0` }} className="w-full flex items-center justify-center">
        {section.showLine && <div className="w-full max-w-4xl h-px" style={{ backgroundColor: styles.textColor || '#E5E7EB' }}></div>}
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
      const { data, error } = await supabase
        .from('orcamentos')
        .select('*')
        .eq('share_token', token)
        .single();

      if (error) throw error;
      setOrcamento(data);

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
    <div className="min-h-screen bg-gray-100 font-sans text-gray-900 flex flex-col items-center justify-start sm:py-12">
      {isPDFMode ? (
        // Visualização Modo PDF
        <div className="w-full h-[100dvh] sm:h-[90vh] sm:max-w-4xl sm:rounded-3xl sm:shadow-2xl overflow-hidden relative flex flex-col bg-white">
          {sections[0]?.fileUrl ? (
            <iframe src={`${sections[0].fileUrl}#toolbar=0`} className="w-full flex-1 border-0" title="Proposta PDF" />
          ) : (
            <div className="flex-1 flex items-center justify-center">O arquivo PDF não foi encontrado.</div>
          )}
          
          {/* CTAs Fixed na base da tela para o cliente */}
          {sections[0]?.ctas?.length > 0 && sections[0]?.fileUrl && (
            <div className="absolute bottom-6 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none">
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
                    style={{ backgroundColor: cta.color || '#22c55e' }}
                    className="px-8 py-3.5 rounded-xl font-bold text-white shadow-md hover:-translate-y-1 transition-transform flex-1 text-center min-w-[200px]"
                  >
                    {cta.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // Visualização Modo Construtor (Design limpo como landing page)
        <div className="w-full max-w-[900px] bg-white sm:rounded-3xl shadow-2xl min-h-screen sm:min-h-0 flex flex-col overflow-hidden">
          {sections.map((s: any) => (
            <PreviewBlock key={s.id} section={s} />
          ))}
        </div>
      )}
    </div>
  );
}