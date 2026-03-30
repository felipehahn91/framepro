import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Save, Loader2, Image as ImageIcon, Type, DollarSign, 
  Trash2, Plus, FileUp, Settings, Link as LinkIcon, ArrowUp, ArrowDown
} from "lucide-react";
import { toast } from "sonner";

// Componente helper para simplificar a renderização
const PreviewBlock = ({ section }: { section: any }) => {
  if (section.type === 'cover') {
    return (
      <div className="relative w-full aspect-video bg-gray-50 overflow-hidden flex flex-col items-center justify-center text-center p-8">
        {section.imageUrl && <img src={section.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
        <div className="relative z-10 bg-white/90 backdrop-blur-md p-8 rounded-2xl shadow-sm border border-white/50 max-w-xl w-full">
          <h1 className="text-4xl font-bold text-gray-900 mb-3">{section.title || 'Título da Proposta'}</h1>
          <p className="text-gray-600 text-lg">{section.subtitle || 'Subtítulo'}</p>
        </div>
      </div>
    );
  }
  if (section.type === 'text') {
    return (
      <div className="w-full bg-white p-8 sm:p-12 prose max-w-none text-gray-700">
        {section.content ? <div dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} /> : <p className="text-gray-400 italic">Bloco de texto vazio. Selecione este bloco para digitar.</p>}
      </div>
    );
  }
  if (section.type === 'pricing') {
    const total = section.items?.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0) || 0;
    return (
      <div className="w-full bg-white p-8 sm:p-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-8">{section.title || 'Investimento'}</h2>
        <div className="space-y-4">
          {section.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
              <span className="text-gray-700 text-lg">{item.name || 'Item sem nome'}</span>
              <span className="font-semibold text-gray-900 text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(item.price) || 0)}</span>
            </div>
          ))}
          {section.items?.length > 0 && (
            <div className="flex justify-between items-center py-6 mt-6 border-t-2 border-gray-900">
              <span className="font-bold text-xl text-gray-900">Total</span>
              <span className="font-bold text-2xl text-orange-500">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}</span>
            </div>
          )}
        </div>
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
  const [sections, setSections] = useState<any[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const isPDFMode = orcamento?.type === 'pdf';

  useEffect(() => {
    if (user && id) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const { data, error } = await supabase.from('orcamentos').select('*').eq('id', id).single();
      if (error) throw error;
      
      setOrcamento(data);
      setSections(data.sections || []);
      if (data.sections?.length > 0) setSelectedId(data.sections[0].id);
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
      await supabase.from('orcamentos').update({
        name: orcamento.name,
        sections: sections,
        updated_at: new Date().toISOString()
      }).eq('id', id);
      toast.success("Orçamento salvo com sucesso!");
    } catch (error) {
      toast.error("Erro ao salvar.");
    } finally {
      setSaving(false);
    }
  };

  // Builder Methods
  const addSection = (type: string) => {
    const newSection: any = { id: crypto.randomUUID(), type };
    if (type === 'cover') { newSection.title = 'Nova Capa'; newSection.subtitle = ''; newSection.imageUrl = ''; }
    if (type === 'text') { newSection.content = 'Digite seu texto aqui...'; }
    if (type === 'pricing') { newSection.title = 'Investimento'; newSection.items = [{ name: 'Pacote Básico', price: 1500 }]; }
    
    setSections([...sections, newSection]);
    setSelectedId(newSection.id);
  };

  const updateSection = (id: string, updates: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, ...updates } : s));
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

  // PDF Methods
  const handlePdfUpload = async (file: File) => {
    if (file.type !== 'application/pdf') return toast.error("Apenas arquivos PDF.");
    toast.info("Fazendo upload...");
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${user?.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage.from('contract_images').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('contract_images').getPublicUrl(filePath);
      
      updateSection(sections[0].id, { fileUrl: publicUrl });
      toast.success("PDF carregado!");
    } catch (e) {
      toast.error("Erro no upload do PDF.");
    }
  };

  const activeSection = sections.find(s => s.id === selectedId);

  if (loading) return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <div className="flex flex-col h-screen bg-[#f8fafc] font-sans overflow-hidden">
      
      {/* Topbar: Minimalista e Focada */}
      <div className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-20">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orcamentos')} className="text-gray-500 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="h-6 w-px bg-gray-200"></div>
          <input 
            type="text" 
            value={orcamento.name} 
            onChange={e => setOrcamento({...orcamento, name: e.target.value})}
            className="text-[17px] font-bold text-gray-900 border-none focus:ring-0 p-0 bg-transparent w-64 md:w-96 outline-none"
            placeholder="Nome do orçamento"
          />
        </div>
        <button onClick={handleSave} disabled={saving} className="px-6 py-2 bg-orange-500 text-white text-sm font-semibold rounded-md hover:bg-orange-600 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
        </button>
      </div>

      {/* Workspace */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar Esquerda (Configurações tipo Elementor) */}
        <div className="w-[320px] bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 shadow-[2px_0_10px_rgba(0,0,0,0.02)]">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2 bg-gray-50/50">
            <Settings className="w-4 h-4 text-gray-600" />
            <h2 className="font-bold text-gray-800 text-sm uppercase tracking-wider">Configurações</h2>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {isPDFMode ? (
              // Modo PDF: Controles simplificados
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Arquivo PDF</label>
                  {sections[0]?.fileUrl ? (
                    <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                      <FileUp className="w-6 h-6 text-green-500 mx-auto mb-2" />
                      <p className="text-sm font-semibold text-green-700 mb-2">PDF Carregado</p>
                      <button onClick={() => updateSection(sections[0].id, { fileUrl: '' })} className="text-[11px] font-bold text-red-500 hover:text-red-700 uppercase">Trocar Arquivo</button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-blue-200 bg-blue-50 hover:bg-blue-100/50 transition-colors rounded-lg p-6 flex flex-col items-center cursor-pointer text-center">
                      <FileUp className="w-6 h-6 text-blue-500 mb-2" />
                      <span className="text-sm font-bold text-blue-700">Selecione o PDF</span>
                      <input type="file" accept="application/pdf" className="hidden" onChange={e => e.target.files && handlePdfUpload(e.target.files[0])} />
                    </label>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Botões Flutuantes (CTAs)</label>
                    <button 
                      onClick={() => {
                        const ctas = sections[0].ctas || [];
                        updateSection(sections[0].id, { ctas: [...ctas, { label: 'Aprovar Orçamento', link: 'https://wa.me/', color: 'bg-green-500' }] });
                      }}
                      className="p-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {sections[0]?.ctas?.map((cta: any, idx: number) => (
                      <div key={idx} className="bg-white border border-gray-200 p-3 rounded-lg shadow-sm relative group">
                        <button onClick={() => {
                          const newCtas = [...sections[0].ctas]; newCtas.splice(idx, 1);
                          updateSection(sections[0].id, { ctas: newCtas });
                        }} className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        
                        <div className="space-y-2">
                          <div>
                            <label className="text-[10px] font-semibold text-gray-400">Texto do Botão</label>
                            <input 
                              value={cta.label} onChange={e => {
                                const newCtas = [...sections[0].ctas]; newCtas[idx].label = e.target.value;
                                updateSection(sections[0].id, { ctas: newCtas });
                              }} 
                              className="w-full text-sm font-semibold bg-transparent border-b border-gray-200 focus:border-orange-400 outline-none pb-1"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] font-semibold text-gray-400">Link de Direcionamento</label>
                            <div className="flex items-center gap-2 mt-1">
                              <LinkIcon className="w-3 h-3 text-gray-400 shrink-0" />
                              <input 
                                value={cta.link} onChange={e => {
                                  const newCtas = [...sections[0].ctas]; newCtas[idx].link = e.target.value;
                                  updateSection(sections[0].id, { ctas: newCtas });
                                }} 
                                placeholder="https://" className="w-full text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 outline-none focus:border-orange-400"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              // Modo Builder: Camadas e Elementos
              <div className="space-y-8">
                
                {/* 1. Lista de Camadas Ativas */}
                <div className="space-y-2">
                  {sections.map((s, idx) => (
                    <div 
                      key={s.id} 
                      onClick={() => setSelectedId(s.id)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-sm cursor-pointer transition-all ${
                        selectedId === s.id 
                        ? 'border-orange-300 bg-orange-50 text-orange-900 shadow-sm' 
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        {s.type === 'cover' && <ImageIcon className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                        {s.type === 'text' && <Type className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                        {s.type === 'pricing' && <DollarSign className={`w-4 h-4 ${selectedId === s.id ? 'text-orange-500' : 'text-gray-400'}`} />}
                        <span className="font-semibold">{s.type === 'cover' ? 'Capa' : s.type === 'text' ? 'Texto' : 'Preço'}</span>
                      </div>
                      
                      <div className="flex items-center gap-0.5">
                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} disabled={idx === 0} className="p-1 hover:bg-black/5 rounded disabled:opacity-30 text-gray-400"><ArrowUp className="w-3.5 h-3.5" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} disabled={idx === sections.length - 1} className="p-1 hover:bg-black/5 rounded disabled:opacity-30 text-gray-400"><ArrowDown className="w-3.5 h-3.5" /></button>
                        <div className="w-px h-3 bg-gray-200 mx-1"></div>
                        <button onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} className="p-1 hover:bg-red-100 hover:text-red-600 rounded text-gray-400"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 2. Grid de Adição de Blocos */}
                <div className="grid grid-cols-3 gap-2">
                  <button onClick={() => addSection('cover')} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all group">
                    <ImageIcon className="w-5 h-5 text-gray-400 mb-1.5 group-hover:text-gray-700" />
                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700">Capa</span>
                  </button>
                  <button onClick={() => addSection('text')} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all group">
                    <Type className="w-5 h-5 text-gray-400 mb-1.5 group-hover:text-gray-700" />
                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700">Texto</span>
                  </button>
                  <button onClick={() => addSection('pricing')} className="flex flex-col items-center justify-center p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all group">
                    <DollarSign className="w-5 h-5 text-gray-400 mb-1.5 group-hover:text-gray-700" />
                    <span className="text-[10px] font-bold text-gray-500 group-hover:text-gray-700">Preço</span>
                  </button>
                </div>

                {/* 3. Propriedades do Bloco Ativo */}
                {activeSection && (
                  <div className="pt-6 border-t border-gray-100 animate-in fade-in slide-in-from-bottom-2">
                    <h3 className="font-bold text-gray-900 text-[13px] uppercase tracking-wider mb-4">
                      Editar {activeSection.type === 'cover' ? 'Capa' : activeSection.type === 'text' ? 'Texto' : 'Preço'}
                    </h3>
                    
                    <div className="space-y-4">
                      {activeSection.type === 'cover' && (
                        <>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500">Título</label>
                            <input value={activeSection.title || ''} onChange={e => updateSection(activeSection.id, { title: e.target.value })} className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500">Subtítulo</label>
                            <input value={activeSection.subtitle || ''} onChange={e => updateSection(activeSection.id, { subtitle: e.target.value })} className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20" />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-xs font-bold text-gray-500">URL da Imagem de Fundo</label>
                            <input value={activeSection.imageUrl || ''} onChange={e => updateSection(activeSection.id, { imageUrl: e.target.value })} className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20" placeholder="https://" />
                          </div>
                        </>
                      )}

                      {activeSection.type === 'text' && (
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-gray-500">Conteúdo do Bloco</label>
                          <textarea 
                            value={activeSection.content || ''} 
                            onChange={e => updateSection(activeSection.id, { content: e.target.value })} 
                            className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20 min-h-[250px] resize-none" 
                            placeholder="Escreva seu texto aqui..."
                          />
                        </div>
                      )}

                      {activeSection.type === 'pricing' && (
                        <>
                          <div className="space-y-1.5 mb-6">
                            <label className="text-xs font-bold text-gray-500">Título da Tabela</label>
                            <input value={activeSection.title || ''} onChange={e => updateSection(activeSection.id, { title: e.target.value })} className="w-full text-sm px-3 py-2 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-orange-400 focus:ring-1 focus:ring-orange-400/20" />
                          </div>
                          
                          <div className="space-y-3">
                            <label className="text-xs font-bold text-gray-500">Itens e Valores</label>
                            {activeSection.items?.map((item: any, i: number) => (
                              <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-200 group">
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
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Canvas Area (Direita) */}
          <div className="flex-1 bg-gray-100 overflow-y-auto p-4 sm:p-8 flex justify-center relative custom-scrollbar">
            
            {/* Folha / Page Container */}
            <div className="w-full max-w-[850px] min-h-[1000px] bg-white shadow-xl border border-gray-200 flex flex-col relative transition-all">
              
              {isPDFMode ? (
                <div className="w-full h-full relative flex-1 flex flex-col">
                  {sections[0]?.fileUrl ? (
                    <iframe src={`${sections[0].fileUrl}#toolbar=0`} className="w-full flex-1 border-0" title="PDF Preview" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400 bg-gray-50">
                      <FileUp className="w-16 h-16 mb-4 text-gray-300" />
                      <p className="font-medium text-lg text-gray-500">Faça upload de um PDF no menu lateral</p>
                    </div>
                  )}
                  
                  {/* Simulador de CTAs na Base */}
                  {sections[0]?.ctas?.length > 0 && sections[0]?.fileUrl && (
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                      <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-gray-200 flex gap-4 pointer-events-auto">
                        {sections[0].ctas.map((cta: any, i: number) => (
                          <div key={i} className={`px-6 py-3 rounded-xl font-bold text-white shadow-md cursor-pointer hover:-translate-y-1 transition-transform ${cta.color || 'bg-green-500'}`}>
                            {cta.label}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col w-full h-full relative">
                  {sections.length === 0 ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400">
                      <div className="w-20 h-20 rounded-full bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center mb-4">
                        <Plus className="w-8 h-8 text-gray-300" />
                      </div>
                      <p className="font-medium text-gray-500">Adicione blocos usando a barra lateral esquerda</p>
                    </div>
                  ) : (
                    sections.map(s => (
                      <div 
                        key={s.id} 
                        className={`w-full relative group cursor-pointer transition-all ${selectedId === s.id ? 'ring-2 ring-inset ring-orange-400 z-10 shadow-lg' : 'hover:ring-2 hover:ring-inset hover:ring-gray-200 z-0'}`} 
                        onClick={() => setSelectedId(s.id)}
                      >
                        <PreviewBlock section={s} />
                        
                        {/* Overlay helper para clique quando não selecionado */}
                        {selectedId !== s.id && (
                          <div className="absolute inset-0 bg-transparent group-hover:bg-gray-900/5 transition-colors" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}