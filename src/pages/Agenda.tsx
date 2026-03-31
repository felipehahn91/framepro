import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { listUserCalendars, listGoogleEvents, createGoogleCalendarEvent } from "@/lib/googleCalendar";
import { 
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, 
  CheckSquare, FileText, DollarSign, AlertCircle, Clock, 
  Loader2, X, ChevronDown, Download, RefreshCw, ExternalLink, Globe,
  Plus, Video
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
  DialogFooter
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
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  
  // Google Calendar Integration State
  const [googleCalendars, setGoogleCalendars] = useState<any[]>([]);
  const [selectedGoogleCalendarId, setSelectedGoogleCalendarId] = useState<string>("");
  const [googleEvents, setGoogleEvents] = useState<CalendarEvent[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [upcomingDays, setUpcomingDays] = useState(7);

  // Estados para o Modal de Novo Evento
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<Date | null>(null);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [newEventData, setNewEventData] = useState({
    title: '',
    time: '',
    description: '',
    createMeet: false,
    saveToCRM: true,
  });

  useEffect(() => {
    if (user) {
      fetchAllData();
      if (session?.provider_token) {
        fetchGoogleCalendars();
      }
    }
  }, [user, session]);

  useEffect(() => {
    if (session?.provider_token && selectedGoogleCalendarId) {
      fetchGoogleEventsForPeriod();
    } else {
      setGoogleEvents([]);
    }
  }, [selectedGoogleCalendarId, currentDate]);

  const fetchGoogleCalendars = async () => {
    try {
      const calendars = await listUserCalendars(session!.provider_token!);
      setGoogleCalendars(calendars);
      const primary = calendars.find((c: any) => c.primary);
      if (primary && !selectedGoogleCalendarId) {
        setSelectedGoogleCalendarId(primary.id);
      }
    } catch (error) {
      console.error("Erro ao buscar calendários do Google:", error);
    }
  };

  const fetchGoogleEventsForPeriod = async () => {
    setLoadingGoogle(true);
    try {
      const monthStart = startOfMonth(currentDate);
      const monthEnd = endOfMonth(monthStart);
      const timeMin = startOfWeek(monthStart).toISOString();
      const timeMax = endOfWeek(monthEnd).toISOString();

      const items = await listGoogleEvents(session!.provider_token!, selectedGoogleCalendarId, timeMin, timeMax);
      
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
        supabase.from('tasks').select('*').eq('user_id', user?.id),
        supabase.from('contracts').select('*, opportunities(name)').eq('user_id', user?.id),
        supabase.from('transactions').select('*, clients:client_id(name)').eq('user_id', user?.id)
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
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/calendar',
          redirectTo: window.location.origin + '/agenda'
        }
      });
      if (error) throw error;
    } catch (error) {
      toast.error('Erro ao conectar com Google.');
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

  const upcomingEventsList = useMemo(() => {
    const today = startOfDay(new Date());
    const endDate = addDays(today, upcomingDays);
    return allEvents
      .filter(e => e.date >= today && e.date <= endDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [allEvents, upcomingDays]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

  // Ação de Clique no Dia do Calendário
  const handleDayClick = (day: Date) => {
    setSelectedDateForNewEvent(day);
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

      // Salva no Google Calendar se estiver conectado e a opção (ou Meet) estiver selecionada
      if (session?.provider_token && selectedGoogleCalendarId) {
        googleEventRes = await createGoogleCalendarEvent(
          session.provider_token,
          selectedGoogleCalendarId,
          {
            title: newEventData.title,
            description: newEventData.description,
            date: selectedDateForNewEvent!,
            time: newEventData.time,
            createMeet: newEventData.createMeet
          }
        );
        toast.success("Evento salvo no Google Calendar!");
        fetchGoogleEventsForPeriod();
      } else if (newEventData.createMeet) {
        toast.warning("Google Calendar não conectado. O link do Meet não pôde ser gerado.");
      }

      // Salva no CRM como Tarefa
      if (newEventData.saveToCRM) {
        let crmDescription = newEventData.description;
        if (googleEventRes?.hangoutLink) {
          crmDescription += `\n\n🔗 Link da Reunião (Meet): ${googleEventRes.hangoutLink}`;
        }

        let dueDate = selectedDateForNewEvent!;
        if (newEventData.time) {
          const [hours, minutes] = newEventData.time.split(':');
          dueDate = new Date(selectedDateForNewEvent!);
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

  if (loading) {
    return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Agenda CRM</h1>
            <p className="text-sm text-gray-500">Compromissos integrados com seu Google Calendar.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {session?.provider_token ? (
              <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl shadow-sm border border-gray-200">
                <Globe className="w-4 h-4 text-purple-500" />
                <select 
                  value={selectedGoogleCalendarId}
                  onChange={(e) => setSelectedGoogleCalendarId(e.target.value)}
                  className="bg-transparent text-sm font-bold text-gray-700 focus:outline-none cursor-pointer pr-2 max-w-[200px] truncate"
                >
                  <option value="">Nenhuma agenda selecionada</option>
                  {googleCalendars.map(cal => (
                    <option key={cal.id} value={cal.id}>{cal.summary}</option>
                  ))}
                </select>
                {loadingGoogle && <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-500" />}
              </div>
            ) : (
              <button 
                onClick={handleConnectGoogle}
                className="px-4 py-2.5 bg-white border border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-2 shadow-sm text-sm"
              >
                <img src="https://www.google.com/favicon.ico" className="w-4 h-4" alt="Google" />
                Conectar Google Calendar
              </button>
            )}

            <div className="flex flex-wrap items-center gap-4 bg-white px-4 py-2.5 rounded-xl shadow-sm border border-gray-200 text-sm font-medium text-gray-600">
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-orange-500"></div> CRM</div>
              <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div> Google</div>
            </div>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-6 h-6 text-orange-500" />
                <h2 className="text-xl font-bold text-gray-900 capitalize">
                  {format(currentDate, "MMMM yyyy", { locale: ptBR })}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={prevMonth} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={() => setCurrentDate(new Date())} className="px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-sm font-semibold text-gray-700 transition-colors">
                  Hoje
                </button>
                <button onClick={nextMonth} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 flex flex-col overflow-auto custom-scrollbar">
              <div className="grid grid-cols-7 bg-gray-50/80 border-b border-gray-100 shrink-0">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                  <div key={day} className="py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 flex-1 auto-rows-fr">
                {calendarDays.map((day, idx) => {
                  const isCurrentMonth = isSameMonth(day, currentDate);
                  const isDayToday = isToday(day);
                  const dayEvents = allEvents.filter(e => isSameDay(e.date, day));

                  return (
                    <div 
                      key={day.toString()} 
                      onClick={() => handleDayClick(day)}
                      className={`min-h-[120px] border-r border-b border-gray-100 p-1.5 transition-colors cursor-pointer group relative ${!isCurrentMonth ? 'bg-gray-50/50 opacity-50' : 'bg-white hover:bg-gray-50/50'}`}
                    >
                      <div className="absolute inset-0 border-2 border-transparent group-hover:border-orange-400/30 rounded-lg pointer-events-none transition-all z-10" />
                      
                      <div className="flex justify-between items-start mb-1 relative z-20">
                        <span className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-semibold ${isDayToday ? 'bg-orange-500 text-white shadow-sm' : 'text-gray-700'}`}>
                          {format(day, 'd')}
                        </span>
                        <div className="opacity-0 group-hover:opacity-100 p-1 bg-orange-50 text-orange-500 rounded-md transition-opacity" title="Criar Evento">
                          <Plus className="w-3 h-3" />
                        </div>
                      </div>
                      
                      <div className="space-y-1 mt-1 relative z-20">
                        {dayEvents.slice(0, 4).map(event => (
                          <div 
                            key={event.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(event); }}
                            className={`px-2 py-1 rounded-md border text-[11px] font-medium truncate cursor-pointer transition-all hover:shadow-sm ${event.bgClass} ${event.colorClass}`}
                            title={event.title}
                          >
                            {event.title}
                          </div>
                        ))}
                        {dayEvents.length > 4 && (
                          <div className="text-[10px] font-bold text-gray-400 pl-1">
                            + {dayEvents.length - 4} eventos
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="w-full lg:w-[320px] bg-white rounded-2xl shadow-sm border border-gray-200 flex flex-col shrink-0 h-[400px] lg:h-auto">
            <div className="p-5 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-gray-400" />
                <DropdownMenu>
                  <DropdownMenuTrigger className="flex items-center gap-1 font-bold text-gray-900 hover:text-orange-500 transition-colors focus:outline-none">
                    Próximos {upcomingDays} dias <ChevronDown className="w-4 h-4" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    {[7, 15, 30].map(d => (
                      <DropdownMenuItem key={d} onClick={() => setUpcomingDays(d)} className="cursor-pointer">
                        Próximos {d} dias
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-gray-50/30 relative">
              {upcomingEventsList.length > 0 ? (
                upcomingEventsList.map(event => (
                  <div 
                    key={`upc-${event.id}`}
                    onClick={() => setSelectedEvent(event)}
                    className="bg-white p-3 rounded-xl border border-gray-200 shadow-sm hover:border-orange-300 hover:shadow-md transition-all cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg shrink-0 mt-0.5 ${event.bgClass} ${event.colorClass.split(' ')[0]}`}>
                        {event.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 leading-tight group-hover:text-orange-600 transition-colors line-clamp-2">
                          {event.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 font-medium">
                          <span>{format(event.date, "dd MMM", { locale: ptBR })}</span>
                          <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                          <span>{event.type}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center px-4 opacity-70">
                  <CalendarIcon className="w-12 h-12 text-gray-300 mb-3" />
                  <p className="font-bold text-gray-700">Nenhum evento próximo</p>
                  <p className="text-xs text-gray-500 mt-1">Sua agenda para os próximos {upcomingDays} dias está livre.</p>
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
                {selectedDateForNewEvent && format(selectedDateForNewEvent, "EEEE, dd 'de' MMMM", { locale: ptBR })}
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
                  <div className={`p-2 rounded-lg ${session?.provider_token ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'}`}>
                    <Video className="w-4 h-4" />
                  </div>
                  <div>
                    <span className={`text-sm font-bold block ${session?.provider_token ? 'text-gray-900' : 'text-gray-400'}`}>Gerar Link do Meet</span>
                    <span className="text-[10px] text-gray-500 font-medium">Reunião em vídeo automática</span>
                  </div>
                </div>
                <input 
                  type="checkbox" 
                  checked={newEventData.createMeet}
                  onChange={e => setNewEventData({...newEventData, createMeet: e.target.checked})}
                  disabled={!session?.provider_token || !selectedGoogleCalendarId}
                  className="w-5 h-5 rounded border-gray-300 accent-blue-500 cursor-pointer disabled:opacity-50"
                />
              </label>

              {(!session?.provider_token || !selectedGoogleCalendarId) && (
                <div className="bg-orange-50 text-orange-700 p-2.5 rounded-lg text-xs font-medium border border-orange-100">
                  Conecte sua conta do Google e selecione uma agenda na tela anterior para poder usar o Google Meet.
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
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedEvent(null)} />
          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 overflow-hidden">
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

            <div className="p-6 space-y-4">
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
                  <div className="text-sm text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto custom-scrollbar">
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
          </div>
        </div>
      )}
    </Layout>
  );
}