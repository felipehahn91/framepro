import { supabase } from "@/integrations/supabase/client";

let isTracking = false;
let trackingInterval: any;

export const initTracking = (orcamentoId: string, sessionId: string, device: string) => {
  if (isTracking) return () => {};
  isTracking = true;
  
  const sessionEvents: any[] = [];
  const startTime = Date.now();
  let analyticsRowId: string | null = null;

  // Cria a sessão imediatamente
  supabase.from('orcamento_analytics').insert({
    orcamento_id: orcamentoId,
    session_id: sessionId,
    device: device,
    replay_data: { device, events: [] }
  }).select('id').single().then(({ data, error }) => {
    if (error) console.error(error);
    if (data) analyticsRowId = data.id;
  });

  // Pega as coordenadas exatas relativas ao container central da proposta
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

    // Salva o clique individualmente para o mapa de calor
    if (type === 'click') {
      supabase.from('orcamento_tracking').insert({
        orcamento_id: orcamentoId,
        session_id: sessionId,
        event_type: 'click',
        x: data.x,
        y: data.y,
        timestamp: timeOffset
      }).then(({ error }) => {
        if (error) console.error(error);
      });
    }
  };

  let lastMouseMove = 0;
  
  const onMouseMove = (e: MouseEvent) => {
    const now = Date.now();
    if (now - lastMouseMove > 100) {
      const coords = getRelativeCoords(e.clientX, e.clientY);
      recordEvent('mousemove', coords);
      lastMouseMove = now;
    }
  };

  // Captura o arrastar do dedo no celular para exibir no Replay
  const onTouchMove = (e: TouchEvent) => {
    const now = Date.now();
    if (now - lastMouseMove > 100 && e.touches.length > 0) {
      const touch = e.touches[0];
      const coords = getRelativeCoords(touch.clientX, touch.clientY);
      recordEvent('mousemove', coords); // Salvamos como mousemove para o player ler igual
      lastMouseMove = now;
    }
  };

  const onClick = (e: MouseEvent) => {
    const coords = getRelativeCoords(e.clientX, e.clientY);
    recordEvent('click', coords);
  };

  let lastScroll = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - lastScroll > 150) {
      // Capturamos o scroll do window, mas no player ele vai simular a rolagem
      recordEvent('scroll', { scroll_y: window.scrollY });
      lastScroll = now;
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('touchmove', onTouchMove, { passive: true });
  window.addEventListener('click', onClick);
  window.addEventListener('scroll', onScroll, { passive: true });

  // Envia os dados periodicamente (a cada 5 segundos)
  trackingInterval = setInterval(() => {
    if (analyticsRowId && sessionEvents.length > 0) {
      supabase.from('orcamento_analytics').update({
        replay_data: { device, events: [...sessionEvents] }
      }).eq('id', analyticsRowId).then(({ error }) => {
        if (error) console.error(error);
      });
    }
  }, 5000);

  return () => {
    isTracking = false;
    window.removeEventListener('mousemove', onMouseMove);
    window.removeEventListener('touchmove', onTouchMove);
    window.removeEventListener('click', onClick);
    window.removeEventListener('scroll', onScroll);
    clearInterval(trackingInterval);
    
    // Envio final no momento em que sair
    if (analyticsRowId && sessionEvents.length > 0) {
      supabase.from('orcamento_analytics').update({
        replay_data: { device, events: [...sessionEvents] }
      }).eq('id', analyticsRowId).then(({ error }) => {
        if (error) console.error(error);
      });
    }
  };
};