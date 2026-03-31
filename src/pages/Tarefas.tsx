import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, Edit2, Trash2, Search, Loader2, X, CheckSquare, 
  Calendar as CalendarIcon, AlertCircle, CheckCircle2, Circle, 
  ArrowUpDown, Inbox, Calendar, Clock, Hash, Check
} from "lucide-react";
import { toast } from "sonner";
import { format, isToday, isWithinInterval, addDays, startOfDay, endOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  due_date: string | null;
  created_at: string;
  user_id: string;
  project: string | null;
}

type FilterType = 'inbox' | 'today' | 'next_7' | 'completed' | string;

const PROJECTS = ["Sessão de Fotos", "Edição", "Administrativo"];

export default function Tarefas() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  
  // Navegação e Filtros
  const [activeFilter, setActiveFilter] = useState<FilterType>('inbox');
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date_asc");

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
    due_date: "",
    project: ""
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

      if (error && error.code !== '42P01') throw error;
      setTasks(data || []);
    } catch (error) {
      toast.error("Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  };

  // Lógica de filtragem baseada na sidebar
  const filteredTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const next7 = endOfDay(addDays(today, 7));

    let result = tasks.filter(task => {
      // Filtro de busca
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      // Filtro de Categoria/Sidebar
      if (activeFilter === 'completed') return task.status === 'Concluída';
      
      // Para os outros filtros, ignoramos as já concluídas
      if (task.status === 'Concluída') return false;

      if (activeFilter === 'inbox') return true;
      
      if (activeFilter === 'today') {
        if (!task.due_date) return false;
        return isToday(new Date(task.due_date));
      }

      if (activeFilter === 'next_7') {
        if (!task.due_date) return false;
        const d = new Date(task.due_date);
        return isWithinInterval(d, { start: today, end: next7 });
      }

      // Se for um projeto específico
      if (PROJECTS.includes(activeFilter)) {
        return task.project === activeFilter;
      }

      return true;
    });

    // Ordenação
    result.sort((a, b) => {
      if (sortBy === 'date_asc') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [tasks, activeFilter, searchQuery, sortBy]);

  // Contadores para a sidebar
  const counts = useMemo(() => {
    const today = startOfDay(new Date());
    const next7 = endOfDay(addDays(today, 7));
    
    return {
      inbox: tasks.filter(t => t.status !== 'Concluída').length,
      today: tasks.filter(t => t.status !== 'Concluída' && t.due_date && isToday(new Date(t.due_date))).length,
      next_7: tasks.filter(t => t.status !== 'Concluída' && t.due_date && isWithinInterval(new Date(t.due_date), { start: today, end: next7 })).length,
      completed: tasks.filter(t => t.status === 'Concluída').length,
      projects: PROJECTS.reduce((acc, p) => {
        acc[p] = tasks.filter(t => t.status !== 'Concluída' && t.project === p).length;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [tasks]);

  const handleOpenModal = (task?: Task) => {
    if (task) {
      setSelectedTask(task);
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status || "Pendente",
        priority: task.priority || "Média",
        due_date: task.due_date ? task.due_date.split('T')[0] : "",
        project: task.project || ""
      });
    } else {
      setSelectedTask(null);
      setFormData({
        title: "",
        description: "",
        status: "Pendente",
        priority: "Média",
        due_date: "",
        project: PROJECTS.includes(activeFilter) ? activeFilter : ""
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
        due_date: formData.due_date || null,
        project: formData.project || null
      };

      if (selectedTask) {
        const { data, error } = await supabase.from('tasks').update(payload).eq('id', selectedTask.id).select().single();
        if (error) throw error;
        setTasks(prev => prev.map(t => t.id === selectedTask.id ? data as Task : t));
        toast.success("Tarefa atualizada!");
      } else {
        const { data, error } = await supabase.from('tasks').insert(payload).select().single();
        if (error) throw error;
        setTasks(prev => [data as Task, ...prev]);
        toast.success("Tarefa criada!");
      }
      setIsModalOpen(false);
    } catch (error) {
      toast.error("Erro ao salvar tarefa.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    const newStatus = task.status === 'Concluída' ? 'Pendente' : 'Concluída';
    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      toast.success(newStatus === 'Concluída' ? "Concluída!" : "Reaberta.");
    } catch (e) {
      toast.error("Erro ao atualizar.");
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    try {
      await supabase.from('tasks').delete().eq('id', selectedTask.id);
      setTasks(prev => prev.filter(t => t.id !== selectedTask.id));
      toast.success("Tarefa removida.");
      setIsDeleteModalOpen(false);
    } catch (e) {
      toast.error("Erro ao remover.");
    }
  };

  const getSectionTitle = () => {
    if (activeFilter === 'inbox') return 'Entrada';
    if (activeFilter === 'today') return 'Hoje';
    if (activeFilter === 'next_7') return 'Próximos 7 dias';
    if (activeFilter === 'completed') return 'Concluídas';
    return activeFilter;
  };

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex h-full gap-8">
        
        {/* SIDEBAR TAREFAS */}
        <div className="w-64 shrink-0 flex flex-col pt-2">
          <div className="space-y-1 mb-8">
            <button 
              onClick={() => setActiveFilter('inbox')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'inbox' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <Inbox className={`w-5 h-5 ${activeFilter === 'inbox' ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className="text-sm">Entrada</span>
              </div>
              <span className="text-xs opacity-60">{counts.inbox}</span>
            </button>

            <button 
              onClick={() => setActiveFilter('today')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'today' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <Calendar className={`w-5 h-5 ${activeFilter === 'today' ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="text-sm">Hoje</span>
              </div>
              <span className="text-xs opacity-60">{counts.today}</span>
            </button>

            <button 
              onClick={() => setActiveFilter('next_7')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'next_7' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <Clock className={`w-5 h-5 ${activeFilter === 'next_7' ? 'text-purple-500' : 'text-gray-400'}`} />
                <span className="text-sm">Próximos 7 dias</span>
              </div>
              <span className="text-xs opacity-60">{counts.next_7}</span>
            </button>

            <button 
              onClick={() => setActiveFilter('completed')}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'completed' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className={`w-5 h-5 ${activeFilter === 'completed' ? 'text-orange-500' : 'text-gray-400'}`} />
                <span className="text-sm">Concluídas</span>
              </div>
              <span className="text-xs opacity-60">{counts.completed}</span>
            </button>
          </div>

          <div className="space-y-2">
            <h4 className="px-3 text-[11px] font-bold uppercase text-gray-400 tracking-wider mb-2">Projetos</h4>
            {PROJECTS.map(project => (
              <button 
                key={project}
                onClick={() => setActiveFilter(project)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === project ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                <div className="flex items-center gap-3">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span className="text-sm">{project}</span>
                </div>
                <span className="text-xs opacity-60">{counts.projects[project]}</span>
              </button>
            ))}
          </div>
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col pt-2 min-w-0">
          
          {/* Header Seção */}
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{getSectionTitle()}</h2>
              <p className="text-xs text-gray-400 font-medium">{filteredTasks.length} tarefas</p>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Tarefa
            </button>
          </div>

          {/* Barra de Busca e Sort */}
          <div className="flex items-center gap-3 mb-8">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar tarefas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
              />
            </div>
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-medium focus:outline-none"
            >
              <option value="date_asc">Data (Mais próxima)</option>
              <option value="created_desc">Recentemente criadas</option>
            </select>
          </div>

          {/* Lista de Tarefas */}
          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-1">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const completed = task.status === 'Concluída';
                return (
                  <div 
                    key={task.id}
                    onClick={() => handleOpenModal(task)}
                    className="group flex items-start gap-4 p-3 rounded-xl hover:bg-white transition-all cursor-pointer border border-transparent hover:border-gray-100 hover:shadow-sm"
                  >
                    <button 
                      onClick={(e) => handleToggleComplete(task, e)}
                      className={`mt-1 shrink-0 transition-colors ${completed ? 'text-green-500' : 'text-gray-300 hover:text-orange-400'}`}
                    >
                      {completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                    </button>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-[15px] font-semibold truncate ${completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                        {task.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        {task.due_date && (
                          <div className={`flex items-center gap-1 text-[11px] font-bold ${new Date(task.due_date) < new Date() && !completed ? 'text-red-500' : 'text-gray-400'}`}>
                            <CalendarIcon className="w-3 h-3" />
                            {format(new Date(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                          </div>
                        )}
                        {task.project && (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-orange-400/80">
                            <Hash className="w-3 h-3" />
                            {task.project}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setIsDeleteModalOpen(true); }} className="p-2 text-gray-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50">
                <CheckSquare className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-medium">Nenhuma tarefa encontrada.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Criar/Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in zoom-in-95">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
              <h2 className="text-xl font-bold text-gray-900">{selectedTask ? 'Editar Tarefa' : 'Nova Tarefa'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveTask} className="p-6 space-y-5">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">O que precisa ser feito? *</label>
                <input 
                  required autoFocus
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-semibold"
                  placeholder="Ex: Enviar fotos do casamento"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Projeto / Categoria</label>
                <select 
                  value={formData.project} onChange={e => setFormData({...formData, project: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
                >
                  <option value="">Sem Projeto (Entrada)</option>
                  {PROJECTS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Data de Vencimento</label>
                  <input 
                    type="date"
                    value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-gray-700"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Prioridade</label>
                  <select 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Notas adicionais</label>
                <textarea 
                  rows={3}
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none resize-none"
                  placeholder="Descreva detalhes importantes..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center gap-2">
                  {isSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {selectedTask ? 'Salvar Alterações' : 'Adicionar Tarefa'}
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
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-8 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Remover tarefa?</h3>
            <p className="text-gray-500 text-sm mb-8">Esta ação não pode ser desfeita. A tarefa será excluída permanentemente.</p>
            <div className="flex gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}