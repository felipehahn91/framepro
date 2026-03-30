
import React, { useState, useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useCache } from '@/hooks/useCache';
import { subscriptionManager } from '@/lib/SubscriptionManager';
import pb from '@/lib/pocketbaseClient';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import Sidebar from '@/components/Sidebar.jsx';
import Header from '@/components/Header.jsx';
import { Plus, Edit2, Trash2, CheckSquare, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

const TarefasPage = React.memo(() => {
  const { currentUser } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    status: 'Pendente',
    priority: 'Média',
    dueDate: '',
  });

  useEffect(() => {
    return () => {
      subscriptionManager.unsubscribeAll();
    };
  }, []);

  const { data, isLoading, refetch, invalidate } = useCache(`tasks_list_${page}_${statusFilter}_${priorityFilter}`, () => {
    let filter = `userId = "${currentUser.id}"`;
    if (statusFilter !== 'all') filter += ` && status = "${statusFilter}"`;
    if (priorityFilter !== 'all') filter += ` && priority = "${priorityFilter}"`;
    
    return pb.collection('tasks').getList(page, limit, {
      filter,
      sort: '-created',
      $autoCancel: false
    });
  }, { dependencies: [currentUser?.id, page, statusFilter, priorityFilter] });

  const tasks = useMemo(() => data?.items || [], [data?.items]);
  const totalPages = data?.totalPages || 1;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.title) {
      toast.error('Título é obrigatório');
      return;
    }

    try {
      if (editingTask) {
        await pb.collection('tasks').update(editingTask.id, formData, { $autoCancel: false });
        toast.success('Tarefa atualizada');
      } else {
        await pb.collection('tasks').create({
          ...formData,
          userId: currentUser.id,
        }, { $autoCancel: false });
        toast.success('Tarefa criada');
      }

      invalidate();
      refetch();
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error('Erro ao salvar tarefa');
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) return;

    try {
      await pb.collection('tasks').delete(id, { $autoCancel: false });
      toast.success('Tarefa excluída');
      invalidate();
      refetch();
    } catch (error) {
      toast.error('Erro ao excluir tarefa');
    }
  };

  const handleMarkComplete = async (task) => {
    try {
      await pb.collection('tasks').update(task.id, {
        status: 'Concluída',
      }, { $autoCancel: false });
      invalidate();
      refetch();
      toast.success('Tarefa concluída');
    } catch (error) {
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const resetForm = () => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      status: 'Pendente',
      priority: 'Média',
      dueDate: '',
    });
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Alta': return 'text-destructive';
      case 'Média': return 'text-primary';
      case 'Baixa': return 'text-muted-foreground';
      default: return '';
    }
  };

  if (isLoading && tasks.length === 0) {
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
        <title>Tarefas - Frame Pro</title>
        <meta name="description" content="Gerencie suas tarefas" />
      </Helmet>

      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold mb-2">Tarefas</h1>
                  <p className="text-muted-foreground">Organize suas atividades</p>
                </div>
                <Dialog open={dialogOpen} onOpenChange={(open) => {
                  setDialogOpen(open);
                  if (!open) resetForm();
                }}>
                  <DialogTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      <Plus className="mr-2 h-4 w-4" />
                      Nova tarefa
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{editingTask ? 'Editar tarefa' : 'Nova tarefa'}</DialogTitle>
                      <DialogDescription>
                        {editingTask ? 'Atualize as informações da tarefa' : 'Adicione uma nova tarefa'}
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Título *</Label>
                        <Input
                          id="title"
                          value={formData.title}
                          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                          required
                          className="text-foreground"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Descrição</Label>
                        <Textarea
                          id="description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={3}
                          className="text-foreground"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="status">Status</Label>
                          <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Pendente">Pendente</SelectItem>
                              <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                              <SelectItem value="Concluída">Concluída</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="priority">Prioridade</Label>
                          <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Alta">Alta</SelectItem>
                              <SelectItem value="Média">Média</SelectItem>
                              <SelectItem value="Baixa">Baixa</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="dueDate">Data de vencimento</Label>
                        <Input
                          id="dueDate"
                          type="date"
                          value={formData.dueDate}
                          onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                          className="text-foreground"
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancelar
                        </Button>
                        <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                          {editingTask ? 'Atualizar' : 'Criar'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <Card>
                <CardContent className="p-4">
                  <div className="flex gap-4 mb-4">
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
                        <SelectTrigger className="w-40">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="Pendente">Pendente</SelectItem>
                          <SelectItem value="Em Progresso">Em Progresso</SelectItem>
                          <SelectItem value="Concluída">Concluída</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Select value={priorityFilter} onValueChange={(v) => { setPriorityFilter(v); setPage(1); }}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas</SelectItem>
                        <SelectItem value="Alta">Alta</SelectItem>
                        <SelectItem value="Média">Média</SelectItem>
                        <SelectItem value="Baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {tasks && tasks.length > 0 ? (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Título</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Prioridade</TableHead>
                            <TableHead>Vencimento</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {tasks.map((task) => (
                            <TableRow key={task?.id}>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{task?.title || 'Sem título'}</p>
                                  {task?.description && (
                                    <p className="text-sm text-muted-foreground line-clamp-1">
                                      {task.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>
                                <span className="inline-block px-2 py-1 text-xs rounded bg-muted">
                                  {task?.status || 'Sem status'}
                                </span>
                              </TableCell>
                              <TableCell>
                                <span className={`font-medium ${getPriorityColor(task?.priority)}`}>
                                  {task?.priority || 'Sem prioridade'}
                                </span>
                              </TableCell>
                              <TableCell>
                                {task?.dueDate ? new Date(task.dueDate).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {task?.status !== 'Concluída' && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleMarkComplete(task)}
                                      title="Marcar como concluída"
                                    >
                                      <CheckSquare className="h-4 w-4" />
                                    </Button>
                                  )}
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEdit(task)}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDelete(task?.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
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
                      <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhuma tarefa encontrada</h3>
                      <p className="text-muted-foreground">
                        {statusFilter !== 'all' || priorityFilter !== 'all'
                          ? 'Tente ajustar os filtros'
                          : 'Comece criando sua primeira tarefa'}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div>
    </>
  );
});

export default TarefasPage;
