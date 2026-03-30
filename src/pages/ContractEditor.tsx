import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, useParams } from "react-router-dom";
import ReactQuill from "react-quill-new";
import "react-quill-new/dist/quill.snow.css";
import SignaturePad from "react-signature-canvas";
import { 
  ArrowLeft, Save, UploadCloud, X, Loader2, Image as ImageIcon, PenTool 
} from "lucide-react";
import { toast } from "sonner";

export default function ContractEditor() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const isNew = !id || id === 'novo';
  
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [clients, setClients] = useState<{id: string, name: string}[]>([]);
  
  const sigCanvas = useRef<SignaturePad>(null);

  const [formData, setFormData] = useState({
    client_id: "",
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
        
        setFormData({
          client_id: contract.client_id || "",
          value: contract.value.toString(),
          start_date: contract.start_date,
          end_date: contract.end_date || "",
          description: contract.description || "",
          contract_image: contract.contract_image || "",
          supplier_signature: contract.supplier_signature || "",
          client_signature: contract.client_signature || "",
          signature_status: contract.signature_status || "Pendente"
        });

        if (contract.contract_image) setImagePreview(contract.contract_image);
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

  const handleSave = async () => {
    if (!formData.client_id) return toast.error("Selecione um cliente.");
    if (!formData.value) return toast.error("Informe o valor.");
    if (!formData.start_date) return toast.error("Informe a data de início.");

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
        client_id: formData.client_id,
        value: parseFloat(formData.value),
        start_date: formData.start_date,
        end_date: formData.end_date || null,
        description: formData.description,
        contract_image: imageUrl,
        supplier_signature: formData.supplier_signature,
        signature_status: formData.signature_status
      };

      if (isNew) {
        const share_token = crypto.randomUUID();
        await supabase.from('contracts').insert({ ...payload, share_token });
        toast.success("Contrato criado com sucesso!");
      } else {
        await supabase.from('contracts').update(payload).eq('id', id);
        toast.success("Contrato atualizado com sucesso!");
      }
      
      navigate('/contratos');
    } catch (error) {
      toast.error("Erro ao salvar contrato.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
        
        {/* Top Bar */}
        <div className="bg-white border border-gray-200 p-4 rounded-2xl shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/contratos')} className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{isNew ? 'Novo Contrato' : 'Editar Contrato'}</h1>
              <p className="text-sm text-gray-500">Preencha os detalhes, assine e redija o documento.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/contratos')} className="px-5 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
              Cancelar
            </button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar Contrato
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Form */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">Cliente *</label>
                <select 
                  value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                >
                  <option value="">Selecione o cliente</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-900 mb-1.5">Valor (R$) *</label>
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
          <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[600px]">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <h3 className="font-bold text-gray-900">Corpo do Contrato</h3>
              <span className="text-xs font-semibold text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200">
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
              .editor-container .ql-editor { min-height: 500px; padding: 24px; color: #374151; }
            `}} />
          </div>

        </div>
      </div>
    </Layout>
  );
}