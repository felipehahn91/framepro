import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { initTracking } from "@/lib/tracking";
import { PDFDocumentViewer } from "@/components/PDFDocumentViewer";
import { useSEO } from "@/hooks/use-seo";

const getDeviceType = () => {
  const width = window.innerWidth;
  const ua = navigator.userAgent.toLowerCase();
  if (width < 768 || ua.includes('mobile')) return 'mobile';
  if (width >= 768 && width <= 1024 || ua.includes('tablet')) return 'tablet';
  return 'desktop';
};

const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const renderHTML = (html: string, fallback: string) => {
  if (!html || html === '<p><br></p>') return fallback;
  return html;
};

const PreviewBlock = ({ section }: { section: any }) => {
  const styles = section.styles || {};
  
  const baseStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor || 'transparent',
    backgroundImage: styles.backgroundImage ? `url(${styles.backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: styles.textColor || 'inherit',
    padding: `${styles.padding || 40}px`,
    fontFamily: styles.fontFamily || 'inherit',
  };

  if (section.type === 'cover') {
    return (
      <div style={{...baseStyle, padding: 0}} className="relative w-full aspect-video flex flex-col items-center justify-center text-center overflow-hidden">
        {styles.backgroundImage && <div className="absolute inset-0 bg-black/40 z-0"></div>}
        <div className="relative z-10 p-8 max-w-3xl w-full">
          <div 
            className="font-bold mb-4 title-rich-text" 
            style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 48}px`, lineHeight: 1.1 }}
            dangerouslySetInnerHTML={{ __html: renderHTML(section.title, 'Título da Proposta') }}
          />
          <div 
            className="opacity-90 title-rich-text" 
            style={{ color: styles.textColor || '#4B5563', fontSize: `${styles.textSize || 20}px`, lineHeight: 1.4 }}
            dangerouslySetInnerHTML={{ __html: renderHTML(section.subtitle, 'Subtítulo da sua proposta') }}
          />
        </div>
      </div>
    );
  }

  if (section.type === 'text') {
    return (
      <div style={baseStyle} className="w-full prose max-w-none">
        {section.content && section.content !== '<p><br></p>' ? (
          <div dangerouslySetInnerHTML={{ __html: section.content }} />
        ) : null}
      </div>
    );
  }

  if (section.type === 'pricing') {
    const packages = section.packages || (section.items ? section.items.map((i: any) => ({
      id: crypto.randomUUID(),
      title: i.name,
      price: i.price,
      description: '',
      features: [],
      buttonText: 'Selecionar',
      buttonLink: '',
      color: '#3b82f6'
    })) : []);

    return (
      <div style={baseStyle} className="w-full">
        {section.title && section.title !== '<p><br></p>' && (
          <div 
            className="font-bold mb-12 text-center title-rich-text" 
            style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 32}px` }}
            dangerouslySetInnerHTML={{ __html: section.title }}
          />
        )}
        
        <div className={`grid gap-6 md:gap-8 grid-cols-1 ${packages.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : packages.length >= 3 ? 'md:grid-cols-3' : 'max-w-md mx-auto'}`}>
          {packages.map((pkg: any, i: number) => (
            <div key={pkg.id || i} className="flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
              <div style={{ backgroundColor: pkg.color || '#3b82f6' }} className="pt-6 pb-16 px-6 text-center text-white">
                <h3 className="text-xl font-bold uppercase tracking-wider">{pkg.title || 'Plano'}</h3>
              </div>
              
              <div className="px-6 flex-1 flex flex-col relative z-10 -mt-10">
                <div className="bg-white rounded-xl shadow-lg p-6 text-center border border-gray-50 mb-6 flex flex-col items-center justify-center min-h-[120px]">
                  <div className="text-3xl font-bold" style={{ color: pkg.color || '#3b82f6' }}>
                     {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(pkg.price) || 0)}
                  </div>
                  {pkg.description && <p className="text-xs text-gray-400 mt-3 leading-relaxed">{pkg.description}</p>}
                </div>
                
                <ul className="space-y-4 text-left flex-1 px-2">
                  {(pkg.features || []).map((feat: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600">
                      <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: pkg.color || '#3b82f6' }} />
                      <span className="text-sm leading-relaxed">{feat}</span>
                    </li>
                  ))}
                  {(!pkg.features || pkg.features.length === 0) && (
                    <p className="text-xs text-gray-300 italic text-center">Nenhum item adicionado.</p>
                  )}
                </ul>
                
                <div className="mt-8 mb-6 px-2">
                  <a 
                    href={pkg.buttonLink || '#'} 
                    target={pkg.buttonLink ? "_blank" : "_self"}
                    rel="noreferrer"
                    style={{ backgroundColor: pkg.color || '#3b82f6' }} 
                    className="block w-full py-3.5 rounded-full text-white font-bold transition-transform hover:-translate-y-1 shadow-lg hover:shadow-xl text-center text-sm uppercase tracking-wider"
                  >
                    {pkg.buttonText || 'Selecionar Plano'}
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (section.type === 'two-columns') {
    return (
      <div style={baseStyle} className={`w-full flex flex-col ${section.imagePosition === 'right' ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}>
        <div className="flex-1 space-y-6 w-full">
          <div 
            className="font-bold leading-tight title-rich-text" 
            style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 36}px` }}
            dangerouslySetInnerHTML={{ __html: renderHTML(section.title, 'Título da Seção') }}
          />
          <div className="prose max-w-none opacity-90">
            {section.content && section.content !== '<p><br></p>' && <div dangerouslySetInnerHTML={{ __html: section.content }} />}
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
        {section.title && section.title !== '<p><br></p>' && (
          <div 
            className="font-bold mb-10 text-center title-rich-text" 
            style={{ fontSize: `${styles.titleSize || 32}px` }}
            dangerouslySetInnerHTML={{ __html: section.title }}
          />
        )}
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
        {section.title && section.title !== '<p><br></p>' && (
          <div 
            className="font-bold mb-10 text-center title-rich-text" 
            style={{ fontSize: `${styles.titleSize || 32}px` }}
            dangerouslySetInnerHTML={{ __html: section.title }}
          />
        )}
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

  if (section.type === 'button') {
    const handleApprove = (e: React.MouseEvent) => {
      e.preventDefault();
      toast.success(section.buttonApproveMessage || "Orçamento aprovado com sucesso!");
    };

    const handleScroll = (e: React.MouseEvent) => {
      e.preventDefault();
      if (section.buttonScrollTarget) {
        document.getElementById(section.buttonScrollTarget)?.scrollIntoView({ behavior: 'smooth' });
      }
    };

    let href: string | undefined = undefined;
    let onClick: ((e: React.MouseEvent) => void) | undefined = undefined;

    if (section.buttonAction === 'whatsapp') {
      const num = (section.buttonWhatsappNumber || '').replace(/\D/g, '');
      const txt = encodeURIComponent(section.buttonWhatsappText || '');
      href = `https://wa.me/${num}?text=${txt}`;
    } else if (section.buttonAction === 'approve') {
      onClick = handleApprove;
    } else if (section.buttonAction === 'scroll') {
      href = `#${section.buttonScrollTarget}`;
      onClick = handleScroll;
    }

    return (
      <div style={baseStyle} className={`w-full flex justify-${styles.align === 'left' ? 'start' : styles.align === 'right' ? 'end' : 'center'}`}>
        <a
          href={href}
          onClick={onClick}
          target={section.buttonAction === 'whatsapp' ? '_blank' : '_self'}
          style={{ backgroundColor: styles.buttonColor || '#f97316', color: styles.buttonTextColor || '#ffffff' }}
          className="px-8 py-4 rounded-full font-bold text-lg shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all inline-block cursor-pointer"
        >
          {section.buttonText || 'Clique Aqui'}
        </a>
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
  const [pdfLoaded, setPdfLoaded] = useState(false);

  const loadedSections = orcamento?.sections || [];
  const globalSec = loadedSections.find((s: any) => s.type === 'global-settings');
  const globalSettings = globalSec?.styles || { pageBackgroundColor: '#f3f4f6', backgroundColor: '#ffffff', maxWidth: '900px' };
  const renderSections = loadedSections.filter((s: any) => s.type !== 'global-settings');
  
  const pdfSection = loadedSections.find((s: any) => s.type === 'pdf');

  useSEO({
    title: globalSettings.seoTitle || (orcamento ? orcamento.name : "Proposta Comercial"),
    description: globalSettings.seoDescription || "Acesse este link para visualizar a proposta comercial.",
    image: globalSettings.seoImage || undefined,
  });

  useEffect(() => {
    if (token) fetchOrcamento();
  }, [token]);

  const fetchOrcamento = async () => {
    try {
      const { data, error } = await supabase.rpc('get_public_orcamento', { p_token: token });

      if (error || !data) throw error || new Error("Not found");
      setOrcamento(data);

      // Atualizar views
      supabase.rpc('increment_orcamento_view', { p_id: data.id }).then();
    } catch (error) {
      console.error("Error fetching orcamento:", error);
      toast.error("Proposta não encontrada.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orcamento) return;
    
    const sessionId = generateSessionId();
    const deviceType = getDeviceType();
    
    // Inicia gravação de interações (Clarity clone)
    const cleanupTracking = initTracking(orcamento.id, sessionId, deviceType);

    return () => {
      cleanupTracking();
    };
  }, [orcamento]);

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
  if (!orcamento) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><AlertCircle className="w-16 h-16 text-gray-300 mb-4" /><h2 className="text-2xl font-bold">Proposta Indisponível</h2><p className="text-gray-500">O link acessado é inválido ou expirou.</p></div>;

  const isPDFMode = orcamento.type === 'pdf';

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        .title-rich-text p { margin: 0; padding: 0; }
        html { scroll-behavior: smooth; }
      `}} />
      <div
        className="min-h-screen font-sans text-gray-900 flex flex-col items-center justify-start sm:py-12 transition-colors relative overflow-y-auto custom-scrollbar"
        style={{ backgroundColor: globalSettings.pageBackgroundColor || '#f3f4f6' }}
      >
        {isPDFMode ? (
          <div
            id="proposal-container"
            className="w-full sm:rounded-3xl sm:shadow-2xl overflow-hidden relative flex flex-col transition-all shrink-0"
            style={{
              maxWidth: globalSettings.maxWidth || '900px',
              backgroundColor: globalSettings.backgroundColor || '#ffffff',
              minHeight: pdfSection?.fileUrl && pdfLoaded ? 'auto' : '1000px'
            }}
          >
            {pdfSection?.fileUrl ? (
              <PDFDocumentViewer 
                url={pdfSection.fileUrl} 
                onLoadSuccessCallback={() => setPdfLoaded(true)}
              />
            ) : (
              <div className="flex-1 flex items-center justify-center p-20">O arquivo PDF não foi encontrado.</div>
            )}

            {/* FREE CTAS (Mostra apenas após carregar o PDF) */}
            {pdfLoaded && pdfSection?.ctas?.length > 0 && pdfSection?.fileUrl && (
              <div className="animate-in fade-in duration-500 delay-300">
                {pdfSection.ctas.map((cta: any, i: number) => {
                  if (cta.isGrouped !== false) return null;
                  return (
                    <button
                      key={`free-${i}`}
                      onClick={() => {
                        if(cta.link) {
                          const finalLink = cta.link.startsWith('http') ? cta.link : `https://${cta.link}`;
                          window.open(finalLink, '_blank');
                        }
                      }}
                      style={{
                        position: 'absolute',
                        top: cta.top || '50%',
                        left: cta.left || '50%',
                        transform: 'translate(-50%, -50%)',
                        backgroundColor: cta.color || '#f97316',
                        color: cta.textColor || '#ffffff',
                        borderRadius: cta.borderRadius || '9999px',
                        fontFamily: cta.fontFamily || 'inherit',
                        fontWeight: cta.isBold === false ? 'normal' : 'bold',
                        textTransform: cta.isUppercase ? 'uppercase' : 'none',
                        zIndex: 51
                      }}
                      className="px-3 py-1.5 text-[10px] sm:px-4 sm:py-2 sm:text-xs md:px-5 md:py-2.5 md:text-sm lg:px-6 lg:py-3 lg:text-base shadow-xl hover:-translate-y-1 hover:shadow-2xl transition-all whitespace-nowrap"
                    >
                      {cta.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div
            id="proposal-container"
            className="w-full sm:rounded-3xl shadow-2xl min-h-screen sm:min-h-0 flex flex-col overflow-hidden transition-all relative shrink-0"
            style={{
              maxWidth: globalSettings.maxWidth,
              backgroundColor: globalSettings.backgroundColor
            }}
          >
            {renderSections.map((s: any) => (
              <div key={s.id} id={s.id}>
                <PreviewBlock section={s} />
              </div>
            ))}
          </div>
        )}

        {/* GROUPED CTAS (Mostra apenas após carregar o PDF se for modo PDF) */}
        {((!isPDFMode) || (isPDFMode && pdfLoaded)) && isPDFMode && pdfSection?.ctas?.length > 0 && pdfSection?.fileUrl && pdfSection.ctas.some((c: any) => c.isGrouped !== false) && (
          <div className="sticky bottom-6 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none mt-auto pb-6 w-full animate-in slide-in-from-bottom-10 fade-in duration-500 delay-300">
            <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-gray-200 flex flex-wrap justify-center gap-4 pointer-events-auto max-w-2xl w-full">
              {pdfSection.ctas.filter((c: any) => c.isGrouped !== false).map((cta: any, i: number) => (
                <button
                  key={i}
                  onClick={() => {
                    if(cta.link) {
                      const finalLink = cta.link.startsWith('http') ? cta.link : `https://${cta.link}`;
                      window.open(finalLink, '_blank');
                    }
                  }}
                  style={{
                    backgroundColor: cta.color || '#f97316',
                    color: cta.textColor || '#ffffff',
                    borderRadius: cta.borderRadius || '9999px',
                    fontFamily: cta.fontFamily || 'inherit',
                    fontWeight: cta.isBold === false ? 'normal' : 'bold',
                    textTransform: cta.isUppercase ? 'uppercase' : 'none',
                  }}
                  className="px-4 py-3 text-xs sm:px-8 sm:py-3.5 sm:text-base shadow-md hover:-translate-y-1 transition-transform flex-1 text-center min-w-[140px] sm:min-w-[200px]"
                >
                  {cta.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}