
import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext.jsx';
import pb from '@/lib/pocketbaseClient.js';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card.jsx';
import { Button } from '@/components/ui/button.jsx';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog.jsx';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover.jsx';
import Sidebar from '@/components/Sidebar.jsx';
import Header from '@/components/Header.jsx';
import { Calendar as CalendarIcon, Clock, FileText, DollarSign, CheckSquare, AlertCircle, ChevronDown, Check } from 'lucide-react';

const AgendaPage = () => {
  const { currentUser } = useAuth();
  const [events, setEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // New state for period selection
  const [upcomingPeriod, setUpcomingPeriod] = useState(7);
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchAllEvents = async () => {
      if (!currentUser?.id) {
        if (isMounted) setIsLoading(false);
        return;
      }
      
      try {
        if (isMounted) setIsLoading(true);
        
        const [tasks, contracts, transactions] = await Promise.all([
          pb.collection('tasks').getFullList({ filter: `userId = "${currentUser.id}" && dueDate != ""`, $autoCancel: false }),
          pb.collection('contracts').getFullList({ filter: `userId = "${currentUser.id}" && startDate != ""`, $autoCancel: false }),
          pb.collection('transactions').getFullList({ filter: `userId = "${currentUser.id}"`, expand: 'clientId', $autoCancel: false })
        ]);

        if (!isMounted) return;

        const formattedTasks = tasks.map(t => ({
          id: `task-${t.id}`,
          originalId: t.id,
          title: t.title || 'Tarefa sem título',
          date: new Date(t.dueDate),
          type: 'Tarefa',
          status: t.status,
          color: 'bg-orange-500',
          bgColor: 'bg-orange-500/20',
          textColor: 'text-orange-700 dark:text-orange-400',
          icon: <CheckSquare className="w-4 h-4" />,
          description: t.description
        }));

        const formattedContracts = contracts.map(c => ({
          id: `contract-${c.id}`,
          originalId: c.id,
          title: `Contrato: ${c.value ? `R$ ${c.value}` : 'Sem valor'}`,
          date: new Date(c.startDate),
          endDate: c.endDate ? new Date(c.endDate) : null,
          type: 'Contrato',
          status: c.status,
          color: 'bg-blue-500',
          bgColor: 'bg-blue-500/20',
          textColor: 'text-blue-700 dark:text-blue-400',
          icon: <FileText className="w-4 h-4" />,
          description: `Status: ${c.status} | Assinatura: ${c.signatureStatus}`
        }));

        const formattedTransactions = [];
        
        transactions.forEach(t => {
          const clientName = t.expand?.clientId?.name || 'Sem cliente';
          
          if (t.isInstallment && t.installments) {
            t.installments.forEach(inst => {
              if (inst.status !== 'Pago') {
                const isOverdue = new Date(inst.dueDate) < new Date(new Date().setHours(0,0,0,0));
                formattedTransactions.push({
                  id: `trans-${t.id}-inst-${inst.id}`,
                  originalId: t.id,
                  title: `Parcela ${inst.number}/${t.installmentCount} - ${clientName}`,
                  date: new Date(inst.dueDate),
                  type: 'Parcela',
                  status: isOverdue ? 'Atrasado' : 'Pendente',
                  color: isOverdue ? 'bg-red-500' : 'bg-yellow-500',
                  bgColor: isOverdue ? 'bg-red-500/20' : 'bg-yellow-500/20',
                  textColor: isOverdue ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400',
                  icon: isOverdue ? <AlertCircle className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />,
                  description: `Valor: R$ ${inst.amount} | Transação: ${t.description}`
                });
              }
            });
          } else {
            if (t.status !== 'Recebido' && t.date) {
              const isOverdue = t.status === 'Atrasado' || new Date(t.date) < new Date(new Date().setHours(0,0,0,0));
              formattedTransactions.push({
                id: `trans-${t.id}`,
                originalId: t.id,
                title: `${t.description} - ${clientName}`,
                date: new Date(t.date),
                type: 'Transação',
                status: isOverdue ? 'Atrasado' : 'Pendente',
                color: isOverdue ? 'bg-red-500' : 'bg-yellow-500',
                bgColor: isOverdue ? 'bg-red-500/20' : 'bg-yellow-500/20',
                textColor: isOverdue ? 'text-red-700 dark:text-red-400' : 'text-yellow-700 dark:text-yellow-400',
                icon: isOverdue ? <AlertCircle className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />,
                description: `Valor: R$ ${t.amount} | Status: ${t.status}`
              });
            }
          }
        });

        const allEvents = [...formattedTasks, ...formattedContracts, ...formattedTransactions]
          .filter(e => !isNaN(e.date.getTime()));

        setEvents(allEvents);
      } catch (error) {
        console.error('Erro ao buscar eventos:', error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchAllEvents();

    pb.collection('tasks').subscribe('*', fetchAllEvents);
    pb.collection('contracts').subscribe('*', fetchAllEvents);
    pb.collection('transactions').subscribe('*', fetchAllEvents);

    return () => {
      isMounted = false;
      pb.collection('tasks').unsubscribe('*');
      pb.collection('contracts').unsubscribe('*');
      pb.collection('transactions').unsubscribe('*');
    };
  }, [currentUser?.id]);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDayOfMonth = (y, m) => new Date(y, m, 1).getDay();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));

  const handleEventClick = (event) => {
    setSelectedEvent(event);
    setIsDialogOpen(true);
  };

  const calendarCells = [];
  for (let i = 0; i < firstDay; i++) {
    calendarCells.push(<div key={`empty-${i}`} className="h-28 border border-border/50 bg-muted/10"></div>);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const isToday = new Date().toDateString() === new Date(year, month, day).toDateString();
    
    const dayEvents = events.filter(e => 
      e.date.getDate() === day && 
      e.date.getMonth() === month && 
      e.date.getFullYear() === year
    );

    calendarCells.push(
      <div key={`day-${day}`} className={`h-28 border border-border/50 p-2 overflow-y-auto transition-colors ${isToday ? 'bg-primary/5' : 'bg-card hover:bg-muted/30'}`}>
        <div className={`text-sm font-medium mb-1 w-7 h-7 flex items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground'}`}>
          {day}
        </div>
        <div className="space-y-1.5">
          {dayEvents.map(event => (
            <div 
              key={event.id} 
              onClick={() => handleEventClick(event)}
              className={`text-xs px-2 py-1 rounded-md cursor-pointer flex items-center gap-1.5 truncate transition-transform hover:scale-[0.98] ${event.bgColor} ${event.textColor}`} 
              title={event.title}
            >
              <div className={`w-1.5 h-1.5 rounded-full ${event.color} shrink-0`}></div>
              <span className="truncate font-medium">{event.title}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Calculate end date based on selected period
  const nextPeriodDate = new Date(today);
  nextPeriodDate.setDate(today.getDate() + upcomingPeriod);

  const upcomingEvents = events
    .filter(e => e.date >= today && e.date <= nextPeriodDate)
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  return (
    <>
      <Helmet>
        <title>Agenda CRM - Frame Pro</title>
        <meta name="description" content="Gerencie seus compromissos, contratos e tarefas" />
      </Helmet>

      <div className="flex h-screen bg-background">
        <Sidebar />
        
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-7xl mx-auto space-y-6">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Agenda CRM</h1>
                  <p className="text-muted-foreground mt-1">Acompanhe tarefas, contratos e transações</p>
                </div>
                <div className="flex items-center gap-3 text-sm flex-wrap">
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-orange-500"></div> Tarefas</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Contratos</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-yellow-500"></div> Pagamentos Pendentes</div>
                  <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-red-500"></div> Pagamentos Atrasados</div>
                </div>
              </div>

              <div className="grid lg:grid-cols-4 gap-6">
                
                <div className="lg:col-span-3 space-y-4">
                  <Card className="shadow-sm border-border/50">
                    <CardHeader className="flex flex-row items-center justify-between py-4 border-b border-border/50 bg-card">
                      <CardTitle className="text-xl flex items-center gap-2 font-semibold">
                        <CalendarIcon className="h-5 w-5 text-primary" />
                        {monthNames[month]} {year}
                      </CardTitle>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={prevMonth}>Anterior</Button>
                        <Button variant="outline" size="sm" onClick={nextMonth}>Próximo</Button>
                      </div>
                    </CardHeader>
                    <CardContent className="p-0">
                      <div className="grid grid-cols-7 gap-0 bg-muted/30 border-b border-border/50">
                        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                          <div key={day} className="text-center text-sm font-medium text-muted-foreground py-3">
                            {day}
                          </div>
                        ))}
                      </div>
                      <div className="grid grid-cols-7 gap-0 bg-card">
                        {calendarCells}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="space-y-6">
                  <Card className="shadow-sm border-border/50">
                    <CardHeader className="pb-3">
                      <Popover open={isPeriodOpen} onOpenChange={setIsPeriodOpen}>
                        <PopoverTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-auto p-1.5 -ml-1.5 hover:bg-muted/50 font-semibold text-lg flex items-center gap-2 text-foreground"
                          >
                            <Clock className="h-5 w-5 text-primary" />
                            Próximos {upcomingPeriod} dias
                            <ChevronDown className="h-4 w-4 opacity-50" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-40 p-1" align="start">
                          <div className="flex flex-col">
                            {[7, 14, 30].map(days => (
                              <Button
                                key={days}
                                variant="ghost"
                                className={`justify-start font-normal ${upcomingPeriod === days ? 'bg-muted' : ''}`}
                                onClick={() => { 
                                  setUpcomingPeriod(days); 
                                  setIsPeriodOpen(false); 
                                }}
                              >
                                {days} dias
                                {upcomingPeriod === days && <Check className="ml-auto h-4 w-4" />}
                              </Button>
                            ))}
                          </div>
                        </PopoverContent>
                      </Popover>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="space-y-3">
                          {[1, 2, 3].map(i => (
                            <div key={i} className="h-16 bg-muted animate-pulse rounded-lg"></div>
                          ))}
                        </div>
                      ) : upcomingEvents.length > 0 ? (
                        <div className="space-y-3">
                          {upcomingEvents.map(event => (
                            <div 
                              key={`upcoming-${event.id}`} 
                              onClick={() => handleEventClick(event)}
                              className="p-3 rounded-xl border border-border/50 bg-card hover:shadow-md transition-all cursor-pointer group"
                            >
                              <div className="flex items-start gap-3">
                                <div className={`p-2 rounded-lg ${event.bgColor} ${event.textColor} shrink-0 group-hover:scale-110 transition-transform`}>
                                  {event.icon}
                                </div>
                                <div>
                                  <p className="font-medium text-sm leading-tight line-clamp-2">{event.title}</p>
                                  <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                    {event.date.toLocaleDateString('pt-BR')} • {event.type}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-muted-foreground bg-muted/10 rounded-xl border border-dashed border-border/50">
                          <CalendarIcon className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p className="text-sm font-medium">Nenhum evento próximo</p>
                          <p className="text-xs mt-1 opacity-70">Seus próximos {upcomingPeriod} dias estão livres.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

              </div>
            </div>
          </main>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${selectedEvent?.bgColor} ${selectedEvent?.textColor}`}>
                {selectedEvent?.icon}
              </div>
              <DialogTitle className="text-xl">{selectedEvent?.title}</DialogTitle>
            </div>
            <DialogDescription>
              Detalhes do evento selecionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedEvent && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <p className="font-medium">{selectedEvent.type}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Data</p>
                  <p className="font-medium">{selectedEvent.date.toLocaleDateString('pt-BR')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">{selectedEvent.status || 'N/A'}</p>
                </div>
                {selectedEvent.endDate && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Data Final</p>
                    <p className="font-medium">{selectedEvent.endDate.toLocaleDateString('pt-BR')}</p>
                  </div>
                )}
              </div>
              
              {selectedEvent.description && (
                <div className="space-y-1 pt-4 border-t border-border/50">
                  <p className="text-sm text-muted-foreground">Descrição / Detalhes</p>
                  <p className="text-sm bg-muted/30 p-3 rounded-lg border border-border/50">
                    {selectedEvent.description}
                  </p>
                </div>
              )}
            </div>
          )}
          
          <div className="flex justify-end">
            <Button onClick={() => setIsDialogOpen(false)}>Fechar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AgendaPage;
