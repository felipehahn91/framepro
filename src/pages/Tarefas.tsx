import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, Edit2, Trash2, Filter, Loader2, X, CheckSquare, 
  Calendar as CalendarIcon, AlertCircle, CheckCircle2, Circle, ArrowUpDown
} from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  user_id: string;
}

export default function Tarefas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Filtros e Ordenação
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");

  // Modais
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "Pendente",
    priority: "Média",
    due_date: ""
  });

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) {
        if (error.code === '42P01') {
          console.warn("Tabela 'tasks' não existe. Ela será criada ao inserir a primeira tarefa se as políticas permitirem, ou precisa ser criada no banco.");
          setTasks([]);
        } else {
          throw error;
        }
      } else {
        setTasks(data || []);
      }
    } catch (error) {
      console.error(error);
      toast.error("Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedTasks = useMemo(() => {
    // 1. Filtrar
    let result = tasks.filter(task => {
      const matchStatus = statusFilter === "all" || task.status === statusFilter;
      const matchPriority = priorityFilter === "all" || task.priority === priorityFilter;
      return matchStatus && matchPriority;
    });

    // 2. Ordenar
    result.sort((a, b) => {
      if (sortBy === 'created_desc') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      }
      
      if (sortBy === 'date_asc' || sortBy === 'date_desc') {
        // Tarefas sem data ficam por último sempre
        if (!a.due_date && !b.due_date) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        
        const dateA = new Date(a.due_date).getTime();
        const dateB = new Date(b.due_date).getTime();
        
        if (dateA === dateB) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return sortBy === 'date_asc' ? dateA - dateB : dateB - dateA;
      }
      
      if (sortBy === 'priority_high') {
        const priorityWeight: Record<string, number> = { 'Alta': 3, 'Média': 2, 'Baixa': 1 };
        const wA = priorityWeight[a.priority] || 0;
        const wB = priorityWeight[b.priority] || 0;
        
        if (wA === wB) return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        return wB - wA; // Maior peso primeiro
      }
      
      return 0;
    });

    return result;
  }, [tasks, statusFilter, priorityFilter, sortBy]);

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "Pendente",
        priority: task.priority || "Média",
        due_date: task.due_date ? task.due_date.split('T')[0] : ""
      });
    } else {
      setSelectedTask(null);
      setFormData({
        title: "",
        description: "",
        status: "Pendente",
        priority: "Média",
        due_date: ""
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return toast.error("O título é obrigatório.");

    setIsSubmitting(true);
    try {
      const payload = {
        user_id: user?.id,
        title: formData.title,
        description: formData.description,
        status: formData.status,
        priority: formData.priority,
        due_date: formData.due_date || null
      };

      if (selectedTask) {
        const { data, error } = await supabase
          .from('tasks')
          .update(payload)
          .eq('id', selectedTask.id)
          .select()
          .single();

        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? data as Task : t));
        toast.success("Tarefa atualizada com sucesso!");
      } else {
        const { data, error } = await supabase
          .from('tasks')
          .insert(payload)
          .select()
          .single();

        if (error) throw error;
        setTasks(prev => [data as Task, ...prev]);
        toast.success("Tarefa criada com sucesso!");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar tarefa. Verifique se a tabela 'tasks' existe no banco de dados.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída';
    
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      const { error } = await supabase
        .from('tasks')
        .update({ status: newStatus })
        .eq('id', task.id);

      if (error) throw error;
      toast.success(newStatus === 'Concluída' ? "Tarefa concluída!" : "Tarefa reaberta.");
    } catch (error) {
      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: task.status } : t));
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleDeleteClick = (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedTask(task);
    setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('tasks').delete().eq('id', selectedTask.id);
      if (error) throw error;
      
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      toast.success("Tarefa excluída.");
      setIsDeleteModalOpen(false);
    } catch (error) {
      toast.error("Erro ao excluir tarefa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isOverdue = (dateString: string | null, status: string) => {
    if (!dateString || status === 'Concluída') return false;
    const dueDate = new Date(dateString);
    dueDate.setHours(23, 59, 59, 999);
    return dueDate < new Date();
  };

  const getPriorityStyles = (priority: string) => {
    switch (priority) {
      case 'Alta': return 'bg-red-50 text-red-600 border-red-200';
      case 'Média': return 'bg-orange-50 text-orange-600 border-orange-200';
      case 'Baixa': return 'bg-gray-50 text-gray-600 border-gray-200';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-full">
          <Loader2 className="w-8 h-8 animate-spin text-orange-400" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto flex flex-col h-full">
        
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Tarefas</h1>
            <p className="text-sm text-gray-500">Organize suas atividades e acompanhamentos</p>
          </div>
          <button 
            onClick={() => handleOpenModal()} 
            className="px-5 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" /> Nova tarefa
          </button>
        </div>

        {/* Main Card Container */}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm flex-1 flex flex-col">
          
          {/* Filters & Sorting Bar */}
          <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row gap-4 items-start sm:items-center bg-gray-50/50 rounded-t-xl justify-between">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2 text-gray-500">
                <Filter className="w-4 h-4" />
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-white border border-gray-200 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
                >
                  <option value="all">Todos os Status</option>
                  <option value="Pendente">Pendentes</option>
                  <option value="Em Progresso">Em Progresso</option>
                  <option value="Concluída">Concluídas</option>
                </select>
              </div>

              <select 
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="bg-white border border-gray-200 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                <option value="all">Todas Prioridades</option>
                <option value="Alta">Alta</option>
                <option value="Média">Média</option>
                <option value="Baixa">Baixa</option>
              </select>
            </div>

            {/* Ordering */}
            <div className="flex items-center gap-2 text-gray-500">
              <ArrowUpDown className="w-4 h-4" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-white border border-gray-200 rounded-md text-sm py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400 cursor-pointer"
              >
                <option value="created_desc">Mais recentes primeiro</option>
                <option value="date_asc">Vencimento (Mais próximo)</option>
                <option value="date_desc">Vencimento (Mais distante)</option>
                <option value="priority_high">Prioridade (Alta primeiro)</option>
              </select>
            </div>
          </div>

          {/* Task List */}
          <div className="flex-1 overflow-y-auto">
            {filteredAndSortedTasks.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {filteredAndSortedTasks.map((task) => {
                  const isCompleted = task.status === 'Concluída';
                  const overdue = isOverdue(task.due_date, task.status);

                  return (
                    <div 
                      key={task.id}
                      onClick={() => handleOpenModal(task)}
                      className={`group flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors cursor-pointer ${isCompleted ? 'opacity-60 bg-gray-50/50' : ''}`}
                    >
                      {/* Checkbox Toggle */}
                      <button 
                        onClick={(e) => handleToggleComplete(task, e)}
                        className={`mt-0.5 shrink-0 text-gray-300 hover:text-orange-400 transition-colors ${isCompleted ? 'text-green-500 hover:text-green-600' : ''}`}
                      >
                        {isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                      </button>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <h3 className={`font-semibold text-[15px] truncate ${isCompleted ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h3>
                          {!isCompleted && (
                            <span className={`px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide shrink-0 ${getPriorityStyles(task.priority)}`}>
                              {task.priority}
                            </span>
                          )}
                        </div>
                        
                        {task.description && (
                          <p className={`text-sm mb-2 line-clamp-2 ${isCompleted ? 'text-gray-400' : 'text-gray-600'}`}>
                            {task.description}
                          </p>
                        )}

                        {/* Meta info */}
                        <div className="flex items-center gap-4 mt-2">
                          {task.due_date && (
                            <div className={`flex items-center gap-1.5 text-xs font-medium ${overdue ? 'text-red-500 bg-red-50 px-2 py-1 rounded border border-red-100' : 'text-gray-500'}`}>
                              {overdue ? <AlertCircle className="w-3.5 h-3.5" /> : <CalendarIcon className="w-3.5 h-3.5" />}
                              {new Date(task.due_date).toLocaleDateString('pt-BR')}
                              {overdue && " (Atrasada)"}
                            </div>
                          )}
                          
                          {task.status === 'Em Progresso' && (
                            <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
                              Em Progresso
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(task); }}
                          className="p-2 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteClick(task, e)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 px-4 text-center">
                <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4 border border-gray-100 shadow-sm">
                  <CheckSquare className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhuma tarefa encontrada</h3>
                <p className="text-sm text-gray-500 max-w-sm">
                  {statusFilter !== "all" || priorityFilter !== "all" 
                    ? "Tente limpar os filtros para ver mais resultados." 
                    : "Comece criando sua primeira tarefa no botão acima para organizar seu dia."}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Criar/Editar Tarefa */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedTask ? 'Editar Tarefa' : 'Nova tarefa'}</h2>
                <p className="text-sm text-gray-500 mt-1">{selectedTask ? 'Atualize os detalhes da atividade.' : 'Adicione uma nova tarefa'}</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Título *</label>
                <input 
                  required autoFocus
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors"
                  placeholder="O que precisa ser feito?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição</label>
                <textarea 
                  rows={4}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-orange-400 transition-colors resize-none"
                  placeholder="Adicione mais detalhes..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em Progresso">Em Progresso</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Prioridade</label>
                  <select 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="Alta">Alta</option>
                    <option value="Média">Média</option>
                    <option value="Baixa">Baixa</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data de vencimento</label>
                <input 
                  type="date"
                  value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-5 py-2.5 text-gray-700 font-semibold border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-6 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 disabled:opacity-50 shadow-sm">
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {selectedTask ? 'Atualizar' : 'Criar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Deletar */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsDeleteModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 text-center animate-in zoom-in-95">
            <div className="w-12 h-12 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Excluir Tarefa?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Tem certeza que deseja excluir <strong>{selectedTask?.title}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} disabled={isSubmitting} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button onClick={confirmDelete} disabled={isSubmitting} className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center">
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}