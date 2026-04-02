import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import { 
  ArrowLeft, Save, Loader2, Image as ImageIcon, Type, DollarSign, 
  Trash2, Plus, FileUp, Settings, Link as LinkIcon, ArrowUp, ArrowDown,
  LayoutTemplate, Video, Minus, Columns, ChevronDown, Palette, AlignLeft, X, Layers,
  UploadCloud, ExternalLink, CheckCircle2, MousePointerClick
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PDFDocumentViewer } from "@/components/PDFDocumentViewer";

const SECTION_LABELS: Record<string, string> = {
  'cover': 'Capa',
  'text': 'Texto Livre',
  'pricing': 'Oferta',
  'two-columns': '2 Colunas',
  'gallery': 'Galeria',
  'video': 'Vídeo',
  'button': 'Botão CTA',
  'separator': 'Separador'
};

const quillModules = {
  toolbar: [
    [{ 'header': [2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    [{ 'align': [] }],
    ['clean']
  ]
};

const titleQuillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ 'color': [] }, { 'background': [] }],
    [{ 'align': [] }],
    ['clean']
  ]
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
        ) : (
          <p className="opacity-50 italic">Bloco de texto vazio. Selecione este bloco para digitar.</p>
        )}
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
      <div style={baseStyle} className={`w-full flex flex-col ${section.imagePosition === 'right' ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-12 items-center`}>
        <div className="flex-1 space-y-4 w-full">
          <div 
            className="font-bold leading-tight mb-4 title-rich-text" 
            style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 36}px` }}
            dangerouslySetInnerHTML={{ __html: renderHTML(section.title, 'Título da Seção') }}
          />
          <div className="prose max-w-none opacity-90">
            {section.content && section.content !== '<p><br></p>' ? <div dangerouslySetInnerHTML={{ __html: section.content }} /> : <p>Descreva seu serviço, produto ou metodologia aqui.</p>}
          </div>
        </div>
        <div className="flex-1 w-full">
          {section.imageUrl ? (
            <img src={section.imageUrl} alt="Seção" className="w-full rounded-2xl shadow-lg object-cover aspect-video" />
          ) : (
            <div className="w-full aspect-video bg-black/10 rounded-2xl flex items-center justify-center border-2 border-dashed border-black/20">
              <ImageIcon className="w-8 h-8 opacity-40" />
            </div>
          )}
        </div>
      </div>
    );
  }

  if (section.type === 'gallery') {
    return (
      <div style={baseStyle} className="w-full">
        {section.title && (
          <div 
            className="font-bold mb-6 text-center title-rich-text" 
            style={{ fontSize: `${styles.titleSize || 32}px` }}
            dangerouslySetInnerHTML={{ __html: section.title }}
          />
        )}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {section.images?.length > 0 ? section.images.map((img: string, i: number) => (
            <img key={i} src={img} className="w-full aspect-square object-cover rounded-xl shadow-sm" alt={`Galeria ${i}`} />
          )) : (
            <div className="col-span-full py-12 text-center opacity-50 border-2 border-dashed rounded-xl">Adicione imagens na galeria</div>
          )}
        </div>
      </div>
    );
  }

  if (section.type === 'video') {
    return (
      <div style={baseStyle} className="w-full flex flex-col items-center">
        {section.title && (
          <div 
            className="font-bold mb-6 text-center title-rich-text" 
            style={{ fontSize: `${styles.titleSize || 32}px` }}
            dangerouslySetInnerHTML={{ __html: section.title }}
          />
        )}
        {section.videoUrl ? (
          <div className="w-full max-w-4xl aspect-video rounded-2xl overflow-hidden shadow-xl">
            <iframe 
              src={section.videoUrl.replace('watch?v=', 'embed/').replace('vimeo.com/', 'player.vimeo.com/video/')} 
              className="w-full h-full border-0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen 
            />
          </div>
        ) : (
          <div className="w-full max-w-4xl aspect-video bg-black/10 rounded-2xl flex flex-col items-center justify-center border-2 border-dashed border-black/20">
            <Video className="w-12 h-12 opacity-30 mb-2" />
            <span className="opacity-50">Insira a URL do vídeo</span>
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
        {section.showLine && <div className="w-full max-w-3xl h-px" style={{ backgroundColor: styles.textColor || '#E5E7EB' }}></div>}
      </div>
    );
  }

  return null;
};

export default function OrcamentoEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [orcamento, setOrcamento] = useState<any>(null);
  
  const [globalSettings, setGlobalSettings] = useState({ pageBackgroundColor: '#f3f4f6', backgroundColor: '#ffffff', maxWidth: '900px' });
  const [sections, setSections] = useState<any[]>([]);
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'content' | 'style'>('content');

  const isPDFMode = orcamento?.type === 'pdf';
  const pdfSection = sections.find(s => s.type === 'pdf');

  const [draggingCtaIndex, setDraggingCtaIndex] = useState<number | null>(null);
  const [expandedCtaIndex, setExpandedCtaIndex] = useState<number | null>(0);

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase.from('orcamentos').select('*').eq('id', id).single();
      if (error) throw error;
      
      setOrcamento(data);
      
      const loadedSections = data.sections || [];
      const globalSec = loadedSections.find((s: any) => s.type === 'global-settings');
      
      if (globalSec) {
        setGlobalSettings(globalSec.styles || { pageBackgroundColor: '#f3f4f6', backgroundColor: '#ffffff', maxWidth: '900px' });
        setSections(loadedSections.filter((s: any) => s.type !== 'global-settings'));
      } else {
        setGlobalSettings({ pageBackgroundColor: '#f3f4f6', backgroundColor: '#ffffff', maxWidth: '900px' });
        setSections(loadedSections);
      }

      if (loadedSections.length > 0 && loadedSections[0].type !== 'global-settings') {
        setSelectedId(loadedSections[0].id);
      }
    } catch (error) {
      toast.error("Orçamento não encontrado.");
      navigate('/orcamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const sectionsToSave = [
        { id: 'global', type: 'global-settings', styles: globalSettings },
        ...sections
      ];

      await supabase.from('orcamentos').update({
        name: orcamento.name,
        sections: sectionsToSave,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      
      toast.success("Orçamento salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  const handlePreview = () => {
    if (orcamento?.share_token) {
      window.open(`/orcamentos/public/${orcamento.share_token}`, '_blank');
    }
  };

  const addSection = (type: string) => {
    const newSection: any = { 
      id: crypto.randomUUID(), 
      type,
      styles: { 
        backgroundColor: 'transparent', 
        textColor: '#111827', 
        padding: 40, 
        backgroundImage: '',
        fontFamily: 'inherit',
        titleSize: type === 'cover' ? 56 : 32,
        textSize: 18
      }
    };
    
    if (type === 'cover') { 
      newSection.title = 'Nova Capa'; newSection.subtitle = 'Subtítulo da proposta'; newSection.imageUrl = ''; 
      newSection.styles.padding = 0;
    }
    if (type === 'text') newSection.content = '<p>Digite seu texto aqui...</p>';
    if (type === 'pricing') { 
      newSection.title = 'Investimento'; 
      newSection.packages = [
        { id: crypto.randomUUID(), title: 'Basic', price: 1099, description: 'Plano inicial para projetos.', features: ['Benefício 1', 'Benefício 2'], buttonText: 'Contratar Basic', buttonLink: '', color: '#3b82f6' },
        { id: crypto.randomUUID(), title: 'Premium', price: 2099, description: 'O melhor custo benefício.', features: ['Benefício 1', 'Benefício 2', 'Benefício Especial'], buttonText: 'Contratar Premium', buttonLink: '', color: '#8b5cf6' }
      ]; 
    }
    if (type === 'two-columns') { newSection.title = 'Nossa Solução'; newSection.content = '<p>Detalhes do serviço...</p>'; newSection.imageUrl = ''; newSection.imagePosition = 'right'; }
    if (type === 'gallery') { newSection.title = 'Portfólio'; newSection.images = []; }
    if (type === 'video') { newSection.title = 'Apresentação'; newSection.videoUrl = ''; }
    if (type === 'button') {
      newSection.buttonText = 'Aprovar Orçamento';
      newSection.buttonAction = 'approve';
      newSection.buttonApproveMessage = 'Muito obrigado! Entraremos em contato em breve.';
      newSection.styles.buttonColor = '#f97316';
      newSection.styles.buttonTextColor = '#ffffff';
      newSection.styles.align = 'center';
    }
    if (type === 'separator') { newSection.height = 40; newSection.showLine = true; }
    
    setSections([...sections, newSection]);
    setSelectedId(newSection.id);
    setActiveTab('content');
  };

  const updateSection = (id: string, updates: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
  };

  const updateStyle = (id: string, styleKey: string, value: string | number) => {
    setSections(sections.map(s => {
      if (s.id === id) {
        return { ...s, styles: { ...(s.styles || {}), [styleKey]: value } };
      }
      return s;
    }));
  };

  const moveSection = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index > 0) {
      const newSections = [...sections];
      [newSections[index - 1], newSections[index]] = [newSections[index], newSections[index - 1]];
      setSections(newSections);
    } else if (direction === 'down' && index < sections.length - 1) {
      const newSections = [...sections];
      [newSections[index + 1], newSections[index]] = [newSections[index], newSections[index + 1]];
      setSections(newSections);
    }
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const handleImageUpload = async (file: File, callback: (url: string) => void) => {
    if (!file.type.startsWith('image/')) return toast.error("Apenas imagens são permitidas.");
    if (file.size > 5 * 1024 * 1024) return toast.error("A imagem deve ter no máximo 5MB.");
    
    const toastId = toast.loading("Fazendo upload da imagem...");
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error } = await supabase.storage.from('contract_images').upload(filePath, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('contract_images').getPublicUrl(filePath);
      callback(publicUrl);
      toast.success("Upload concluído!", { id: toastId });
    } catch (error) {
      console.error(error);
      toast.error("Erro ao fazer upload da imagem.", { id: toastId });
    }
  };

  const handleGalleryUpload = async (files: FileList, sectionId: string) => {
    const toastId = toast.loading(`Fazendo upload de ${files.length} imagem(ns)...`);
    try {
      const newUrls = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (!file.type.startsWith('image/')) continue;
        if (file.size > 5 * 1024 * 1024) continue;
        
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error } = await supabase.storage.from('contract_images').upload(filePath, file);
        if (error) throw error;
        
        const { data: { publicUrl } } = supabase.storage.from('contract_images').getPublicUrl(filePath);
        newUrls.push(publicUrl);
      }
      
      setSections(prev => prev.map(s => {
        if (s.id === sectionId) {
          return { ...s, images: [...(s.images || []), ...newUrls] };
        }
        return s;
      }));
      
      toast.success("Upload da galeria concluído!", { id: toastId });
    } catch (error) {
      toast.error("Erro no upload da galeria.", { id: toastId });
    }
  };

  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') return toast.error("Apenas arquivos PDF.");
    toast.info("Fazendo upload...");
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;
      const { error } = await supabase.storage.from('contract_images').upload(filePath, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('contract_images').getPublicUrl(filePath);
      
      if (pdfSection) {
        updateSection(pdfSection.id, { fileUrl: publicUrl });
      }
      toast.success("PDF carregado!");
    } catch (e) {
      toast.error("Erro no upload.");
    }
  };

  const handleDragMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (draggingCtaIndex === null || !pdfSection) return;
    const rect = e.currentTarget.getBoundingClientRect();
    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;
    
    // Limits
    if (x < 0) x = 0; if (x > 100) x = 100;
    if (y < 0) y = 0; if (y > 100) y = 100;

    const newCtas = [...pdfSection.ctas];
    newCtas[draggingCtaIndex].left = `${x.toFixed(2)}%`;
    newCtas[draggingCtaIndex].top = `${y.toFixed(2)}%`;
    updateSection(pdfSection.id, { ctas: newCtas });
  };

  const activeSection = sections.find(s => s.id === selectedId);

  return (
    <Layout>
      <style dangerouslySetInnerHTML={{__html: `
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,400;0,600;0,700;1,400&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
        .ql-toolbar { border-radius: 8px 8px 0 0; border-color: #e5e7eb !important; background: #fafafa; }
        .ql-container { border-radius: 0 0 8px 8px; border-color: #e5e7eb !important; font-family: inherit; font-size: 14px; background: white; min-height: 150px; }
        
        .title-quill .ql-container { min-height: 60px; height: auto; }
        .title-quill .ql-editor { min-height: 60px; padding: 12px; }
        .title-rich-text p { margin: 0; padding: 0; }
      `}} />
      <div className="flex flex-col h-[calc(100vh-6rem)]">
        {/* Topbar */}
        <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm flex items-center justify-between mb-4 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/orcamentos')} className="text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="h-6 w-px bg-gray-200"></div>
            <input 
              type="text" 
              value={orcamento?.name || ''} 
              onChange={e => setOrcamento({...orcamento, name: e.target.value})}
              className="text-[16px] font-bold text-gray-900 border-none focus:ring-0 p-0 bg-transparent w-48 md:w-96 outline-none"
              placeholder="Nome da Proposta"
            />
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={handlePreview} 
              className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-semibold rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-4 h-4" /> Visualizar
            </button>
            <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-orange-500 text-white text-sm font-semibold rounded-md hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Atualizar
            </button>
          </div>
        </div>

        {/* Workspace Elementor Style */}
        <div className="flex-1 flex overflow-hidden bg-gray-100 rounded-xl border border-gray-200">
          
          {/* SIDEBAR ESQUERDA */}
          <div className="w-[340px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
            
            <div className="p-4 border-b border-gray-200 bg-white flex flex-col gap-3 shadow-sm z-10 relative">
              {selectedId === 'global' ? (
                <>
                  <button 
                    onClick={() => setSelectedId(null)} 
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors w-fit"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar aos Blocos
                  </button>
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                    <Settings className="w-5 h-5 text-orange-500" /> 
                    <span>Configurações da Página</span>
                  </div>
                </>
              ) : activeSection ? (
                <>
                  <button 
                    onClick={() => setSelectedId(null)} 
                    className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-orange-500 transition-colors w-fit"
                  >
                    <ArrowLeft className="w-4 h-4" /> Voltar aos Blocos
                  </button>
                  <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                    <Settings className="w-5 h-5 text-orange-500" /> 
                    <span className="capitalize">Editar {SECTION_LABELS[activeSection.type] || activeSection.type}</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
                  <LayoutTemplate className="w-5 h-5 text-orange-500" /> Blocos Disponíveis
                </div>
              )}
            </div>

            {/* Corpo da Sidebar Esquerda */}
            <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/30">
              
              {selectedId === 'global' ? (
                <div className="p-4 space-y-5 animate-in fade-in">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Fundo da Tela</h4>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Cor de Fundo (Área Externa)</label>
                      <div className="flex gap-2">
                        <input type="color" value={globalSettings.pageBackgroundColor || '#f3f4f6'} onChange={e => setGlobalSettings({...globalSettings, pageBackgroundColor: e.target.value})} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" />
                        <input type="text" value={globalSettings.pageBackgroundColor || '#f3f4f6'} onChange={e => setGlobalSettings({...globalSettings, pageBackgroundColor: e.target.value})} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-orange-400 bg-white" />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-1.5">Define a cor da página inteira por trás do orçamento.</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Fundo da Proposta</h4>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Cor de Fundo (Papel)</label>
                      <div className="flex gap-2">
                        <input type="color" value={globalSettings.backgroundColor || '#ffffff'} onChange={e => setGlobalSettings({...globalSettings, backgroundColor: e.target.value})} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" />
                        <input type="text" value={globalSettings.backgroundColor || '#ffffff'} onChange={e => setGlobalSettings({...globalSettings, backgroundColor: e.target.value})} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-orange-400 bg-white" />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                    <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Dimensões</h4>
                    <div>
                      <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Largura do Conteúdo</label>
                      <select value={globalSettings.maxWidth} onChange={e => setGlobalSettings({...globalSettings, maxWidth: e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-orange-400 bg-white">
                        <option value="800px">Estreito (800px)</option>
                        <option value="900px">Padrão (900px)</option>
                        <option value="1100px">Largo (1100px)</option>
                        <option value="100%">Tela Cheia (100%)</option>
                      </select>
                    </div>
                  </div>
                </div>
              ) : !activeSection && !isPDFMode ? (
                <div className="p-4 space-y-6">
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Adicionar Bloco</h3>
                    <div className="grid grid-cols-2 gap-2">
                      <button onClick={() => addSection('cover')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group shadow-sm">
                        <ImageIcon className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Capa</span>
                      </button>
                      <button onClick={() => addSection('text')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group shadow-sm">
                        <Type className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Texto Livre</span>
                      </button>
                      <button onClick={() => addSection('two-columns')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group shadow-sm">
                        <Columns className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">2 Colunas</span>
                      </button>
                      <button onClick={() => addSection('pricing')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group shadow-sm">
                        <DollarSign className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Oferta</span>
                      </button>
                      <button onClick={() => addSection('gallery')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group shadow-sm">
                        <LayoutTemplate className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Galeria</span>
                      </button>
                      <button onClick={() => addSection('video')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group shadow-sm">
                        <Video className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Vídeo</span>
                      </button>
                      <button onClick={() => addSection('button')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group shadow-sm">
                        <MousePointerClick className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Botão CTA</span>
                      </button>
                      <button onClick={() => addSection('separator')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group col-span-2 shadow-sm">
                        <Minus className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Separador</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : isPDFMode ? (
                <div className="p-4 space-y-8 animate-in fade-in">
                  
                  {/* CONFIGURAÇÕES DE FUNDO E DIMENSÕES */}
                  <div className="space-y-4">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Aparência da Página</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Largura do PDF na Tela</label>
                        <select value={globalSettings.maxWidth} onChange={e => setGlobalSettings({...globalSettings, maxWidth: e.target.value})} className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-orange-400 bg-white">
                          <option value="800px">Estreito (800px)</option>
                          <option value="900px">Padrão (900px)</option>
                          <option value="1100px">Largo (1100px)</option>
                          <option value="100%">Tela Cheia (100%)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Cor de Fundo (Área Externa)</label>
                        <div className="flex gap-2">
                          <input type="color" value={globalSettings.pageBackgroundColor || '#f3f4f6'} onChange={e => setGlobalSettings({...globalSettings, pageBackgroundColor: e.target.value})} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" />
                          <input type="text" value={globalSettings.pageBackgroundColor || '#f3f4f6'} onChange={e => setGlobalSettings({...globalSettings, pageBackgroundColor: e.target.value})} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-orange-400 bg-white" />
                        </div>
                      </div>

                      <div>
                        <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Cor de Fundo (Atrás do PDF)</label>
                        <div className="flex gap-2">
                          <input type="color" value={globalSettings.backgroundColor || '#ffffff'} onChange={e => setGlobalSettings({...globalSettings, backgroundColor: e.target.value})} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" />
                          <input type="text" value={globalSettings.backgroundColor || '#ffffff'} onChange={e => setGlobalSettings({...globalSettings, backgroundColor: e.target.value})} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-orange-400 bg-white" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ARQUIVO PDF */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider border-b border-gray-100 pb-2">Arquivo PDF</h3>
                    {pdfSection?.fileUrl ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                        <FileUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-green-700 mb-2">PDF Carregado</p>
                        <button onClick={() => updateSection(pdfSection.id, { fileUrl: '' })} className="text-[11px] font-bold text-red-500 hover:underline">REMOVER ARQUIVO</button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors rounded-lg p-6 flex flex-col items-center cursor-pointer text-center">
                        <FileUp className="w-6 h-6 text-blue-500 mb-2" />
                        <span className="text-sm font-bold text-blue-700">Selecione o PDF</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={e => e.target.files && handlePdfUpload(e.target.files[0])} />
                      </label>
                    )}
                  </div>
                  
                  {/* BOTÕES CTA */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Botões de Ação (CTAs)</h3>
                      <button onClick={() => {
                        if (pdfSection) {
                          const ctas = pdfSection.ctas || [];
                          updateSection(pdfSection.id, {
                            ctas: [...ctas, {
                              id: crypto.randomUUID(),
                              label: 'Aprovar Orçamento',
                              link: '',
                              color: '#f97316',
                              textColor: '#ffffff',
                              borderRadius: '9999px',
                              fontFamily: 'inherit',
                              isBold: true,
                              isUppercase: false,
                              isGrouped: true,
                              top: '80%',
                              left: '50%'
                            }]
                          });
                          setExpandedCtaIndex(ctas.length);
                        }
                      }} className="p-1.5 bg-orange-100 text-orange-600 rounded hover:bg-orange-200"><Plus className="w-4 h-4" /></button>
                    </div>
                    
                    <div className="space-y-4">
                      {pdfSection?.ctas?.map((cta: any, idx: number) => (
                        <div key={cta.id || idx} className="bg-gray-50 border border-gray-200 rounded-xl shadow-sm relative group overflow-hidden">
                          
                          {/* Accordion Header */}
                          <div
                            className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => setExpandedCtaIndex(expandedCtaIndex === idx ? null : idx)}
                          >
                            <div className="flex items-center gap-2">
                              <MousePointerClick className="w-4 h-4 text-gray-400" />
                              <span className="font-bold text-sm text-gray-700">{cta.label || `Botão ${idx + 1}`}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button onClick={(e) => {
                                e.stopPropagation();
                                const newCtas = [...pdfSection.ctas]; newCtas.splice(idx, 1);
                                updateSection(pdfSection.id, { ctas: newCtas });
                                if (expandedCtaIndex === idx) setExpandedCtaIndex(null);
                              }} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"><X className="w-4 h-4" /></button>
                              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${expandedCtaIndex === idx ? 'rotate-180' : ''}`} />
                            </div>
                          </div>

                          {/* Accordion Body */}
                          {expandedCtaIndex === idx && (
                            <div className="p-4 pt-0 space-y-4 border-t border-gray-100 mt-2 animate-in fade-in slide-in-from-top-2">
                              <div className="grid grid-cols-1 gap-3 pt-2">
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Texto do Botão</label>
                                  <input value={cta.label} onChange={e => {
                                      const newCtas = [...pdfSection.ctas]; newCtas[idx].label = e.target.value;
                                      updateSection(pdfSection.id, { ctas: newCtas });
                                    }} className="w-full text-sm font-semibold border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-orange-400 bg-white"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Link de Destino</label>
                                  <input value={cta.link} onChange={e => {
                                      const newCtas = [...pdfSection.ctas]; newCtas[idx].link = e.target.value;
                                      updateSection(pdfSection.id, { ctas: newCtas });
                                    }} placeholder="https://..." className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 outline-none focus:border-orange-400 bg-white"
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cor Fundo</label>
                                    <div className="flex gap-2">
                                      <input type="color" value={cta.color || '#f97316'} onChange={e => {
                                          const newCtas = [...pdfSection.ctas]; newCtas[idx].color = e.target.value;
                                          updateSection(pdfSection.id, { ctas: newCtas });
                                        }} className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5 bg-white"
                                      />
                                    </div>
                                  </div>
                                  <div>
                                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Cor Texto</label>
                                    <div className="flex gap-2">
                                      <input type="color" value={cta.textColor || '#ffffff'} onChange={e => {
                                          const newCtas = [...pdfSection.ctas]; newCtas[idx].textColor = e.target.value;
                                          updateSection(pdfSection.id, { ctas: newCtas });
                                        }} className="w-8 h-8 rounded cursor-pointer border border-gray-300 p-0.5 bg-white"
                                      />
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-2">Estilo Visual</label>
                                  <div className="grid grid-cols-2 gap-2 mb-2">
                                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                      <input type="checkbox" checked={cta.isBold !== false} onChange={e => {
                                        const newCtas = [...pdfSection.ctas]; newCtas[idx].isBold = e.target.checked;
                                        updateSection(pdfSection.id, { ctas: newCtas });
                                      }} className="rounded text-orange-500 focus:ring-orange-500" />
                                      Negrito
                                    </label>
                                    <label className="flex items-center gap-2 text-xs text-gray-700 cursor-pointer">
                                      <input type="checkbox" checked={cta.isUppercase || false} onChange={e => {
                                        const newCtas = [...pdfSection.ctas]; newCtas[idx].isUppercase = e.target.checked;
                                        updateSection(pdfSection.id, { ctas: newCtas });
                                      }} className="rounded text-orange-500 focus:ring-orange-500" />
                                      Maiúsculas
                                    </label>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 gap-2">
                                    <div>
                                      <label className="text-[10px] text-gray-400 font-semibold">Arredondamento</label>
                                      <select value={cta.borderRadius || '9999px'} onChange={e => {
                                          const newCtas = [...pdfSection.ctas]; newCtas[idx].borderRadius = e.target.value;
                                          updateSection(pdfSection.id, { ctas: newCtas });
                                        }} className="w-full text-xs border border-gray-200 rounded-md p-1.5 focus:outline-none focus:border-orange-400 bg-white">
                                        <option value="0px">Quadrado</option>
                                        <option value="8px">Leve</option>
                                        <option value="16px">Médio</option>
                                        <option value="9999px">Pílula</option>
                                      </select>
                                    </div>
                                    <div>
                                      <label className="text-[10px] text-gray-400 font-semibold">Fonte</label>
                                      <select value={cta.fontFamily || 'inherit'} onChange={e => {
                                          const newCtas = [...pdfSection.ctas]; newCtas[idx].fontFamily = e.target.value;
                                          updateSection(pdfSection.id, { ctas: newCtas });
                                        }} className="w-full text-xs border border-gray-200 rounded-md p-1.5 focus:outline-none focus:border-orange-400 bg-white">
                                        <option value="inherit">Padrão</option>
                                        <option value="'Montserrat', sans-serif">Montserrat</option>
                                        <option value="'Playfair Display', serif">Playfair</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>

                                <div className="pt-2 border-t border-gray-100">
                                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 mb-2 cursor-pointer">
                                    <input type="checkbox" checked={cta.isGrouped !== false} onChange={e => {
                                      const newCtas = [...pdfSection.ctas]; newCtas[idx].isGrouped = e.target.checked;
                                      updateSection(pdfSection.id, { ctas: newCtas });
                                    }} className="rounded text-orange-500 focus:ring-orange-500 w-4 h-4" />
                                    Agrupar botão na barra flutuante inferior?
                                  </label>
                                  
                                  {cta.isGrouped === false && (
                                    <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                                      <p className="text-[10px] text-orange-600 font-semibold mb-2 leading-tight">Posicionamento Livre: Arraste o botão livremente sobre o PDF ao lado para fixá-lo na posição desejada.</p>
                                      <div className="grid grid-cols-2 gap-2">
                                        <div>
                                          <label className="text-[10px] text-orange-700 font-bold">X (Esquerda %)</label>
                                          <input type="text" value={cta.left || '50%'} onChange={e => {
                                              const newCtas = [...pdfSection.ctas]; newCtas[idx].left = e.target.value;
                                              updateSection(pdfSection.id, { ctas: newCtas });
                                            }} className="w-full text-xs border border-orange-200 rounded p-1 bg-white outline-none" />
                                        </div>
                                        <div>
                                          <label className="text-[10px] text-orange-700 font-bold">Y (Topo %)</label>
                                          <input type="text" value={cta.top || '50%'} onChange={e => {
                                              const newCtas = [...pdfSection.ctas]; newCtas[idx].top = e.target.value;
                                              updateSection(pdfSection.id, { ctas: newCtas });
                                            }} className="w-full text-xs border border-orange-200 rounded p-1 bg-white outline-none" />
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                // Builder Active Section Settings
                <div className="flex flex-col h-full animate-in fade-in slide-in-from-left-2">
                  <div className="flex border-b border-gray-200 shrink-0 bg-white sticky top-0 z-10 shadow-sm">
                    <button onClick={() => setActiveTab('content')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${activeTab === 'content' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>
                      <AlignLeft className="w-3.5 h-3.5" /> Conteúdo
                    </button>
                    <button onClick={() => setActiveTab('style')} className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 ${activeTab === 'style' ? 'text-orange-500 border-b-2 border-orange-500 bg-orange-50/30' : 'text-gray-500 hover:bg-gray-50'}`}>
                      <Palette className="w-3.5 h-3.5" /> Estilo
                    </button>
                  </div>

                  <div className="p-4 space-y-5">
                    {/* ABA DE CONTEÚDO */}
                    {activeTab === 'content' && activeSection && (
                      <div className="space-y-4 animate-in fade-in">
                        
                        {activeSection.type === 'cover' && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Título da Capa</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.title || ''}
                                onChange={(val) => updateSection(activeSection.id, { title: val })}
                                modules={titleQuillModules}
                                className="bg-white rounded-lg shadow-sm title-quill"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Subtítulo</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.subtitle || ''}
                                onChange={(val) => updateSection(activeSection.id, { subtitle: val })}
                                modules={titleQuillModules}
                                className="bg-white rounded-lg shadow-sm title-quill"
                              />
                            </div>
                          </>
                        )}

                        {activeSection.type === 'text' && (
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Conteúdo do Texto Livre</label>
                            <ReactQuill 
                              theme="snow"
                              value={activeSection.content || ''}
                              onChange={(val) => updateSection(activeSection.id, { content: val })}
                              modules={quillModules}
                              className="bg-white rounded-lg shadow-sm"
                            />
                          </div>
                        )}

                        {activeSection.type === 'button' && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Texto do Botão</label>
                              <input 
                                value={activeSection.buttonText || ''} 
                                onChange={e => updateSection(activeSection.id, { buttonText: e.target.value })} 
                                className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm" 
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Ação do Botão</label>
                              <select 
                                value={activeSection.buttonAction || 'approve'} 
                                onChange={e => updateSection(activeSection.id, { buttonAction: e.target.value })} 
                                className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm"
                              >
                                <option value="approve">Aprovar Orçamento (Mensagem)</option>
                                <option value="whatsapp">Enviar WhatsApp</option>
                                <option value="scroll">Rolar para Seção (Âncora)</option>
                              </select>
                            </div>

                            {activeSection.buttonAction === 'approve' && (
                              <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Mensagem de Sucesso (Toast)</label>
                                <input 
                                  value={activeSection.buttonApproveMessage || ''} 
                                  onChange={e => updateSection(activeSection.id, { buttonApproveMessage: e.target.value })} 
                                  className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm" 
                                  placeholder="Ex: Muito obrigado! Entraremos em contato."
                                />
                              </div>
                            )}

                            {activeSection.buttonAction === 'whatsapp' && (
                              <div className="grid grid-cols-1 gap-4">
                                <div>
                                  <label className="text-xs font-bold text-gray-500 mb-1 block">Número do WhatsApp</label>
                                  <input 
                                    value={activeSection.buttonWhatsappNumber || ''} 
                                    onChange={e => updateSection(activeSection.id, { buttonWhatsappNumber: e.target.value })} 
                                    className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm" 
                                    placeholder="Ex: 5511999999999" 
                                  />
                                </div>
                                <div>
                                  <label className="text-xs font-bold text-gray-500 mb-1 block">Texto Pré-definido da Mensagem</label>
                                  <textarea 
                                    value={activeSection.buttonWhatsappText || ''} 
                                    onChange={e => updateSection(activeSection.id, { buttonWhatsappText: e.target.value })} 
                                    className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm min-h-[80px]" 
                                    placeholder="Ex: Olá, quero aprovar o orçamento..." 
                                  />
                                </div>
                              </div>
                            )}

                            {activeSection.buttonAction === 'scroll' && (
                              <div>
                                <label className="text-xs font-bold text-gray-500 mb-1 block">Rolar para qual seção?</label>
                                <select 
                                  value={activeSection.buttonScrollTarget || ''} 
                                  onChange={e => updateSection(activeSection.id, { buttonScrollTarget: e.target.value })} 
                                  className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm"
                                >
                                  <option value="">Selecione a seção destino...</option>
                                  {sections.filter(s => s.id !== activeSection.id).map(s => {
                                    const sectionName = s.title ? s.title.replace(/<[^>]*>?/gm, '').substring(0,25) : s.id.substring(0,8);
                                    return (
                                      <option key={s.id} value={s.id}>{(SECTION_LABELS[s.type] || s.type).toUpperCase()} - {sectionName}</option>
                                    );
                                  })}
                                </select>
                              </div>
                            )}
                          </>
                        )}

                        {activeSection.type === 'two-columns' && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Layout (Posição da Imagem)</label>
                              <select value={activeSection.imagePosition || 'right'} onChange={e => updateSection(activeSection.id, { imagePosition: e.target.value })} className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm">
                                <option value="right">Texto à Esquerda, Imagem à Direita</option>
                                <option value="left">Imagem à Esquerda, Texto à Direita</option>
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Título da Seção</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.title || ''}
                                onChange={(val) => updateSection(activeSection.id, { title: val })}
                                modules={titleQuillModules}
                                className="bg-white rounded-lg shadow-sm title-quill"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Conteúdo</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.content || ''}
                                onChange={(val) => updateSection(activeSection.id, { content: val })}
                                modules={quillModules}
                                className="bg-white rounded-lg shadow-sm"
                              />
                            </div>
                            <div className="pt-2">
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Imagem</label>
                              {activeSection.imageUrl ? (
                                <div className="relative rounded-lg overflow-hidden border border-gray-200 group h-32">
                                  <img src={activeSection.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <button onClick={() => updateSection(activeSection.id, { imageUrl: '' })} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                                      <X className="w-3 h-3" /> Remover
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <label className="border-2 border-dashed border-gray-300 rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-colors">
                                  <UploadCloud className="w-6 h-6 text-gray-400 mb-2" />
                                  <span className="text-xs font-bold text-gray-600">Fazer upload de imagem</span>
                                  <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && handleImageUpload(e.target.files[0], url => updateSection(activeSection.id, { imageUrl: url }))} />
                                </label>
                              )}
                            </div>
                          </>
                        )}

                        {activeSection.type === 'pricing' && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Título da Tabela de Preços</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.title || ''}
                                onChange={(val) => updateSection(activeSection.id, { title: val })}
                                modules={titleQuillModules}
                                className="bg-white rounded-lg shadow-sm title-quill"
                              />
                            </div>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <label className="text-xs font-bold text-gray-500 block">Pacotes (Planos)</label>
                                <button onClick={() => {
                                  if ((activeSection.packages || []).length >= 3) return toast.error("Máximo de 3 pacotes.");
                                  const newPackages = [...(activeSection.packages || []), { 
                                    id: crypto.randomUUID(), title: 'Novo Plano', price: 0, description: '', features: [], buttonText: 'Contratar', buttonLink: '', color: '#3b82f6' 
                                  }];
                                  updateSection(activeSection.id, { packages: newPackages });
                                }} className="p-1 bg-orange-100 text-orange-600 rounded hover:bg-orange-200"><Plus className="w-4 h-4" /></button>
                              </div>
                              
                              {activeSection.packages?.map((pkg: any, pkgIdx: number) => (
                                <div key={pkg.id || pkgIdx} className="border border-gray-200 bg-white p-3 rounded-xl shadow-sm relative">
                                  <button onClick={() => {
                                    const newPkgs = [...activeSection.packages]; newPkgs.splice(pkgIdx, 1);
                                    updateSection(activeSection.id, { packages: newPkgs });
                                  }} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                                  
                                  <div className="space-y-2.5 mt-2">
                                    <div className="flex gap-2">
                                      <input type="color" value={pkg.color || '#3b82f6'} onChange={e => {
                                        const newPkgs = [...activeSection.packages]; newPkgs[pkgIdx].color = e.target.value;
                                        updateSection(activeSection.id, { packages: newPkgs });
                                      }} className="w-8 h-8 rounded border-none cursor-pointer p-0" title="Cor do Plano" />
                                      <input value={pkg.title} onChange={e => {
                                        const newPkgs = [...activeSection.packages]; newPkgs[pkgIdx].title = e.target.value;
                                        updateSection(activeSection.id, { packages: newPkgs });
                                      }} className="flex-1 text-sm font-bold border-b border-gray-200 focus:border-orange-400 outline-none px-1" placeholder="Título (ex: Premium)" />
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-bold text-gray-400">R$</span>
                                      <input type="number" value={pkg.price} onChange={e => {
                                        const newPkgs = [...activeSection.packages]; newPkgs[pkgIdx].price = e.target.value;
                                        updateSection(activeSection.id, { packages: newPkgs });
                                      }} className="w-full text-sm border border-gray-200 p-1.5 rounded outline-none focus:border-orange-400" placeholder="Valor (ex: 1500)" />
                                    </div>
                                    
                                    <textarea value={pkg.description} onChange={e => {
                                        const newPkgs = [...activeSection.packages]; newPkgs[pkgIdx].description = e.target.value;
                                        updateSection(activeSection.id, { packages: newPkgs });
                                      }} className="w-full text-xs border border-gray-200 p-1.5 rounded outline-none focus:border-orange-400 resize-none h-14" placeholder="Breve descrição do plano..." />
                                    
                                    {/* Features List */}
                                    <div className="bg-gray-50 p-2 rounded-lg border border-gray-100 space-y-2">
                                      <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Itens Inclusos</label>
                                        <button onClick={() => {
                                          const newPkgs = [...activeSection.packages];
                                          newPkgs[pkgIdx].features = [...(newPkgs[pkgIdx].features || []), 'Novo Item'];
                                          updateSection(activeSection.id, { packages: newPkgs });
                                        }} className="text-[10px] font-bold text-orange-500 hover:underline">+ Item</button>
                                      </div>
                                      {(pkg.features || []).map((feat: string, fIdx: number) => (
                                        <div key={fIdx} className="flex gap-1 items-center">
                                          <input value={feat} onChange={e => {
                                            const newPkgs = [...activeSection.packages];
                                            newPkgs[pkgIdx].features[fIdx] = e.target.value;
                                            updateSection(activeSection.id, { packages: newPkgs });
                                          }} className="flex-1 text-xs border border-gray-200 p-1 rounded outline-none focus:border-orange-400" />
                                          <button onClick={() => {
                                            const newPkgs = [...activeSection.packages];
                                            newPkgs[pkgIdx].features.splice(fIdx, 1);
                                            updateSection(activeSection.id, { packages: newPkgs });
                                          }} className="text-gray-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
                                        </div>
                                      ))}
                                    </div>

                                    {/* CTA Button */}
                                    <div className="grid grid-cols-2 gap-2 pt-2">
                                      <div>
                                        <label className="text-[10px] font-semibold text-gray-400">Texto do Botão</label>
                                        <input value={pkg.buttonText} onChange={e => {
                                          const newPkgs = [...activeSection.packages]; newPkgs[pkgIdx].buttonText = e.target.value;
                                          updateSection(activeSection.id, { packages: newPkgs });
                                        }} className="w-full text-xs border border-gray-200 p-1.5 rounded outline-none focus:border-orange-400" placeholder="Ex: Contratar" />
                                      </div>
                                      <div>
                                        <label className="text-[10px] font-semibold text-gray-400">Link do Botão</label>
                                        <input value={pkg.buttonLink} onChange={e => {
                                          const newPkgs = [...activeSection.packages]; newPkgs[pkgIdx].buttonLink = e.target.value;
                                          updateSection(activeSection.id, { packages: newPkgs });
                                        }} className="w-full text-xs border border-gray-200 p-1.5 rounded outline-none focus:border-orange-400" placeholder="https://" />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}

                        {activeSection.type === 'gallery' && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Título (Opcional)</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.title || ''}
                                onChange={(val) => updateSection(activeSection.id, { title: val })}
                                modules={titleQuillModules}
                                className="bg-white rounded-lg shadow-sm title-quill"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Imagens da Galeria</label>
                              <div className="grid grid-cols-2 gap-2">
                                {activeSection.images?.map((img: string, i: number) => (
                                  <div key={i} className="relative rounded-lg overflow-hidden border border-gray-200 group aspect-square">
                                    <img src={img} className="w-full h-full object-cover" alt="Galeria" />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                      <button onClick={() => {
                                        const newImgs = [...activeSection.images]; newImgs.splice(i, 1);
                                        updateSection(activeSection.id, { images: newImgs });
                                      }} className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                                <label className="border-2 border-dashed border-gray-300 rounded-lg aspect-square flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-colors">
                                  <Plus className="w-6 h-6 text-gray-400 mb-1" />
                                  <span className="text-[10px] font-bold text-gray-500">Adicionar Imagens</span>
                                  <input type="file" accept="image/*" multiple className="hidden" onChange={e => e.target.files && handleGalleryUpload(e.target.files, activeSection.id)} />
                                </label>
                              </div>
                            </div>
                          </>
                        )}

                        {activeSection.type === 'video' && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Título (Opcional)</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.title || ''}
                                onChange={(val) => updateSection(activeSection.id, { title: val })}
                                modules={titleQuillModules}
                                className="bg-white rounded-lg shadow-sm title-quill"
                              />
                            </div>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">URL do Vídeo (YouTube/Vimeo)</label>
                              <input value={activeSection.videoUrl || ''} onChange={e => updateSection(activeSection.id, { videoUrl: e.target.value })} className="w-full text-sm p-2.5 bg-white border border-gray-200 rounded-lg outline-none shadow-sm" placeholder="https://www.youtube.com/watch?v=..." />
                            </div>
                          </>
                        )}

                        {activeSection.type === 'separator' && (
                          <>
                            <div>
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Altura do Espaço (px)</label>
                              <input type="range" min="10" max="200" value={activeSection.height || 40} onChange={e => updateSection(activeSection.id, { height: Number(e.target.value) })} className="w-full accent-orange-500" />
                              <div className="text-right text-xs text-gray-500 mt-1">{activeSection.height || 40}px</div>
                            </div>
                            <div className="flex items-center gap-2 mt-4">
                              <input type="checkbox" checked={activeSection.showLine !== false} onChange={e => updateSection(activeSection.id, { showLine: e.target.checked })} className="w-4 h-4 text-orange-500 rounded border-gray-300" id="showLine" />
                              <label htmlFor="showLine" className="text-sm font-semibold text-gray-700">Mostrar linha divisória</label>
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* ABA DE ESTILO COM TIPOGRAFIA AVANÇADA */}
                    {activeTab === 'style' && activeSection && (
                      <div className="space-y-5 animate-in fade-in">

                        {activeSection.type === 'button' && (
                          <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                            <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Estilo do Botão</h4>
                            
                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Cor do Botão</label>
                              <div className="flex gap-2">
                                <input type="color" value={activeSection.styles?.buttonColor || '#f97316'} onChange={e => updateStyle(activeSection.id, 'buttonColor', e.target.value)} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" />
                                <input type="text" value={activeSection.styles?.buttonColor || '#f97316'} onChange={e => updateStyle(activeSection.id, 'buttonColor', e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-orange-400 bg-white" />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Cor do Texto</label>
                              <div className="flex gap-2">
                                <input type="color" value={activeSection.styles?.buttonTextColor || '#ffffff'} onChange={e => updateStyle(activeSection.id, 'buttonTextColor', e.target.value)} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" />
                                <input type="text" value={activeSection.styles?.buttonTextColor || '#ffffff'} onChange={e => updateStyle(activeSection.id, 'buttonTextColor', e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-orange-400 bg-white" />
                              </div>
                            </div>

                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Alinhamento</label>
                              <select value={activeSection.styles?.align || 'center'} onChange={e => updateStyle(activeSection.id, 'align', e.target.value)} className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-orange-400 bg-white">
                                <option value="left">Esquerda</option>
                                <option value="center">Centro</option>
                                <option value="right">Direita</option>
                              </select>
                            </div>
                          </div>
                        )}

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Tipografia (Geral)</h4>
                          
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">Família da Fonte</label>
                            <select 
                              value={activeSection.styles?.fontFamily || 'inherit'} 
                              onChange={e => updateStyle(activeSection.id, 'fontFamily', e.target.value)}
                              className="w-full text-sm border border-gray-200 rounded-lg p-2.5 focus:outline-none focus:border-orange-400 bg-white"
                            >
                              <option value="inherit">Padrão do Sistema</option>
                              <option value="'Montserrat', sans-serif">Montserrat (Moderna)</option>
                              <option value="'Playfair Display', serif">Playfair Display (Elegante)</option>
                              <option value="'Lora', serif">Lora (Clássica)</option>
                            </select>
                          </div>

                          {activeSection.type !== 'button' && (
                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                                Cor Padrão do Texto 
                                <span className="font-normal text-gray-400 uppercase">{activeSection.styles?.textColor || '#111827'}</span>
                              </label>
                              <div className="flex gap-2">
                                <input type="color" value={activeSection.styles?.textColor || '#111827'} onChange={e => updateStyle(activeSection.id, 'textColor', e.target.value)} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5" />
                                <input type="text" value={activeSection.styles?.textColor || '#111827'} onChange={e => updateStyle(activeSection.id, 'textColor', e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none" />
                              </div>
                              <p className="text-[10px] text-gray-400 mt-1">Essa cor afeta os textos e títulos normais, mas pode ser sobrescrita pelo editor de texto.</p>
                            </div>
                          )}

                          {['cover', 'pricing', 'two-columns', 'gallery', 'video'].includes(activeSection.type) && (
                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                                Tamanho Base do Título
                                <span className="font-normal text-gray-500">{activeSection.styles?.titleSize || (activeSection.type === 'cover' ? 48 : 32)}px</span>
                              </label>
                              <input type="range" min="16" max="100" step="2" value={activeSection.styles?.titleSize || (activeSection.type === 'cover' ? 48 : 32)} onChange={e => updateStyle(activeSection.id, 'titleSize', Number(e.target.value))} className="w-full accent-orange-500" />
                            </div>
                          )}

                          {['cover', 'pricing'].includes(activeSection.type) && (
                            <div>
                              <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                                Tamanho do Subtítulo / Valores
                                <span className="font-normal text-gray-500">{activeSection.styles?.textSize || 18}px</span>
                              </label>
                              <input type="range" min="12" max="60" step="1" value={activeSection.styles?.textSize || 18} onChange={e => updateStyle(activeSection.id, 'textSize', Number(e.target.value))} className="w-full accent-orange-500" />
                            </div>
                          )}
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Fundo (Background)</h4>
                          
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                              Cor de Fundo 
                              <span className="font-normal text-gray-400 uppercase">{activeSection.styles?.backgroundColor || 'transparent'}</span>
                            </label>
                            <div className="flex gap-2">
                              <input type="color" value={activeSection.styles?.backgroundColor || '#ffffff'} onChange={e => updateStyle(activeSection.id, 'backgroundColor', e.target.value)} className="h-10 w-12 rounded cursor-pointer border border-gray-300 p-0.5 bg-white" />
                              <input type="text" value={activeSection.styles?.backgroundColor || 'transparent'} onChange={e => updateStyle(activeSection.id, 'backgroundColor', e.target.value)} className="flex-1 text-sm border border-gray-200 rounded-lg px-3 focus:outline-none focus:border-orange-400 bg-white" />
                            </div>
                          </div>

                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Imagem de Fundo</label>
                            {activeSection.styles?.backgroundImage ? (
                              <div className="relative rounded-lg overflow-hidden border border-gray-200 group h-24 mt-2">
                                <img src={activeSection.styles.backgroundImage} alt="Background" className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <button onClick={() => updateStyle(activeSection.id, 'backgroundImage', '')} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold flex items-center gap-1">
                                    <X className="w-3 h-3" /> Remover
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <label className="border-2 border-dashed border-gray-300 rounded-lg p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-colors mt-2">
                                <UploadCloud className="w-5 h-5 text-gray-400 mb-1" />
                                <span className="text-[10px] font-bold text-gray-600">Fazer upload de imagem de fundo</span>
                                <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && handleImageUpload(e.target.files[0], url => updateStyle(activeSection.id, 'backgroundImage', url))} />
                              </label>
                            )}
                          </div>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                          <h4 className="text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Espaçamento</h4>
                          
                          <div>
                            <label className="text-xs font-bold text-gray-700 mb-1.5 flex justify-between">
                              Padding Interno (Espaço)
                              <span className="font-normal text-gray-500">{activeSection.styles?.padding || 40}px</span>
                            </label>
                            <input type="range" min="0" max="120" step="4" value={activeSection.styles?.padding || 40} onChange={e => updateStyle(activeSection.id, 'padding', Number(e.target.value))} className="w-full accent-orange-500" />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* CANVAS AREA (Centro - Preview da Folha) */}
          <div
            className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center justify-start relative custom-scrollbar"
            style={{ backgroundColor: globalSettings.pageBackgroundColor || '#f3f4f6' }}
          >
            
            <div
              className={`w-full shadow-2xl border border-gray-200 flex flex-col relative transition-all overflow-hidden shrink-0 ${isPDFMode ? 'min-h-[1000px] mb-4' : 'min-h-[1000px] h-fit mb-20'}`}
              style={{
                maxWidth: globalSettings.maxWidth,
                backgroundColor: globalSettings.backgroundColor
              }}
            >
              
              {isPDFMode ? (
                <div
                  className="w-full h-full relative flex flex-col"
                  onMouseMove={handleDragMouseMove}
                  onMouseUp={() => setDraggingCtaIndex(null)}
                  onMouseLeave={() => setDraggingCtaIndex(null)}
                >
                  {pdfSection?.fileUrl ? (
                    <>
                      <PDFDocumentViewer url={pdfSection.fileUrl} />
                      {/* Invisible overlay to capture mouse events while dragging */}
                      {draggingCtaIndex !== null && (
                        <div className="absolute inset-0 z-40 cursor-grabbing bg-transparent" />
                      )}
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50 min-h-[500px]">
                      <FileUp className="w-16 h-16 mb-4 text-gray-300" />
                      <p className="font-medium text-lg text-gray-500">Faça upload de um PDF no menu lateral</p>
                    </div>
                  )}

                  {/* FREE CTAS */}
                  {pdfSection?.ctas?.length > 0 && pdfSection?.fileUrl && (
                    <>
                      {pdfSection.ctas.map((cta: any, i: number) => {
                        if (cta.isGrouped !== false) return null;
                        return (
                          <div
                            key={`free-${i}`}
                            onMouseDown={(e) => { e.preventDefault(); setDraggingCtaIndex(i); }}
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
                              cursor: draggingCtaIndex === i ? 'grabbing' : 'grab',
                              zIndex: 51
                            }}
                            className="px-6 py-3 shadow-xl hover:ring-4 hover:ring-orange-400/30 transition-shadow select-none whitespace-nowrap"
                          >
                            {cta.label}
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col w-full relative group/canvas">
                  {sections.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />
                      <p className="font-medium text-gray-500">Adicione sua primeira seção usando a barra esquerda ou os botões abaixo</p>
                    </div>
                  ) : (
                    sections.map(s => (
                      <div 
                        key={s.id} 
                        id={s.id}
                        className={`w-full relative group cursor-pointer transition-all ${selectedId === s.id ? 'ring-[3px] ring-inset ring-orange-500 z-10 shadow-xl' : 'hover:ring-[3px] hover:ring-inset hover:ring-blue-400/50 z-0'}`} 
                        onClick={() => { setSelectedId(s.id); setActiveTab('content'); }}
                      >
                        <PreviewBlock section={s} />
                        {selectedId !== s.id && (
                          <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/5 transition-colors" />
                        )}
                        
                        {/* Editor Controls Overlay (Like Elementor) */}
                        {selectedId === s.id && (
                          <div className="absolute -top-[28px] left-1/2 -translate-x-1/2 bg-orange-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-t-lg shadow-md flex items-center gap-2">
                            <Settings className="w-3 h-3" /> Editando {SECTION_LABELS[s.type] || s.type}
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Add Section Elementor-Style Button inside Canvas */}
                  <div className="w-full p-8 mt-4">
                    <div className="w-full border-2 border-dashed border-orange-200 bg-orange-50/50 rounded-2xl p-8 flex items-center justify-center transition-all hover:bg-orange-50 hover:border-orange-300">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="bg-[#FF8C00] hover:bg-[#e67e22] text-white px-6 py-3 rounded-full font-bold flex items-center gap-2 shadow-lg transition-transform hover:scale-105 focus:outline-none">
                            <Plus className="w-5 h-5" /> Nova Seção <ChevronDown className="w-4 h-4 ml-1" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className="w-56 p-2 rounded-xl shadow-xl border border-gray-100 bg-white">
                          <DropdownMenuItem onClick={() => addSection('cover')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <LayoutTemplate className="w-4 h-4 mr-3 text-orange-500" /> Capa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSection('text')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <Type className="w-4 h-4 mr-3 text-orange-500" /> Texto Livre
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSection('two-columns')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <Columns className="w-4 h-4 mr-3 text-orange-500" /> 2 Colunas
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSection('pricing')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <DollarSign className="w-4 h-4 mr-3 text-orange-500" /> Oferta
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSection('gallery')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <ImageIcon className="w-4 h-4 mr-3 text-orange-500" /> Galeria
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSection('video')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <Video className="w-4 h-4 mr-3 text-orange-500" /> Vídeo
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSection('button')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <MousePointerClick className="w-4 h-4 mr-3 text-orange-500" /> Botão CTA
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addSection('separator')} className="cursor-pointer py-3 rounded-lg focus:bg-orange-50 font-medium text-gray-700">
                            <Minus className="w-4 h-4 mr-3 text-orange-500" /> Separador
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* GROUPED CTAS NO RODAPÉ DA ROLAGEM */}
            {isPDFMode && pdfSection?.ctas?.length > 0 && pdfSection?.fileUrl && pdfSection.ctas.some((c: any) => c.isGrouped !== false) && (
              <div className="sticky bottom-6 left-0 right-0 flex justify-center z-50 px-4 pointer-events-none w-full mt-auto shrink-0 pb-2">
                <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-gray-200 flex gap-4 pointer-events-auto">
                  {pdfSection.ctas.filter((c: any) => c.isGrouped !== false).map((cta: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        backgroundColor: cta.color || '#f97316',
                        color: cta.textColor || '#ffffff',
                        borderRadius: cta.borderRadius || '9999px',
                        fontFamily: cta.fontFamily || 'inherit',
                        fontWeight: cta.isBold === false ? 'normal' : 'bold',
                        textTransform: cta.isUppercase ? 'uppercase' : 'none',
                      }}
                      className="px-6 py-3 shadow-md transition-transform"
                    >
                      {cta.label}
                    </div>
                  ))}
                  {pdfSection.ctas.filter((c: any) => c.isGrouped !== false).length === 0 && (
                    <span className="text-sm text-gray-400 font-medium px-4">Sem botões agrupados</span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SIDEBAR DIREITA (Camadas / Navigator) */}
          {!isPDFMode && (
            <div className="w-[280px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-[-2px_0_10px_rgba(0,0,0,0.02)]">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Layers className="w-4 h-4 text-gray-600" />
                <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Camadas (Blocos)</h2>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-gray-50/30">
                <div 
                  onClick={() => { setSelectedId('global'); setActiveTab('style'); }}
                  className={`flex items-center justify-between px-3 py-3 rounded-lg border cursor-pointer transition-all mb-4 ${
                    selectedId === 'global' ? 'border-orange-400 bg-orange-50 shadow-sm' : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Settings className={`w-4 h-4 ${selectedId === 'global' ? 'text-orange-500' : 'text-gray-400'}`} />
                    <span className={`font-semibold text-sm ${selectedId === 'global' ? 'text-orange-900' : 'text-gray-700'}`}>
                      Configurações da Página
                    </span>
                  </div>
                </div>
                
                {sections.map((s, idx) => (
                  <div 
                    key={s.id} 
                    onClick={() => { setSelectedId(s.id); setActiveTab('content'); }}
                    className={`flex items-center justify-between px-3 py-3 rounded-lg border cursor-pointer transition-all group ${
                      selectedId === s.id 
                        ? 'border-orange-400 bg-orange-50 shadow-sm' 
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {s.type === 'cover' && <ImageIcon className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      {s.type === 'text' && <Type className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      {s.type === 'pricing' && <DollarSign className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      {s.type === 'two-columns' && <Columns className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      {s.type === 'gallery' && <ImageIcon className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      {s.type === 'video' && <Video className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      {s.type === 'button' && <MousePointerClick className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      {s.type === 'separator' && <Minus className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      
                      <span className={`font-semibold text-sm capitalize ${selectedId === s.id ? 'text-orange-900' : 'text-gray-700'}`}>
                        {SECTION_LABELS[s.type] || s.type}
                      </span>
                    </div>
                    
                    <div className={`flex items-center gap-0.5 transition-opacity ${selectedId === s.id ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                      <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} disabled={idx === 0} className="p-1 hover:bg-black/5 rounded disabled:opacity-30 text-gray-500"><ArrowUp className="w-3.5 h-3.5" /></button>
                      <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} disabled={idx === sections.length - 1} className="p-1 hover:bg-black/5 rounded disabled:opacity-30 text-gray-500"><ArrowDown className="w-3.5 h-3.5" /></button>
                      <div className="w-px h-3 bg-gray-200 mx-1"></div>
                      <button onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-gray-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
                
                {sections.length === 0 && (
                  <p className="text-xs text-gray-400 italic text-center py-4">Sua página está vazia.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}