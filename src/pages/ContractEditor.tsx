import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import SignaturePad from "react-signature-canvas";
import { 
  ArrowLeft, Save, UploadCloud, X, Loader2, Image as ImageIcon, PenTool, 
  Wand2, Info, Copy, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

export default function ContractEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = !id || id === 'novo';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  const [linkedTransaction, setLinkedTransaction] = useState<any>(null);
  
  const sigCanvas = useRef<SignaturePad>(null);

  const [formData, setFormData] = useState({
    client_id: "",
    title: "",
    value: "",
    start_date: new Date().toISOString().split('T')[0],
    end_date: "",
    description: "",
    contract_image: "",
    supplier_signature: "",
    client_signature: "",
    signature_status: "Pendente"
  });

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const availableVariables = [
    { tag: '{{nome}}', desc: 'Nome do Cliente' },
    { tag: '{{cpf}}', desc: 'CPF ou CNPJ' },
    { tag: '{{rg}}', desc: 'RG' },
    { tag: '{{estado_civil}}', desc: 'Estado Civil' },
    { tag: '{{profissao}}', desc: 'Profissão' },
    { tag: '{{endereco}}', desc: 'Endereço Completo' },
    { tag: '{{valor}}', desc: 'Valor Total (ex: R$ 5.000,00)' },
    { tag: '{{parcelas}}', desc: 'Quantidade de Parcelas' },
    { tag: '{{data_evento}}', desc: 'Data do Evento' }
  ];

  useEffect(() => {
    if (user) loadData();
  }, [user, id]);

  const loadData = async () => {
    try {
      const { data: clientsData } = await supabase
        .from('opportunities')
        .select('id, name')
        .eq('user_id', user?.id)
        .eq('is_client', true);
        
      setClients(clientsData || []);

      if (!isNew) {
        const { data: contract, error } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .single();
          
        if (error) throw error;
        
        const clientId = contract.client_id || "template";
        
        setFormData({
          client_id: clientId,
          title: contract.title || "",
          value: contract.value ? contract.value.toString() : "",
          start_date: contract.start_date || new Date().toISOString().split('T')[0],
          end_date: contract.end_date || "",
          description: contract.description || "",
          contract_image: contract.contract_image || "",
          supplier_signature: contract.supplier_signature || "",
          client_signature: contract.client_signature || "",
          signature_status: contract.signature_status || "Pendente"
        });

        if (contract.contract_image) setImagePreview(contract.contract_image);

        if (clientId !== "template") {
          const { data: tx } = await supabase
            .from('transactions')
            .select('*')
            .eq('client_id', clientId)
            .eq('amount', contract.value)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (tx) setLinkedTransaction(tx);
        }
      }
    } catch (error) {
      toast.error("Erro ao carregar dados.");
      navigate('/contratos');
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) return toast.error("Apenas imagens são permitidas.");
    if (file.size > 5 * 1024 * 1024) return toast.error("Máximo de 5MB.");
    
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const loadDefaultTemplate = () => {
    if (formData.description && !confirm("Atenção: Isso irá substituir todo o texto que você já escreveu. Deseja continuar?")) {
      return;
    }

    const templateHTML = `
      <h2 style="text-align: center;"><strong>CONTRATO DE PRESTAÇÃO DE SERVIÇOS</strong></h2>
      <p><br></p>
      <p><strong>CLÁUSULA PRIMEIRA - DAS PARTES</strong></p>
      <p><strong>CONTRATANTE:</strong> {{nome}}, {{estado_civil}}, {{profissao}}, portador(a) do RG nº {{rg}} e inscrito(a) no CPF/CNPJ sob o nº {{cpf}}, residente e domiciliado(a) em {{endereco}}.</p>
      <p><br></p>
      <p><strong>CONTRATADA:</strong> [SEU NOME / NOME DA SUA EMPRESA], inscrito(a) no CNPJ/CPF sob o nº [SEU CNPJ/CPF], com sede em [SEU ENDEREÇO].</p>
      <p><br></p>
      <p><strong>CLÁUSULA SEGUNDA - DO OBJETO</strong></p>
      <p>O presente contrato tem como objeto a prestação de serviços no evento a ser realizado na data de <strong>{{data_evento}}</strong>.</p>
      <p><br></p>
      <p><strong>CLÁUSULA TERCEIRA - DO VALOR E FORMA DE PAGAMENTO</strong></p>
      <p>Pelos serviços prestados, a CONTRATANTE pagará à CONTRATADA o valor total de <strong>{{valor}}</strong>, que será pago em <strong>{{parcelas}}</strong> vez(es).</p>
      <p><br></p>
      <p><strong>CLÁUSULA QUARTA - DO CANCELAMENTO</strong></p>
      <p>Em caso de rescisão por parte da CONTRATANTE, o valor do sinal não será devolvido, servindo como multa rescisória para cobrir os custos de bloqueio de agenda.</p>
      <p><br></p>
      <p><strong>CLÁUSULA QUINTA - DO DIREITO DE IMAGEM</strong></p>
      <p>A CONTRATANTE autoriza a CONTRATADA a utilizar as imagens produzidas no evento para fins de portfólio, site e redes sociais, desde que não exponham as partes a situações vexatórias.</p>
      <p><br></p>
      <p><strong>CLÁUSULA SEXTA - DO FORO</strong></p>
      <p>Para dirimir quaisquer controvérsias oriundas do presente contrato, as partes elegem o foro da comarca de [SUA CIDADE] / [SEU ESTADO].</p>
      <p><br></p>
      <p style="text-align: center;">E, por estarem assim justos e contratados, firmam o presente instrumento.</p>
    `;

    setFormData({ ...formData, description: templateHTML });
    toast.success("Modelo padrão carregado com sucesso!");
  };

  const copyVariable = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`Variável ${tag} copiada!`);
  };

  const handleSave = async () => {
    if (!formData.client_id) return toast.error("Selecione um cliente (ou crie um contrato modelo sem atrelar).");
    
    const isTemplate = formData.client_id === 'template';
    
    if (isTemplate && !formData.title) return toast.error("Por favor, dê um nome ao seu modelo de contrato.");
    if (!isTemplate && !formData.value) return toast.error("Informe o valor base.");

    setSaving(true);
    try {
      let imageUrl = formData.contract_image;

      if (imageFile && user) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('contract_images')
          .upload(filePath, imageFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('contract_images')
            .getPublicUrl(filePath);
          imageUrl = publicUrl;
        }
      }

      const payload = {
        user_id: user?.id,
        client_id: isTemplate ? null : formData.client_id,
        title: isTemplate ? formData.title : null,
        value: isTemplate ? 0 : (parseFloat(formData.value) || 0),
        start_date: isTemplate ? new Date().toISOString().split('T')[0] : formData.start_date,
        end_date: isTemplate ? null : (formData.end_date || null),
        description: formData.description,
        contract_image: imageUrl,
        supplier_signature: formData.supplier_signature,
        signature_status: formData.signature_status
      };

      if (isNew) {
        const share_token = crypto.randomUUID();
        const { error } = await supabase.from('contracts').insert({ ...payload, share_token });
        if (error) throw error;
        toast.success(isTemplate ? "Modelo salvo com sucesso!" : "Contrato salvo com sucesso!");
      } else {
        const { error } = await supabase.from('contracts').update(payload).eq('id', id);
        if (error) throw error;
        toast.success("Atualizado com sucesso!");
      }
      
      navigate('/contratos');
    } catch (error: any) {
      console.error("Save Error:", error);
      toast.error(error?.message || "Erro ao salvar contrato. Verifique sua conexão e os dados.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  const isTemplate = formData.client_id === 'template';

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6 pb-20">
        
        {/* Top Bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex items-center justify-between z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/contratos')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{isNew ? 'Novo Contrato / Modelo' : 'Editar Contrato'}</h1>
              <p className="text-sm text-gray-500 hidden sm:block">Preencha os detalhes, assine e redija o documento.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/contratos')} className="hidden sm:block px-5 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">Vincular Cliente *</label>
                <select 
                  value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                >
                  <option value="">Selecione o cliente</option>
                  <option value="template" className="font-bold text-purple-600">É apenas um Modelo (Template Base)</option>
                  <optgroup label="Seus Clientes">
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </optgroup>
                </select>
              </div>

              {isTemplate ? (
                <div className="animate-in fade-in space-y-5">
                  <div>
                    <label className="block text-sm font-bold text-purple-900 mb-1.5">Nome do Modelo *</label>
                    <input 
                      type="text" placeholder="Ex: Modelo Casamento Completo"
                      value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                      className="w-full px-3 py-2.5 bg-purple-50 border border-purple-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 text-purple-900 font-semibold placeholder:text-purple-300"
                    />
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <Info className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
                      <div>
                        <h4 className="font-bold text-purple-900 text-sm">Modo Template Ativo</h4>
                        <p className="text-xs text-purple-700 mt-1">
                          Campos de valor e data foram ocultados, pois eles serão preenchidos automaticamente pelas variáveis ao enviar o link de fechamento.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in">
                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1.5">Valor Base (R$) *</label>
                    <input 
                      type="number" step="0.01" placeholder="0.00"
                      value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1.5">Data de Início *</label>
                    <input 
                      type="date"
                      value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-gray-900 mb-1.5">Data de Término (Opcional)</label>
                    <input 
                      type="date"
                      value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Plano de Pagamento Vinculado */}
            {linkedTransaction && (
              <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-green-50">
                  <Label className="text-base font-bold flex items-center gap-2 text-green-800">
                    <DollarSign className="w-5 h-5 text-green-600" />
                    Plano de Pagamento Vinculado
                  </Label>
                  <p className="text-xs text-green-600 mt-1 font-medium">Condições salvas após o cliente assinar o contrato.</p>
                </div>
                <CardContent className="p-5 space-y-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-gray-500">Status Atual:</span>
                    <span className="text-sm font-bold uppercase text-gray-900">{linkedTransaction.status}</span>
                  </div>
                  {linkedTransaction.is_installment && linkedTransaction.installments ? (
                     <div className="space-y-2">
                       {(typeof linkedTransaction.installments === 'string' ? JSON.parse(linkedTransaction.installments) : linkedTransaction.installments).map((inst: any, idx: number) => (
                         <div key={idx} className="flex justify-between items-center text-sm p-3 bg-gray-50 rounded-lg border border-gray-100">
                           <span className="font-bold text-gray-700">{inst.number}x de {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.amount)}</span>
                           <span className="text-gray-500 font-medium text-xs">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</span>
                         </div>
                       ))}
                     </div>
                  ) : (
                    <div className="text-sm p-3 bg-gray-50 rounded-lg border border-gray-100 flex justify-between items-center">
                      <span className="font-bold text-gray-700">À vista</span>
                      <span className="font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(linkedTransaction.amount)}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Espaço para a Assinatura do Fornecedor */}
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <PenTool className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-gray-900">Sua Assinatura (Fornecedor)</h3>
              </div>
              
              {formData.supplier_signature ? (
                <div className="relative inline-block w-full border-b-2 border-gray-800 pb-2 text-center">
                  <img src={formData.supplier_signature} alt="Sua Assinatura" className="h-24 mx-auto object-contain" />
                  <button 
                    onClick={() => setFormData({
                      ...formData, 
                      supplier_signature: '', 
                      signature_status: formData.client_signature ? 'Assinado 1/2' : 'Pendente'
                    })} 
                    className="absolute -top-3 -right-2 bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors shadow-sm"
                    title="Remover assinatura"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-xl bg-gray-50 p-3">
                  <SignaturePad 
                    ref={sigCanvas} 
                    canvasProps={{ className: "w-full h-24" }} 
                  />
                  <div className="flex gap-2 mt-3 justify-center">
                    <button 
                      onClick={() => sigCanvas.current?.clear()} 
                      className="px-4 py-2 text-xs font-semibold bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                      Limpar
                    </button>
                    <button 
                      onClick={() => {
                        if(!sigCanvas.current?.isEmpty()){
                          setFormData({
                            ...formData, 
                            supplier_signature: sigCanvas.current?.getCanvas().toDataURL('image/png'),
                            signature_status: formData.client_signature ? 'Assinado 2/2' : 'Assinado 1/2'
                          });
                        }
                      }} 
                      className="px-4 py-2 text-xs font-semibold bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors shadow-sm"
                    >
                      Adicionar Assinatura
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <ImageIcon className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-gray-900">Imagem do Contrato</h3>
              </div>
              <div className="p-6">
                {imagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-gray-200 group">
                    <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button onClick={() => { setImagePreview(null); setImageFile(null); setFormData({...formData, contract_image: ''}); }} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold flex items-center gap-2">
                        <X className="w-4 h-4" /> Remover
                      </button>
                    </div>
                  </div>
                ) : (
                  <label className="border-2 border-dashed border-gray-300 rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-orange-300 transition-colors">
                    <UploadCloud className="w-10 h-10 text-gray-400 mb-3" />
                    <p className="font-bold text-gray-900 text-sm mb-1">Clique ou arraste uma imagem</p>
                    <p className="text-xs text-gray-500">JPEG, PNG, GIF ou WebP (Max 5MB)</p>
                    <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files && handleImageUpload(e.target.files[0])} />
                  </label>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Editor */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Variáveis Dinâmicas Helper */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-blue-500" />
                  <h3 className="font-bold text-blue-900">Variáveis Inteligentes</h3>
                </div>
                <button 
                  onClick={loadDefaultTemplate}
                  className="px-4 py-2 bg-white text-blue-600 font-bold text-xs rounded-lg border border-blue-200 shadow-sm hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  Carregar Modelo Padrão
                </button>
              </div>
              <p className="text-sm text-blue-800 mb-4">
                Clique nas tags abaixo para copiá-las. Cole-as no texto do seu contrato. 
                Quando você enviar o link de fechamento para o cliente, o CRM trocará essas tags automaticamente pelos dados dele!
              </p>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableVariables.map((v, i) => (
                  <div 
                    key={i} 
                    onClick={() => copyVariable(v.tag)}
                    className="bg-white border border-blue-100 rounded-lg p-2.5 flex items-center justify-between cursor-pointer hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                    title="Clique para copiar"
                  >
                    <div className="flex flex-col min-w-0">
                      <span className="font-mono text-xs font-bold text-blue-700">{v.tag}</span>
                      <span className="text-[10px] text-gray-500 truncate">{v.desc}</span>
                    </div>
                    <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-500 shrink-0" />
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
                <h3 className="font-bold text-gray-900">Corpo do Contrato</h3>
                <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                  {formData.description.length} / 1.000.000
                </span>
              </div>
              <div className="flex-1 editor-container">
                <ReactQuill 
                  theme="snow"
                  value={formData.description}
                  onChange={(val) => setFormData({...formData, description: val})}
                  className="h-[500px]"
                  modules={{
                    toolbar: [
                      [{ 'header': [1, 2, 3, false] }],
                      ['bold', 'italic', 'underline', 'strike'],
                      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
                      [{ 'align': [] }],
                      ['link', 'image'],
                      ['clean']
                    ]
                  }}
                />
              </div>
              <style dangerouslySetInnerHTML={{__html: `
                .editor-container .quill { display: flex; flex-direction: column; height: 100%; }
                .editor-container .ql-toolbar { border: none !important; border-bottom: 1px solid #e5e7eb !important; padding: 12px 16px !important; background: #fff; }
                .editor-container .ql-container { border: none !important; flex: 1; font-family: inherit; font-size: 15px; }
                .editor-container .ql-editor { min-height: 500px; padding: 24px; color: #374151; line-height: 1.6; }
              `}} />
            </div>
          </div>

        </div>
      </div>
    </Layout>
  );
}