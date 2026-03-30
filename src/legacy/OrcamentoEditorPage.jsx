
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbaseClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Save, ArrowLeft, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import OrçamentoEditor from '@/components/OrçamentoEditor';
import OrçamentoPreview from '@/components/OrçamentoPreview';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const OrçamentoEditorPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [orcamento, setOrcamento] = useState(null);
  const [sections, setSections] = useState([]);
  const [globalSpacing, setGlobalSpacing] = useState(0);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchOrcamento = async () => {
      try {
        const data = await pb.collection('orcamentos').getOne(id, { $autoCancel: false });
        setOrcamento(data);
        setSections(data.sections || []);
      } catch (error) {
        toast.error('Erro ao carregar orçamento');
        navigate('/orcamentos');
      } finally {
        setLoading(false);
      }
    };
    fetchOrcamento();
  }, [id, navigate]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await pb.collection('orcamentos').update(id, {
        name: orcamento.name,
        sections: sections
      }, { $autoCancel: false });
      toast.success('Orçamento salvo com sucesso');
    } catch (error) {
      toast.error('Erro ao salvar orçamento');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await pb.collection('orcamentos').delete(id, { $autoCancel: false });
      toast.success('Orçamento deletado com sucesso');
      navigate('/orcamentos');
    } catch (error) {
      toast.error('Erro ao deletar orçamento');
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <Skeleton className="h-[600px] w-full" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Editor de Orçamento - Frame Pro</title>
      </Helmet>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64 h-full">
          <Header />
          <main className="flex-1 flex flex-col overflow-hidden bg-muted/30">
            <div className="p-6 pb-2 border-b bg-background z-10 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <h1 className="text-3xl font-bold">Editor de Orçamento</h1>
                </div>
                <div className="flex items-center gap-4">
                  <Input 
                    value={orcamento?.name || ''}
                    onChange={(e) => setOrcamento({...orcamento, name: e.target.value})}
                    className="font-bold text-lg bg-white w-64"
                  />
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deleting}>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Deletar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. Isso excluirá permanentemente o orçamento "{orcamento?.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                          Sim, deletar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  <Button onClick={handleSave} disabled={saving} className="bg-[#FF8C00] hover:bg-[#FF8C00]/90 text-white">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="flex flex-col lg:flex-row gap-6 relative min-h-full">
                <div className="w-full lg:w-1/2 flex flex-col pb-20">
                  <OrçamentoEditor 
                    sections={sections} 
                    setSections={setSections} 
                    globalSpacing={globalSpacing} 
                    setGlobalSpacing={setGlobalSpacing} 
                    selectedElementId={selectedElementId}
                    setSelectedElementId={setSelectedElementId}
                  />
                </div>
                <div className="w-full lg:w-1/2 bg-muted/30 rounded-xl overflow-hidden border shadow-sm sticky top-0 h-[calc(100vh-140px)]">
                  <OrçamentoPreview 
                    sections={sections} 
                    setSections={setSections} 
                    globalSpacing={globalSpacing} 
                    selectedElementId={selectedElementId}
                    setSelectedElementId={setSelectedElementId}
                  />
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

export default OrçamentoEditorPage;
