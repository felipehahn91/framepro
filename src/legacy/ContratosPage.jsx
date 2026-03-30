
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCache } from '@/hooks/useCache';
import { subscriptionManager } from '@/lib/SubscriptionManager';
import pb from '@/lib/pocketbaseClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import ContractCard from '@/components/ContractCard';
import ErrorFallback from '@/components/ErrorFallback';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Plus, FileText, ChevronLeft, ChevronRight, Search, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { useContractNotifications } from '@/hooks/useContractNotifications';

const ContratosPage = React.memo(() => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 20;

  useContractNotifications();

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      subscriptionManager.unsubscribeAll();
    };
  }, []);

  const { data, isLoading, error, refetch, invalidate } = useCache(`contracts_list_${page}_${debouncedSearch}`, async () => {
    let filter = `userId = "${currentUser.id}"`;
    if (debouncedSearch) {
      filter += ` && (clientId.name ~ "${debouncedSearch}" || description ~ "${debouncedSearch}")`;
    }
    return await pb.collection('contracts').getList(page, limit, {
      filter,
      sort: '-created',
      expand: 'clientId',
      $autoCancel: false
    });
  }, { dependencies: [currentUser?.id, page, debouncedSearch] });

  const contracts = useMemo(() => data?.items || [], [data?.items]);
  const totalPages = data?.totalPages || 1;

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este contrato? Esta ação não pode ser desfeita.')) return;

    try {
      await pb.collection('contracts').delete(id, { $autoCancel: false });
      toast.success('Contrato excluído com sucesso');
      invalidate();
      
      if (contracts.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        refetch();
      }
    } catch (err) {
      toast.error('Erro ao excluir contrato');
    }
  };

  const handleOpenPublicLink = async (contract) => {
    let token = contract.shareToken;
    if (!token) {
      token = crypto.randomUUID();
      try {
        await pb.collection('contracts').update(contract.id, { shareToken: token }, { $autoCancel: false });
        invalidate();
        refetch();
      } catch (err) {
        toast.error('Erro ao gerar link público');
        return;
      }
    }
    window.open(`/contracts/public/${contract.id}?token=${token}`, '_blank');
  };

  if (isLoading && contracts.length === 0) {
    return (
      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
            <div className="flex justify-between mb-8">
              <Skeleton className="h-10 w-48" />
              <Skeleton className="h-10 w-32" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Contratos - Frame Pro</title>
        <meta name="description" content="Gerencie seus contratos" />
      </Helmet>

      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Contratos</h1>
                  <p className="text-muted-foreground mt-1">Crie, envie e gerencie assinaturas de contratos.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar contratos..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-background"
                    />
                  </div>
                  <Button onClick={() => navigate('/contracts/new')} className="shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Contrato
                  </Button>
                </div>
              </div>

              {error ? (
                <ErrorFallback message={error.message || 'Erro ao carregar contratos'} onRetry={refetch} />
              ) : contracts.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {contracts.map((contract) => (
                      <div key={contract.id} className="relative group">
                        <ContractCard 
                          contract={contract} 
                          onDelete={handleDelete}
                        />
                        <Button 
                          variant="secondary" 
                          size="sm" 
                          className="absolute top-4 right-12 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleOpenPublicLink(contract)}
                          title="Abrir link público"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 mt-8">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(page - 1)} 
                        disabled={page === 1}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                      </Button>
                      <span className="text-sm text-muted-foreground font-medium">
                        Página {page} de {totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setPage(page + 1)} 
                        disabled={page === totalPages}
                      >
                        Próxima <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-24 px-4 text-center bg-card rounded-2xl border border-border/50 shadow-sm">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Nenhum contrato encontrado</h3>
                  <p className="text-muted-foreground max-w-md mb-6">
                    {debouncedSearch ? 'Tente ajustar sua busca.' : 'Você ainda não possui contratos. Crie seu primeiro documento para enviar aos clientes e coletar assinaturas digitais.'}
                  </p>
                  {!debouncedSearch && (
                    <Button onClick={() => navigate('/contracts/new')} className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Criar Primeiro Contrato
                    </Button>
                  )}
                </div>
              )}

            </div>
          </main>
        </div>
      </div>
    </>
  );
});

export default ContratosPage;
