
import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useAuth } from '@/contexts/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import ErrorBoundaryWithCleanup from '@/components/ErrorBoundaryWithCleanup';
import pb from '@/lib/pocketbaseClient';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Camera, Save, Loader2, Palette, Check } from 'lucide-react';

const THEMES = [
  { id: 'theme-frame-pro', name: 'Frame Pro', primary: '#FF8C00', secondary: '#FFFFFF' },
  { id: 'theme-elegancia-dourada', name: 'Elegância Dourada', primary: '#D4AF37', secondary: '#1a1a1a' },
  { id: 'theme-azul-profissional', name: 'Azul Profissional', primary: '#2E5090', secondary: '#F5F5F5' },
  { id: 'theme-rosa-sofisticado', name: 'Rosa Sofisticado', primary: '#D4547C', secondary: '#FFF8F9' },
  { id: 'theme-verde-natural', name: 'Verde Natural', primary: '#2D6A4F', secondary: '#F1FAEE' },
  { id: 'theme-cinza-minimalista', name: 'Cinza Minimalista', primary: '#4A4A4A', secondary: '#FFFFFF' },
];

const SettingsPageContent = () => {
  const { currentUser, changeTheme } = useAuth();
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState('');
  const fileInputRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  const [profileData, setProfileData] = useState({ name: '', company: '', avatar: null });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [activeTheme, setActiveTheme] = useState('theme-frame-pro');

  // Real-time updates for settings
  useSubscription('settings_page', 'dashboard_settings', `userId="${currentUser?.id}"`, (e) => {
    if (e.action === 'update' && e.record.theme) {
      setActiveTheme(e.record.theme);
    }
  }, [currentUser?.id]);

  useEffect(() => {
    if (currentUser) {
      setProfileData({ name: currentUser.name || '', company: currentUser.company || '', avatar: null });
      if (currentUser.avatar) setAvatarPreview(pb.files.getUrl(currentUser, currentUser.avatar));

      const localTheme = localStorage.getItem(`themeId_${currentUser.id}`);
      if (localTheme && THEMES.some(t => t.id === localTheme)) {
        setActiveTheme(localTheme);
      } else {
        pb.collection('dashboard_settings').getFullList({ filter: `userId="${currentUser.id}"`, $autoCancel: false })
          .then(settings => {
            if (settings.length > 0) {
              const dbTheme = settings[0].theme || settings[0].themeId;
              if (dbTheme) setActiveTheme(dbTheme);
            }
          }).catch(console.error);
      }
    }
  }, [currentUser]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileData(prev => ({ ...prev, avatar: file }));
      setAvatarPreview(URL.createObjectURL(file));
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', profileData.name);
      formData.append('company', profileData.company);
      if (profileData.avatar) formData.append('avatar', profileData.avatar);

      await pb.collection('users').update(currentUser.id, formData, { $autoCancel: false });
      toast.success('Perfil atualizado com sucesso!');
      window.location.reload();
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

  const handleThemeChange = async (themeId) => {
    setActiveTheme(themeId); // Optimistic update
    await changeTheme(themeId);
    showAutoSave();
  };

  return (
    <>
      <Helmet>
        <title>Configurações - Frame Pro</title>
      </Helmet>

      <div className="flex h-screen bg-muted/30">
        <Sidebar />
        <div className="flex-1 flex flex-col lg:ml-64">
          <Header />
          <main className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                  <p className="text-muted-foreground mt-2">Gerencie seu perfil e personalize a aparência do CRM.</p>
                </div>
                {saveStatus && (
                  <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-900/20 dark:text-green-400 px-3 py-1.5 rounded-full text-sm font-medium animate-in fade-in duration-300">
                    {saveStatus}
                  </div>
                )}
              </div>

              <Tabs defaultValue="profile" className="w-full">
                <TabsList className="grid w-full max-w-md grid-cols-2 mb-8">
                  <TabsTrigger value="profile">Perfil</TabsTrigger>
                  <TabsTrigger value="appearance">Aparência</TabsTrigger>
                </TabsList>

                <TabsContent value="profile">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Informações do Perfil</CardTitle>
                      <CardDescription>Atualize seus dados pessoais e foto de perfil.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex flex-col sm:flex-row gap-6 items-start">
                        <div className="flex flex-col items-center gap-3">
                          <Avatar className="w-24 h-24 border-2 border-border">
                            <AvatarImage src={avatarPreview} />
                            <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                              {currentUser?.name?.charAt(0) || 'U'}
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
                            <Input id="email" value={currentUser?.email || ''} disabled className="bg-muted/50" />
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

                      <div className="flex justify-end pt-4 border-t border-border/50">
                        <Button onClick={saveProfile} disabled={loading} className="bg-primary text-primary-foreground">
                          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                          Salvar Perfil
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="appearance">
                  <Card className="border-border/50 shadow-sm">
                    <CardHeader>
                      <CardTitle>Personalização Visual</CardTitle>
                      <CardDescription>Escolha um tema de cores para o seu CRM. As alterações são salvas e aplicadas automaticamente.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-8">
                      <div className="space-y-4">
                        <div className="flex items-center gap-2">
                          <Palette className="w-5 h-5 text-muted-foreground" />
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
                                  isActive ? 'border-primary ring-2 ring-primary/20 bg-primary/5' : 'border-border/50 hover:border-primary/50 bg-card'
                                }`}
                              >
                                {isActive && (
                                  <div className="absolute top-3 right-3 bg-primary text-primary-foreground rounded-full p-0.5">
                                    <Check className="w-4 h-4" />
                                  </div>
                                )}
                                <div className="flex flex-col gap-3">
                                  <div className="flex h-12 rounded-lg overflow-hidden border border-border/50 shadow-sm">
                                    <div className="w-1/2 h-full" style={{ backgroundColor: theme.primary }}></div>
                                    <div className="w-1/2 h-full" style={{ backgroundColor: theme.secondary }}></div>
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="font-medium text-sm">{theme.name}</h4>
                                    <div className="flex gap-2 text-xs text-muted-foreground">
                                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }}></span>Primária</span>
                                      <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full border border-border" style={{ backgroundColor: theme.secondary }}></span>Secundária</span>
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
              </Tabs>
            </div>
          </main>
        </div>
      </div>
    </>
  );
};

const SettingsPage = () => (
  <ErrorBoundaryWithCleanup>
    <SettingsPageContent />
  </ErrorBoundaryWithCleanup>
);

export default SettingsPage;
