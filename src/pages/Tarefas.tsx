import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Plus, Edit2, Trash2, Search, Loader2, X, CheckSquare, 
  Calendar as CalendarIcon, AlertCircle, CheckCircle2, Circle, 
  ArrowUpDown, Inbox, Calendar, Clock, Hash, Check, Folder, Zap
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
  project: string | null;
  created_at: string;
  user_id: string;
}

type FilterType = 'inbox' | 'today' | 'next_7' | 'in_progress' | 'completed' | string;

// Função auxiliar para evitar problema de fuso horário
const parseDateSafe = (dateStr: string | null) => {
  if (!dateStr) return new Date();
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return new Date();
  // Se for apenas a data ou se a hora for exata meia-noite (UTC), empurramos para o meio-dia
  // Isso previne que a conversão pro fuso do Brasil (GMT-3) faça a data cair pro dia anterior
  if (dateStr.length <= 10 || (d.getUTCHours() === 0 && d.getUTCMinutes() === 0)) {
    d.setUTCHours(12);
  }
  return d;
};

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
  const [isCreatingProject, setIsCreatingProject] = useState(false);

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
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      setTasks(data || []);
    } catch (error) {
      toast.error("Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  };

  // Extrai lista única de projetos existentes
  const existingProjects = useMemo(() => {
    const projects = tasks.map(t => t.project).filter(Boolean) as string[];
    return Array.from(new Set(projects)).sort();
  }, [tasks]);

  // Lógica de filtragem
  const filteredTasks = useMemo(() => {
    const today = startOfDay(new Date());
    const next7 = endOfDay(addDays(today, 7));

    let result = tasks.filter(task => {
      if (searchQuery && !task.title.toLowerCase().includes(searchQuery.toLowerCase())) return false;

      if (activeFilter === 'completed') return task.status === 'Concluída';
      if (activeFilter === 'in_progress') return task.status === 'Em execução' || task.status === 'Em Progresso';

      // Para as outras abas (inbox, hoje, próximos, projetos) nós ESCONDEMOS as tarefas concluídas
      if (task.status === 'Concluída') return false;

      if (activeFilter === 'inbox') return true;
      
      if (activeFilter === 'today') {
        if (!task.due_date) return false;
        return isToday(parseDateSafe(task.due_date));
      }

      if (activeFilter === 'next_7') {
        if (!task.due_date) return false;
        const d = parseDateSafe(task.due_date);
        return isWithinInterval(d, { start: today, end: next7 });
      }

      // Filtragem por projeto específico
      if (activeFilter.startsWith('project:')) {
        const projectName = activeFilter.replace('project:', '');
        return task.project === projectName;
      }

      return true;
    });

    result.sort((a, b) => {
      if (sortBy === 'date_asc') {
        if (!a.due_date) return 1;
        if (!b.due_date) return -1;
        return parseDateSafe(a.due_date).getTime() - parseDateSafe(b.due_date).getTime();
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return result;
  }, [tasks, activeFilter, searchQuery, sortBy]);

  const counts = useMemo(() => {
    const today = startOfDay(new Date());
    const next7 = endOfDay(addDays(today, 7));
    
    const projectCounts: Record<string, number> = {};
    
    tasks.forEach(t => {
      if (t.status !== 'Concluída' && t.project) {
        projectCounts[t.project] = (projectCounts[t.project] || 0) + 1;
      }
    });

    return {
      inbox: tasks.filter(t => t.status !== 'Concluída').length,
      today: tasks.filter(t => t.status !== 'Concluída' && t.due_date && isToday(parseDateSafe(t.due_date))).length,
      next_7: tasks.filter(t => t.status !== 'Concluída' && t.due_date && isWithinInterval(parseDateSafe(t.due_date), { start: today, end: next7 })).length,
      in_progress: tasks.filter(t => t.status === 'Em execução' || t.status === 'Em Progresso').length,
      completed: tasks.filter(t => t.status === 'Concluída').length,
      projectCounts
    };
  }, [tasks]);

  const handleOpenModal = (task?: Task) => {
    setIsCreatingProject(false);
    if (task) {
      setSelectedTask(task);
      setFormData({
        title: task.title || "",
        description: task.description || "",
        status: task.status === 'Em Progresso' ? 'Em execução' : (task.status || "Pendente"),
        priority: task.priority || "Média",
        due_date: task.due_date ? task.due_date.split('T')[0] : "",
        project: task.project || ""
      });
    } else {
      setSelectedTask(null);
      
      let defaultProject = "";
      let defaultStatus = "Pendente";

      if (activeFilter.startsWith('project:')) {
        defaultProject = activeFilter.replace('project:', '');
      }
      if (activeFilter === 'in_progress') {
        defaultStatus = 'Em execução';
      }

      setFormData({
        title: "",
        description: "",
        status: defaultStatus,
        priority: "Média",
        due_date: activeFilter === 'today' ? new Date().toISOString().split('T')[0] : "",
        project: defaultProject
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
        // Garante que é salvo pelo menos no meio-dia UTC
        due_date: formData.due_date ? `${formData.due_date}T12:00:00Z` : null,
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

  // Ciclo de Cliques: Pendente -> Em execução -> Concluída -> Pendente
  const handleToggleStatusClick = async (task: Task, e: React.MouseEvent) => {
    e.stopPropagation();
    
    let newStatus = 'Pendente';
    if (task.status === 'Pendente') newStatus = 'Em execução';
    else if (task.status === 'Em execução' || task.status === 'Em Progresso') newStatus = 'Concluída';
    else if (task.status === 'Concluída') newStatus = 'Pendente';

    setTasks(prev => prev.map(t => t.id === task.id ? { ...t, status: newStatus } : t));
    
    try {
      await supabase.from('tasks').update({ status: newStatus }).eq('id', task.id);
      
      if (newStatus === 'Em execução') toast.success("Tarefa em execução!");
      else if (newStatus === 'Concluída') toast.success("Tarefa concluída!");
      else toast.info("Tarefa marcada como pendente.");
      
    } catch (error) {
      toast.error("Erro ao atualizar o status.");
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
    if (activeFilter === 'in_progress') return 'Em execução';
    if (activeFilter === 'completed') return 'Concluídas';
    if (activeFilter.startsWith('project:')) return activeFilter.replace('project:', '');
    return activeFilter;
  };

  const mobileFilters = [
    { id: 'inbox', label: 'Entrada', count: counts.inbox, icon: Inbox },
    { id: 'today', label: 'Hoje', count: counts.today, icon: Calendar },
    { id: 'next_7', label: 'Próx. 7 dias', count: counts.next_7, icon: Clock },
    { id: 'in_progress', label: 'Em execução', count: counts.in_progress, icon: Zap },
    { id: 'completed', label: 'Concluídas', count: counts.completed, icon: CheckCircle2 }
  ];

  if (loading) return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  return (
    <Layout>
      {/* FAB para Mobile */}
      <button 
        onClick={() => handleOpenModal()} 
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-orange-400 text-white rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] flex items-center justify-center z-40 hover:bg-orange-500 transition-transform active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row h-full gap-4 md:gap-8 pb-20 md:pb-0">
        
        {/* Filtros Pílula Mobile (Horizontal Scroll) */}
        <div className="md:hidden flex overflow-x-auto gap-2 pb-2 mb-2 custom-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 shrink-0">
          {mobileFilters.map(filter => (
            <button
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border transition-colors ${
                activeFilter === filter.id 
                  ? 'bg-orange-50 border-orange-200 text-orange-600' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <filter.icon className={`w-4 h-4 ${activeFilter === filter.id ? (filter.id === 'in_progress' ? 'text-yellow-500 fill-yellow-500' : 'text-orange-500') : 'text-gray-400'}`} />
              {filter.label}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeFilter === filter.id ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                {filter.count}
              </span>
            </button>
          ))}

          {/* Projetos Mobile */}
          {existingProjects.map(project => (
            <button
              key={`mob-proj-${project}`}
              onClick={() => setActiveFilter(`project:${project}`)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap text-sm font-bold border transition-colors ${
                activeFilter === `project:${project}` 
                  ? 'bg-orange-50 border-orange-200 text-orange-600' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Hash className={`w-4 h-4 ${activeFilter === `project:${project}` ? 'text-orange-500' : 'text-gray-400'}`} />
              {project}
              <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[10px] ${activeFilter === `project:${project}` ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
                {counts.projectCounts[project] || 0}
              </span>
            </button>
          ))}
        </div>

        {/* SIDEBAR TAREFAS DESKTOP */}
        <div className="hidden md:flex w-64 shrink-0 flex-col pt-2 overflow-y-auto custom-scrollbar pr-2">
          <div className="space-y-1 mb-8">
            <button onClick={() => setActiveFilter('inbox')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'inbox' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-3"><Inbox className={`w-5 h-5 ${activeFilter === 'inbox' ? 'text-orange-500' : 'text-gray-400'}`} /><span className="text-sm">Entrada</span></div>
              <span className="text-xs opacity-60">{counts.inbox}</span>
            </button>

            <button onClick={() => setActiveFilter('today')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'today' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-3"><Calendar className={`w-5 h-5 ${activeFilter === 'today' ? 'text-green-500' : 'text-gray-400'}`} /><span className="text-sm">Hoje</span></div>
              <span className="text-xs opacity-60">{counts.today}</span>
            </button>

            <button onClick={() => setActiveFilter('next_7')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'next_7' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-3"><Clock className={`w-5 h-5 ${activeFilter === 'next_7' ? 'text-purple-500' : 'text-gray-400'}`} /><span className="text-sm">Próximos 7 dias</span></div>
              <span className="text-xs opacity-60">{counts.next_7}</span>
            </button>

            <button onClick={() => setActiveFilter('in_progress')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'in_progress' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-3"><Zap className={`w-5 h-5 ${activeFilter === 'in_progress' ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400'}`} /><span className="text-sm">Em execução</span></div>
              <span className="text-xs opacity-60">{counts.in_progress}</span>
            </button>

            <button onClick={() => setActiveFilter('completed')} className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === 'completed' ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}>
              <div className="flex items-center gap-3"><CheckCircle2 className={`w-5 h-5 ${activeFilter === 'completed' ? 'text-orange-500' : 'text-gray-400'}`} /><span className="text-sm">Concluídas</span></div>
              <span className="text-xs opacity-60">{counts.completed}</span>
            </button>
          </div>

          {existingProjects.length > 0 && (
            <div className="mb-8">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 px-3">Projetos</h3>
              <div className="space-y-1">
                {existingProjects.map(project => (
                  <button 
                    key={`desktop-proj-${project}`}
                    onClick={() => setActiveFilter(`project:${project}`)} 
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg transition-all ${activeFilter === `project:${project}` ? 'bg-orange-50 text-orange-600 font-bold' : 'text-gray-600 hover:bg-gray-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Hash className={`w-4 h-4 ${activeFilter === `project:${project}` ? 'text-orange-500' : 'text-gray-400'}`} />
                      <span className="text-sm truncate max-w-[140px] text-left">{project}</span>
                    </div>
                    <span className="text-xs opacity-60">{counts.projectCounts[project] || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CONTEÚDO PRINCIPAL */}
        <div className="flex-1 flex flex-col pt-2 min-w-0">
          
          <div className="flex items-center justify-between mb-4 md:mb-2">
            <div className="flex items-center gap-3">
              {activeFilter.startsWith('project:') && <Hash className="w-6 h-6 text-gray-400" />}
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{getSectionTitle()}</h2>
                <p className="text-xs text-gray-400 font-medium">{filteredTasks.length} tarefas</p>
              </div>
            </div>
            <button 
              onClick={() => handleOpenModal()}
              className="hidden md:flex px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-lg transition-colors items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Tarefa
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 mb-6 md:mb-8">
            <div className="relative w-full sm:flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                placeholder="Buscar tarefas..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all shadow-sm"
              />
            </div>
            <select 
              value={sortBy}
              onChange={e => setSortBy(e.target.value)}
              className="w-full sm:w-auto bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-600 font-medium focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-sm"
            >
              <option value="date_asc">Data (Mais próxima)</option>
              <option value="created_desc">Recentemente criadas</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-2">
            {filteredTasks.length > 0 ? (
              filteredTasks.map((task) => {
                const completed = task.status === 'Concluída';
                const inProgress = task.status === 'Em execução' || task.status === 'Em Progresso';

                return (
                  <div 
                    key={task.id}
                    onClick={() => handleOpenModal(task)}
                    className={`group flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 p-4 rounded-xl bg-white border ${inProgress && !completed ? 'border-yellow-400 shadow-md ring-1 ring-yellow-400/20' : 'border-gray-200 hover:border-orange-200 hover:shadow-md'} transition-all cursor-pointer relative`}
                  >
                    <div className="flex items-start gap-3 w-full sm:w-auto flex-1">
                      <button 
                        onClick={(e) => handleToggleStatusClick(task, e)}
                        title="Clique para mudar o status"
                        className={`mt-0.5 shrink-0 transition-all hover:scale-110 ${
                          completed ? 'text-green-500' : 
                          inProgress ? 'text-yellow-500' : 
                          'text-gray-300 hover:text-yellow-500'
                        }`}
                      >
                        {completed ? (
                          <CheckCircle2 className="w-6 h-6" />
                        ) : inProgress ? (
                          <Zap className="w-6 h-6 fill-yellow-500" />
                        ) : (
                          <Circle className="w-6 h-6" />
                        )}
                      </button>
                      
                      <div className="flex-1 min-w-0 pr-8 sm:pr-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`text-[15px] font-bold truncate ${completed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                            {task.title}
                          </h3>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3 mt-1.5">
                          {inProgress && !completed && (
                            <div className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border text-yellow-600 bg-yellow-50 border-yellow-200 uppercase tracking-wider">
                              Em execução
                            </div>
                          )}
                          {task.project && (
                            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${completed ? 'text-gray-400 bg-gray-50 border-gray-100' : 'text-blue-600 bg-blue-50 border-blue-100'}`}>
                              <Folder className="w-3 h-3" />
                              {task.project}
                            </div>
                          )}
                          {task.due_date && (
                            <div className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md border ${parseDateSafe(task.due_date) < new Date() && !completed ? 'text-red-600 bg-red-50 border-red-100' : 'text-gray-500 bg-gray-50 border-gray-100'}`}>
                              <CalendarIcon className="w-3 h-3" />
                              {format(parseDateSafe(task.due_date), "dd 'de' MMM", { locale: ptBR })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedTask(task); setIsDeleteModalOpen(true); }} 
                      className="absolute right-3 top-3 sm:relative sm:top-0 sm:right-0 p-2 text-gray-400 hover:text-red-500 bg-gray-50 sm:bg-transparent rounded-lg hover:bg-red-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center opacity-50 bg-white rounded-xl border border-gray-100 shadow-sm h-full max-h-[300px]">
                <CheckSquare className="w-12 h-12 text-gray-300 mb-4" />
                <p className="text-gray-500 font-bold">Nenhuma tarefa encontrada.</p>
                <p className="text-sm mt-1">Crie sua primeira tarefa usando o botão (+).</p>
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
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 transition-colors bg-white rounded-full shadow-sm border border-gray-200">
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
                {isCreatingProject ? (
                  <div className="flex gap-2">
                    <input 
                      autoFocus
                      placeholder="Nome do novo projeto..."
                      value={formData.project}
                      onChange={e => setFormData({...formData, project: e.target.value})}
                      className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-semibold text-sm"
                    />
                    <button 
                      type="button" 
                      onClick={() => {
                        setIsCreatingProject(false); 
                        setFormData({...formData, project: ''});
                      }} 
                      className="px-3 bg-gray-100 rounded-xl text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors flex items-center justify-center border border-gray-200"
                    >
                       <X className="w-5 h-5" />
                    </button>
                  </div>
                ) : (
                  <select 
                    value={formData.project}
                    onChange={e => {
                      if (e.target.value === 'new') {
                        setIsCreatingProject(true);
                        setFormData({...formData, project: ''});
                      } else {
                        setFormData({...formData, project: e.target.value});
                      }
                    }}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm text-gray-700 font-medium"
                  >
                    <option value="">Sem projeto</option>
                    {existingProjects.map(p => <option key={p} value={p}>{p}</option>)}
                    <option value="new">+ Criar novo projeto...</option>
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Status</label>
                  <select 
                    value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-semibold text-gray-700"
                  >
                    <option value="Pendente">Pendente</option>
                    <option value="Em execução">Em execução</option>
                    <option value="Concluída">Concluída</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Prioridade</label>
                  <select 
                    value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none font-semibold text-gray-700"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Data de Vencimento</label>
                <input 
                  type="date"
                  value={formData.due_date} onChange={e => setFormData({...formData, due_date: e.target.value})}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-gray-700"
                />
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

              <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors order-2 sm:order-1">Cancelar</button>
                <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-3 bg-orange-400 hover:bg-orange-500 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2 order-1 sm:order-2">
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
          <div className="relative bg-white rounded-3xl w-full max-w-sm shadow-2xl p-8 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-100">
              <Trash2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Remover tarefa?</h3>
            <p className="text-gray-500 text-sm mb-8">Esta ação não pode ser desfeita. A tarefa será excluída permanentemente.</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-colors">Cancelar</button>
              <button onClick={handleDelete} className="flex-1 py-3 bg-red-500 text-white font-bold rounded-xl hover:bg-red-600 transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}

    </Layout>
  );
}