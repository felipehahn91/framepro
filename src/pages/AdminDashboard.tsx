import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldAlert, Users, Activity, Server,
  MessageSquare, DollarSign, Loader2, Mail, Phone, Save,
  ExternalLink, Target, FileText, Calculator, CreditCard
} from "lucide-react";
import { toast } from "sonner";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const growthData = [
  { name: "Jan", users: 12 },
  { name: "Fev", users: 19 },
  { name: "Mar", users: 27 },
  { name: "Abr", users: 45 },
  { name: "Mai", users: 68 },
  { name: "Jun", users: 104 },
];

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'evolution' | 'notifications'>('overview');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalOpps, setTotalOpps] = useState(0);

  // Estados para Notification global
  const [globalNotifTitle, setGlobalNotifTitle] = useState("");
  const [globalNotifContent, setGlobalNotifContent] = useState("");
  const [globalNotifType, setGlobalNotifType] = useState("info");
  const [sendingNotif, setSendingNotif] = useState(false);

  // Estados para Evolution API
  const [evolutionUrl, setEvolutionUrl] = useState("");
  const [evolutionKey, setEvolutionKey] = useState("");

  // Estados do Modal de Detalhes do Usuário
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userStats, setUserStats] = useState({ leads: 0, clients: 0, contracts: 0, orcamentos: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('*').limit(1).maybeSingle();
      if (data) {
        setEvolutionUrl(data.evo_api_url || "");
        setEvolutionKey(data.evo_api_key || "");
      }
    };
    fetchSettings();

    if (profile?.role === 'admin') {
      fetchUsersAndStats();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchUsersAndStats = async () => {
    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setUsersList(users || []);

      const { count } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true });
      
      setTotalOpps(count || 0);
    } catch (error) {
      console.error("Erro ao buscar dados do admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvolution = async () => {
    setSaving(true);
    try {
      const { data } = await supabase.from('platform_settings').select('id').limit(1).maybeSingle();
      
      if (data) {
        await supabase.from('platform_settings').update({
          evo_api_url: evolutionUrl,
          evo_api_key: evolutionKey
        }).eq('id', data.id);
      } else {
        await supabase.from('platform_settings').insert([{
          evo_api_url: evolutionUrl,
          evo_api_key: evolutionKey
        }]);
      }
      toast.success("Configurações da Evolution API salvas!");
    } catch (err) {
      toast.error("Erro ao salvar configurações.");
    } finally {
      setSaving(false);
    }
  };

  const calculateMRR = () => {
    let mrr = 0;
    usersList.forEach(u => {
      if (u.subscription_status === 'active' || u.subscription_status === 'trialing') {
        mrr += u.plan_type === 'founder' ? 67 : 97;
      }
    });
    return mrr;
  };

  const openUserModal = async (u: any) => {
    setSelectedUser(u);
    setLoadingStats(true);
    try {
      const [leads, clients, contracts, orcamentos] = await Promise.all([
         supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('is_client', false),
         supabase.from('opportunities').select('id', { count: 'exact', head: true }).eq('user_id', u.id).eq('is_client', true),
         supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('user_id', u.id),
         supabase.from('orcamentos').select('id', { count: 'exact', head: true }).eq('user_id', u.id)
      ]);
      
      setUserStats({
        leads: leads.count || 0,
        clients: clients.count || 0,
        contracts: contracts.count || 0,
        orcamentos: orcamentos.count || 0
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSendGlobalNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalNotifTitle || !globalNotifContent) return toast.error("Preencha título e conteúdo.");
    
    setSendingNotif(true);
    try {
      const targetUsers = usersList.filter(u => u.role !== 'admin');
      if (targetUsers.length === 0) {
        toast.info("Nenhum usuário para notificar.");
        setSendingNotif(false);
        return;
      }

      const notificationsToInsert = targetUsers.map(u => ({
        user_id: u.id,
        title: globalNotifTitle,
        content: globalNotifContent,
        type: globalNotifType
      }));

      const { error } = await supabase.from('notifications').insert(notificationsToInsert);
      if (error) throw error;
      
      toast.success(`Notificação enviada para ${targetUsers.length} usuários!`);
      setGlobalNotifTitle("");
      setGlobalNotifContent("");
    } catch (err) {
      toast.error("Erro ao enviar notificação.");
    } finally {
      setSendingNotif(false);
    }
  };

  if (loading) {
    return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  if (profile?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-2">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Acesso Restrito</h1>
          <p className="text-gray-500 text-lg">Esta área é exclusiva para administradores.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
        
        {/* Header Section */}
        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-bold tracking-wider text-sm uppercase">Super Admin</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Painel de Controle</h1>
              <p className="text-gray-400 max-w-xl">Gerencie usuários e configure o sistema globalmente.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700 backdrop-blur-md">
              {(['overview', 'users', 'evolution', 'notifications'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab === 'overview' ? 'Visão Geral' : tab === 'users' ? 'Usuários' : tab === 'evolution' ? 'Evolution API' : 'Notificações'}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar">
          
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-4"><Users className="w-5 h-5" /></div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{usersList.length}</h3>
                  <p className="text-sm font-medium text-gray-500">Usuários Cadastrados</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center mb-4"><DollarSign className="w-5 h-5" /></div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateMRR())}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">Faturamento Mensal (MRR)</p>
                </div>
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                  <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-4"><Activity className="w-5 h-5" /></div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{totalOpps}</h3>
                  <p className="text-sm font-medium text-gray-500">Total de Leads</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Crescimento de Usuários</h2>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                      <Area type="monotone" dataKey="users" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">Usuários e Assinaturas</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Contato</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Data Cad.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((usr) => (
                      <tr key={usr.id} onClick={() => openUserModal(usr)} className="hover:bg-orange-50 cursor-pointer transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-xs text-orange-600">
                              {usr.first_name ? usr.first_name.substring(0,2).toUpperCase() : 'US'}
                            </div>
                            <span className="font-semibold text-gray-900">{usr.first_name} {usr.last_name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-xs text-gray-600">{usr.email}</div>
                          <div className="text-xs text-gray-400">{usr.phone}</div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${usr.role === 'admin' ? 'bg-purple-50 text-purple-700' : 'bg-green-50 text-green-700'}`}>
                            {usr.role === 'admin' ? 'Admin' : usr.subscription_status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right text-sm text-gray-500">
                          {new Date(usr.updated_at).toLocaleDateString('pt-BR')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'evolution' && (
            <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-8 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Configurações Evolution API</h2>
                <p className="opacity-90">Defina os parâmetros globais da API de WhatsApp.</p>
              </div>
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">URL do Servidor</label>
                    <input type="url" value={evolutionUrl} onChange={e => setEvolutionUrl(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700">Global API Key</label>
                    <input type="password" value={evolutionKey} onChange={e => setEvolutionKey(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none" />
                  </div>
                </div>
                <button onClick={handleSaveEvolution} disabled={saving} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Salvar Configurações Globais
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2">Mensagens em Massa</h2>
                <p className="opacity-90">Envie avisos em tempo real para todos os usuários.</p>
              </div>
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8">
                <form onSubmit={handleSendGlobalNotification} className="space-y-6">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Título</label>
                    <input type="text" required value={globalNotifTitle} onChange={e => setGlobalNotifTitle(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Mensagem</label>
                    <textarea required rows={4} value={globalNotifContent} onChange={e => setGlobalNotifContent(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Tipo</label>
                    <div className="flex gap-2">
                      {['info', 'success', 'warning'].map(type => (
                        <button key={type} type="button" onClick={() => setGlobalNotifType(type)} className={`flex-1 py-3 rounded-xl border-2 font-bold text-xs uppercase transition-all ${globalNotifType === type ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'}`}>
                          {type === 'info' ? 'Info' : type === 'success' ? 'Sucesso' : 'Aviso'}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button type="submit" disabled={sendingNotif} className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2">
                    {sendingNotif ? <Loader2 className="w-5 h-5 animate-spin" /> : <MessageSquare className="w-5 h-5" />} Enviar para todos
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal Detalhes Usuário */}
      <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="sm:max-w-2xl bg-white rounded-3xl p-0 overflow-hidden">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-bold">
              {selectedUser?.first_name?.substring(0,2).toUpperCase()}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">{selectedUser?.first_name} {selectedUser?.last_name}</DialogTitle>
              <p className="text-sm text-gray-500">{selectedUser?.email}</p>
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <Target className="w-4 h-4 text-orange-500 mb-2" />
                <p className="text-2xl font-bold">{userStats.leads}</p>
                <p className="text-xs text-gray-500 font-medium">Leads</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <Users className="w-4 h-4 text-blue-500 mb-2" />
                <p className="text-2xl font-bold">{userStats.clients}</p>
                <p className="text-xs text-gray-500 font-medium">Clientes</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <FileText className="w-4 h-4 text-purple-500 mb-2" />
                <p className="text-2xl font-bold">{userStats.contracts}</p>
                <p className="text-xs text-gray-500 font-medium">Contratos</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100">
                <Calculator className="w-4 h-4 text-green-500 mb-2" />
                <p className="text-2xl font-bold">{userStats.orcamentos}</p>
                <p className="text-xs text-gray-500 font-medium">Orçamentos</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}