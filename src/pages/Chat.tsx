import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchChats, fetchMessages, sendTextMessage } from "@/lib/evolution";
import { 
  Search, Send, Loader2, MessageSquare, User, Smartphone, AlertCircle, ArrowLeft, Image as ImageIcon
} from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Chat() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [waInstance, setWaInstance] = useState<any>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  
  // Chat States
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChat, setSelectedChat] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState("");
  const [loadingChats, setLoadingChats] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  // Inicialização: Verifica a instância do WhatsApp
  useEffect(() => {
    if (user) loadInstance();
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, [user]);

  const loadInstance = async () => {
    try {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'connected')
        .single();
      
      if (data) {
        setWaInstance(data);
        loadChats(data.instance_name);
        
        // Polling para simular o Webhook em tempo real
        pollingInterval.current = setInterval(() => {
          loadChats(data.instance_name, true);
        }, 5000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingConfig(false);
    }
  };

  // Carrega a lista de conversas
  const loadChats = async (instanceName: string, isSilent = false) => {
    if (!isSilent) setLoadingChats(true);
    try {
      const res = await fetchChats(instanceName);
      
      // Evolution API costuma retornar em array direto ou dentro de objects
      const chatsList = Array.isArray(res) ? res : (res.data || res.chats || []);
      
      // Trata a estrutura retornada
      const parsedChats = chatsList.map((c: any) => ({
        id: c.remoteJid || c.id,
        name: c.name || c.pushName || (c.remoteJid || '').split('@')[0] || "Desconhecido",
        unreadCount: c.unreadCount || 0,
        timestamp: c.conversationTimestamp ? new Date(c.conversationTimestamp * 1000) : new Date()
      })).filter((c: any) => c.id && c.id.includes('@s.whatsapp.net')) // Filtra apenas contatos comuns, exclui grupos por enquanto
      .sort((a: any, b: any) => b.timestamp.getTime() - a.timestamp.getTime());
      
      setChats(parsedChats);
    } catch (error) {
      if (!isSilent) console.error("Não foi possível carregar as conversas.");
    } finally {
      if (!isSilent) setLoadingChats(false);
    }
  };

  // Carrega mensagens quando um chat é selecionado ou via polling
  useEffect(() => {
    if (selectedChat && waInstance) {
      loadMessages(waInstance.instance_name, selectedChat.id);
    }
  }, [selectedChat]);

  // Polling silencioso das mensagens da conversa atual
  useEffect(() => {
    const msgInterval = setInterval(() => {
      if (selectedChat && waInstance) {
        loadMessages(waInstance.instance_name, selectedChat.id, true);
      }
    }, 4000);
    return () => clearInterval(msgInterval);
  }, [selectedChat, waInstance]);

  const loadMessages = async (instanceName: string, remoteJid: string, isSilent = false) => {
    if (!isSilent) setLoadingMessages(true);
    try {
      const res = await fetchMessages(instanceName, remoteJid);
      const msgsData = Array.isArray(res) ? res : (res.data || res.messages || []);
      
      const parsedMessages = msgsData.map((m: any) => {
        // Tenta extrair o texto de várias fontes possíveis (incluindo legendas de imagens/vídeos)
        let text = m.message?.conversation || 
                   m.message?.extendedTextMessage?.text || 
                   m.message?.imageMessage?.caption || 
                   m.message?.videoMessage?.caption || 
                   m.text || "";

        // Se for mídia/anexo sem legenda, coloca um aviso genérico
        if (!text && m.message) {
          if (m.message.imageMessage) text = "📷 Imagem";
          else if (m.message.videoMessage) text = "🎥 Vídeo";
          else if (m.message.audioMessage) text = "🎵 Áudio";
          else if (m.message.documentMessage) text = "📄 Documento";
          else if (m.message.stickerMessage) text = "✨ Figurinha";
          else text = "📎 Mídia/Anexo";
        }

        return {
          id: m.key?.id || m.id,
          text: text,
          fromMe: m.key?.fromMe || m.fromMe || false,
          timestamp: m.messageTimestamp ? new Date(m.messageTimestamp * 1000) : new Date(m.timestamp || Date.now())
        };
      }).sort((a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime());

      setMessages(parsedMessages);
      
      // Rola para o final apenas se não for uma atualização silenciosa ou se o usuário não tiver subido muito a tela
      if (!isSilent) {
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (error) {
      if (!isSilent) toast.error("Não foi possível carregar as mensagens.");
    } finally {
      if (!isSilent) setLoadingMessages(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedChat || !waInstance) return;

    const messageText = inputText.trim();
    setInputText("");
    
    // Atualização otimista
    const tempMsg = {
      id: crypto.randomUUID(),
      text: messageText,
      fromMe: true,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, tempMsg]);
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

    setSending(true);
    try {
      await sendTextMessage(waInstance.instance_name, selectedChat.id, messageText);
    } catch (error) {
      toast.error("Falha ao enviar mensagem.");
      // Remove a mensagem em caso de falha
      setMessages(prev => prev.filter(m => m.id !== tempMsg.id));
    } finally {
      setSending(false);
    }
  };

  const filteredChats = chats.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));

  // Se não estiver conectado, mostra tela de aviso
  if (loadingConfig) {
    return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  if (!waInstance) {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-orange-100 rounded-full flex items-center justify-center mb-6">
            <Smartphone className="w-10 h-10 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">WhatsApp não conectado</h2>
          <p className="text-gray-500 mb-8">Para usar o WebChat do CRM, você precisa ler o QR Code e conectar sua conta na aba de Configurações.</p>
          <button 
            onClick={() => navigate('/configuracoes')}
            className="px-6 py-3 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors shadow-sm"
          >
            Ir para Configurações
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="h-full flex flex-col bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        
        <div className="flex flex-1 overflow-hidden">
          {/* SIDEBAR DE CHATS */}
          <div className={`w-full md:w-80 border-r border-gray-200 flex flex-col bg-gray-50 shrink-0 ${selectedChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="p-4 bg-white border-b border-gray-200 shrink-0">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Conversas</h2>
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar contatos..." 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-100 border-none rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {loadingChats ? (
                <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
              ) : filteredChats.length > 0 ? (
                filteredChats.map(chat => (
                  <div 
                    key={chat.id} 
                    onClick={() => setSelectedChat(chat)}
                    className={`flex items-center gap-3 p-4 cursor-pointer transition-colors border-b border-gray-100 ${selectedChat?.id === chat.id ? 'bg-orange-50' : 'hover:bg-gray-100 bg-white'}`}
                  >
                    <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-500 font-bold uppercase overflow-hidden">
                      {chat.profilePicUrl ? <img src={chat.profilePicUrl} alt="Avatar" className="w-full h-full object-cover" /> : <User className="w-6 h-6" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <h3 className="font-bold text-gray-900 text-sm truncate">{chat.name}</h3>
                        <span className="text-[10px] text-gray-400">
                          {chat.timestamp.toLocaleDateString() === new Date().toLocaleDateString() 
                            ? chat.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                            : chat.timestamp.toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500 truncate font-mono">{chat.id.split('@')[0]}</p>
                        {chat.unreadCount > 0 && (
                          <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            {chat.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm">
                  Nenhuma conversa encontrada.
                </div>
              )}
            </div>
          </div>

          {/* ÁREA DE MENSAGENS */}
          <div className={`flex-1 flex flex-col bg-[#EFEAE2] relative ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
            {/* Background WhatsApp pattern simulated with CSS */}
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] pointer-events-none mix-blend-multiply"></div>
            
            {selectedChat ? (
              <>
                {/* Header do Chat Ativo */}
                <div className="bg-white border-b border-gray-200 p-4 flex items-center gap-4 shrink-0 z-10 shadow-sm">
                  <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-500">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-gray-900 leading-tight">{selectedChat.name}</h2>
                    <p className="text-xs text-gray-500 font-mono">{selectedChat.id.split('@')[0]}</p>
                  </div>
                </div>

                {/* Lista de Mensagens */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 z-10 custom-scrollbar">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-gray-400" /></div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.fromMe;
                      // Detecta se o texto é de mídia baseado nos nossos fallbacks
                      const isMedia = msg.text.startsWith('📷') || msg.text.startsWith('🎥') || msg.text.startsWith('🎵') || msg.text.startsWith('📄') || msg.text.startsWith('📎') || msg.text.startsWith('✨');
                      
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 relative shadow-sm flex flex-col ${
                            isMe ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'
                          }`}>
                            {isMedia && (
                              <div className="flex items-center gap-2 mb-1 text-gray-500 bg-black/5 rounded p-1.5 w-fit">
                                <span className="text-[13px] font-medium">{msg.text.split(' ')[0]}</span>
                                <span className="text-xs italic">{msg.text.substring(2)}</span>
                              </div>
                            )}
                            {!isMedia && (
                              <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                            )}
                            <div className="text-[10px] text-gray-500 text-right mt-1 font-medium">
                              {msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="bg-gray-50 p-4 z-10 shrink-0">
                  <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                    <input 
                      type="text"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Digite uma mensagem"
                      className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400"
                    />
                    <button 
                      type="submit" 
                      disabled={!inputText.trim() || sending}
                      className="w-12 h-12 bg-orange-400 text-white rounded-xl flex items-center justify-center hover:bg-orange-500 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                    >
                      {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                    </button>
                  </form>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <MessageSquare className="w-10 h-10 text-gray-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">WebChat Frame Pro</h2>
                <p className="text-gray-500 max-w-md">Selecione uma conversa na lateral para começar a enviar mensagens conectadas ao seu WhatsApp.</p>
                <div className="mt-6 text-sm text-gray-400 max-w-md bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                  <p><strong>Aviso sobre histórico:</strong> A API baixa as mensagens em segundo plano. Se não ver mensagens antigas imediatamente, elas podem ainda estar sendo sincronizadas do seu celular.</p>
                </div>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </Layout>
  );
}