
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useCache } from '@/hooks/useCache';
import { useSubscription } from '@/hooks/useSubscription';
import { subscriptionManager } from '@/lib/SubscriptionManager';
import ErrorBoundaryWithCleanup from '@/components/ErrorBoundaryWithCleanup';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Plus, Edit2, Trash2, Users, Target, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const ClientesPageContent = React.memo(() => {
  const { currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', company: '' });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const [localClients, setLocalClients] = useState([]);
  
  // Pagination & Search
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const limit = 20;

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    return () => {
      subscriptionManager.unsubscribeAll();
    };
  }, []);

  const { data, isLoading, refetch, invalidate } = useCache(`clients_list_${page}_${debouncedSearch}`, async () => {
    let filter = `userId = "${currentUser.id}"`;
    if (debouncedSearch) {
      filter += ` && (name ~ "${debouncedSearch}" || email ~ "${debouncedSearch}" || company ~ "${debouncedSearch}")`;
    }

    const [clientsData, oppsData] = await Promise.all([
      pb.collection('clients').getList(page, limit, { filter, sort: '-created', $autoCancel: false }),
      pb.collection('opportunities').getFullList({ filter: `userId = "${currentUser.id}" && isClient = true`, $autoCancel: false })
    ]);
    return { clientsData, oppsData };
  }, { dependencies: [currentUser?.id, page, debouncedSearch] });

  useEffect(() => {
    if (data?.clientsData?.items) {
      setLocalClients(data.clientsData.items);
    }
  }, [data?.clientsData]);

  // Real-time updates
  useSubscription('clientes_page', 'clients', `userId="${currentUser?.id}"`, () => {
    refetch();
  }, [currentUser?.id, page, debouncedSearch]);

  const opportunities = useMemo(() => data?.oppsData || [], [data?.oppsData]);
  const totalPages = data?.clientsData?.totalPages || 1;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name) { toast.error('Nome é obrigatório'); return; }
    setIsSubmitting(true);

    try {
      if (editingClient) {
        setLocalClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...formData } : c));
        await pb.collection('clients').update(editingClient.id, formData, { $autoCancel: false });
        toast.success('Cliente atualizado');
      } else {
        const tempId = 'temp_' + Date.now();
        const newClient = { id: tempId, ...formData, created: new Date().toISOString(), userId: currentUser.id };
        setLocalClients(prev => [newClient, ...prev]);
        await pb.collection('clients').create({ ...formData, userId: currentUser.id }, { $autoCancel: false });
        toast.success('Cliente criado');
      }
      invalidate();
      refetch();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar cliente');
      refetch();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (client) => {
    setEditingClient(client);
    setFormData({ name: client.name, email: client.email || '', phone: client.phone || '', company: client.company || '' });
    setDialogOpen(true);
  };

  const handleDeleteClick = (client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!clientToDelete) return;
    const clientId = clientToDelete.id;
    
    setIsDeleting(true);
    setLocalClients(prev => prev.filter(c => c.id !== clientId));
    setDeleteModalOpen(false);
    setClientToDelete(null);

    try {
      const relatedOpps = await pb.collection('opportunities').getFullList({ filter: `clientIdRelation="${clientId}" || clientId="${clientId}"`, $autoCancel: false });
      for (const opp of relatedOpps) {
        await pb.collection('opportunities').update(opp.id, { clientId: null, clientIdRelation: null, isClient: false }, { $autoCancel: false });
      }

      const contractsList = await pb.collection('contracts').getList(1, 500, { filter: `clientId="${clientId}"`, $autoCancel: false });
      for (const contract of contractsList.items) {
        await pb.collection('contracts').update(contract.id, { clientId: null }, { $autoCancel: false });
      }

      await pb.collection('clients').delete(clientId, { $autoCancel: false });
      toast.success(`Cliente deletado com sucesso.`);
      invalidate();
      refetch();
    } catch (error) {
      toast.error(error.message || 'Erro ao deletar cliente');
      refetch();
    } finally {
      setIsDeleting(false);
    }
  };

  const resetForm = () => {
    setEditingClient(null);
    setFormData({ name: '', email: '', phone: '', company: '' });
  };

  const isFromOpportunity = (clientId) => {
    return opportunities.some(opp => opp.clientIdRelation === clientId || opp.clientId === clientId);
  };

  if (isLoading && localClients.length === 0) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <Skeleton className="h-96 w-full" />
          </main>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>Clientes - Frame Pro</title>
      </Helmet>

      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Clientes</h1>
                  <p className="text-muted-foreground">Gerencie sua base de clientes</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Buscar clientes..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 bg-background"
                    />
                  </div>
                  <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                    <DialogTrigger asChild>
                      <Button className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                        <Plus className="mr-2 h-4 w-4" /> Novo cliente
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{editingClient ? 'Editar cliente' : 'Novo cliente'}</DialogTitle>
                        <DialogDescription>{editingClient ? 'Atualize as informações do cliente' : 'Adicione um novo cliente'}</DialogDescription>
                      </DialogHeader>
                      <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome *</Label>
                          <Input id="name" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input id="email" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input id="phone" value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="company">Empresa</Label>
                          <Input id="company" value={formData.company} onChange={(e) => setFormData({ ...formData, company: e.target.value })} />
                        </div>
                        <div className="flex justify-end gap-2">
                          <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                          <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" disabled={isSubmitting}>
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                            {editingClient ? 'Atualizar' : 'Criar'}
                          </Button>
                        </div>
                      </form>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              <Card>
                <CardContent className="p-0">
                  {localClients.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Origem</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Cadastro</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {localClients.map((client) => (
                            <TableRow key={client.id}>
                              <TableCell className="font-medium">{client.name}</TableCell>
                              <TableCell>
                                {isFromOpportunity(client.id) ? (
                                  <Badge variant="secondary" className="bg-orange-500/10 text-orange-500 hover:bg-orange-500/20 border-orange-500/20">
                                    <Target className="w-3 h-3 mr-1" /> Oportunidade
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary" className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20 border-gray-500/20">
                                    Manual
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>{client.email || '-'}</TableCell>
                              <TableCell>{client.phone || '-'}</TableCell>
                              <TableCell>{client.company || '-'}</TableCell>
                              <TableCell>{new Date(client.created).toLocaleDateString('pt-BR')}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button variant="ghost" size="icon" onClick={() => handleEdit(client)}><Edit2 className="h-4 w-4" /></Button>
                                  <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(client)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 p-4 border-t border-border/50">
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                            <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
                          </Button>
                          <span className="text-sm text-muted-foreground font-medium">Página {page} de {totalPages}</span>
                          <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                            Próxima <ChevronRight className="w-4 h-4 ml-1" />
                          </Button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-12 text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum cliente encontrado</h3>
                      <p className="text-muted-foreground mb-4">{debouncedSearch ? 'Tente ajustar sua busca' : 'Comece adicionando seu primeiro cliente'}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>

      <Dialog open={deleteModalOpen} onOpenChange={setDeleteModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Deletar Cliente</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja deletar o cliente <strong>{clientToDelete?.name}</strong> permanentemente?
              <br /><br />
              Esta ação não pode ser desfeita. O cliente será removido do sistema e desvinculado de todas as oportunidades e contratos.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)} disabled={isDeleting}>Cancelar</Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={isDeleting}>
              {isDeleting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />} Deletar Cliente
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});

const ClientesPage = () => (
  <ErrorBoundaryWithCleanup>
    <ClientesPageContent />
  </ErrorBoundaryWithCleanup>
);

export default ClientesPage;
