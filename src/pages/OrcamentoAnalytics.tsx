import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Slider } from '@/components/ui/slider';
import { 
  MousePointerClick, Eye, Clock, PlayCircle, ArrowLeft, 
  Smartphone, Monitor, Tablet, PauseCircle, X, MousePointer2, Loader2 
} from 'lucide-react';
import { toast } from 'sonner';

// Reutilizando o renderizador de blocos de forma simplificada
const renderHTML = (html: string, fallback: string) => {
  if (!html || html === '<p><br></p>') return fallback;
  return html;
};

const PreviewBlock = ({ section }: { section: any }) => {
  const styles = section.styles || {};
  const baseStyle: React.CSSProperties = {
    backgroundColor: styles.backgroundColor || 'transparent',
    backgroundImage: styles.backgroundImage ? `url(${styles.backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    color: styles.textColor || 'inherit',
    padding: `${styles.padding || 40}px`,
    fontFamily: styles.fontFamily || 'inherit',
  };

  if (section.type === 'cover') return (
    <div style={{...baseStyle, padding: 0}} className="relative w-full aspect-video flex flex-col items-center justify-center text-center overflow-hidden">
      {styles.backgroundImage && <div className="absolute inset-0 bg-black/40 z-0"></div>}
      <div className="relative z-10 p-8 max-w-3xl w-full">
        <div className="font-bold mb-4 title-rich-text" style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 48}px`, lineHeight: 1.1 }} dangerouslySetInnerHTML={{ __html: renderHTML(section.title, 'Título') }} />
        <div className="opacity-90 title-rich-text" style={{ color: styles.textColor || '#4B5563', fontSize: `${styles.textSize || 20}px`, lineHeight: 1.4 }} dangerouslySetInnerHTML={{ __html: renderHTML(section.subtitle, 'Subtítulo') }} />
      </div>
    </div>
  );

  if (section.type === 'text') return (
    <div style={baseStyle} className="w-full prose max-w-none">
      {section.content && section.content !== '<p><br></p>' ? <div dangerouslySetInnerHTML={{ __html: section.content }} /> : null}
    </div>
  );

  if (section.type === 'pricing') {
    const packages = section.packages || [];
    return (
      <div style={baseStyle} className="w-full">
        {section.title && section.title !== '<p><br></p>' && <div className="font-bold mb-12 text-center title-rich-text" style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 32}px` }} dangerouslySetInnerHTML={{ __html: section.title }} />}
        <div className={`grid gap-6 md:gap-8 grid-cols-1 ${packages.length === 2 ? 'md:grid-cols-2 max-w-4xl mx-auto' : packages.length >= 3 ? 'md:grid-cols-3' : 'max-w-md mx-auto'}`}>
          {packages.map((pkg: any, i: number) => (
            <div key={i} className="flex flex-col bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100 relative">
              <div style={{ backgroundColor: pkg.color || '#3b82f6' }} className="pt-6 pb-16 px-6 text-center text-white">
                <h3 className="text-xl font-bold uppercase tracking-wider">{pkg.title || 'Plano'}</h3>
              </div>
              <div className="px-6 flex-1 flex flex-col relative z-10 -mt-10">
                <div className="bg-white rounded-xl shadow-lg p-6 text-center border border-gray-50 mb-6 flex flex-col items-center justify-center min-h-[120px]">
                  <div className="text-3xl font-bold" style={{ color: pkg.color || '#3b82f6' }}>R$ {pkg.price}</div>
                </div>
                <ul className="space-y-4 text-left flex-1 px-2">
                  {(pkg.features || []).map((feat: string, idx: number) => (
                    <li key={idx} className="flex items-start gap-3 text-sm text-gray-600"><span className="text-sm leading-relaxed">{feat}</span></li>
                  ))}
                </ul>
                <div className="mt-8 mb-6 px-2">
                  <div style={{ backgroundColor: pkg.color || '#3b82f6' }} className="block w-full py-3.5 rounded-full text-white font-bold text-center text-sm uppercase">{pkg.buttonText || 'Selecionar'}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  if (section.type === 'two-columns') return (
    <div style={baseStyle} className={`w-full flex flex-col ${section.imagePosition === 'right' ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 md:gap-16 items-center`}>
      <div className="flex-1 space-y-6 w-full">
        <div className="font-bold leading-tight title-rich-text" style={{ color: styles.textColor || '#111827', fontSize: `${styles.titleSize || 36}px` }} dangerouslySetInnerHTML={{ __html: renderHTML(section.title, 'Título') }} />
        <div className="prose max-w-none opacity-90"><div dangerouslySetInnerHTML={{ __html: section.content }} /></div>
      </div>
      <div className="flex-1 w-full">{section.imageUrl && <img src={section.imageUrl} className="w-full rounded-2xl shadow-2xl object-cover aspect-video" />}</div>
    </div>
  );

  if (section.type === 'gallery') return (
    <div style={baseStyle} className="w-full">
      {section.title && section.title !== '<p><br></p>' && <div className="font-bold mb-10 text-center title-rich-text" style={{ fontSize: `${styles.titleSize || 32}px` }} dangerouslySetInnerHTML={{ __html: section.title }} />}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {section.images?.map((img: string, i: number) => (
          <div key={i} className="aspect-square rounded-2xl overflow-hidden shadow-md group"><img src={img} className="w-full h-full object-cover" /></div>
        ))}
      </div>
    </div>
  );

  if (section.type === 'button') return (
    <div style={baseStyle} className={`w-full flex justify-${styles.align === 'left' ? 'start' : styles.align === 'right' ? 'end' : 'center'}`}>
      <div style={{ backgroundColor: styles.buttonColor || '#f97316', color: styles.buttonTextColor || '#ffffff' }} className="px-8 py-4 rounded-full font-bold text-lg shadow-lg inline-block">{section.buttonText || 'Clique Aqui'}</div>
    </div>
  );

  if (section.type === 'separator') return (
    <div style={{ ...baseStyle, padding: `${section.height || 40}px 0` }} className="w-full flex items-center justify-center">
      {section.showLine && <div className="w-full max-w-4xl h-px" style={{ backgroundColor: styles.textColor || '#E5E7EB' }}></div>}
    </div>
  );

  return null;
};


export default function OrcamentoAnalytics() {
  const { id } = useParams();
  const navigate = useNavigate();
  
  const [orcamento, setOrcamento] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [tracking, setTracking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'heatmap' | 'replay'>('heatmap');
  
  // Replay State
  const [playingSession, setPlayingSession] = useState<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [activeClicks, setActiveClicks] = useState<any[]>([]);
  
  const heatmapContainerRef = useRef<HTMLDivElement>(null);
  const heatmapCanvasRef = useRef<HTMLCanvasElement>(null);
  const replayContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchAnalytics();
    const interval = setInterval(fetchAnalytics, 15000); // Atualiza a cada 15s
    return () => clearInterval(interval);
  }, [id]);

  const fetchAnalytics = async () => {
    try {
      const { data: orcData, error: orcErr } = await supabase.from('orcamentos').select('*').eq('id', id).single();
      if (orcErr) throw orcErr;
      setOrcamento(orcData);

      const [analyticsData, trackingData] = await Promise.all([
        supabase.from('orcamento_analytics').select('*').eq('orcamento_id', id).order('created_at', { ascending: false }),
        supabase.from('orcamento_tracking').select('*').eq('orcamento_id', id)
      ]);

      setAnalytics(analyticsData.data || []);
      setTracking(trackingData.data || []);
    } catch (error) {
      toast.error('Erro ao carregar dados de analytics');
    } finally {
      setLoading(false);
    }
  };

  // Renderizar Heatmap
  useEffect(() => {
    if (!loading && activeTab === 'heatmap' && tracking.length > 0 && heatmapCanvasRef.current && heatmapContainerRef.current) {
      const canvas = heatmapCanvasRef.current;
      const container = heatmapContainerRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      canvas.width = container.scrollWidth;
      canvas.height = container.scrollHeight;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const clicks = tracking.filter(t => t.event_type === 'click');
      const moves = tracking.filter(t => t.event_type === 'mousemove');
      
      // Desenha o rastro do mouse (fraco)
      moves.forEach(point => {
        const x = point.x;
        const y = point.y;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.08)'); 
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
      });

      // Desenha os cliques (forte)
      clicks.forEach(point => {
        const x = point.x;
        const y = point.y;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
        gradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)'); 
        gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [loading, tracking, orcamento, activeTab]);

  // Player de Replay
  useEffect(() => {
    if (!isPlaying || !playingSession) return;
    
    const events = playingSession.replay_data?.events || [];
    if (events.length === 0) return;
    
    const duration = events[events.length - 1].timeOffset;
    let animationFrameId: number;
    let lastTime = performance.now();

    const loop = (now: number) => {
      const delta = (now - lastTime) * playbackSpeed;
      lastTime = now;
      
      setCurrentTime(prev => {
        const next = prev + delta;
        if (next >= duration) {
          setIsPlaying(false);
          return duration;
        }
        return next;
      });
      
      animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [isPlaying, playingSession, playbackSpeed]);

  // Sincronizar Replay com a Tela
  useEffect(() => {
    if (!playingSession) return;
    
    const events = playingSession.replay_data?.events || [];
    let currentMouse = { x: -100, y: -100 };
    let currentScroll = 0;
    let currentClicks: any[] = [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.timeOffset > currentTime) break;
      
      if (ev.type === 'mousemove') currentMouse = { x: ev.x, y: ev.y };
      if (ev.type === 'scroll') currentScroll = ev.scroll_y || ev.scrollY || 0;
      if (ev.type === 'click' && currentTime - ev.timeOffset < 800) {
        currentClicks.push(ev);
      }
    }

    setCursorPos(currentMouse);
    setActiveClicks(currentClicks);
    
    if (replayContainerRef.current) {
      replayContainerRef.current.scrollTop = currentScroll;
    }
  }, [currentTime, playingSession]);

  const handlePlaySession = (session: any) => {
    setPlayingSession(session);
    setCurrentTime(0);
    setIsPlaying(true);
    setPlaybackSpeed(1);
  };

  const closePlayer = () => {
    setPlayingSession(null);
    setIsPlaying(false);
  };

  const formatTime = (ms: number) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const getDeviceIcon = (device: string) => {
    if (device === 'mobile') return <Smartphone className="w-4 h-4" />;
    if (device === 'tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  if (loading) return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;

  const clicks = tracking.filter(t => t.event_type === 'click').length;
  // Simplificando o tempo médio com base na duração dos eventos de cada sessão
  const totalDurationMs = analytics.reduce((acc, session) => {
    const events = session.replay_data?.events || [];
    if (events.length > 0) return acc + events[events.length - 1].timeOffset;
    return acc;
  }, 0);
  const avgTimeMinutes = analytics.length > 0 ? Math.floor((totalDurationMs / analytics.length) / 60000) : 0;

  const loadedSections = orcamento?.sections || [];
  const globalSec = loadedSections.find((s: any) => s.type === 'global-settings');
  const globalSettings = globalSec?.styles || { pageBackgroundColor: '#f3f4f6', backgroundColor: '#ffffff', maxWidth: '900px' };
  const renderSections = loadedSections.filter((s: any) => s.type !== 'global-settings');

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/orcamentos')} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Analytics da Proposta</h1>
            <p className="text-sm text-gray-500">{orcamento?.name}</p>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Visualizações</span>
              <Eye className="w-5 h-5 text-blue-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{orcamento?.view_count || 0}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Cliques Totais</span>
              <MousePointerClick className="w-5 h-5 text-orange-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{clicks}</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Tempo Médio Gasto</span>
              <Clock className="w-5 h-5 text-green-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{avgTimeMinutes} min</div>
          </div>
          <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-500">Sessões Gravadas</span>
              <PlayCircle className="w-5 h-5 text-purple-500" />
            </div>
            <div className="text-3xl font-bold text-gray-900">{analytics.length}</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full max-w-[400px]">
          <button 
            onClick={() => setActiveTab('heatmap')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'heatmap' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Mapa de Calor
          </button>
          <button 
            onClick={() => setActiveTab('replay')}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'replay' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Gravações de Tela
          </button>
        </div>

        {/* Heatmap Tab */}
        {activeTab === 'heatmap' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex-1 flex flex-col">
            <div className="p-6 border-b border-gray-100">
              <h3 className="font-bold text-gray-900 text-lg">Mapa de Calor (Heatmap)</h3>
              <p className="text-sm text-gray-500">Visualize onde seus clientes movem o mouse e clicam na proposta.</p>
            </div>
            <div className="flex-1 p-6 bg-gray-50 flex justify-center overflow-hidden">
              <div 
                className="relative w-full max-h-[800px] overflow-y-auto shadow-xl border border-gray-200 rounded-xl" 
                ref={heatmapContainerRef}
                style={{ backgroundColor: globalSettings.pageBackgroundColor || '#f3f4f6', maxWidth: globalSettings.maxWidth }}
              >
                {/* O orçamento renderizado apenas como fundo */}
                <div className="pointer-events-none opacity-40">
                  <div style={{ backgroundColor: globalSettings.backgroundColor }}>
                    {renderSections.map((s: any) => (
                      <PreviewBlock key={s.id} section={s} />
                    ))}
                  </div>
                </div>
                
                {/* Canvas sobreposto (Heatmap) */}
                <canvas 
                  ref={heatmapCanvasRef} 
                  className="absolute top-0 left-0 pointer-events-none z-50 mix-blend-multiply" 
                />
                
                {tracking.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-white/80 backdrop-blur-sm z-50">
                    <p className="text-gray-500 font-medium">Aguardando as interações dos seus clientes...</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Replay Tab */}
        {activeTab === 'replay' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <h3 className="font-bold text-gray-900 text-lg mb-1">Sessões de Clientes</h3>
            <p className="text-sm text-gray-500 mb-6">Assista em tempo real como seus clientes navegam na proposta.</p>

            {analytics.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {analytics.map((session) => {
                  const device = session.replay_data?.device || 'desktop';
                  const eventsCount = session.replay_data?.events?.length || 0;
                  const duration = eventsCount > 0 ? session.replay_data.events[eventsCount - 1].timeOffset : 0;
                  
                  return (
                    <div key={session.id} className="border border-gray-200 rounded-xl p-5 hover:border-orange-300 hover:shadow-md transition-all bg-gray-50/50 flex flex-col justify-between">
                      <div className="flex items-start gap-4 mb-6">
                        <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                          <PlayCircle className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm mb-1">
                            {new Date(session.created_at).toLocaleString('pt-BR')}
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="flex items-center gap-1 text-[11px] font-semibold bg-white border border-gray-200 px-2 py-0.5 rounded-full capitalize text-gray-600">
                              {getDeviceIcon(device)} {device}
                            </span>
                            <span className="text-xs text-gray-500">{formatTime(duration)}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => handlePlaySession(session)}
                        className="w-full py-2.5 bg-white border border-gray-200 text-gray-900 font-semibold rounded-lg hover:bg-orange-50 hover:border-orange-200 hover:text-orange-600 transition-colors shadow-sm disabled:opacity-50"
                        disabled={eventsCount === 0}
                      >
                        Assistir Replay
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
                <PlayCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="font-bold text-gray-900">Nenhuma gravação disponível</p>
                <p className="text-sm text-gray-500 mt-1">Envie o link do orçamento para os clientes para iniciar a gravação de tela invisível (Clarity).</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal Replay Player */}
      {playingSession && (
        <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-md flex flex-col">
          {/* Header */}
          <div className="h-16 bg-black border-b border-white/10 flex items-center justify-between px-6 text-white shrink-0">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm font-semibold">
                {getDeviceIcon(playingSession.replay_data?.device)}
                <span className="capitalize">{playingSession.replay_data?.device || 'Desktop'}</span>
              </div>
              <span className="text-white/60 text-sm font-medium hidden sm:block">
                Visualização gravada em {new Date(playingSession.created_at).toLocaleString('pt-BR')}
              </span>
            </div>
            <button onClick={closePlayer} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Player Area */}
          <div className="flex-1 relative flex items-center justify-center p-4 sm:p-8 overflow-hidden">
            <div 
              className="bg-white rounded-xl overflow-hidden relative shadow-2xl transition-all duration-300"
              style={{
                width: playingSession.replay_data?.device === 'mobile' ? '375px' : playingSession.replay_data?.device === 'tablet' ? '768px' : '100%',
                maxWidth: globalSettings.maxWidth,
                height: '100%',
                maxHeight: '800px',
                backgroundColor: globalSettings.pageBackgroundColor || '#f3f4f6'
              }}
            >
              {/* Scrollable Container Fake */}
              <div 
                ref={replayContainerRef}
                className="w-full h-full overflow-hidden relative shadow-xl mx-auto"
                style={{ maxWidth: globalSettings.maxWidth, backgroundColor: globalSettings.backgroundColor }}
              >
                <div className="pointer-events-none select-none">
                  {renderSections.map((s: any) => (
                    <PreviewBlock key={s.id} section={s} />
                  ))}
                </div>
                
                {/* Mouse Falso */}
                <div 
                  className="absolute z-[9999] pointer-events-none transition-all duration-75 ease-linear"
                  style={{ left: cursorPos.x, top: cursorPos.y, transform: 'translate(-50%, -50%)' }}
                >
                  <MousePointer2 className="w-6 h-6 text-black fill-white drop-shadow-md" />
                </div>

                {/* Cliques Falsos */}
                {activeClicks.map((click, i) => (
                  <div 
                    key={`${click.timeOffset}-${i}`}
                    className="absolute z-[9998] w-10 h-10 rounded-full border-2 border-orange-500 pointer-events-none animate-ping"
                    style={{ left: click.x, top: click.y, transform: 'translate(-50%, -50%)' }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="h-24 bg-black border-t border-white/10 px-6 flex flex-col justify-center gap-3 shrink-0">
            <div className="flex items-center gap-4 max-w-3xl mx-auto w-full">
              <span className="text-white/60 text-xs font-mono w-12 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider 
                value={[currentTime]} 
                max={playingSession.replay_data?.events[playingSession.replay_data.events.length - 1]?.timeOffset || 100}
                step={100}
                onValueChange={([val]) => {
                  setCurrentTime(val);
                  if (!isPlaying) {
                    const events = playingSession.replay_data?.events || [];
                    let currentScroll = 0;
                    for (let i = 0; i < events.length; i++) {
                      if (events[i].timeOffset > val) break;
                      if (events[i].type === 'scroll') currentScroll = events[i].scroll_y || 0;
                    }
                    if (replayContainerRef.current) replayContainerRef.current.scrollTop = currentScroll;
                  }
                }}
                className="flex-1 cursor-pointer"
              />
              <span className="text-white/60 text-xs font-mono w-12">
                {formatTime(playingSession.replay_data?.events[playingSession.replay_data.events.length - 1]?.timeOffset || 0)}
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-6">
              <button 
                className="text-white hover:text-orange-400 transition-colors"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <PauseCircle className="w-10 h-10" /> : <PlayCircle className="w-10 h-10" />}
              </button>
              
              <div className="flex items-center gap-1 bg-white/10 rounded-full p-1">
                {[1, 1.5, 2, 4].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${playbackSpeed === speed ? 'bg-orange-500 text-white' : 'text-white/60 hover:text-white hover:bg-white/10'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}