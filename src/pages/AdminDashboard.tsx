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
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'evolution' | 'notifications' | 'ai'>('overview');
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

  // Estados para OpenAI
  const [openaiKey, setOpenaiKey] = useState("");

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
        setOpenaiKey(data.openai_api_key || "");
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

  const handleSaveOpenAI = async () => {
    setSaving(true);
    try {
      const { data } = await supabase.from('platform_settings').select('id').limit(1).maybeSingle();
      
      const payload = { openai_api_key: openaiKey };

      if (data) {
        await supabase.from('platform_settings').update(payload).eq('id', data.id);
      } else {
        await supabase.from('platform_settings').insert([payload]);
      }
      toast.success("Chave da OpenAI salva com sucesso!");
    } catch (err) {
      toast.error("Erro ao salvar chave da OpenAI.");
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
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/admin-get-user-stats', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ target_user_id: u.id })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setUserStats({
          leads: data.leads || 0,
          clients: data.clients || 0,
          contracts: data.contracts || 0,
          orcamentos: data.orcamentos || 0
        });
      } else {
        throw new Error(data.error);
      }
    } catch (e) {
      console.error("Erro ao buscar métricas:", e);
      toast.error("Erro ao carregar as métricas do usuário.");
    } finally {
      setLoadingStats(false);
    }
  };

  const handleSendGlobalNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!globalNotifTitle || !globalNotifContent) return toast.error("Preencha título e conteúdo.");
    
    setSendingNotif(true);
    try {
      const targetUsers = usersList;
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
              {(['overview', 'users', 'evolution', 'notifications', 'ai'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
                >
                  {tab === 'overview' ? 'Visão Geral' : 
                   tab === 'users' ? 'Usuários' : 
                   tab === 'evolution' ? 'Evolution API' : 
                   tab === 'notifications' ? 'Notificações' : 'OpenAI'}
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
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Plano</th>
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
                          <span className="text-xs font-bold text-gray-700 uppercase bg-gray-100 px-2 py-1 rounded-md">
                            {usr.role === 'admin' ? 'Vitalício' : (usr.plan_type || 'Starter')}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                            usr.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 
                            usr.subscription_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                            usr.subscription_status === 'trialing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            'bg-red-50 text-red-700 border-red-200'
                          }`}>
                            {usr.role === 'admin' ? 'Admin' : (usr.subscription_status || 'inactive')}
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

          {activeTab === 'ai' && (
            <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-8 text-white shadow-lg">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                  <Activity className="w-6 h-6" /> Inteligência Artificial
                </h2>
                <p className="opacity-90">Configure a OpenAI para gerar insights automáticos no Dashboard dos usuários.</p>
              </div>
              <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">OpenAI API Key</label>
                  <input 
                    type="password" 
                    placeholder="sk-..."
                    value={openaiKey} 
                    onChange={e => setOpenaiKey(e.target.value)} 
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none" 
                  />
                  <p className="text-[10px] text-gray-400">Esta chave será usada para gerar os resumos diários e mensagens de incentivo.</p>
                </div>
                <button onClick={handleSaveOpenAI} disabled={saving} className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />} Salvar Configurações de IA
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
        <DialogContent className="sm:max-w-3xl bg-white rounded-3xl p-0 overflow-hidden shadow-2xl">
          <div className="p-6 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100 flex items-center gap-5">
            <div className="w-16 h-16 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-bold shadow-sm">
              {selectedUser?.first_name?.substring(0,2).toUpperCase() || 'US'}
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-gray-900 mb-1">
                {selectedUser?.first_name} {selectedUser?.last_name}
              </DialogTitle>
              <div className="flex items-center gap-3 text-sm text-gray-500 font-medium">
                <span className="flex items-center gap-1.5"><Mail className="w-4 h-4" /> {selectedUser?.email || 'Sem email'}</span>
                {selectedUser?.phone && <span className="flex items-center gap-1.5"><Phone className="w-4 h-4" /> {selectedUser?.phone}</span>}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className={`px-3 py-1.5 text-xs font-bold rounded-xl border ${selectedUser?.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                {selectedUser?.role === 'admin' ? 'Administrador' : 'Usuário Padrão'}
              </span>
              <div className="flex flex-col gap-2">
                <select
                  value={selectedUser?.plan_type || 'starter'}
                  onChange={async (e) => {
                    const newPlan = e.target.value;
                    const newStatus = selectedUser?.subscription_status === 'inactive' ? 'active' : selectedUser?.subscription_status;
                    
                    setSelectedUser({ ...selectedUser, plan_type: newPlan, subscription_status: newStatus });
                    
                    const { error } = await supabase.rpc('admin_update_user_plan', {
                      p_user_id: selectedUser.id,
                      p_plan_type: newPlan,
                      p_status: newStatus
                    });
                    
                    if (error) {
                      toast.error("Erro ao salvar o plano no banco de dados.");
                      console.error(error);
                      return;
                    }
                    
                    setUsersList(usersList.map(u => u.id === selectedUser.id ? { ...u, plan_type: newPlan, subscription_status: newStatus } : u));
                    toast.success(`Plano alterado para ${newPlan.toUpperCase()}`);
                  }}
                  className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-orange-400 shadow-sm"
                >
                  <option value="starter">Starter (Básico)</option>
                  <option value="plus">Plus (Completo)</option>
                  <option value="founder">Founder Pack</option>
                </select>

                <select
                  value={selectedUser?.subscription_status || 'inactive'}
                  onChange={async (e) => {
                    const newStatus = e.target.value;
                    
                    setSelectedUser({ ...selectedUser, subscription_status: newStatus });
                    
                    const { error } = await supabase.rpc('admin_update_user_plan', {
                      p_user_id: selectedUser.id,
                      p_plan_type: selectedUser.plan_type || 'starter',
                      p_status: newStatus
                    });
                    
                    if (error) {
                      toast.error("Erro ao salvar o status no banco de dados.");
                      console.error(error);
                      return;
                    }
                    
                    setUsersList(usersList.map(u => u.id === selectedUser.id ? { ...u, subscription_status: newStatus } : u));
                    toast.success(`Status alterado para ${newStatus.toUpperCase()}`);
                  }}
                  className="text-xs font-bold bg-white border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 shadow-sm"
                >
                  <option value="active">🟢 Ativo (Acesso Liberado)</option>
                  <option value="trialing">🔵 Trial (Em teste)</option>
                  <option value="past_due">🟠 Inadimplente</option>
                  <option value="canceled">🔴 Cancelado</option>
                  <option value="inactive">⚫ Inativo</option>
                </select>
              </div>
            </div>
          </div>
          
          <div className="p-6 space-y-8 bg-gray-50/30">
            {/* Secão: Estatísticas de Uso */}
            <div>
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="w-4 h-4 text-gray-400" /> Métricas de Uso
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <Target className="w-5 h-5 text-orange-500 mb-3" />
                  <p className="text-3xl font-black text-gray-900">{loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : userStats.leads}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Leads</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <Users className="w-5 h-5 text-blue-500 mb-3" />
                  <p className="text-3xl font-black text-gray-900">{loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : userStats.clients}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Clientes</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <FileText className="w-5 h-5 text-purple-500 mb-3" />
                  <p className="text-3xl font-black text-gray-900">{loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : userStats.contracts}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Contratos</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                  <Calculator className="w-5 h-5 text-green-500 mb-3" />
                  <p className="text-3xl font-black text-gray-900">{loadingStats ? <Loader2 className="w-6 h-6 animate-spin text-gray-300" /> : userStats.orcamentos}</p>
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mt-1">Orçamentos</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Secão: Detalhes da Conta */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-4 h-4 text-gray-400" /> Dados Pessoais
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-semibold text-gray-500">Empresa</span>
                    <span className="text-sm font-bold text-gray-900">{selectedUser?.company || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-semibold text-gray-500">Data de Cadastro</span>
                    <span className="text-sm font-bold text-gray-900">{selectedUser?.created_at ? new Date(selectedUser.created_at).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-semibold text-gray-500">Última Atualização</span>
                    <span className="text-sm font-bold text-gray-900">{selectedUser?.updated_at ? new Date(selectedUser.updated_at).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-semibold text-gray-500">Meta Mensal</span>
                    <span className="text-sm font-bold text-green-600">
                      {selectedUser?.monthly_revenue_goal ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedUser.monthly_revenue_goal) : 'Não definida'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Secão: Assinatura */}
              <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-gray-400" /> Informações de Assinatura
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-semibold text-gray-500">Status</span>
                    <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                      selectedUser?.subscription_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                      selectedUser?.subscription_status === 'trialing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                      'bg-red-50 text-red-700 border-red-200'
                    }`}>
                      {selectedUser?.subscription_status?.toUpperCase() || 'INACTIVE'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-semibold text-gray-500">Plano</span>
                    <span className="text-sm font-bold text-gray-900 uppercase">{selectedUser?.plan_type || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-gray-50">
                    <span className="text-xs font-semibold text-gray-500">Fim do Período de Teste</span>
                    <span className="text-sm font-bold text-gray-900">{selectedUser?.trial_end ? new Date(selectedUser.trial_end).toLocaleDateString('pt-BR') : '-'}</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-xs font-semibold text-gray-500">Stripe Customer ID</span>
                    <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded truncate max-w-[150px]">
                      {selectedUser?.stripe_customer_id || 'Não vinculado'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}