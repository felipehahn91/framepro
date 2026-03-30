
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import pb from '@/lib/pocketbaseClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Slider } from '@/components/ui/slider';
import { MousePointerClick, Eye, Clock, PlayCircle, ArrowLeft, Smartphone, Monitor, Tablet, PauseCircle, X, MousePointer2 } from 'lucide-react';
import { toast } from 'sonner';
import OrçamentoPreview from '@/components/OrçamentoPreview';

const OrçamentoAnalyticsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [orcamento, setOrcamento] = useState(null);
  const [analytics, setAnalytics] = useState([]);
  const [tracking, setTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Replay State
  const [playingSession, setPlayingSession] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [cursorPos, setCursorPos] = useState({ x: -100, y: -100 });
  const [activeClicks, setActiveClicks] = useState([]);
  
  const heatmapContainerRef = useRef(null);
  const heatmapCanvasRef = useRef(null);
  const replayContainerRef = useRef(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const orcData = await pb.collection('orcamentos').getOne(id, { $autoCancel: false });
        setOrcamento(orcData);

        const [analyticsData, trackingData] = await Promise.all([
          pb.collection('orcamento_analytics').getFullList({ filter: `orcamentoId = "${id}"`, sort: '-created', $autoCancel: false }),
          pb.collection('orcamento_tracking').getFullList({ filter: `orcamentoId = "${id}"`, sort: '-timestamp', $autoCancel: false })
        ]);

        setAnalytics(analyticsData);
        setTracking(trackingData);
      } catch (error) {
        toast.error('Erro ao carregar dados de analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
    
    // Real-time updates
    const interval = setInterval(fetchAnalytics, 15000);
    return () => clearInterval(interval);
  }, [id]);

  // Render Heatmap
  useEffect(() => {
    if (!loading && tracking.length > 0 && heatmapCanvasRef.current && heatmapContainerRef.current) {
      const canvas = heatmapCanvasRef.current;
      const container = heatmapContainerRef.current;
      const ctx = canvas.getContext('2d');
      
      // Set canvas size to match the full scrollable content
      canvas.width = container.scrollWidth;
      canvas.height = container.scrollHeight;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const clicks = tracking.filter(t => t.eventType === 'click');
      const moves = tracking.filter(t => t.eventType === 'mousemove');
      
      // Draw mouse moves (faint)
      moves.forEach(point => {
        const x = point.x;
        const y = point.y;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 15);
        gradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)'); // Blue faint
        gradient.addColorStop(1, 'rgba(59, 130, 246, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.fill();
      });

      // Draw clicks (strong)
      clicks.forEach(point => {
        const x = point.x;
        const y = point.y;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 25);
        gradient.addColorStop(0, 'rgba(255, 69, 0, 0.8)'); // Red/Orange strong
        gradient.addColorStop(0.5, 'rgba(255, 140, 0, 0.5)');
        gradient.addColorStop(1, 'rgba(255, 140, 0, 0)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 25, 0, Math.PI * 2);
        ctx.fill();
      });
    }
  }, [loading, tracking, orcamento]);

  // Replay Playback Loop
  useEffect(() => {
    if (!isPlaying || !playingSession) return;
    
    const events = playingSession.replayData?.events || [];
    if (events.length === 0) return;
    
    const duration = events[events.length - 1].timeOffset;
    let animationFrameId;
    let lastTime = performance.now();

    const loop = (now) => {
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

  // Apply Replay State
  useEffect(() => {
    if (!playingSession) return;
    
    const events = playingSession.replayData?.events || [];
    let currentMouse = { x: -100, y: -100 };
    let currentScroll = 0;
    let currentClicks = [];

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      if (ev.timeOffset > currentTime) break;
      
      if (ev.type === 'mousemove') currentMouse = { x: ev.x, y: ev.y };
      if (ev.type === 'scroll') currentScroll = ev.scrollY;
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

  const handlePlaySession = (session) => {
    setPlayingSession(session);
    setCurrentTime(0);
    setIsPlaying(true);
    setPlaybackSpeed(1);
  };

  const closePlayer = () => {
    setPlayingSession(null);
    setIsPlaying(false);
  };

  const formatTime = (ms) => {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 p-6">
            <Skeleton className="h-8 w-64 mb-6" />
            <div className="grid gap-6 md:grid-cols-4 mb-6">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
            <Skeleton className="h-[400px] w-full" />
          </main>
        </div>
      </div>
    );
  }

  const clicks = tracking.filter(t => t.eventType === 'click').length;
  const totalTimeSpent = tracking.reduce((acc, t) => Math.max(acc, t.metadata?.timeSpent || 0), 0);
  const timeSpentMinutes = Math.floor(totalTimeSpent / 60000);

  const getDeviceIcon = (device) => {
    if (device === 'mobile') return <Smartphone className="w-4 h-4" />;
    if (device === 'tablet') return <Tablet className="w-4 h-4" />;
    return <Monitor className="w-4 h-4" />;
  };

  return (
    <>
      <Helmet>
        <title>Analytics - {orcamento?.name || 'Orçamento'}</title>
      </Helmet>

      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64 h-full">
          <Header />
          <main className="flex-1 overflow-y-auto p-6 bg-muted/30">
            <div className="max-w-7xl mx-auto space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/orcamentos')}>
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold mb-1">Analytics do Orçamento</h1>
                  <p className="text-muted-foreground">{orcamento?.name}</p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-4">
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Visualizações</CardTitle>
                    <Eye className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{orcamento?.viewCount || 0}</div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Cliques Totais</CardTitle>
                    <MousePointerClick className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{clicks}</div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Tempo Máx. Gasto</CardTitle>
                    <Clock className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{timeSpentMinutes} min</div>
                  </CardContent>
                </Card>
                <Card className="border-none shadow-sm">
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium">Sessões Gravadas</CardTitle>
                    <PlayCircle className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{analytics.length}</div>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="heatmap" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="heatmap">Mapa de Calor</TabsTrigger>
                  <TabsTrigger value="replay">Gravações de Tela</TabsTrigger>
                </TabsList>
                
                <TabsContent value="heatmap" className="mt-6">
                  <Card className="border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-white border-b z-10 relative">
                      <CardTitle>Mapa de Calor de Interações</CardTitle>
                      <CardDescription>Visualize onde os clientes mais clicam e movem o mouse.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 bg-muted/20">
                      <div className="relative w-full h-[800px] overflow-y-auto" ref={heatmapContainerRef}>
                        {/* The actual proposal rendered as background */}
                        <div className="pointer-events-none opacity-50">
                          <OrçamentoPreview sections={orcamento?.sections || []} />
                        </div>
                        
                        {/* Canvas overlay for heatmap */}
                        <canvas 
                          ref={heatmapCanvasRef} 
                          className="absolute top-0 left-0 pointer-events-none z-50 mix-blend-multiply" 
                        />
                        
                        {tracking.length === 0 && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm z-50">
                            <p className="text-muted-foreground font-medium">Aguardando interações dos clientes...</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="replay" className="mt-6">
                  <Card className="border-none shadow-md">
                    <CardHeader>
                      <CardTitle>Sessões de Clientes</CardTitle>
                      <CardDescription>Assista como os clientes interagem com seu orçamento em tempo real.</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.length > 0 ? (
                        <div className="space-y-3">
                          {analytics.map((session) => {
                            const device = session.replayData?.device || 'desktop';
                            const eventsCount = session.replayData?.events?.length || 0;
                            const duration = eventsCount > 0 ? session.replayData.events[eventsCount - 1].timeOffset : 0;
                            
                            return (
                              <div key={session.id} className="flex items-center justify-between p-4 border rounded-xl hover:border-primary/50 hover:shadow-sm transition-all bg-card">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 rounded-full bg-[#FF8C00]/10 flex items-center justify-center text-[#FF8C00]">
                                    <PlayCircle className="w-6 h-6" />
                                  </div>
                                  <div>
                                    <p className="font-semibold flex items-center gap-2">
                                      Sessão de {new Date(session.created).toLocaleString('pt-BR')}
                                      <span className="text-muted-foreground flex items-center gap-1 text-xs bg-muted px-2 py-0.5 rounded-full capitalize">
                                        {getDeviceIcon(device)} {device}
                                      </span>
                                    </p>
                                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                                      <span className="flex items-center gap-1"><MousePointerClick className="w-3 h-3" /> {eventsCount} eventos</span>
                                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatTime(duration)}</span>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  onClick={() => handlePlaySession(session)}
                                  className="bg-[#FF8C00] hover:bg-[#FF8C00]/90 text-white"
                                  disabled={eventsCount === 0}
                                >
                                  Assistir Replay
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-16 text-muted-foreground border-2 border-dashed rounded-xl bg-muted/10">
                          <PlayCircle className="w-12 h-12 mx-auto mb-4 opacity-20" />
                          <p className="font-medium">Nenhuma gravação disponível ainda.</p>
                          <p className="text-sm mt-1">Envie o link do orçamento para seus clientes para começar a coletar dados.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </main>
        </div>
      </div>

      {/* Replay Player Modal */}
      {playingSession && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex flex-col">
          {/* Header */}
          <div className="h-16 bg-black border-b border-white/10 flex items-center justify-between px-6 text-white">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full text-sm">
                {getDeviceIcon(playingSession.replayData?.device)}
                <span className="capitalize">{playingSession.replayData?.device || 'Desktop'}</span>
              </div>
              <span className="text-white/60 text-sm">
                Sessão de {new Date(playingSession.created).toLocaleString('pt-BR')}
              </span>
            </div>
            <Button variant="ghost" size="icon" onClick={closePlayer} className="text-white hover:bg-white/20">
              <X className="w-6 h-6" />
            </Button>
          </div>

          {/* Player Area */}
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-hidden">
            <div 
              className="bg-white rounded-lg overflow-hidden relative shadow-2xl transition-all duration-300"
              style={{
                width: playingSession.replayData?.device === 'mobile' ? '375px' : playingSession.replayData?.device === 'tablet' ? '768px' : '100%',
                maxWidth: '1200px',
                height: '100%',
                maxHeight: '800px'
              }}
            >
              {/* Scrollable Container */}
              <div 
                ref={replayContainerRef}
                className="w-full h-full overflow-hidden relative"
              >
                <div className="pointer-events-none select-none">
                  <OrçamentoPreview sections={orcamento?.sections || []} />
                </div>
                
                {/* Custom Cursor */}
                <div 
                  className="absolute z-[9999] pointer-events-none transition-all duration-75 ease-linear"
                  style={{ 
                    left: cursorPos.x, 
                    top: cursorPos.y,
                    transform: 'translate(-50%, -50%)'
                  }}
                >
                  <MousePointer2 className="w-6 h-6 text-black fill-white drop-shadow-md" />
                </div>

                {/* Click Ripples */}
                {activeClicks.map((click, i) => (
                  <div 
                    key={`${click.timeOffset}-${i}`}
                    className="absolute z-[9998] w-10 h-10 rounded-full border-2 border-[#FF8C00] pointer-events-none animate-ping"
                    style={{ 
                      left: click.x, 
                      top: click.y,
                      transform: 'translate(-50%, -50%)'
                    }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Controls Footer */}
          <div className="h-24 bg-black border-t border-white/10 px-8 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-4">
              <span className="text-white/60 text-sm font-mono w-12 text-right">
                {formatTime(currentTime)}
              </span>
              <Slider 
                value={[currentTime]} 
                max={playingSession.replayData?.events[playingSession.replayData.events.length - 1]?.timeOffset || 100}
                step={100}
                onValueChange={([val]) => {
                  setCurrentTime(val);
                  if (!isPlaying) {
                    // Force update scroll position when scrubbing while paused
                    const events = playingSession.replayData?.events || [];
                    let currentScroll = 0;
                    for (let i = 0; i < events.length; i++) {
                      if (events[i].timeOffset > val) break;
                      if (events[i].type === 'scroll') currentScroll = events[i].scrollY;
                    }
                    if (replayContainerRef.current) replayContainerRef.current.scrollTop = currentScroll;
                  }
                }}
                className="flex-1 cursor-pointer"
              />
              <span className="text-white/60 text-sm font-mono w-12">
                {formatTime(playingSession.replayData?.events[playingSession.replayData.events.length - 1]?.timeOffset || 0)}
              </span>
            </div>
            
            <div className="flex items-center justify-center gap-6">
              <Button 
                variant="ghost" 
                size="icon" 
                className="text-white hover:bg-white/20 h-12 w-12 rounded-full"
                onClick={() => setIsPlaying(!isPlaying)}
              >
                {isPlaying ? <PauseCircle className="w-8 h-8" /> : <PlayCircle className="w-8 h-8" />}
              </Button>
              
              <div className="flex items-center gap-2 bg-white/10 rounded-full p-1">
                {[1, 1.5, 2].map(speed => (
                  <button
                    key={speed}
                    onClick={() => setPlaybackSpeed(speed)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${playbackSpeed === speed ? 'bg-[#FF8C00] text-white' : 'text-white/60 hover:text-white'}`}
                  >
                    {speed}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default OrçamentoAnalyticsPage;
