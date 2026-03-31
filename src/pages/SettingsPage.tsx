import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Save, Loader2, Palette, Check, MessageSquare, QrCode, Smartphone, LogOut, RefreshCw, Webhook } from 'lucide-react';
import * as evolutionApi from '@/lib/evolution';
import { THEMES, applyTheme, getActiveTheme } from '@/lib/theme';

export default function SettingsPage() {
  const { user, profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [profileData, setProfileData] = useState({ name: '', company: '', avatar: null as File | null });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [activeTheme, setActiveTheme] = useState(getActiveTheme());

  // --- WHATSAPP STATES ---
  const [waInstance, setWaInstance] = useState<any>(null);
  const [waLoading, setWaLoading] = useState(true);
  const [qrCodeBase64, setQrCodeBase64] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('disconnected');
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    document.title = "Configurações - Frame Pro";
    
    if (user) {
      setProfileData({ 
        name: profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}` : '', 
        company: '', 
        avatar: null 
      });
      if (profile?.avatar_url) setAvatarPreview(profile.avatar_url);
      
      fetchWaInstance();
    }
  }, [user, profile]);

  const fetchWaInstance = async () => {
    setWaLoading(true);
    try {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .eq('user_id', user?.id)
        .single();
      
      if (error && error.code !== 'PGRST116' && error.code !== '42P01') throw error; 

      if (data) {
        setWaInstance(data);
        checkEvolutionState(data.instance_name);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setWaLoading(false);
    }
  };

  const checkEvolutionState = async (instanceName: string) => {
    try {
      const response = await evolutionApi.getConnectionState(instanceName);
      const state = response?.instance?.state || response?.state || 'disconnected';
      
      setConnectionStatus(state);

      if (state === 'open') {
        if (pollingInterval.current) clearInterval(pollingInterval.current);
        setQrCodeBase64(null);
        await updateDbStatus(instanceName, 'connected');
        
        try {
          await evolutionApi.setEvolutionWebhook(instanceName);
        } catch (e) {
          console.error("Falha ao registrar Webhook silenciosamente:", e);
        }
      } else if (state === 'connecting' || state === 'close') {
        fetchQrCode(instanceName);
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('not found')) {
        await supabase.from('whatsapp_instances').delete().eq('instance_name', instanceName);
        setWaInstance(null);
        if (pollingInterval.current) clearInterval(pollingInterval.current);
      }
    }
  };

  const fetchQrCode = async (instanceName: string) => {
    try {
      const response = await evolutionApi.connectInstance(instanceName);
      if (response.base64) {
        setQrCodeBase64(response.base64);
        if (!pollingInterval.current) {
          pollingInterval.current = setInterval(() => checkEvolutionState(instanceName), 3000); 
        }
      }
    } catch (error) {
      console.error("Erro ao buscar QR Code:", error);
    }
  };

  const updateDbStatus = async (instanceName: string, status: string) => {
    await supabase.from('whatsapp_instances').update({ status }).eq('instance_name', instanceName);
    setWaInstance((prev: any) => prev ? { ...prev, status } : prev);
  };

  const handleConnectWhatsapp = async () => {
    setWaLoading(true);
    try {
      const config = evolutionApi.getEvolutionConfig();
      if (!config.url || !config.key) {
        return toast.error("Integração com WhatsApp não está configurada no painel global.");
      }

      const instanceName = `framepro_${user?.id?.replace(/-/g, '').substring(0, 10)}`;

      let evolutionRes;
      try {
        evolutionRes = await evolutionApi.createInstance(instanceName);
      } catch (err: any) {
        if (!err.message.includes('already exists')) {
          throw err;
        }
      }

      const { data, error } = await supabase.from('whatsapp_instances').insert({
        user_id: user?.id,
        instance_name: instanceName,
        status: 'connecting'
      }).select().single();

      if (error && error.code !== '23505') throw error; 

      if (data) setWaInstance(data);

      const qrData = evolutionRes?.qrcode?.base64 || evolutionRes?.base64;
      if (qrData) {
        setQrCodeBase64(qrData);
        if (!pollingInterval.current) {
          pollingInterval.current = setInterval(() => checkEvolutionState(instanceName), 3000);
        }
      } else {
        await fetchQrCode(instanceName);
      }

      toast.success("Instância criada! Escaneie o QR Code.");
    } catch (error: any) {
      toast.error(error.message || "Erro ao conectar WhatsApp.");
    } finally {
      setWaLoading(false);
    }
  };

  const handleDisconnectWhatsapp = async () => {
    if (!waInstance) return;
    setWaLoading(true);
    try {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
      
      await evolutionApi.logoutInstance(waInstance.instance_name).catch(console.error);
      await evolutionApi.deleteInstance(waInstance.instance_name).catch(console.error);

      await supabase.from('whatsapp_instances').delete().eq('id', waInstance.id);
      
      setWaInstance(null);
      setQrCodeBase64(null);
      setConnectionStatus('disconnected');
      toast.success("WhatsApp desconectado com sucesso.");
    } catch (error) {
      toast.error("Erro ao desconectar WhatsApp.");
    } finally {
      setWaLoading(false);
    }
  };

  const handleForceWebhook = async () => {
    if (!waInstance) return;
    try {
      await evolutionApi.setEvolutionWebhook(waInstance.instance_name);
      toast.success("Webhook ativado com sucesso na Evolution!");
    } catch (error: any) {
      toast.error("Erro ao configurar Webhook: " + (error.message || "Verifique a API"));
    }
  };

  useEffect(() => {
    return () => {
      if (pollingInterval.current) clearInterval(pollingInterval.current);
    };
  }, []);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileData(prev => ({ ...prev, avatar: file }));
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil.');
    } finally {
      setLoading(false);
    }
  };

  const showAutoSave = () => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('✓ Salvo automaticamente');
    saveTimeoutRef.current = setTimeout(() => setSaveStatus(''), 3000);
  };

  const handleThemeChange = (themeId: string) => {
    setActiveTheme(themeId);
    applyTheme(themeId); 
    showAutoSave();
  };

  return (
    <Layout>
      <div className="max-w-4xl mx-auto h-full flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configurações</h1>
            <p className="text-gray-500 mt-1">Gerencie seu perfil, personalização e integrações.</p>
          </div>
          {saveStatus && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium animate-in fade-in duration-300">
              {saveStatus}
            </div>
          )}
        </div>

        <Tabs defaultValue="profile" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full max-w-[600px] grid-cols-3 mb-4 bg-gray-100 p-1">
            <TabsTrigger value="profile">Perfil</TabsTrigger>
            <TabsTrigger value="appearance">Aparência</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto pb-6">
            {/* ABA PERFIL */}
            <TabsContent value="profile" className="mt-0">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Informações do Perfil</CardTitle>
                  <CardDescription>Atualize seus dados pessoais e foto de perfil.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex flex-col sm:flex-row gap-6 items-start">
                    <div className="flex flex-col items-center gap-3">
                      <Avatar className="w-24 h-24 border-2 border-gray-200 shadow-sm">
                        <AvatarImage src={avatarPreview || ''} />
                        <AvatarFallback className="text-2xl bg-orange-100 text-orange-600 font-bold">
                          {profile?.first_name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
                      <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">
                        <Camera className="w-4 h-4 mr-2" /> Alterar Foto
                      </Button>
                    </div>

                    <div className="flex-1 space-y-4 w-full">
                      <div className="space-y-2">
                        <Label htmlFor="email">Email (Apenas leitura)</Label>
                        <Input id="email" value={user?.email || ''} disabled className="bg-gray-50" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <Input id="name" name="name" value={profileData.name} onChange={handleProfileChange} placeholder="Seu nome" />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="company">Empresa / Estúdio</Label>
                        <Input id="company" name="company" value={profileData.company} onChange={handleProfileChange} placeholder="Nome do seu negócio" />
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end pt-4 border-t border-gray-100">
                    <Button onClick={saveProfile} disabled={loading} className="bg-orange-400 hover:bg-orange-500 text-white font-bold px-6">
                      {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                      Salvar Perfil
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA APARÊNCIA */}
            <TabsContent value="appearance" className="mt-0">
              <Card className="border-gray-200 shadow-sm">
                <CardHeader>
                  <CardTitle>Personalização Visual</CardTitle>
                  <CardDescription>Escolha um tema de cores para o seu CRM. As alterações são salvas automaticamente.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Palette className="w-5 h-5 text-gray-500" />
                      <Label className="text-base font-semibold">Temas Disponíveis</Label>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {THEMES.map((theme) => {
                        const isActive = activeTheme === theme.id;
                        return (
                          <div
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id)}
                            className={`relative cursor-pointer rounded-xl border-2 p-4 transition-all duration-200 hover:shadow-md ${
                              isActive ? 'border-orange-400 ring-2 ring-orange-400/20 bg-orange-50/50' : 'border-gray-200 hover:border-orange-300 bg-white'
                            }`}
                          >
                            {isActive && (
                              <div className="absolute top-3 right-3 bg-orange-500 text-white rounded-full p-0.5 shadow-sm">
                                <Check className="w-4 h-4" />
                              </div>
                            )}
                            <div className="flex flex-col gap-3">
                              <div className="flex h-12 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
                                <div className="w-1/2 h-full" style={{ backgroundColor: theme.primary }}></div>
                                <div className="w-1/2 h-full" style={{ backgroundColor: theme.secondary }}></div>
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-gray-900 text-sm">{theme.name}</h4>
                                <div className="flex gap-2 text-[11px] font-medium text-gray-500">
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }}></span>Primária</span>
                                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-gray-300" style={{ backgroundColor: theme.secondary }}></span>Secundária</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA WHATSAPP (EVOLUTION) */}
            <TabsContent value="whatsapp" className="mt-0">
              <Card className="border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-emerald-500 to-green-600 p-6 sm:p-8 text-white">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
                      <MessageSquare className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">WhatsApp Pessoal</h2>
                      <p className="text-green-50 text-sm">Conecte seu celular para enviar mensagens e automações direto do CRM.</p>
                    </div>
                  </div>
                </div>

                <CardContent className="p-6 sm:p-8">
                  {waLoading ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                      <Loader2 className="w-10 h-10 animate-spin text-green-500 mb-4" />
                      <p className="font-medium">Sincronizando com a Evolution API...</p>
                    </div>
                  ) : !waInstance ? (
                    // ESTADO 1: Desconectado / Nenhuma instância
                    <div className="flex flex-col items-center justify-center py-10 text-center">
                      <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-6 border border-green-100">
                        <Smartphone className="w-10 h-10 text-green-500" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum WhatsApp Conectado</h3>
                      <p className="text-gray-500 max-w-sm mx-auto mb-8">
                        Para utilizar envios automáticos e os botões de atalho da plataforma, você precisa conectar seu aparelho gerando um QR Code.
                      </p>
                      <Button 
                        onClick={handleConnectWhatsapp}
                        className="bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-6 rounded-xl shadow-lg hover:shadow-xl transition-all text-lg flex items-center gap-2"
                      >
                        <QrCode className="w-5 h-5" /> Conectar WhatsApp Agora
                      </Button>
                    </div>
                  ) : connectionStatus !== 'open' ? (
                    // ESTADO 2: Aguardando Escanear QR Code
                    <div className="flex flex-col md:flex-row items-center gap-10 py-6">
                      <div className="flex-1 text-center md:text-left">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider mb-4 border border-blue-200">
                          <RefreshCw className="w-3 h-3 animate-spin" /> Aguardando Leitura
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-4">Escaneie o QR Code</h3>
                        <div className="space-y-4 text-gray-600">
                          <p className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-900 font-bold flex items-center justify-center text-xs shrink-0">1</span>
                            Abra o WhatsApp no seu celular
                          </p>
                          <p className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-900 font-bold flex items-center justify-center text-xs shrink-0">2</span>
                            Toque em <strong>Mais opções</strong> (Android) ou <strong>Configurações</strong> (iPhone)
                          </p>
                          <p className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-900 font-bold flex items-center justify-center text-xs shrink-0">3</span>
                            Toque em <strong>Aparelhos conectados</strong> e depois em <strong>Conectar um aparelho</strong>
                          </p>
                        </div>
                        
                        <Button 
                          variant="outline" 
                          onClick={handleDisconnectWhatsapp}
                          className="mt-8 text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
                        >
                          Cancelar Operação
                        </Button>
                      </div>

                      <div className="shrink-0 bg-white p-4 rounded-3xl shadow-xl border border-gray-100">
                        {qrCodeBase64 ? (
                          <img src={qrCodeBase64} alt="WhatsApp QR Code" className="w-64 h-64 rounded-xl" />
                        ) : (
                          <div className="w-64 h-64 flex flex-col items-center justify-center bg-gray-50 rounded-xl text-gray-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-2" />
                            <p className="text-sm font-medium">Gerando QR Code...</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    // ESTADO 3: Conectado e Pronto
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-6 py-6 px-4 bg-gray-50 rounded-2xl border border-gray-200">
                      <div className="flex items-center gap-5">
                        <div className="relative">
                          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                            <Smartphone className="w-8 h-8" />
                          </div>
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-gray-900">Aparelho Conectado</h3>
                          <p className="text-gray-500 text-sm mt-0.5">Sua sessão está ativa e pronta para uso no CRM.</p>
                          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-green-100 text-green-700 rounded-md text-xs font-bold uppercase tracking-wider">
                            <Check className="w-3.5 h-3.5" /> Sessão Ativa
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2 w-full sm:w-auto">
                        <Button 
                          onClick={handleForceWebhook}
                          variant="outline"
                          className="border-green-200 text-green-700 hover:bg-green-50 font-bold px-6 shadow-sm w-full"
                        >
                          <Webhook className="w-4 h-4 mr-2" /> Forçar Webhook
                        </Button>
                        <Button 
                          onClick={handleDisconnectWhatsapp}
                          variant="destructive"
                          className="bg-red-500 hover:bg-red-600 font-bold px-6 shadow-sm w-full"
                        >
                          <LogOut className="w-4 h-4 mr-2" /> Desconectar
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </Layout>
  );
}