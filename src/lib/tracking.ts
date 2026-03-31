import { supabase } from "@/integrations/supabase/client";

let isTracking = false;
let trackingInterval: any;

export const initTracking = (orcamentoId: string, sessionId: string, device: string) => {
  if (isTracking) return () => {};
  isTracking = true;
  
  const sessionEvents: any[] = [];
  const startTime = Date.now();

  // Cria a sessão base (apenas INSERE, sem tentar ler de volta para não dar erro de permissão)
  supabase.from('orcamento_analytics').insert({
    orcamento_id: orcamentoId,
    session_id: sessionId,
    device: device,
    replay_data: { device, events: [] }
  }).then(({ error }) => {
    if (error) console.error("Erro ao iniciar sessão:", error);
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
    sessionEvents.push({ type, timeOffset, ...data });

    // Salva o clique para o mapa de calor
    if (type === 'click') {
      supabase.from('orcamento_tracking').insert({
        orcamento_id: orcamentoId,
        session_id: sessionId,
        event_type: 'click',
        x: data.x,
        y: data.y,
        timestamp: timeOffset
      }).then();
    }
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
      recordEvent('scroll', { scroll_y: window.scrollY });
      lastScroll = now;
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('click', onClick);
  window.addEventListener('scroll', onScroll, { passive: true });

  const syncData = () => {
    if (sessionEvents.length > 0) {
      // Atualiza os dados da gravação continuamente localizando pelo session_id (não esbarra no bloqueio RLS)
      supabase.from('orcamento_analytics').update({
        replay_data: { device, events: [...sessionEvents] }
      }).eq('session_id', sessionId).then(({ error }) => {
        if (error) console.error("Erro ao sincronizar dados:", error);
      });
    }
  };

  // Sincroniza periodicamente com o banco de dados a cada 5 segundos
  trackingInterval = setInterval(syncData, 5000);

  return () => {
    isTracking = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('click', onClick);
    window.removeEventListener('scroll', onScroll);
    clearInterval(trackingInterval);
    
    // Dispara uma última vez quando o cliente sai da página
    syncData();
  };
};