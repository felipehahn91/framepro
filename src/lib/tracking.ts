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
  }).select('id').single().then(({ data }) => {
    if (data) analyticsRowId = data.id;
  });

  // Pega as coordenadas exatas relativas ao container central da proposta
  const getRelativeCoords = (e: MouseEvent) => {
    const container = document.getElementById('proposal-container');
    if (container) {
      const rect = container.getBoundingClientRect();
      return {
        x: Math.round(e.clientX - rect.left),
        y: Math.round(e.clientY - rect.top) // Isso resolve o problema de scroll
      };
    }
    return { x: Math.round(e.pageX), y: Math.round(e.pageY) };
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
    // Throttle de 100ms para evitar sobrecarga
    if (now - lastMouseMove > 100) {
      const coords = getRelativeCoords(e);
      recordEvent('mousemove', coords);
      lastMouseMove = now;
    }
  };

  const onClick = (e: MouseEvent) => {
    const coords = getRelativeCoords(e);
    recordEvent('click', coords);
  };

  let lastScroll = 0;
  const onScroll = () => {
    const now = Date.now();
    if (now - lastScroll > 100) {
      recordEvent('scroll', { scroll_y: window.scrollY });
      lastScroll = now;
    }
  };

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('click', onClick);
  window.addEventListener('scroll', onScroll);

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