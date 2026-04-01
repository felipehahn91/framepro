import React, { useEffect, useState } from 'react';
import { Bell, Check, Trash2, Info, CheckCircle2, AlertTriangle, XCircle, ExternalLink } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  content: string;
  type: string;
  is_read: boolean;
  created_at: string;
  related_entity_type?: string;
  related_entity_id?: string;
}

export const Notifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      const subscription = supabase
        .channel('public:notifications')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, (payload) => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching notifications:', error);
      return;
    }

    setNotifications(data || []);
    setUnreadCount((data || []).filter(n => !n.is_read).length);
  };

  const markAsRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    fetchNotifications();
  };

  const deleteNotification = async (id: string) => {
    await supabase.from('notifications').delete().eq('id', id);
    fetchNotifications();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'error': return <XCircle className="w-5 h-5 text-red-500" />;
      default: return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getLink = (type?: string, id?: string) => {
    if (!type || !id) return null;
    switch (type) {
      case 'contract': return `/contratos`;
      case 'transaction': return `/financeiro`;
      case 'opportunity': return `/oportunidades`;
      default: return null;
    }
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors outline-none focus:ring-2 focus:ring-orange-200">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 sm:w-96 p-0 shadow-xl border-gray-100 rounded-2xl overflow-hidden z-50">
        <div className="flex items-center justify-between p-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="font-bold text-gray-900">Notificações</h3>
          {unreadCount > 0 && (
            <button 
              onClick={markAllAsRead}
              className="text-xs text-orange-600 hover:text-orange-700 font-semibold flex items-center gap-1 transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Marcar todas lidas
            </button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
          {notifications.length === 0 ? (
            <div className="p-8 text-center flex flex-col items-center justify-center text-gray-400">
              <Bell className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">Nenhuma notificação por enquanto.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {notifications.map((notification) => {
                const link = getLink(notification.related_entity_type, notification.related_entity_id);
                return (
                  <div 
                    key={notification.id} 
                    className={`p-4 flex gap-4 transition-colors hover:bg-gray-50 ${notification.is_read ? 'opacity-70' : 'bg-orange-50/30'}`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {getIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className={`text-sm font-semibold text-gray-900 ${!notification.is_read ? 'font-bold' : ''}`}>
                          {notification.title}
                        </h4>
                        <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">
                          {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true, locale: ptBR })}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed mb-2">
                        {notification.content}
                      </p>
                      
                      <div className="flex items-center gap-3 mt-2">
                        {!notification.is_read && (
                          <button 
                            onClick={() => markAsRead(notification.id)}
                            className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 transition-colors"
                          >
                            Marcar como lida
                          </button>
                        )}
                        {link && (
                          <Link 
                            to={link}
                            onClick={() => setIsOpen(false)}
                            className="text-[11px] font-semibold text-gray-600 hover:text-gray-900 flex items-center gap-1 transition-colors"
                          >
                            Ver detalhes <ExternalLink className="w-3 h-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteNotification(notification.id)}
                      className="shrink-0 text-gray-300 hover:text-red-500 transition-colors h-fit p-1 rounded-md hover:bg-red-50"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
