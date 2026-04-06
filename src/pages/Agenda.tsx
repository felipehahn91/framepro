import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { listUserCalendars, listGoogleEvents, createGoogleCalendarEvent } from "@/lib/googleCalendar";
import { UpgradeModal } from "@/components/UpgradeModal";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  CheckSquare, FileText, DollarSign, AlertCircle, Clock,
  Loader2, X, ChevronDown, Download, RefreshCw, ExternalLink, Globe,
  Plus, Video, ListTodo
} from "lucide-react";
import { toast } from "sonner";
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, isSameMonth, isSameDay, addDays, 
  isToday, parseISO, startOfDay
} from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'Tarefa' | 'Contrato' | 'Pagamento' | 'Google';
  status: string;
  colorClass: string;
  bgClass: string;
  icon: React.ReactNode;
  description?: string;
  amount?: number;
  originalData: any;
}

export default function Agenda() {
  const { user, profile, session } = useAuth();
  
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState("");
  const isStarter = profile?.role !== 'admin' && (profile?.plan_type === 'starter' || profile?.plan_type === 'monthly' || !profile?.plan_type);
  
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  const [rightPanelMode, setRightPanelMode] = useState<'day' | 'upcoming'>('day');
  
  // Largura do painel direito (Desktop)
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem('framepro_agenda_panel_width');
    return saved ? parseInt(saved, 10) : 320;
  });

  useEffect(() => {
    localStorage.setItem('framepro_agenda_panel_width', rightPanelWidth.toString());
  }, [rightPanelWidth]);

  const startResizing = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = rightPanelWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      requestAnimationFrame(() => {
        // Movendo para a esquerda aumenta o painel (pois a alça está na esquerda do painel)
        const deltaX = startX - moveEvent.clientX;
        const newWidth = Math.max(280, Math.min(800, startWidth + deltaX));
        setRightPanelWidth(newWidth);
      });
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // Google Calendar Integration State
  const isGoogleEnabledInDB = user?.user_metadata?.google_calendar_enabled === true;
  
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState<string>("");
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [upcomingDays, setUpcomingDays] = useState(7);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    time: '',
    description: '',
    createMeet: false,
    saveToCRM: true,
  });

  // Salva o Refresh Token no banco se ele vier do OAuth
  useEffect(() => {
    if (session?.provider_refresh_token && user) {
      supabase.from('profiles').update({ 
        google_refresh_token: session.provider_refresh_token 
      }).eq('id', user.id).then(({ error }) => {
        if (error) console.error("Erro ao salvar refresh token", error);
      });
    }
  }, [session, user]);

  useEffect(() => {
    if (user) {
      fetchAllData();
      if (isGoogleEnabledInDB) {
        fetchGoogleCalendars();
      }
    }
  }, [user, isGoogleEnabledInDB]);

  useEffect(() => {
    if (isGoogleEnabledInDB && selectedGoogleCalendarId) {
      fetchGoogleEventsForPeriod();
    } else {
      setGoogleEvents([]);
    }
  }, [selectedGoogleCalendarId, currentDate, isGoogleEnabledInDB]);

  const fetchGoogleCalendars = async () => {
    try {
      const calendars = await listUserCalendars();
      setGoogleCalendars(calendars);
      const primary = calendars.find((c: any) => c.primary);
      if (primary && !selectedGoogleCalendarId) {
        setSelectedGoogleCalendarId(primary.id);
      }
    } catch (error) {
      console.error("Erro ao buscar calendários do Google:", error);
      toast.error("Conexão com Google Expirada. Clique em reconectar.");
    }
  };

  const fetchGoogleEventsForPeriod = async () => {
    setLoadingGoogle(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const timeMin = startOfWeek(monthStart).toISOString();
      const timeMax = endOfWeek(monthEnd).toISOString();

      const items = await listGoogleEvents(selectedGoogleCalendarId, timeMin, timeMax);
      
      const parsed: CalendarEvent[] = items.map((item: any) => {
        const start = item.start.dateTime || item.start.date;
        return {
          id: `google-${item.id}`,
          title: item.summary || '(Sem título)',
          date: startOfDay(new Date(start)),
          type: 'Google',
          status: 'Agendado',
          colorClass: 'text-purple-700 border-purple-200',
          bgClass: 'bg-purple-50 hover:bg-purple-100',
          icon: <Globe className="w-3.5 h-3.5 text-purple-500" />,
          description: item.description || '',
          originalData: item
        };
      });

      setGoogleEvents(parsed);
    } catch (error) {
      console.error("Erro ao carregar eventos do Google:", error);
    } finally {
      setLoadingGoogle(false);
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [tasksRes, contractsRes, txRes] = await Promise.all([
        supabase.from('tasks').select('*'),
        supabase.from('contracts').select('*, opportunities(name)'),
        supabase.from('transactions').select('*, clients:client_id(name)')
      ]);

      const tasks = tasksRes.data || [];
      const contracts = contractsRes.data || [];
      const transactions = txRes.data || [];

      const parsedEvents: CalendarEvent[] = [];
      const todayStart = startOfDay(new Date());

      tasks.forEach(task => {
        if (!task.due_date) return;
        const taskDate = startOfDay(parseISO(task.due_date));
        parsedEvents.push({
          id: `task-${task.id}`,
          title: task.title,
          date: taskDate,
          type: 'Tarefa',
          status: task.status,
          colorClass: 'text-orange-700 border-orange-200',
          bgClass: 'bg-orange-50 hover:bg-orange-100',
          icon: <CheckSquare className="w-3.5 h-3.5 text-orange-500" />,
          description: task.description,
          originalData: task
        });
      });

      contracts.forEach(contract => {
        if (!contract.start_date) return;
        const contractDate = startOfDay(parseISO(contract.start_date));
        parsedEvents.push({
          id: `contract-${contract.id}`,
          title: contract.opportunities?.name ? `Contrato: ${contract.opportunities.name}` : 'Novo Contrato',
          date: contractDate,
          type: 'Contrato',
          status: contract.status,
          colorClass: 'text-blue-700 border-blue-200',
          bgClass: 'bg-blue-50 hover:bg-blue-100',
          icon: <FileText className="w-3.5 h-3.5 text-blue-500" />,
          amount: contract.value,
          description: `Status Assinatura: ${contract.signature_status || 'Pendente'}`,
          originalData: contract
        });
      });

      transactions.forEach(tx => {
        const clientName = tx.clients?.name ? ` - ${tx.clients.name}` : '';
        if (tx.is_installment && tx.installments) {
          let insts = [];
          if (typeof tx.installments === 'string') {
            try { insts = JSON.parse(tx.installments); } catch (e) { insts = []; }
          } else {
            insts = tx.installments;
          }
          insts.forEach((inst: any) => {
            if (inst.status === 'Pago') return;
            const dueDate = startOfDay(parseISO(inst.dueDate));
            const isOverdue = dueDate < todayStart;
            parsedEvents.push({
              id: `tx-${tx.id}-inst-${inst.id}`,
              title: `Parcela ${inst.number}/${tx.installment_count}${clientName}`,
              date: dueDate,
              type: 'Pagamento',
              status: isOverdue ? 'Atrasado' : 'Pendente',
              colorClass: isOverdue ? 'text-red-700 border-red-200' : 'text-yellow-700 border-yellow-200',
              bgClass: isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-yellow-50 hover:bg-yellow-100',
              icon: isOverdue ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <DollarSign className="w-3.5 h-3.5 text-yellow-500" />,
              amount: inst.amount,
              description: tx.description,
              originalData: { ...tx, currentInstallment: inst }
            });
          });
        } else {
          if (tx.status === 'Recebido' || tx.status === 'Cancelado') return;
          const txDate = startOfDay(parseISO(tx.date));
          const isOverdue = tx.status === 'Atrasado' || txDate < todayStart;
          parsedEvents.push({
            id: `tx-${tx.id}`,
            title: `${tx.description}${clientName}`,
            date: txDate,
            type: 'Pagamento',
            status: isOverdue ? 'Atrasado' : 'Pendente',
            colorClass: isOverdue ? 'text-red-700 border-red-200' : 'text-yellow-700 border-yellow-200',
            bgClass: isOverdue ? 'bg-red-50 hover:bg-red-100' : 'bg-yellow-50 hover:bg-yellow-100',
            icon: isOverdue ? <AlertCircle className="w-3.5 h-3.5 text-red-500" /> : <DollarSign className="w-3.5 h-3.5 text-yellow-500" />,
            amount: tx.amount,
            originalData: tx
          });
        }
      });
      setEvents(parsedEvents);
    } catch (error) {
      toast.error("Erro ao carregar dados da agenda.");
    } finally {
      setLoading(false);
    }
  };

  const handleConnectGoogle = async () => {
    if (isStarter) {
      setUpgradeFeature("Sincronização com Google Calendar e Meet");
      setUpgradeModalOpen(true);
      return;
    }
    
    try {
      await supabase.auth.updateUser({
        data: { google_calendar_enabled: true }
      });
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar',
          queryParams: {
            access_type: 'offline', // Fundamental para gerar o Refresh Token
            prompt: 'consent',
          },
          redirectTo: window.location.origin + '/agenda'
        }
      });
      if (error) throw error;
    } catch (error) {
      toast.error('Erro ao conectar com Google.');
    }
  };

  const handleDisconnectGoogle = async () => {
    try {
      await supabase.auth.updateUser({
        data: { google_calendar_enabled: false }
      });
      
      // Limpa do banco de dados
      await supabase.from('profiles').update({ google_refresh_token: null }).eq('id', user!.id);
      
      setGoogleEvents([]);
      setSelectedGoogleCalendarId("");
      toast.success("Google Calendar desconectado permanentemente.");
    } catch (error) {
      toast.error("Erro ao desativar integração.");
    }
  };

  const nextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const prevMonth = () => setCurrentDate(subMonths(currentDate, 1));

  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const days = [];
    let day = startDate;
    while (day <= endDate) {
      days.push(day);
      day = addDays(day, 1);
    }
    return days;
  }, [currentDate]);

  const allEvents = useMemo(() => {
    return [...events, ...googleEvents];
  }, [events, googleEvents]);

  const rightPanelEvents = useMemo(() => {
    if (rightPanelMode === 'day') {
      return allEvents
        .filter(e => isSameDay(e.date, selectedDate))
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    } else {
      const today = startOfDay(new Date());
      const endDate = addDays(today, upcomingDays);
      return allEvents
        .filter(e => e.date >= today && e.date <= endDate)
        .sort((a, b) => a.date.getTime() - b.date.getTime());
    }
  }, [allEvents, selectedDate, rightPanelMode, upcomingDays]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setRightPanelMode('day');
  };

  const openCreateModal = (day: Date, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedDate(day);
    setNewEventData({
      title: '',
      time: '',
      description: '',
      createMeet: false,
      saveToCRM: true,
    });
    setIsCreateModalOpen(true);
  };

  const handleCreateEvent = async () => {
    if (!newEventData.title.trim()) return toast.error("O título é obrigatório.");

    setCreatingEvent(true);
    try {
      let googleEventRes = null;

      if (isGoogleEnabledInDB && selectedGoogleCalendarId) {
        googleEventRes = await createGoogleCalendarEvent(
          selectedGoogleCalendarId,
          {
            title: newEventData.title,
            description: newEventData.description,
            date: selectedDate,
            time: newEventData.time,
            createMeet: newEventData.createMeet
          }
        );
        toast.success("Evento salvo no Google Calendar!");
        fetchGoogleEventsForPeriod();
      } else if (newEventData.createMeet) {
        toast.warning("Agenda do Google não vinculada. O link do Meet não pôde ser gerado.");
      }

      if (newEventData.saveToCRM) {
        let crmDescription = newEventData.description;
        if (googleEventRes?.hangoutLink) {
          crmDescription += `\n\n🔗 Link da Reunião (Meet): ${googleEventRes.hangoutLink}`;
        }

        let dueDate = selectedDate;
        if (newEventData.time) {
          const [hours, minutes] = newEventData.time.split(':');
          dueDate = new Date(selectedDate);
          dueDate.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
        }

        await supabase.from('tasks').insert({
          user_id: user?.id,
          title: newEventData.title,
          description: crmDescription.trim(),
          status: 'Pendente',
          priority: 'Média',
          due_date: dueDate.toISOString()
        });

        toast.success("Tarefa adicionada ao CRM!");
        fetchAllData(); 
      }

      setIsCreateModalOpen(false);
    } catch (error) {
      console.error(error);
      toast.error("Erro ao criar evento.");
    } finally {
      setCreatingEvent(false);
    }
  };

  const getDotColor = (type: string, status: string) => {
    if (type === 'Tarefa') return 'bg-orange-500';
    if (type === 'Contrato') return 'bg-blue-500';
    if (type === 'Google') return 'bg-purple-500';
    if (type === 'Pagamento') return status === 'Atrasado' ? 'bg-red-500' : 'bg-yellow-500';
    return 'bg-gray-500';
  };

  if (loading) {
    return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  return (
    <Layout>
      {/* FAB para Mobile */}
      <button 
        onClick={() => openCreateModal(selectedDate)} 
        className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-orange-400 text-white rounded-full shadow-[0_4px_20px_rgba(249,115,22,0.4)] flex items-center justify-center z-40 hover:bg-orange-500 transition-transform active:scale-95"
      >
        <Plus className="w-6 h-6" />
      </button>

      <div className="max-w-7xl mx-auto flex flex-col min-h-full space-y-6 pb-20 md:pb-0 relative">
        
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Agenda CRM</h1>
            <p className="text-sm text-gray-500">Compromissos sincronizados em todos os dispositivos.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {isGoogleEnabledInDB ? (
              <div className="flex items-center justify-between gap-3 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200 w-full sm:w-auto">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Globe className="w-4 h-4 text-purple-500 shrink-0" />
                  <select
                    value={selectedGoogleCalendarId}
                    onChange={(e) => setSelectedGoogleCalendarId(e.target.value)}
                    className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer w-full sm:max-w-[200px] truncate"
                  >
                    <option value="">Nenhuma agenda selecionada</option>
                    {googleCalendars.map(cal => (
                      <option key={cal.id} value={cal.id}>{cal.summary}</option>
                    ))}
                  </select>
                  {loadingGoogle && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500 shrink-0" />}
                </div>
                
                <button
                  onClick={handleDisconnectGoogle}
                  className="p-1.5 bg-red-50 text-red-500 rounded-lg hover:bg-red-100 transition-colors border border-red-100 shrink-0"
                  title="Desconectar Google Calendar Permanentemente"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button 
                onClick={handleConnectGoogle}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm text-sm w-full sm:w-auto justify-center"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Conectar Google Calendar
              </button>
            )}
          </div>
        </div>

        {/* Corpo da Agenda */}
        <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 lg:min-h-0">
          
          {/* Calendário Grid */}
          <div className="shrink-0 lg:flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col lg:overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </h2>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button onClick={prevMonth} className="p-1.5 sm:p-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-xs sm:text-sm font-bold text-gray-700 transition-colors hidden sm:block">
                  Hoje
                </button>
                <button onClick={nextMonth} className="p-1.5 sm:p-2 border border-gray-200 bg-white rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col lg:overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-7 bg-white border-b border-gray-100 shrink-0">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="py-2 sm:py-3 text-center text-[10px] sm:text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isDayToday = isToday(day);
                  const isSelected = isSameDay(day, selectedDate);
                  const dayEvents = allEvents.filter(e => isSameDay(e.date, day));

                  return (
                    <div
                      key={day.toString()}
                      onClick={() => handleDayClick(day)}
                      className={`h-14 sm:h-auto sm:min-h-[100px] border-r border-b border-gray-100 p-1 sm:p-2 transition-colors cursor-pointer group relative
                        ${!isCurrentMonth ? 'bg-gray-50/30' : 'bg-white'}
                        ${isSelected ? 'bg-orange-50/50 ring-inset ring-2 ring-orange-400/20' : 'hover:bg-gray-50/50'}
                      `}
                    >
                      <div className="flex justify-center md:justify-between items-start mb-1 relative z-20">
                        <span className={`w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-bold 
                          ${isDayToday ? 'bg-orange-400 text-white shadow-sm' : isSelected ? 'bg-orange-100 text-orange-600' : !isCurrentMonth ? 'text-gray-400' : 'text-gray-700'}`}
                        >
                          {format(day, 'd')}
                        </span>
                        
                        {/* Botão + visível apenas no Desktop ao passar o mouse */}
                        <div 
                          className="hidden md:flex opacity-0 group-hover:opacity-100 p-1 bg-white border border-gray-200 text-orange-500 rounded-md transition-all shadow-sm hover:bg-orange-50" 
                          title="Criar Evento"
                          onClick={(e) => openCreateModal(day, e)}
                        >
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                      
                      {/* Visualização DESKTOP: Blocos de texto */}
                      <div className="hidden md:block space-y-1 mt-1 relative z-20">
                        {dayEvents.slice(0, 3).map(event => (
                          <div 
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className={`px-2 py-1 rounded border text-[10px] font-bold truncate transition-all hover:shadow-sm ${event.bgClass} ${event.colorClass}`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="text-[10px] font-bold text-gray-400 pl-1 mt-1">
                            + {dayEvents.length - 3} itens
                          </div>
                        )}
                      </div>

                      {/* Visualização MOBILE: Bolinhas */}
                      <div className="md:hidden flex justify-center gap-1 mt-1 flex-wrap px-1 relative z-20">
                        {dayEvents.slice(0, 3).map(event => (
                          <div 
                            key={event.id} 
                            className={`w-1.5 h-1.5 rounded-full ${getDotColor(event.type, event.status)}`} 
                          />
                        ))}
                        {dayEvents.length > 3 && (
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Painel Lateral/Inferior (Eventos) */}
          <style>{`
            @media (min-width: 1024px) {
              .resizable-agenda-panel { width: ${rightPanelWidth}px !important; flex: none !important; }
            }
          `}</style>
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col lg:overflow-hidden relative resizable-agenda-panel">
            {/* Alça de Redimensionamento (Desktop) */}
            <div
              onMouseDown={startResizing}
              className="hidden lg:flex absolute top-1/2 -left-3 w-6 h-16 -mt-8 cursor-col-resize z-20 bg-white hover:bg-orange-50 rounded-full shadow-md border border-gray-200 items-center justify-center group"
              title="Arraste para redimensionar"
            >
              <div className="w-0.5 h-6 bg-gray-300 group-hover:bg-orange-400 rounded-full transition-colors"></div>
            </div>
            <div className="p-4 border-b border-gray-100 shrink-0 bg-gray-50/50">
              
              <div className="flex bg-gray-100/80 p-1 rounded-xl w-full mb-4">
                <button
                  onClick={() => setRightPanelMode('day')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${rightPanelMode === 'day' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Selecionado
                </button>
                <button
                  onClick={() => setRightPanelMode('upcoming')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${rightPanelMode === 'upcoming' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Próximos
                </button>
              </div>

              {rightPanelMode === 'upcoming' ? (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <DropdownMenu>
                    <DropdownMenuTrigger className="flex items-center gap-1 font-bold text-gray-900 text-sm hover:text-orange-500 transition-colors focus:outline-none">
                      Próximos {upcomingDays} dias <ChevronDown className="w-4 h-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                      {[7, 15, 30].map(d => (
                        <DropdownMenuItem key={d} onClick={() => setUpcomingDays(d)} className="cursor-pointer font-medium">
                          Próximos {d} dias
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-gray-900 text-sm">
                    {isToday(selectedDate) ? 'Hoje' : format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex-1 lg:overflow-y-auto p-4 space-y-3 custom-scrollbar bg-white relative">
              {rightPanelEvents.length > 0 ? (
                rightPanelEvents.map(event => (
                  <div 
                    key={`panel-${event.id}`}
                    onClick={() => setSelectedEvent(event)}
                    className="bg-white p-3.5 rounded-xl border border-gray-100 shadow-sm hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl shrink-0 mt-0.5 border ${event.bgClass} ${event.colorClass.split(' ')[0]}`}>
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-[11px] text-gray-500 font-bold uppercase tracking-wider">
                          <span>{format(event.date, "dd MMM", { locale: ptBR })}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span className={event.colorClass.split(' ')[0]}>{event.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-60 py-10">
                  <CalendarIcon className="w-10 h-10 text-gray-300 mb-3" />
                  <p className="font-bold text-gray-600 text-sm">Nenhum evento listado</p>
                  <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
                    {rightPanelMode === 'day' ? 'Sua agenda está livre neste dia.' : `Sua agenda está livre para os próximos ${upcomingDays} dias.`}
                  </p>
                  {rightPanelMode === 'day' && (
                    <button 
                      onClick={() => openCreateModal(selectedDate)}
                      className="mt-4 px-4 py-2 bg-orange-50 text-orange-600 font-bold text-xs rounded-lg hover:bg-orange-100 transition-colors"
                    >
                      Adicionar Evento
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Criação de Evento */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white rounded-3xl shadow-2xl p-0 overflow-hidden">
          <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Novo Evento</DialogTitle>
              <DialogDescription className="text-sm font-medium mt-1">
                {selectedDate && format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </DialogDescription>
            </div>
            <button onClick={() => setIsCreateModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-sm transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Título do Evento *</label>
              <input 
                type="text" 
                value={newEventData.title}
                onChange={e => setNewEventData({...newEventData, title: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all"
                placeholder="Ex: Reunião de Alinhamento"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Horário (Opcional)</label>
              <input 
                type="time" 
                value={newEventData.time}
                onChange={e => setNewEventData({...newEventData, time: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all text-gray-700"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Descrição / Notas</label>
              <textarea 
                rows={3}
                value={newEventData.description}
                onChange={e => setNewEventData({...newEventData, description: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm transition-all resize-none"
                placeholder="Detalhes adicionais..."
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-4 mt-2">
              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${isGoogleEnabledInDB ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`text-sm font-bold block ${isGoogleEnabledInDB ? 'text-gray-900' : 'text-gray-400'}`}>Gerar Link do Meet</span>
                    <span className="text-[10px] text-gray-500 font-medium">Reunião em vídeo automática</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={newEventData.createMeet}
                  onChange={e => setNewEventData({...newEventData, createMeet: e.target.checked})}
                  disabled={!selectedGoogleCalendarId || !isGoogleEnabledInDB}
                  className="w-5 h-5 rounded border-gray-300 accent-blue-500 cursor-pointer disabled:opacity-50"
                />
              </label>

              {(!selectedGoogleCalendarId || !isGoogleEnabledInDB) && (
                <div className="bg-orange-50 text-orange-700 p-2.5 rounded-lg text-xs font-medium border border-orange-100">
                  A conexão com o Google está inativa. Conecte acima para usar o Meet.
                </div>
              )}

              <div className="h-px bg-gray-200 w-full"></div>

              <label className="flex items-center justify-between cursor-pointer group">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-orange-100 text-orange-500">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-sm font-bold text-gray-900 block">Salvar no CRM</span>
                    <span className="text-[10px] text-gray-500 font-medium">Cria uma Tarefa Pendente</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={newEventData.saveToCRM}
                  onChange={e => setNewEventData({...newEventData, saveToCRM: e.target.checked})}
                  className="w-5 h-5 rounded border-gray-300 accent-orange-500 cursor-pointer"
                />
              </label>
            </div>
          </div>

          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-end gap-2">
            <button 
              onClick={() => setIsCreateModalOpen(false)} 
              className="w-full sm:w-auto px-6 py-2.5 text-gray-500 text-sm font-bold hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={handleCreateEvent}
              disabled={!newEventData.title.trim() || creatingEvent}
              className="w-full sm:w-auto px-8 py-2.5 bg-orange-400 text-white text-sm font-bold rounded-xl hover:bg-orange-500 shadow-sm transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {creatingEvent ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar Evento'}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes do Evento Existente */}
      <Dialog open={!!selectedEvent} onOpenChange={(open) => !open && setSelectedEvent(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md bg-white rounded-3xl shadow-2xl p-0 overflow-hidden">
          {selectedEvent && (
            <>
              <div className={`px-6 py-6 border-b border-gray-100 flex items-start justify-between ${selectedEvent.bgClass}`}>
                <div className="flex gap-4">
                  <div className={`mt-1 p-2 rounded-xl bg-white/50 backdrop-blur-sm shadow-sm ${selectedEvent.colorClass.split(' ')[0]}`}>
                    {selectedEvent.icon}
                  </div>
                  <div>
                    <h2 className={`text-lg font-bold leading-tight pr-4 ${selectedEvent.colorClass.split(' ')[0]}`}>
                      {selectedEvent.title}
                    </h2>
                    <p className="text-xs font-bold uppercase tracking-wider opacity-70 mt-1">{selectedEvent.type}</p>
                  </div>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-2 bg-white/50 hover:bg-white rounded-full transition-colors shrink-0 shadow-sm">
                  <X className="w-4 h-4 text-gray-700" />
                </button>
              </div>

              <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Data e Hora</p>
                    <p className="text-sm font-bold text-gray-900">
                      {format(selectedEvent.date, "dd/MM/yyyy")}
                      {selectedEvent.type === 'Google' && selectedEvent.originalData.start.dateTime && (
                        <span className="block text-xs font-semibold text-gray-500 mt-0.5">
                          {format(new Date(selectedEvent.originalData.start.dateTime), "HH:mm")}
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Status</p>
                    <p className="text-sm font-bold text-gray-900">{selectedEvent.status}</p>
                  </div>
                </div>

                {selectedEvent.amount !== undefined && (
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Valor Financeiro</p>
                    <p className="text-xl font-black text-green-600">{formatCurrency(selectedEvent.amount)}</p>
                  </div>
                )}

                {selectedEvent.description && (
                  <div>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Detalhes / Notas</p>
                    <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed">
                      {selectedEvent.description}
                    </div>
                  </div>
                )}

                {selectedEvent.type === 'Google' && (
                  <div className="pt-4 space-y-3">
                      {selectedEvent.originalData.hangoutLink && (
                        <a
                        href={selectedEvent.originalData.hangoutLink}
                        target="_blank"
                        rel="noreferrer"
                        className="w-full py-3 bg-blue-50 text-blue-600 border border-blue-200 font-bold rounded-xl hover:bg-blue-100 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                        >
                          <Video className="w-5 h-5" /> Entrar na Chamada (Meet)
                        </a>
                      )}
                      <a
                      href={selectedEvent.originalData.htmlLink}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
                      >
                        <ExternalLink className="w-4 h-4" /> Ver no Google Calendar
                      </a>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        featureName={upgradeFeature}
      />
    </Layout>
  );
}