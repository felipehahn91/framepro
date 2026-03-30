import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import { 
  ArrowLeft, Save, Loader2, Image as ImageIcon, Type, DollarSign, 
  Trash2, Plus, FileUp, Settings, Link as LinkIcon, MoveUp, MoveDown,
  X, LayoutTemplate
} from "lucide-react";
import { toast } from "sonner";

// Componente helper para simplificar a renderização
const PreviewBlock = ({ section }: { section: any }) => {
  if (section.type === 'cover') {
    return (
      <div className="relative w-full aspect-video bg-gray-100 rounded-2xl overflow-hidden flex flex-col items-center justify-center text-center p-8 border border-gray-200">
        {section.imageUrl && <img src={section.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />}
        <div className="relative z-10 bg-white/80 backdrop-blur-md p-6 rounded-xl border border-white/50 max-w-lg w-full">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{section.title || 'Título da Capa'}</h1>
          <p className="text-gray-600">{section.subtitle || 'Subtítulo da sua proposta'}</p>
        </div>
      </div>
    );
  }
  if (section.type === 'text') {
    return (
      <div className="w-full bg-white p-8 rounded-2xl border border-gray-200 prose max-w-none">
        {section.content ? <div dangerouslySetInnerHTML={{ __html: section.content.replace(/\n/g, '<br/>') }} /> : <p className="text-gray-400 italic">Bloco de texto vazio...</p>}
      </div>
    );
  }
  if (section.type === 'pricing') {
    const total = section.items?.reduce((acc: number, item: any) => acc + (Number(item.price) || 0), 0) || 0;
    return (
      <div className="w-full bg-white p-8 rounded-2xl border border-gray-200">
        <h2 className="text-xl font-bold text-gray-900 mb-6">{section.title || 'Investimento'}</h2>
        <div className="space-y-3">
          {section.items?.map((item: any, i: number) => (
            <div key={i} className="flex justify-between items-center py-3 border-b border-gray-100 last:border-0">
              <span className="text-gray-700">{item.name || 'Item sem nome'}</span>
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

      const { error: uploadError } = await supabase.storage.from('contract_images').upload(filePath, file); // Reusing bucket for simplicity
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
    <Layout>
      <div className="flex flex-col h-[calc(100vh-8rem)]">
        {/* Topbar */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex items-center justify-between mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/orcamentos')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <input 
              type="text" 
              value={orcamento.name} 
              onChange={e => setOrcamento({...orcamento, name: e.target.value})}
              className="text-xl font-bold text-gray-900 border-none focus:ring-0 p-0 bg-transparent"
            />
          </div>
          <button onClick={handleSave} disabled={saving} className="px-6 py-2.5 bg-orange-400 text-white font-bold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Salvar
          </button>
        </div>

        {/* Editor Area */}
        <div className="flex-1 flex gap-6 overflow-hidden">
          
          {/* Sidebar (Controls) */}
          <div className="w-[350px] bg-white border border-gray-200 rounded-2xl shadow-sm flex flex-col overflow-hidden shrink-0">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <Settings className="w-4 h-4" /> Configurações
              </h2>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {isPDFMode ? (
                <div className="space-y-6">
                  {/* Controles PDF */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-gray-700">Arquivo PDF</label>
                    {sections[0]?.fileUrl ? (
                      <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-center">
                        <FileUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm font-semibold text-green-700 mb-3">PDF Carregado</p>
                        <button onClick={() => updateSection(sections[0].id, { fileUrl: '' })} className="text-xs text-red-600 font-bold hover:underline">Remover Arquivo</button>
                      </div>
                    ) : (
                      <label className="border-2 border-dashed border-blue-300 bg-blue-50 hover:bg-blue-100 transition-colors rounded-xl p-6 flex flex-col items-center cursor-pointer text-center">
                        <FileUp className="w-8 h-8 text-blue-500 mb-2" />
                        <span className="text-sm font-bold text-blue-700">Selecione o PDF</span>
                        <input type="file" accept="application/pdf" className="hidden" onChange={e => e.target.files && handlePdfUpload(e.target.files[0])} />
                      </label>
                    )}
                  </div>

                  <div className="border-t border-gray-100 pt-6">
                    <div className="flex items-center justify-between mb-4">
                      <label className="text-sm font-bold text-gray-700">Botões Flutuantes (CTAs)</label>
                      <button 
                        onClick={() => {
                          const ctas = sections[0].ctas || [];
                          updateSection(sections[0].id, { ctas: [...ctas, { label: 'Aprovar Orçamento', link: 'https://wa.me/seu-numero', color: 'bg-green-500' }] });
                        }}
                        className="text-orange-500 hover:bg-orange-50 p-1 rounded"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="space-y-4">
                      {sections[0]?.ctas?.map((cta: any, idx: number) => (
                        <div key={idx} className="bg-gray-50 border border-gray-200 p-3 rounded-lg relative group">
                          <button onClick={() => {
                            const newCtas = [...sections[0].ctas]; newCtas.splice(idx, 1);
                            updateSection(sections[0].id, { ctas: newCtas });
                          }} className="absolute top-2 right-2 text-gray-400 hover:text-red-500">
                            <X className="w-4 h-4" />
                          </button>
                          <input 
                            value={cta.label} onChange={e => {
                              const newCtas = [...sections[0].ctas]; newCtas[idx].label = e.target.value;
                              updateSection(sections[0].id, { ctas: newCtas });
                            }} 
                            placeholder="Texto do Botão" className="w-full text-sm font-bold bg-transparent border-b border-gray-300 mb-2 px-1 focus:outline-none"
                          />
                          <div className="flex items-center gap-2">
                            <LinkIcon className="w-4 h-4 text-gray-400" />
                            <input 
                              value={cta.link} onChange={e => {
                                const newCtas = [...sections[0].ctas]; newCtas[idx].link = e.target.value;
                                updateSection(sections[0].id, { ctas: newCtas });
                              }} 
                              placeholder="Link (ex: WhatsApp)" className="w-full text-xs bg-white border border-gray-200 rounded p-1.5 focus:outline-none"
                            />
                          </div>
                        </div>
                      ))}
                      {(!sections[0]?.ctas || sections[0].ctas.length === 0) && (
                        <p className="text-xs text-gray-500 text-center italic">Nenhum botão adicionado.</p>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Builder Controls */}
                  <div className="space-y-2">
                    {sections.map((s, idx) => (
                      <div 
                        key={s.id} 
                        onClick={() => setSelectedId(s.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${selectedId === s.id ? 'border-orange-400 bg-orange-50' : 'border-gray-200 hover:bg-gray-50'}`}
                      >
                        <div className="flex items-center gap-3">
                          {s.type === 'cover' && <ImageIcon className="w-4 h-4 text-gray-500" />}
                          {s.type === 'text' && <Type className="w-4 h-4 text-gray-500" />}
                          {s.type === 'pricing' && <DollarSign className="w-4 h-4 text-gray-500" />}
                          <span className="font-semibold text-sm capitalize">{s.type === 'cover' ? 'Capa' : s.type === 'text' ? 'Texto' : 'Preços'}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'up'); }} disabled={idx === 0} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><MoveUp className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveSection(idx, 'down'); }} disabled={idx === sections.length - 1} className="p-1 hover:bg-gray-200 rounded disabled:opacity-30"><MoveDown className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); removeSection(s.id); }} className="p-1 hover:bg-red-100 text-red-500 rounded ml-1"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="pt-4 mt-4 border-t border-gray-100 grid grid-cols-3 gap-2">
                      <button onClick={() => addSection('cover')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors">
                        <ImageIcon className="w-5 h-5 text-gray-400 mb-1" /> <span className="text-[10px] font-bold">Capa</span>
                      </button>
                      <button onClick={() => addSection('text')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors">
                        <Type className="w-5 h-5 text-gray-400 mb-1" /> <span className="text-[10px] font-bold">Texto</span>
                      </button>
                      <button onClick={() => addSection('pricing')} className="flex flex-col items-center justify-center p-3 border border-gray-200 rounded-lg hover:border-orange-400 hover:bg-orange-50 transition-colors">
                        <DollarSign className="w-5 h-5 text-gray-400 mb-1" /> <span className="text-[10px] font-bold">Preço</span>
                      </button>
                    </div>
                  </div>

                  {/* Active Section Properties */}
                  {activeSection && (
                    <div className="border-t border-gray-100 pt-6 space-y-4">
                      <h3 className="font-bold text-gray-900 mb-4">Editar {activeSection.type === 'cover' ? 'Capa' : activeSection.type === 'text' ? 'Texto' : 'Tabela de Preços'}</h3>
                      
                      {activeSection.type === 'cover' && (
                        <>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Título</label>
                            <input value={activeSection.title || ''} onChange={e => updateSection(activeSection.id, { title: e.target.value })} className="w-full text-sm p-2 border border-gray-200 rounded-md" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Subtítulo</label>
                            <input value={activeSection.subtitle || ''} onChange={e => updateSection(activeSection.id, { subtitle: e.target.value })} className="w-full text-sm p-2 border border-gray-200 rounded-md" />
                          </div>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">URL da Imagem de Fundo</label>
                            <input value={activeSection.imageUrl || ''} onChange={e => updateSection(activeSection.id, { imageUrl: e.target.value })} className="w-full text-sm p-2 border border-gray-200 rounded-md" placeholder="https://..." />
                          </div>
                        </>
                      )}

                      {activeSection.type === 'text' && (
                        <div>
                          <label className="text-xs font-bold text-gray-500 mb-1 block">Conteúdo</label>
                          <textarea value={activeSection.content || ''} onChange={e => updateSection(activeSection.id, { content: e.target.value })} className="w-full text-sm p-2 border border-gray-200 rounded-md min-h-[200px]" />
                        </div>
                      )}

                      {activeSection.type === 'pricing' && (
                        <>
                          <div>
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Título da Tabela</label>
                            <input value={activeSection.title || ''} onChange={e => updateSection(activeSection.id, { title: e.target.value })} className="w-full text-sm p-2 border border-gray-200 rounded-md" />
                          </div>
                          <div className="space-y-3 mt-4">
                            <label className="text-xs font-bold text-gray-500 mb-1 block">Itens do Orçamento</label>
                            {activeSection.items?.map((item: any, i: number) => (
                              <div key={i} className="flex gap-2 items-center bg-gray-50 p-2 rounded-md border border-gray-100">
                                <input value={item.name} onChange={e => {
                                  const newItems = [...activeSection.items]; newItems[i].name = e.target.value;
                                  updateSection(activeSection.id, { items: newItems });
                                }} className="w-full text-sm p-1.5 border border-gray-200 rounded" placeholder="Item" />
                                <input type="number" value={item.price} onChange={e => {
                                  const newItems = [...activeSection.items]; newItems[i].price = e.target.value;
                                  updateSection(activeSection.id, { items: newItems });
                                }} className="w-24 text-sm p-1.5 border border-gray-200 rounded" placeholder="0.00" />
                                <button onClick={() => {
                                  const newItems = [...activeSection.items]; newItems.splice(i, 1);
                                  updateSection(activeSection.id, { items: newItems });
                                }} className="text-red-500 p-1 hover:bg-red-50 rounded"><X className="w-4 h-4"/></button>
                              </div>
                            ))}
                            <button onClick={() => {
                              const newItems = [...(activeSection.items || []), { name: 'Novo Item', price: 0 }];
                              updateSection(activeSection.id, { items: newItems });
                            }} className="w-full py-2 border-2 border-dashed border-gray-200 rounded-lg text-sm font-bold text-gray-500 hover:bg-gray-50 mt-2">
                              + Adicionar Item
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

          {/* Preview Area */}
          <div className="flex-1 bg-gray-100 rounded-2xl border border-gray-200 shadow-inner overflow-y-auto relative">
            <div className="min-h-full w-full max-w-[800px] mx-auto bg-white shadow-xl min-h-[1056px] relative flex flex-col">
              {isPDFMode ? (
                <div className="w-full h-full relative flex-1 flex flex-col">
                  {sections[0]?.fileUrl ? (
                    <iframe src={`${sections[0].fileUrl}#toolbar=0`} className="w-full flex-1 border-0" title="PDF Preview" />
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                      <FileUp className="w-16 h-16 mb-4 opacity-20" />
                      <p className="font-medium text-lg">Faça upload de um PDF para visualizar</p>
                    </div>
                  )}
                  
                  {/* CTAs Wrapper (Simulando a visualização pública) */}
                  {sections[0]?.ctas?.length > 0 && sections[0]?.fileUrl && (
                    <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                      <div className="bg-white/90 backdrop-blur-md px-6 py-4 rounded-2xl shadow-2xl border border-gray-200 flex gap-4 pointer-events-auto">
                        {sections[0].ctas.map((cta: any, i: number) => (
                          <button key={i} className={`px-6 py-3 rounded-xl font-bold text-white shadow-md hover:scale-105 transition-transform ${cta.color || 'bg-green-500'}`}>
                            {cta.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-8 space-y-8 flex flex-col items-center w-full">
                  {sections.length === 0 ? (
                    <div className="py-32 text-center text-gray-400 w-full border-2 border-dashed border-gray-200 rounded-2xl">
                      <LayoutTemplate className="w-12 h-12 mx-auto mb-4 opacity-30" />
                      <p className="font-medium">Nenhuma seção adicionada.<br/>Use o menu lateral para começar a montar seu orçamento.</p>
                    </div>
                  ) : (
                    sections.map(s => (
                      <div key={s.id} className={`w-full transition-all rounded-2xl ${selectedId === s.id ? 'ring-4 ring-orange-400/30' : ''}`} onClick={() => setSelectedId(s.id)}>
                        <PreviewBlock section={s} />
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}