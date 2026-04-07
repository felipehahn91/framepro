import { supabase } from "@/integrations/supabase/client";

export const initTracking = (orcamentoId: string, sessionId: string, device: string) => {
  let pendingEvents: any[] = [];
  const startTime = Date.now();
  let trackingInterval: any;

  // 1. Cria a sessão inicial (INSERT é permitido pelo banco)
  console.log("Iniciando tracking para:", orcamentoId, sessionId);
  supabase.from('orcamento_analytics').insert({
    orcamento_id: orcamentoId,
    session_id: sessionId,
    device: device,
    replay_data: { device, events: [] }
  }).then(({ error }) => {
    if (error) console.error("Erro ao inserir analytics inicial:", error);
  });

  const getRelativeCoords = (clientX: number, clientY: number) => {
    const container = document.getElementById('proposal-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      return {
        x: Math.round(clientX - rect.left),
        y: Math.round(clientY - rect.top) 
      };
    }
    return { x: Math.round(clientX), y: Math.round(clientY) };
  };

  const recordEvent = (type: string, data: any) => {
    const timeOffset = Date.now() - startTime;
    
    // Adiciona na fila de eventos para envio em massa
    pendingEvents.push({
      orcamento_id: orcamentoId,
      session_id: sessionId,
      event_type: type,
      x: data.x || null,
      y: data.y || null,
      scroll_y: data.scroll_y || null,
      timestamp: timeOffset
    });
  };

  let lastMouseMove = 0;
  
  const onMouseMove = (e: MouseEvent) => {
    const now = Date.now();
    if (now - lastMouseMove > 100) {
      recordEvent('mousemove', getRelativeCoords(e.clientX, e.clientY));
      lastMouseMove = now;
    }
  };

  const onTouchMove = (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastMouseMove > 100 && e.touches.length > 0) {
      recordEvent('mousemove', getRelativeCoords(e.touches[0].clientX, e.touches[0].clientY));
      lastMouseMove = now;
    }
  };

  const onClick = (e: MouseEvent) => {
    recordEvent('click', getRelativeCoords(e.clientX, e.clientY));
  };

  let lastScroll = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - lastScroll > 150) {
      recordEvent('scroll', { scroll_y: Math.round(window.scrollY) });
      lastScroll = now;
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('click', onClick);
  window.addEventListener('scroll', onScroll, { passive: true });

  const syncData = () => {
    if (pendingEvents.length > 0) {
      const eventsToInsert = [...pendingEvents];
      pendingEvents = []; // Limpa a fila
      
      // 2. Ao invés de atualizar (UPDATE), nós inserimos todos os eventos na tabela de tracking.
      // O banco permite INSERTS livremente para visitantes anônimos.
      supabase.from('orcamento_tracking').insert(eventsToInsert).then(({ error }) => {
        if (error) {
          console.error("Erro ao sincronizar eventos:", error);
          // Se falhar a internet, devolve pra fila pra tentar de novo
          pendingEvents = [...eventsToInsert, ...pendingEvents];
        }
      });
    }
  };

  // Envia eventos para o banco a cada 3 segundos
  trackingInterval = setInterval(syncData, 3000);

  return () => {
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('click', onClick);
    window.removeEventListener('scroll', onScroll);
    clearInterval(trackingInterval);
    
    // Dispara uma última vez quando fechar a página
    syncData();
  };
};