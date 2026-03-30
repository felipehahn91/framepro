
import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbaseClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import RichTextEditor from '@/components/RichTextEditor';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowLeft, Save, Loader2, UploadCloud, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

const ContractEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [clients, setClients] = useState([]);
  
  const [formData, setFormData] = useState({
    clientId: '',
    value: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    description: '',
    status: 'Ativo',
    signatureStatus: 'Pendente'
  });

  // Image Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const clientsData = await pb.collection('clients').getFullList({
          filter: `userId="${currentUser.id}"`,
          sort: 'name',
          $autoCancel: false
        });
        setClients(clientsData);

        if (id && id !== 'new') {
          const contract = await pb.collection('contracts').getOne(id, { $autoCancel: false });
          setFormData({
            clientId: contract.clientId,
            value: contract.value.toString(),
            startDate: contract.startDate.split(' ')[0],
            endDate: contract.endDate ? contract.endDate.split(' ')[0] : '',
            description: contract.description || '',
            status: contract.status || 'Ativo',
            signatureStatus: contract.signatureStatus || 'Pendente'
          });

          if (contract.contractImage) {
            setImagePreview(pb.files.getUrl(contract, contract.contractImage));
          }
        }
      } catch (error) {
        console.error(error);
        toast.error('Erro ao carregar dados.');
        navigate('/contracts');
      } finally {
        setInitialLoading(false);
      }
    };

    loadData();
  }, [id, currentUser, navigate]);

  const generateShareToken = () => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const handleImageSelection = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione um arquivo de imagem válido (JPEG, PNG, GIF, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 5MB.');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setRemoveExistingImage(false);
    toast.success('Imagem anexada com sucesso!');
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleImageSelection(file);
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setRemoveExistingImage(true);
  };

  const handleSave = async () => {
    if (!formData.clientId || !formData.value || !formData.startDate) {
      toast.error('Preencha os campos obrigatórios (Cliente, Valor, Data de Início).');
      return;
    }

    if (formData.description && formData.description.length > 1000000) {
      toast.error('O texto do contrato excede o limite máximo de 1.000.000 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = new FormData();
      dataToSave.append('clientId', formData.clientId);
      dataToSave.append('value', parseFloat(formData.value));
      dataToSave.append('startDate', formData.startDate);
      if (formData.endDate) dataToSave.append('endDate', formData.endDate);
      dataToSave.append('description', formData.description);
      dataToSave.append('status', formData.status);
      dataToSave.append('signatureStatus', formData.signatureStatus);
      dataToSave.append('userId', currentUser.id);

      if (imageFile) {
        dataToSave.append('contractImage', imageFile);
      } else if (removeExistingImage) {
        dataToSave.append('contractImage', '');
      }

      if (id && id !== 'new') {
        await pb.collection('contracts').update(id, dataToSave, { $autoCancel: false });
        toast.success('Contrato atualizado com sucesso!');
      } else {
        dataToSave.append('shareToken', generateShareToken());
        await pb.collection('contracts').create(dataToSave, { $autoCancel: false });
        toast.success('Contrato criado com sucesso!');
      }
      navigate('/contracts');
    } catch (error) {
      console.error(error);
      toast.error('Erro ao salvar contrato. Verifique sua conexão.');
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <div className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{id && id !== 'new' ? 'Editar Contrato' : 'Novo Contrato'} - Frame Pro</title>
      </Helmet>

      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-6xl mx-auto space-y-6">
              
              <div className="flex items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => navigate('/contracts')} className="hover:bg-muted">
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                      {id && id !== 'new' ? 'Editar Contrato' : 'Novo Contrato'}
                    </h1>
                    <p className="text-sm text-muted-foreground">
                      Preencha os detalhes, anexe imagens e redija o documento.
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => navigate('/contracts')}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSave} disabled={loading} className="bg-primary text-primary-foreground hover:bg-primary/90">
                    {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Salvar Contrato
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Metadata & Image Upload */}
                <div className="lg:col-span-4 space-y-6">
                  <Card className="border-border/50 shadow-sm">
                    <CardContent className="p-5 space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="clientId">Cliente *</Label>
                        <Select 
                          value={formData.clientId} 
                          onValueChange={(val) => setFormData({...formData, clientId: val})}
                        >
                          <SelectTrigger className="bg-background">
                            <SelectValue placeholder="Selecione o cliente" />
                          </SelectTrigger>
                          <SelectContent>
                            {clients.map(c => (
                              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="value">Valor (R$) *</Label>
                        <Input 
                          id="value" 
                          type="number" 
                          step="0.01" 
                          placeholder="0.00"
                          value={formData.value}
                          onChange={(e) => setFormData({...formData, value: e.target.value})}
                          className="bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="startDate">Data de Início *</Label>
                        <Input 
                          id="startDate" 
                          type="date" 
                          value={formData.startDate}
                          onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                          className="bg-background"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="endDate">Data de Término (Opcional)</Label>
                        <Input 
                          id="endDate" 
                          type="date" 
                          value={formData.endDate}
                          onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                          className="bg-background"
                        />
                      </div>

                      {id && id !== 'new' && (
                        <div className="space-y-2 pt-4 border-t border-border/50">
                          <Label>Status da Assinatura</Label>
                          <div className="text-sm font-medium px-3 py-2 bg-muted/50 rounded-md border border-border/50">
                            {formData.signatureStatus}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Image Upload Section */}
                  <Card className="border-border/50 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-border/50 bg-muted/20">
                      <Label className="text-base font-semibold flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-primary" />
                        Imagem do Contrato
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">Anexe uma imagem de referência (Max 5MB)</p>
                    </div>
                    <CardContent className="p-5">
                      {imagePreview ? (
                        <div className="relative rounded-lg overflow-hidden border border-border/50 group">
                          <img src={imagePreview} alt="Preview" className="w-full h-48 object-cover" />
                          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="destructive" size="sm" onClick={handleRemoveImage}>
                              <X className="w-4 h-4 mr-2" /> Remover Imagem
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div 
                          className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer
                            ${isDragging ? 'border-primary bg-primary/5' : 'border-border/60 hover:border-primary/50 hover:bg-muted/30'}`}
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => document.getElementById('contract-image-upload').click()}
                        >
                          <UploadCloud className={`w-10 h-10 mx-auto mb-3 ${isDragging ? 'text-primary' : 'text-muted-foreground'}`} />
                          <p className="text-sm font-medium mb-1">Clique ou arraste uma imagem</p>
                          <p className="text-xs text-muted-foreground">JPEG, PNG, GIF ou WebP</p>
                          <input 
                            id="contract-image-upload" 
                            type="file" 
                            accept="image/jpeg,image/png,image/gif,image/webp" 
                            className="hidden" 
                            onChange={(e) => handleImageSelection(e.target.files[0])}
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Right Column: Editor */}
                <div className="lg:col-span-8">
                  <Card className="border-border/50 shadow-sm h-full flex flex-col">
                    <div className="p-4 border-b border-border/50 bg-muted/20 flex justify-between items-center">
                      <Label className="text-base font-semibold">Corpo do Contrato</Label>
                      <span className="text-xs font-medium text-muted-foreground bg-background px-2 py-1 rounded-md border border-border/50">
                        {formData.description.length} / 1.000.000
                      </span>
                    </div>
                    <CardContent className="p-0 flex-1">
                      <div className="min-h-[600px] h-full">
                        <RichTextEditor 
                          value={formData.description}
                          onChange={(html) => setFormData({...formData, description: html})}
                          placeholder="Redija os termos do contrato aqui. Você pode colar textos longos, formatar e estruturar o documento."
                          className="h-full border-0 rounded-none"
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default ContractEditor;
