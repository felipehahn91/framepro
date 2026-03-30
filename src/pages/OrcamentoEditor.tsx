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
  UploadCloud, ExternalLink
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    const total = section.items?.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0) || 0;
    return (
      <div style={baseStyle} className="w-full">
        <div 
          className="font-bold mb-8 title-rich-text" 
          style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 32}px` }}
          dangerouslySetInnerHTML={{ __html: renderHTML(section.title, 'Investimento') }}
        />
        <div className="space-y-4">
          {section.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-gray-200/50 last:border-0">
              <span className="opacity-90" style={{ fontSize: `${styles.textSize || 18}px` }}>{item.name || 'Item sem nome'}</span>
              <span className="font-semibold" style={{ fontSize: `${styles.textSize || 18}px` }}>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price) || 0)}</span>
            </div>
          ))}
          {section.items?.length > 0 && (
            <div className="flex justify-between items-center py-6 mt-6 border-t-2 border-current">
              <span className="font-bold" style={{ fontSize: `${(styles.textSize || 18) + 4}px` }}>Total</span>
              <span className="font-bold" style={{ color: styles.textColor ? 'inherit' : '#f97316', fontSize: `${(styles.textSize || 18) + 8}px` }}>
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
    if (type === 'pricing') { newSection.title = 'Investimento'; newSection.items = [{ name: 'Pacote Básico', price: 1500 }]; }
    if (type === 'two-columns') { newSection.title = 'Nossa Solução'; newSection.content = '<p>Detalhes do serviço...</p>'; newSection.imageUrl = ''; newSection.imagePosition = 'right'; }
    if (type === 'gallery') { newSection.title = 'Portfólio'; newSection.images = []; }
    if (type === 'video') { newSection.title = 'Apresentação'; newSection.videoUrl = ''; }
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

  const activeSection = sections.find(s => s.id === selectedId);

  if (loading) return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

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
              value={orcamento.name} 
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
                    <span className="capitalize">Editar {activeSection.type.replace('-', ' ')}</span>
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
                      <button onClick={() => addSection('separator')} className="flex flex-col items-center justify-center py-4 bg-white border border-gray-200 rounded-xl hover:border-orange-400 hover:text-orange-500 transition-all text-gray-500 group col-span-2 shadow-sm">
                        <Minus className="w-5 h-5 mb-2" /> <span className="text-[11px] font-bold">Separador</span>
                      </button>
                    </div>
                  </div>
                </div>
              ) : isPDFMode ? (
                <div className="p-4 space-y-8">
                  <div className="space-y-3">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Arquivo PDF</label>
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
                  <div className="space-y-4 border-t border-gray-200 pt-6">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Botões de Ação (CTAs)</label>
                      <button onClick={() => {
                        if (pdfSection) {
                          const ctas = pdfSection.ctas || [];
                          updateSection(pdfSection.id, { ctas: [...ctas, { label: 'Aprovar Orçamento', link: '', color: '#22c55e' }] });
                        }
                      }} className="p-1 bg-orange-100 text-orange-600 rounded hover:bg-orange-200"><Plus className="w-4 h-4" /></button>
                    </div>
                    <div className="space-y-3">
                      {pdfSection?.ctas?.map((cta: any, idx: number) => (
                        <div key={idx} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm relative group space-y-3">
                          <button onClick={() => {
                            const newCtas = [...pdfSection.ctas]; newCtas.splice(idx, 1);
                            updateSection(pdfSection.id, { ctas: newCtas });
                          }} className="absolute top-2 right-2 text-gray-400 hover:text-red-500"><X className="w-4 h-4" /></button>
                          
                          <div>
                            <label className="text-[10px] font-semibold text-gray-400">Texto</label>
                            <input value={cta.label} onChange={e => {
                                const newCtas = [...pdfSection.ctas]; newCtas[idx].label = e.target.value;
                                updateSection(pdfSection.id, { ctas: newCtas });
                              }} className="w-full text-sm font-semibold border-b border-gray-200 focus:border-orange-400 outline-none pb-1"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-400">Link</label>
                            <input value={cta.link} onChange={e => {
                                const newCtas = [...pdfSection.ctas]; newCtas[idx].link = e.target.value;
                                updateSection(pdfSection.id, { ctas: newCtas });
                              }} placeholder="https://" className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-orange-400"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-400">Cor do Botão</label>
                            <input type="color" value={cta.color} onChange={e => {
                                const newCtas = [...pdfSection.ctas]; newCtas[idx].color = e.target.value;
                                updateSection(pdfSection.id, { ctas: newCtas });
                              }} className="w-full h-8 rounded cursor-pointer border-none p-0"
                            />
                          </div>
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
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Título da Tabela</label>
                              <ReactQuill 
                                theme="snow"
                                value={activeSection.title || ''}
                                onChange={(val) => updateSection(activeSection.id, { title: val })}
                                modules={titleQuillModules}
                                className="bg-white rounded-lg shadow-sm title-quill"
                              />
                            </div>
                            <div className="space-y-3">
                              <label className="text-xs font-bold text-gray-500 mb-1 block">Itens da Oferta</label>
                              {activeSection.items?.map((item: any, i: number) => (
                                <div key={i} className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200 shadow-sm group">
                                  <input value={item.name} onChange={e => {
                                    const newItems = [...activeSection.items]; newItems[i].name = e.target.value;
                                    updateSection(activeSection.id, { items: newItems });
                                  }} className="flex-1 text-sm p-1.5 border border-gray-200 rounded outline-none focus:border-orange-400" placeholder="Nome do item" />
                                  <input type="number" value={item.price} onChange={e => {
                                    const newItems = [...activeSection.items]; newItems[i].price = e.target.value;
                                    updateSection(activeSection.id, { items: newItems });
                                  }} className="w-24 text-sm p-1.5 border border-gray-200 rounded outline-none focus:border-orange-400" placeholder="R$ 0,00" />
                                  <button onClick={() => {
                                    const newItems = [...activeSection.items]; newItems.splice(i, 1);
                                    updateSection(activeSection.id, { items: newItems });
                                  }} className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-4 h-4"/></button>
                                </div>
                              ))}
                              <button onClick={() => {
                                const newItems = [...(activeSection.items || []), { name: 'Novo Item', price: 0 }];
                                updateSection(activeSection.id, { items: newItems });
                              }} className="w-full py-2.5 border border-dashed border-gray-300 rounded-lg text-xs font-bold text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors mt-2">
                                + Adicionar Novo Item
                              </button>
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
            className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center relative custom-scrollbar"
            style={{ backgroundColor: globalSettings.pageBackgroundColor || '#f3f4f6' }}
          >
            
            <div 
              className="w-full min-h-[1000px] shadow-2xl border border-gray-200 flex flex-col relative transition-all mb-20 overflow-hidden"
              style={{
                maxWidth: globalSettings.maxWidth,
                backgroundColor: globalSettings.backgroundColor
              }}
            >
              
              {isPDFMode ? (
                <div className="w-full h-full relative flex-1 flex flex-col">
                  {pdfSection?.fileUrl ? (
                    <iframe src={`${pdfSection.fileUrl}#toolbar=0`} className="w-full flex-1 border-0" title="PDF Preview" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                      <FileUp className="w-16 h-16 mb-4 text-gray-300" />
                      <p className="font-medium text-lg text-gray-500">Faça upload de um PDF no menu lateral</p>
                    </div>
                  )}
                  {pdfSection?.ctas?.length > 0 && pdfSection?.fileUrl && (
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                      <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-gray-200 flex gap-4 pointer-events-auto">
                        {pdfSection.ctas.map((cta: any, i: number) => (
                          <div key={i} style={{ backgroundColor: cta.color || '#22c55e' }} className="px-6 py-3 rounded-xl font-bold text-white shadow-md cursor-pointer hover:-translate-y-1 transition-transform">
                            {cta.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col w-full h-full relative group/canvas">
                  {sections.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <LayoutTemplate className="w-16 h-16 mb-4 opacity-20" />
                      <p className="font-medium text-gray-500">Adicione sua primeira seção usando a barra esquerda ou os botões abaixo</p>
                    </div>
                  ) : (
                    sections.map(s => (
                      <div 
                        key={s.id} 
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
                            <Settings className="w-3 h-3" /> Editando {s.type}
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
          </div>

          {/* SIDEBAR DIREITA (Camadas / Navigator) */}
          {!isPDFMode && (
            <div className="w-[280px] bg-white border-l border-gray-200 flex flex-col shrink-0 z-10 shadow-[-2px_0_10px_rgba(0,0,0,0.02)]">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
                <Layers className="w-4 h-4 text-gray-600" />
                <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Navegador</h2>
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

                <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Camadas (Blocos)</h3>
                
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
                      {s.type === 'separator' && <Minus className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                      
                      <span className={`font-semibold text-sm capitalize ${selectedId === s.id ? 'text-orange-900' : 'text-gray-700'}`}>
                        {s.type.replace('-', ' ')}
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