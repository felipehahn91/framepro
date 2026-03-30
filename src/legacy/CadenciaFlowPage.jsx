
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import ErrorBoundaryWithCleanup from '@/components/ErrorBoundaryWithCleanup';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Plus, Trash2, Save, MessageCircle, MoreVertical, Copy, Edit2, Search, User } from 'lucide-react';
import { toast } from 'sonner';

const CadenciaFlowPageContent = () => {
  const { currentUser } = useAuth();
  const isMounted = useRef(true);
  
  const [flows, setFlows] = useState([]);
  const [activeFlowId, setActiveFlowId] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [isNewFlowOpen, setIsNewFlowOpen] = useState(false);
  const [newFlowName, setNewFlowName] = useState('');
  const [isEditFlowOpen, setIsEditFlowOpen] = useState(false);
  const [editFlowName, setEditFlowName] = useState('');
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const [isWaDialogOpen, setIsWaDialogOpen] = useState(false);
  const [waMessageContent, setWaMessageContent] = useState('');
  const [opportunities, setOpportunities] = useState([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [searchLead, setSearchLead] = useState('');
  const [debouncedSearchLead, setDebouncedSearchLead] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearchLead(searchLead), 300);
    return () => clearTimeout(timer);
  }, [searchLead]);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  const fetchFlows = async () => {
    try {
      const records = await pb.collection('cadencia_flows').getFullList({
        filter: `userId = "${currentUser.id}"`,
        sort: 'created',
        $autoCancel: false
      });

      if (!isMounted.current) return;

      if (records.length > 0) {
        setFlows(records);
        if (!activeFlowId) {
          setActiveFlowId(records[0].id);
          setMessages(records[0].messages || []);
        }
      } else {
        await createDefaultFlow();
      }
    } catch (error) {
      if (error.name !== 'AbortError' && isMounted.current) toast.error('Erro ao carregar fluxos de cadência');
    } finally {
      if (isMounted.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (currentUser) fetchFlows();
  }, [currentUser]);

  // Real-time updates
  useSubscription('cadencia_flows', 'cadencia_flows', `userId="${currentUser?.id}"`, () => {
    fetchFlows();
  }, [currentUser?.id]);

  const createDefaultFlow = async () => {
    const defaultMessages = [
      { id: '1', order: 1, delay: 1, content: 'Olá! Gostaria de saber mais sobre nossos serviços?' },
      { id: '2', order: 2, delay: 3, content: 'Ainda tem interesse em conversar?' },
      { id: '3', order: 3, delay: 7, content: 'Temos uma oferta especial para você!' },
    ];
    try {
      const newFlow = await pb.collection('cadencia_flows').create({
        name: 'Follow Up', description: 'Fluxo padrão de acompanhamento', messageCount: 3, messages: defaultMessages, userId: currentUser.id
      }, { $autoCancel: false });
      if (isMounted.current) {
        setFlows([newFlow]);
        setActiveFlowId(newFlow.id);
        setMessages(defaultMessages);
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao criar fluxo padrão');
    }
  };

  const handleFlowChange = (id) => {
    setActiveFlowId(id);
    const selected = flows.find(f => f.id === id);
    setMessages(selected?.messages || []);
  };

  const handleCreateFlow = async () => {
    if (!newFlowName.trim()) { toast.error('O nome do fluxo é obrigatório'); return; }
    try {
      const newFlow = await pb.collection('cadencia_flows').create({
        name: newFlowName, messageCount: 0, messages: [], userId: currentUser.id
      }, { $autoCancel: false });
      if (isMounted.current) {
        setFlows([...flows, newFlow]);
        setActiveFlowId(newFlow.id);
        setMessages([]);
        setIsNewFlowOpen(false);
        setNewFlowName('');
        toast.success('Fluxo criado com sucesso');
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao criar fluxo');
    }
  };

  const handleEditFlow = async () => {
    if (!editFlowName.trim()) { toast.error('O nome do fluxo é obrigatório'); return; }
    try {
      const updatedFlow = await pb.collection('cadencia_flows').update(activeFlowId, { name: editFlowName }, { $autoCancel: false });
      if (isMounted.current) {
        setFlows(flows.map(f => f.id === activeFlowId ? updatedFlow : f));
        setIsEditFlowOpen(false);
        toast.success('Nome do fluxo atualizado');
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao atualizar fluxo');
    }
  };

  const handleDuplicateFlow = async () => {
    const currentFlow = flows.find(f => f.id === activeFlowId);
    if (!currentFlow) return;
    try {
      const newFlow = await pb.collection('cadencia_flows').create({
        name: `${currentFlow.name} (Cópia)`, description: currentFlow.description, messageCount: currentFlow.messageCount, messages: currentFlow.messages, userId: currentUser.id
      }, { $autoCancel: false });
      if (isMounted.current) {
        setFlows([...flows, newFlow]);
        setActiveFlowId(newFlow.id);
        setMessages(newFlow.messages || []);
        toast.success('Fluxo duplicado com sucesso');
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao duplicar fluxo');
    }
  };

  const handleDeleteFlow = async () => {
    try {
      await pb.collection('cadencia_flows').delete(activeFlowId, { $autoCancel: false });
      if (isMounted.current) {
        const remainingFlows = flows.filter(f => f.id !== activeFlowId);
        if (remainingFlows.length > 0) {
          setFlows(remainingFlows);
          setActiveFlowId(remainingFlows[0].id);
          setMessages(remainingFlows[0].messages || []);
        } else {
          await createDefaultFlow();
        }
        setIsDeleteDialogOpen(false);
        toast.success('Fluxo deletado com sucesso');
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao deletar fluxo');
    }
  };

  const handleAddMessage = () => {
    const newDelay = messages.length > 0 ? messages[messages.length - 1].delay + 5 : 1;
    setMessages([...messages, { id: Date.now().toString(), order: messages.length + 1, delay: newDelay, content: '' }]);
  };

  const handleRemoveMessage = (id) => {
    setMessages(messages.filter(m => m.id !== id).map((m, i) => ({ ...m, order: i + 1 })));
  };

  const handleMessageChange = (id, field, value) => {
    setMessages(messages.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleSaveMessages = async () => {
    if (messages.some(m => !m.content.trim())) { toast.error('Todas as mensagens devem ter conteúdo'); return; }
    setSaving(true);
    try {
      const updatedFlow = await pb.collection('cadencia_flows').update(activeFlowId, { messageCount: messages.length, messages: messages }, { $autoCancel: false });
      if (isMounted.current) {
        setFlows(flows.map(f => f.id === activeFlowId ? updatedFlow : f));
        toast.success('Fluxo salvo com sucesso!');
      }
    } catch (error) {
      if (isMounted.current) toast.error('Erro ao salvar fluxo');
    } finally {
      if (isMounted.current) setSaving(false);
    }
  };

  const openWaDialog = async (content) => {
    if (!content.trim()) { toast.error('A mensagem está vazia'); return; }
    setWaMessageContent(content);
    setIsWaDialogOpen(true);
    
    if (opportunities.length === 0) {
      setLoadingOpps(true);
      try {
        const opps = await pb.collection('opportunities').getFullList({
          filter: `userId = "${currentUser.id}"`, expand: 'pipelineId,columnId', sort: '-created', $autoCancel: false
        });
        if (isMounted.current) setOpportunities(opps);
      } catch (error) {
        if (error.name !== 'AbortError' && isMounted.current) toast.error('Erro ao carregar leads');
      } finally {
        if (isMounted.current) setLoadingOpps(false);
      }
    }
  };

  const handleSendWa = (lead) => {
    const phone = lead.whatsapp || lead.phone;
    if (!phone) { toast.error('Este lead não possui número de telefone cadastrado'); return; }
    const cleanPhone = phone.replace(/\D/g, '');
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessageContent)}`, '_blank');
    toast.success('WhatsApp aberto com sucesso!');
    setIsWaDialogOpen(false);
  };

  const filteredOpps = useMemo(() => {
    return opportunities.filter(opp => 
      opp.name.toLowerCase().includes(debouncedSearchLead.toLowerCase()) ||
      (opp.email && opp.email.toLowerCase().includes(debouncedSearchLead.toLowerCase())) ||
      (opp.whatsapp && opp.whatsapp.includes(debouncedSearchLead))
    );
  }, [opportunities, debouncedSearchLead]);

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-48 mb-6" />
            <div className="space-y-6">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full max-w-3xl" />)}
            </div>
          </main>
        </div>
      </div>
    );
  }

  const activeFlow = flows.find(f => f.id === activeFlowId);

  return (
    <>
      <Helmet>
        <title>Fluxos de Cadência - Frame Pro</title>
      </Helmet>

      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-4xl mx-auto space-y-8">
              <div className="flex flex-col md:flex-row md:items-center justify-between bg-card p-6 rounded-2xl shadow-sm border border-border gap-4">
                <div className="flex-1">
                  <h1 className="text-3xl font-bold mb-2 text-foreground">Fluxos de Cadência</h1>
                  <p className="text-muted-foreground text-sm">Configure sequências de mensagens automáticas para seus leads.</p>
                  <div className="flex items-center gap-3 mt-4">
                    <Select value={activeFlowId} onValueChange={handleFlowChange}>
                      <SelectTrigger className="w-[250px] bg-background"><SelectValue placeholder="Selecione um fluxo" /></SelectTrigger>
                      <SelectContent>
                        {flows.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="icon"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => { setEditFlowName(activeFlow?.name || ''); setIsEditFlowOpen(true); }}><Edit2 className="h-4 w-4 mr-2" /> Editar Nome</DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDuplicateFlow}><Copy className="h-4 w-4 mr-2" /> Duplicar Fluxo</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setIsDeleteDialogOpen(true)}><Trash2 className="h-4 w-4 mr-2" /> Deletar Fluxo</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="secondary" onClick={() => setIsNewFlowOpen(true)}><Plus className="h-4 w-4 mr-2" /> Novo Fluxo</Button>
                  </div>
                </div>
                <Button onClick={handleSaveMessages} disabled={saving} className="bg-[#FF8C00] hover:bg-[#FF8C00]/90 text-white px-6 shrink-0">
                  <Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>

              <div className="relative pl-6 md:pl-12 py-4">
                <div className="absolute left-[27px] md:left-[51px] top-8 bottom-8 w-0.5 bg-border" />
                <div className="space-y-8">
                  {messages.map((msg, index) => (
                    <div key={msg.id} className="relative flex items-start gap-6">
                      <div className="absolute -left-6 md:-left-12 w-10 h-10 rounded-full bg-[#FF8C00] text-white flex items-center justify-center font-bold text-lg shadow-md z-10 ring-4 ring-background">{index + 1}</div>
                      <Card className="flex-1 shadow-sm hover:shadow-md transition-shadow border-muted-foreground/20">
                        <CardContent className="p-5">
                          <div className="flex flex-col md:flex-row md:items-start gap-4">
                            <div className="flex-1 space-y-4">
                              <div className="flex items-center gap-3">
                                <Label className="text-base font-semibold whitespace-nowrap">Enviar após</Label>
                                <Input type="number" min="0" className="w-24 text-center font-medium" value={msg.delay} onChange={(e) => handleMessageChange(msg.id, 'delay', parseInt(e.target.value) || 0)} />
                                <Label className="text-base text-muted-foreground">dias</Label>
                              </div>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between mb-1">
                                  <div className="flex items-center gap-2 text-[#25D366] font-medium text-sm"><MessageCircle className="h-4 w-4" /> Mensagem do WhatsApp</div>
                                </div>
                                <Textarea value={msg.content} onChange={(e) => handleMessageChange(msg.id, 'content', e.target.value)} placeholder="Digite a mensagem que será enviada..." rows={3} className="resize-none bg-muted/30 focus:bg-background transition-colors" />
                              </div>
                            </div>
                            <div className="flex flex-col gap-2 shrink-0">
                              <Button type="button" variant="outline" size="icon" className="border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10 hover:text-[#25D366]" onClick={() => openWaDialog(msg.content)} title="Enviar para um Lead"><MessageCircle className="h-5 w-5" /></Button>
                              <Button type="button" variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleRemoveMessage(msg.id)} title="Remover etapa"><Trash2 className="h-5 w-5" /></Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
                <div className="mt-8 ml-4 md:ml-2">
                  <Button variant="outline" onClick={handleAddMessage} className="border-dashed border-2 border-muted-foreground/30 text-muted-foreground hover:text-foreground hover:border-foreground/50 bg-transparent"><Plus className="mr-2 h-4 w-4" /> Adicionar Nova Etapa</Button>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>

      <Dialog open={isNewFlowOpen} onOpenChange={setIsNewFlowOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Criar Novo Fluxo</DialogTitle><DialogDescription>Dê um nome para sua nova cadência de mensagens.</DialogDescription></DialogHeader>
          <div className="py-4"><Label htmlFor="newFlowName">Nome do Fluxo</Label><Input id="newFlowName" value={newFlowName} onChange={(e) => setNewFlowName(e.target.value)} placeholder="Ex: Follow Up, Contorno de Objeção" className="mt-2" autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => setIsNewFlowOpen(false)}>Cancelar</Button><Button onClick={handleCreateFlow}>Criar Fluxo</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditFlowOpen} onOpenChange={setIsEditFlowOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Editar Nome do Fluxo</DialogTitle></DialogHeader>
          <div className="py-4"><Label htmlFor="editFlowName">Nome do Fluxo</Label><Input id="editFlowName" value={editFlowName} onChange={(e) => setEditFlowName(e.target.value)} className="mt-2" autoFocus /></div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditFlowOpen(false)}>Cancelar</Button><Button onClick={handleEditFlow}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Deletar Fluxo</DialogTitle><DialogDescription>Tem certeza que deseja deletar o fluxo <strong>{activeFlow?.name}</strong>? Esta ação não pode ser desfeita.</DialogDescription></DialogHeader>
          <DialogFooter className="mt-4"><Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>Cancelar</Button><Button variant="destructive" onClick={handleDeleteFlow}>Deletar</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWaDialogOpen} onOpenChange={setIsWaDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-[#25D366]" /> Selecionar Lead para Enviar Mensagem</DialogTitle><DialogDescription>Escolha um lead da sua base para enviar a mensagem desta etapa.</DialogDescription></DialogHeader>
          <div className="relative mt-2 mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome, email ou telefone..." value={searchLead} onChange={(e) => setSearchLead(e.target.value)} className="pl-9" />
          </div>
          <ScrollArea className="flex-1 -mx-6 px-6">
            {loadingOpps ? (
              <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
            ) : filteredOpps.length > 0 ? (
              <div className="space-y-2 pb-4">
                {filteredOpps.map(opp => {
                  const hasPhone = !!(opp.whatsapp || opp.phone);
                  return (
                    <div key={opp.id} className={`flex items-center justify-between p-3 rounded-lg border ${hasPhone ? 'bg-card hover:bg-muted/50 cursor-pointer border-border' : 'bg-muted/30 border-transparent opacity-60 cursor-not-allowed'}`} onClick={() => hasPhone && handleSendWa(opp)}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-5 w-5 text-primary" /></div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{opp.name}</p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                            {opp.expand?.pipelineId?.name && <span className="bg-muted px-1.5 py-0.5 rounded truncate max-w-[100px]">{opp.expand.pipelineId.name}</span>}
                            <span className="truncate">{opp.whatsapp || opp.phone || 'Sem telefone'}</span>
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant={hasPhone ? "default" : "secondary"} className={hasPhone ? "bg-[#25D366] hover:bg-[#25D366]/90 text-white shrink-0" : "shrink-0"} disabled={!hasPhone}>Enviar</Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground"><p>Nenhum lead encontrado.</p></div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};

const CadenciaFlowPage = () => (
  <ErrorBoundaryWithCleanup>
    <CadenciaFlowPageContent />
  </ErrorBoundaryWithCleanup>
);

export default CadenciaFlowPage;
