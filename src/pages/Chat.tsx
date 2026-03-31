import React, { useState, useEffect, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { fetchChats as evFetchChats, fetchMessages as evFetchMessages, sendTextMessage, sendMediaMessage, sendWhatsAppAudio } from "@/lib/evolution";
import { 
  Search, Send, Loader2, MessageSquare, User, Smartphone, ArrowLeft, RefreshCw, CheckCircle2, Paperclip, Mic, X, Trash2, Square
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
  
  // Input States
  const [inputText, setInputText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncingMessages, setSyncingMessages] = useState(false);

  // Mídia States
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedMedia, setSelectedMedia] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);

  // Gravação de Áudio States
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadInstance();
      loadChatsFromDb();
    }
  }, [user]);

  useEffect(() => {
    if (!user) return;

    const chatsChannel = supabase.channel('whatsapp_chats_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_chats', filter: `user_id=eq.${user.id}` }, 
        () => loadChatsFromDb()
      ).subscribe();

    const messagesChannel = supabase.channel('whatsapp_messages_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_messages', filter: `user_id=eq.${user.id}` }, 
        (payload) => {
          const newPayload = payload.new as any;
          if (selectedChat && newPayload && newPayload.chat_id === selectedChat.id) {
             if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
               setMessages(prev => {
                 const exists = prev.find(m => m.message_id === newPayload.message_id);
                 if (exists) return prev.map(m => m.message_id === newPayload.message_id ? newPayload : m);
                 return [...prev, newPayload].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
               });
               setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
             }
          }
        }
      ).subscribe();

    return () => {
      supabase.removeChannel(chatsChannel);
      supabase.removeChannel(messagesChannel);
    };
  }, [user, selectedChat]);

  // Cronômetro do Áudio
  useEffect(() => {
    let interval: any;
    if (isRecording) {
      interval = setInterval(() => setRecordingTime(p => p + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording]);

  const loadInstance = async () => {
    try {
      const { data } = await supabase.from('whatsapp_instances').select('*').eq('user_id', user?.id).eq('status', 'connected').single();
      if (data) setWaInstance(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingConfig(false);
    }
  };

  const loadChatsFromDb = async () => {
    try {
      const { data, error } = await supabase.from('whatsapp_chats').select('*').eq('user_id', user?.id).order('last_message_time', { ascending: false });
      if (error && error.code !== '42P01') throw error;
      setChats(data || []);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (selectedChat) loadMessagesFromDb(selectedChat.id);
  }, [selectedChat]);

  const loadMessagesFromDb = async (chatId: string) => {
    try {
      const { data, error } = await supabase.from('whatsapp_messages').select('*').eq('chat_id', chatId).order('timestamp', { ascending: true });
      if (error && error.code !== '42P01') throw error;
      setMessages(data || []);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (error) {
      console.error("Erro ao carregar mensagens locais.");
    }
  };

  const syncChatsWithEvolution = async () => {
    if (!waInstance) return;
    setSyncing(true);
    try {
      const res = await evFetchChats(waInstance.instance_name);
      const chatsList = Array.isArray(res) ? res : (res.data || res.chats || []);
      const toUpsert = chatsList.filter((c: any) => (c.remoteJid || c.id)?.includes('@s.whatsapp.net')).map((c: any) => {
          const jid = c.remoteJid || c.id;
          return {
            user_id: user?.id,
            instance_name: waInstance.instance_name,
            remote_jid: jid,
            name: c.name || c.pushName || jid.split('@')[0],
            last_message_time: c.conversationTimestamp ? new Date(c.conversationTimestamp * 1000).toISOString() : new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
      });

      if (toUpsert.length > 0) {
        await supabase.from('whatsapp_chats').upsert(toUpsert, { onConflict: 'user_id,remote_jid' });
        await loadChatsFromDb();
        toast.success("Conversas sincronizadas com sucesso!");
      }
    } catch (error) {
      toast.error("Falha ao puxar conversas antigas da API.");
    } finally {
      setSyncing(false);
    }
  };

  const syncMessagesWithEvolution = async () => {
    if (!waInstance || !selectedChat) return;
    setSyncingMessages(true);
    try {
      const res = await evFetchMessages(waInstance.instance_name, selectedChat.remote_jid);
      const msgsData = Array.isArray(res) ? res : (res.data || res.messages || []);
      const toUpsert = msgsData.map((m: any) => {
        let text = m.message?.conversation || m.message?.extendedTextMessage?.text || m.message?.imageMessage?.caption || m.message?.videoMessage?.caption || m.text || "";
        if (!text && m.message) {
          if (m.message.imageMessage) text = "📷 Imagem";
          else if (m.message.videoMessage) text = "🎥 Vídeo";
          else if (m.message.audioMessage) text = "🎵 Áudio";
          else if (m.message.documentMessage) text = "📄 Documento";
          else text = "📎 Mídia";
        }
        return {
          user_id: user?.id,
          chat_id: selectedChat.id,
          message_id: m.key?.id || m.id || crypto.randomUUID(),
          remote_jid: selectedChat.remote_jid,
          text: text,
          from_me: m.key?.fromMe || m.fromMe || false,
          timestamp: m.messageTimestamp ? new Date(m.messageTimestamp * 1000).toISOString() : new Date().toISOString()
        };
      });

      if (toUpsert.length > 0) {
        await supabase.from('whatsapp_messages').upsert(toUpsert, { onConflict: 'user_id,message_id' });
        await loadMessagesFromDb(selectedChat.id);
        toast.success("Histórico da conversa atualizado!");
      }
    } catch (error) {
      toast.error("Falha ao puxar histórico antigo desta conversa.");
    } finally {
      setSyncingMessages(false);
    }
  };

  // --- AUDIO RECORDING ---
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.current.push(e.data);
      };
      mediaRecorder.current.onstop = () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/ogg; codecs=opus' });
        audioChunks.current = [];
        sendAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };
      mediaRecorder.current.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (e) {
      toast.error("Permissão de microfone negada ou indisponível.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder.current && isRecording) {
       mediaRecorder.current.onstop = () => { /* Prevent send */ };
       mediaRecorder.current.stop();
       setIsRecording(false);
       audioChunks.current = [];
    }
  };

  const sendAudioBlob = async (blob: Blob) => {
    if (!selectedChat || !waInstance) return;
    setSending(true);
    try {
      // 1. Upload local para Supabase
      const fileName = `${user?.id}/chat/${crypto.randomUUID()}.ogg`;
      await supabase.storage.from('contract_images').upload(fileName, blob, { contentType: 'audio/ogg' });
      const { data: { publicUrl } } = supabase.storage.from('contract_images').getPublicUrl(fileName);
      
      // 2. Criação Otimista
      const tempId = crypto.randomUUID();
      const optimisticMsg = {
          id: tempId,
          message_id: tempId,
          chat_id: selectedChat.id,
          text: `[AUDIO]${publicUrl}`,
          from_me: true,
          timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

      // 3. Lê Base64 e Envia para Evolution API
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const base64Data = (reader.result as string).split(',')[1];
          const res = await sendWhatsAppAudio(waInstance.instance_name, selectedChat.remote_jid, base64Data);
          
          const realId = res?.key?.id || tempId;
          
          // 4. Salva no DB local
          await supabase.from('whatsapp_messages').insert({
            ...optimisticMsg,
            id: realId,
            message_id: realId,
            user_id: user?.id,
            remote_jid: selectedChat.remote_jid
          });
          
          setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: realId, message_id: realId } : m));
        } catch(err: any) {
          toast.error("Erro ao enviar áudio pela API.");
          setMessages(prev => prev.filter(m => m.id !== tempId));
        } finally {
          setSending(false);
        }
      };
    } catch (err) {
      toast.error("Erro ao processar áudio.");
      setSending(false);
    }
  };

  // --- SELEÇÃO DE MÍDIA ---
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) return toast.error("O arquivo deve ter no máximo 15MB.");
      setSelectedMedia(file);
      setMediaPreview(URL.createObjectURL(file));
    }
  };

  // --- ENVIO DE TEXTO E IMAGENS ---
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if ((!inputText.trim() && !selectedMedia) || !selectedChat || !waInstance) return;

    const messageText = inputText.trim();
    const mediaToSend = selectedMedia;
    
    setInputText("");
    setSelectedMedia(null);
    setMediaPreview(null);
    
    setSending(true);
    try {
      if (mediaToSend) {
        // Envio de Mídia
        const fileExt = mediaToSend.name.split('.').pop();
        const fileName = `${user?.id}/chat/${crypto.randomUUID()}.${fileExt}`;
        const isVideo = mediaToSend.type.startsWith('video/');
        
        await supabase.storage.from('contract_images').upload(fileName, mediaToSend);
        const { data: { publicUrl } } = supabase.storage.from('contract_images').getPublicUrl(fileName);
        
        const tempId = crypto.randomUUID();
        const textToSave = isVideo ? `[VIDEO]${publicUrl} ${messageText}`.trim() : `[IMAGE]${publicUrl} ${messageText}`.trim();
        
        const optimisticMsg = {
            id: tempId,
            message_id: tempId,
            chat_id: selectedChat.id,
            text: textToSave,
            from_me: true,
            timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        const reader = new FileReader();
        reader.readAsDataURL(mediaToSend);
        reader.onloadend = async () => {
          try {
            const base64Data = (reader.result as string).split(',')[1];
            const res = await sendMediaMessage(waInstance.instance_name, selectedChat.remote_jid, base64Data, isVideo ? 'video' : 'image', mediaToSend.type, messageText);
            
            const realId = res?.key?.id || tempId;
            await supabase.from('whatsapp_messages').insert({
              ...optimisticMsg,
              id: realId,
              message_id: realId,
              user_id: user?.id,
              remote_jid: selectedChat.remote_jid
            });
            setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: realId, message_id: realId } : m));
          } catch(err) {
            toast.error("Erro ao enviar mídia.");
            setMessages(prev => prev.filter(m => m.id !== tempId));
          } finally {
            setSending(false);
          }
        };

      } else {
        // Envio de Texto
        const tempId = crypto.randomUUID();
        const optimisticMsg = {
          id: tempId,
          message_id: tempId,
          chat_id: selectedChat.id,
          text: messageText,
          from_me: true,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prev => [...prev, optimisticMsg]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);

        const res = await sendTextMessage(waInstance.instance_name, selectedChat.remote_jid, messageText);
        const realId = res?.key?.id || tempId;
        
        await supabase.from('whatsapp_messages').insert({
          ...optimisticMsg,
          id: realId,
          message_id: realId,
          user_id: user?.id,
          remote_jid: selectedChat.remote_jid
        });
        
        setMessages(prev => prev.map(m => m.id === tempId ? { ...m, id: realId, message_id: realId } : m));
        setSending(false);
      }
    } catch (error: any) {
      toast.error(`Falha: ${error.message || 'Erro desconhecido'}`);
      setSending(false);
    }
  };

  const renderMessageContent = (text: string) => {
    if (text.startsWith('[IMAGE]')) {
      const spaceIdx = text.indexOf(' ');
      const url = spaceIdx > -1 ? text.substring(7, spaceIdx) : text.substring(7);
      const caption = spaceIdx > -1 ? text.substring(spaceIdx + 1) : '';
      return (
        <div className="flex flex-col gap-1">
          <img src={url} alt="Imagem" className="max-w-[200px] sm:max-w-[250px] rounded-lg object-cover" />
          {caption && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{caption}</p>}
        </div>
      );
    }
    if (text.startsWith('[AUDIO]')) {
      const url = text.substring(7);
      return <audio controls src={url} className="w-[200px] sm:w-[250px] h-10 rounded" />;
    }
    if (text.startsWith('[VIDEO]')) {
      const spaceIdx = text.indexOf(' ');
      const url = spaceIdx > -1 ? text.substring(7, spaceIdx) : text.substring(7);
      const caption = spaceIdx > -1 ? text.substring(spaceIdx + 1) : '';
      return (
        <div className="flex flex-col gap-1">
          <video controls src={url} className="max-w-[200px] sm:max-w-[250px] rounded-lg object-cover" />
          {caption && <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{caption}</p>}
        </div>
      );
    }
    return <p className="text-[15px] leading-relaxed whitespace-pre-wrap">{text}</p>;
  }

  const formatRecTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const filteredChats = chats.filter(c => c.name?.toLowerCase().includes(searchQuery.toLowerCase()));

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
            <div className="p-4 bg-white border-b border-gray-200 shrink-0 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Conversas</h2>
                <button 
                  onClick={syncChatsWithEvolution} 
                  disabled={syncing}
                  className="p-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-600 transition-colors flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide"
                >
                  {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />} Sync
                </button>
              </div>
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
              {filteredChats.length > 0 ? (
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
                          {new Date(chat.last_message_time).toLocaleDateString() === new Date().toLocaleDateString() 
                            ? new Date(chat.last_message_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) 
                            : new Date(chat.last_message_time).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <p className="text-xs text-gray-500 truncate">{chat.last_message || '...'}</p>
                        {chat.unread_count > 0 && (
                          <span className="w-5 h-5 bg-green-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">
                            {chat.unread_count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-gray-500 text-sm flex flex-col items-center">
                  <p className="mb-4">Nenhuma conversa encontrada localmente.</p>
                  <button onClick={syncChatsWithEvolution} className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-2">
                    <RefreshCw className="w-4 h-4" /> Importar do WhatsApp
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ÁREA DE MENSAGENS */}
          <div className={`flex-1 flex flex-col bg-[#EFEAE2] relative ${!selectedChat ? 'hidden md:flex' : 'flex'}`}>
            <div className="absolute inset-0 opacity-[0.03] bg-[url('https://web.whatsapp.com/img/bg-chat-tile-dark_a4be512e7195b6b733d9110b408f075d.png')] pointer-events-none mix-blend-multiply"></div>
            
            {selectedChat ? (
              <>
                {/* Header do Chat Ativo */}
                <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
                  <div className="flex items-center gap-4">
                    <button onClick={() => setSelectedChat(null)} className="md:hidden p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-gray-500 overflow-hidden">
                      {selectedChat.profilePicUrl ? <img src={selectedChat.profilePicUrl} className="w-full h-full object-cover" /> : <User className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="font-bold text-gray-900 leading-tight">{selectedChat.name}</h2>
                      <p className="text-xs text-gray-500 font-mono">{selectedChat.remote_jid.split('@')[0]}</p>
                    </div>
                  </div>
                  <button 
                    onClick={syncMessagesWithEvolution} 
                    disabled={syncingMessages}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors flex items-center gap-2 text-xs font-semibold"
                  >
                    {syncingMessages ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                    <span className="hidden sm:inline">Histórico</span>
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 z-10 custom-scrollbar">
                  {messages.length === 0 && !syncingMessages ? (
                     <div className="flex justify-center p-8">
                       <button onClick={syncMessagesWithEvolution} className="px-4 py-2 bg-white border border-gray-200 rounded-lg shadow-sm text-gray-700 font-medium hover:bg-gray-50 flex items-center gap-2">
                         <RefreshCw className="w-4 h-4" /> Baixar Histórico da Conversa
                       </button>
                     </div>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.from_me;
                      return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-4 py-2 relative shadow-sm flex flex-col ${
                            isMe ? 'bg-[#d9fdd3] text-gray-900 rounded-tr-none' : 'bg-white text-gray-900 rounded-tl-none'
                          }`}>
                            {renderMessageContent(msg.text)}
                            <div className="text-[10px] text-gray-500 text-right mt-1 font-medium flex justify-end gap-1 items-center">
                              {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                              {isMe && <CheckCircle2 className="w-3 h-3 text-gray-400" />}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                <div className="bg-gray-50 p-4 z-10 shrink-0">
                  {mediaPreview && (
                    <div className="mb-3 relative inline-block">
                      <img src={mediaPreview} className="h-24 rounded-lg border border-gray-200 shadow-sm object-cover" />
                      <button onClick={() => { setSelectedMedia(null); setMediaPreview(null); }} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                  
                  {isRecording ? (
                    <div className="flex items-center justify-between bg-white border border-red-200 rounded-xl p-3 shadow-sm max-w-4xl mx-auto">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-red-500 font-medium font-mono">{formatRecTime(recordingTime)}</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <button onClick={cancelRecording} className="text-gray-400 hover:text-red-500 p-2"><Trash2 className="w-5 h-5" /></button>
                         <button onClick={stopRecording} className="bg-orange-400 hover:bg-orange-500 text-white p-2 rounded-full shadow-sm"><Send className="w-5 h-5 ml-0.5" /></button>
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto items-end">
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-xl transition-colors shrink-0 h-12 flex items-center justify-center">
                        <Paperclip className="w-6 h-6" />
                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,video/*" onChange={handleFileSelect} />
                      </button>
                      
                      <textarea 
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(e); } }}
                        placeholder="Digite uma mensagem"
                        className="flex-1 px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none max-h-32 custom-scrollbar"
                        rows={1}
                      />
                      
                      {inputText.trim() || selectedMedia ? (
                        <button 
                          type="submit" 
                          disabled={sending}
                          className="w-12 h-12 bg-orange-400 text-white rounded-xl flex items-center justify-center hover:bg-orange-500 transition-colors disabled:opacity-50 shrink-0 shadow-sm"
                        >
                          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-1" />}
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={startRecording}
                          className="w-12 h-12 bg-green-500 text-white rounded-xl flex items-center justify-center hover:bg-green-600 transition-colors shrink-0 shadow-sm"
                        >
                          <Mic className="w-5 h-5" />
                        </button>
                      )}
                    </form>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 z-10">
                <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center shadow-sm mb-6">
                  <MessageSquare className="w-10 h-10 text-gray-300" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">WebChat Seguro</h2>
                <p className="text-gray-500 max-w-md">Os dados são armazenados localmente e isolados no seu CRM.</p>
              </div>
            )}
          </div>
          
        </div>
      </div>
    </Layout>
  );
}