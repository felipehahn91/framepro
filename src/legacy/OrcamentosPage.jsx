
import React, { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCache } from '@/hooks/useCache';
import { useSubscription } from '@/hooks/useSubscription';
import { subscriptionManager } from '@/lib/SubscriptionManager';
import ErrorBoundaryWithCleanup from '@/components/ErrorBoundaryWithCleanup';
import pb from '@/lib/pocketbaseClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, Search, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import OrçamentoCard from '@/components/OrçamentoCard';

const SendToLeadModal = lazy(() => import('@/components/SendToLeadModal'));

const OrçamentosPageContent = React.memo(() => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  
  const [sendModalOpen, setSendModalOpen] = useState(false);
  const [orcamentoToSend, setOrcamentoToSend] = useState(null);
  const [localOrcamentos, setLocalOrcamentos] = useState([]);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 20;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      subscriptionManager.unsubscribeAll();
    };
  }, []);

  const { data, isLoading, refetch, invalidate } = useCache(`orcamentos_list_${page}_${debouncedSearch}`, async () => {
    let filter = `userId = "${currentUser.id}"`;
    if (debouncedSearch) {
      filter += ` && name ~ "${debouncedSearch}"`;
    }

    const [orcData, oppsData, pipesData, colsData] = await Promise.all([
      pb.collection('orcamentos').getList(page, limit, { filter, sort: '-updated', $autoCancel: false }),
      pb.collection('opportunities').getFullList({ filter: `userId = "${currentUser.id}"`, $autoCancel: false }),
      pb.collection('pipelines').getFullList({ filter: `userId = "${currentUser.id}"`, $autoCancel: false }),
      pb.collection('pipeline_columns').getFullList({ filter: `userId = "${currentUser.id}"`, $autoCancel: false })
    ]);
    return { orcData, oppsData, pipesData, colsData };
  }, { dependencies: [currentUser?.id, page, debouncedSearch] });

  useEffect(() => {
    if (data?.orcData?.items) {
      setLocalOrcamentos(data.orcData.items);
    }
  }, [data?.orcData]);

  // Real-time updates
  useSubscription('orcamentos_page', 'orcamentos', `userId="${currentUser?.id}"`, () => {
    refetch();
  }, [currentUser?.id, page, debouncedSearch]);

  const opportunities = useMemo(() => data?.oppsData || [], [data?.oppsData]);
  const pipelines = useMemo(() => data?.pipesData || [], [data?.pipesData]);
  const columns = useMemo(() => data?.colsData || [], [data?.colsData]);
  const totalPages = data?.orcData?.totalPages || 1;

  const handleCreate = async () => {
    try {
      const newOrcamento = await pb.collection('orcamentos').create({
        name: 'Novo Orçamento',
        userId: currentUser.id,
        sections: [],
        shareToken: crypto.randomUUID(),
        viewCount: 0
      }, { $autoCancel: false });
      
      invalidate();
      toast.success('Orçamento criado com sucesso!');
      navigate(`/orcamentos/editar/${newOrcamento.id}`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Create error:', error);
        toast.error('Erro ao criar orçamento');
      }
    }
  };

  const handleDuplicate = async (orcamento) => {
    try {
      await pb.collection('orcamentos').create({
        name: `${orcamento.name} (Cópia)`,
        userId: currentUser.id,
        leadId: orcamento.leadId,
        sections: orcamento.sections,
        shareToken: crypto.randomUUID(),
        viewCount: 0
      }, { $autoCancel: false });
      
      invalidate();
      refetch();
      toast.success('Orçamento duplicado');
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Erro ao duplicar orçamento');
      }
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este orçamento?')) return;
    
    const previousOrcamentos = [...localOrcamentos];
    setLocalOrcamentos(prev => prev.filter(o => o.id !== id));

    try {
      try {
        const analytics = await pb.collection('orcamento_analytics').getFullList({ filter: `orcamentoId="${id}"`, $autoCancel: false });
        await Promise.all(analytics.map(record => pb.collection('orcamento_analytics').delete(record.id, { $autoCancel: false })));
      } catch (e) { if (e.name !== 'AbortError') console.warn('Analytics delete error', e); }

      try {
        const tracking = await pb.collection('orcamento_tracking').getFullList({ filter: `orcamentoId="${id}"`, $autoCancel: false });
        await Promise.all(tracking.map(record => pb.collection('orcamento_tracking').delete(record.id, { $autoCancel: false })));
      } catch (e) { if (e.name !== 'AbortError') console.warn('Tracking delete error', e); }

      await pb.collection('orcamentos').delete(id, { $autoCancel: false });
      
      toast.success('Orçamento deletado com sucesso!');
      invalidate();
      refetch();
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('Error deleting budget:', error);
        setLocalOrcamentos(previousOrcamentos);
        toast.error('Erro ao excluir orçamento. Verifique se há outras dependências ativas.');
      }
    }
  };

  const handleOpenSendModal = (orcamento) => {
    setOrcamentoToSend(orcamento);
    setSendModalOpen(true);
  };

  const handleSendEmail = async (orcamento, lead) => {
    try {
      if (orcamento.leadId !== lead.id) {
        await pb.collection('orcamentos').update(orcamento.id, { leadId: lead.id }, { $autoCancel: false });
      }
      
      await pb.collection('orcamentos').update(orcamento.id, { emailSent: true }, { $autoCancel: false });
      
      invalidate();
      refetch();
      toast.success(`Email enviado para ${lead.email}`);
    } catch (error) {
      if (error.name !== 'AbortError') {
        toast.error('Erro ao enviar email');
      }
    }
  };

  const handleOpenPublicLink = async (orcamento) => {
    let token = orcamento.shareToken;
    if (!token) {
      token = crypto.randomUUID();
      try {
        await pb.collection('orcamentos').update(orcamento.id, { shareToken: token }, { $autoCancel: false });
        invalidate();
        refetch();
      } catch (err) {
        if (err.name !== 'AbortError') {
          toast.error('Erro ao gerar link público');
        }
        return;
      }
    }
    window.open(`/orcamentos/public/${orcamento.id}?token=${token}`, '_blank');
  };

  if (isLoading && localOrcamentos.length === 0) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <div className="flex justify-between mb-6">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Orçamentos - Frame Pro</title>
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64 h-full">
          <Header />
          <main className="flex-1 flex flex-col overflow-hidden bg-muted/30 p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <h1 className="text-3xl font-bold">Orçamentos</h1>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Buscar orçamentos..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 bg-background"
                  />
                </div>
                <Button onClick={handleCreate} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Novo Orçamento
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto pb-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {localOrcamentos.map(orcamento => (
                  <div key={orcamento.id} className="h-full relative group">
                    <OrçamentoCard 
                      orcamento={orcamento}
                      opportunities={opportunities}
                      onDuplicate={handleDuplicate}
                      onDelete={handleDelete}
                      onOpenSendModal={handleOpenSendModal}
                      onEdit={(id) => navigate(`/orcamentos/editar/${id}`)}
                      onAnalytics={(id) => navigate(`/orcamentos/analytics/${id}`)}
                    />
                    <Button 
                      variant="secondary" 
                      size="sm" 
                      className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleOpenPublicLink(orcamento)}
                      title="Abrir link público"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {localOrcamentos.length === 0 && (
                  <div className="col-span-full text-center p-12 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                    {debouncedSearch ? 'Nenhum orçamento encontrado para esta busca.' : 'Você ainda não possui orçamentos. Crie o seu primeiro!'}
                  </div>
                )}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-4 mt-8">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                  </Button>
                  <span className="text-sm text-muted-foreground font-medium">Página {page} de {totalPages}</span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    Próxima <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      <Suspense fallback={null}>
        {sendModalOpen && (
          <SendToLeadModal 
            isOpen={sendModalOpen}
            onClose={() => setSendModalOpen(false)}
            orcamento={orcamentoToSend}
            pipelines={pipelines}
            columns={columns}
            opportunities={opportunities}
            onSend={handleSendEmail}
          />
        )}
      </Suspense>
    </>
  );
});

const OrçamentosPage = () => (
  <ErrorBoundaryWithCleanup>
    <OrçamentosPageContent />
  </ErrorBoundaryWithCleanup>
);

export default OrçamentosPage;
