import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldAlert, Users, Activity, Settings, Server,
  MessageSquare, DollarSign, Loader2, Mail, Phone, Save,
  ExternalLink, Target, FileText, Calculator, Calendar, CreditCard
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

// Dados mockados para o gráfico de crescimento do SaaS
const growthData = [
  { name: "Jan", users: 12 },
  { name: "Fev", users: 19 },
  { name: "Mar", users: 27 },
  { name: "Abr", users: 45 },
  { name: "Mai", users: 68 },
  { name: "Jun", users: 104 },
];

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'evolution'>('overview');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalOpps, setTotalOpps] = useState(0);

  // Estados para Evolution API
  const [evolutionUrl, setEvolutionUrl] = useState("");
  const [evolutionKey, setEvolutionKey] = useState("");

  // Estados do Modal de Detalhes do Usuário
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userStats, setUserStats] = useState({ leads: 0, clients: 0, contracts: 0, orcamentos: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('platform_settings').select('*').limit(1).single();
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
      // Ordenando por updated_at por segurança, caso created_at não exista em algum registro antigo
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error(error);
        throw error;
      }
      setUsersList(users || []);

      const { count } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true });
      
      setTotalOpps(count || 0);

    } catch (error) {
      console.error("Erro ao buscar usuários do admin:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvolution = async () => {
    setSaving(true);
    try {
      const { data } = await supabase.from('platform_settings').select('id').limit(1).single();
      
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
      
      localStorage.setItem('evo_api_url', evolutionUrl);
      localStorage.setItem('evo_api_key', evolutionKey);
      
      toast.success("Configurações da Evolution API salvas!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao salvar configurações da Evolution API.");
    } finally {
      setSaving(false);
    }
  };

  const calculateMRR = () => {
    let mrr = 0;
    usersList.forEach(u => {
      if (u.subscription_status === 'active' || u.subscription_status === 'trialing') {
        if (u.plan_type === 'founder') {
          mrr += 67;
        } else {
          mrr += 97;
        }
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
      toast.error("Erro ao buscar dados de uso deste usuário.");
    } finally {
      setLoadingStats(false);
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
          <p className="text-gray-500 text-lg">Esta área é exclusiva para administradores do sistema.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6 relative">
        
        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-orange-400 mb-2">
                <ShieldAlert className="w-5 h-5" />
                <span className="font-bold tracking-wider text-sm uppercase">Super Admin</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Painel de Controle</h1>
              <p className="text-gray-400 max-w-xl">Gerencie usuários, assinaturas e configure integrações globais.</p>
            </div>
            
            <div className="flex flex-wrap gap-2 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700 backdrop-blur-md">
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}>Visão Geral</button>
              <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}>Usuários</button>
              <button onClick={() => setActiveTab('evolution')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'evolution' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}>Evolution API</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-8 custom-scrollbar">
          
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{usersList.length}</h3>
                  <p className="text-sm font-medium text-gray-500">Total de Usuários Cadastrados</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(calculateMRR())}
                  </h3>
                  <p className="text-sm font-medium text-gray-500">MRR (Faturamento Recorrente)</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Activity className="w-5 h-5" /></div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{totalOpps}</h3>
                  <p className="text-sm font-medium text-gray-500">Leads/Oportunidades no Sistema</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Crescimento de Usuários</h2>
                    <p className="text-sm text-gray-500">Evolução de cadastros nos últimos 6 meses</p>
                  </div>
                </div>
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
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
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
                <h2 className="text-lg font-bold text-gray-900">Assinaturas e Usuários</h2>
                <p className="text-sm text-gray-500">Controle e status de pagamentos via Stripe. Clique em um usuário para ver os detalhes.</p>
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
                      <tr 
                        key={usr.id} 
                        onClick={() => openUserModal(usr)}
                        className="hover:bg-orange-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {usr.avatar_url ? (
                              <img src={usr.avatar_url} alt={usr.first_name} className="w-8 h-8 rounded-full object-cover border border-gray-200" />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center font-bold text-xs text-orange-600">
                                {usr.first_name ? usr.first_name.substring(0,2).toUpperCase() : 'US'}
                              </div>
                            )}
                            <span className="font-semibold text-gray-900">{usr.first_name || 'Sem Nome'} {usr.last_name || ''}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            {usr.email && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Mail className="w-3 h-3 text-gray-400" /> {usr.email}
                              </div>
                            )}
                            {usr.phone && (
                              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                <Phone className="w-3 h-3 text-gray-400" /> {usr.phone}
                              </div>
                            )}
                            {!usr.email && !usr.phone && <span className="text-xs text-gray-400">-</span>}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-600 font-medium capitalize">
                            {usr.plan_type || 'Mensal'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {usr.role === 'admin' ? (
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-purple-100 text-purple-700 border border-purple-200">
                              Isento (Admin)
                            </span>
                          ) : usr.subscription_status === 'active' ? (
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-green-100 text-green-700 border border-green-200">
                              Ativo
                            </span>
                          ) : usr.subscription_status === 'trialing' ? (
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-blue-100 text-blue-700 border border-blue-200">
                              Teste (Trial)
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
                              {usr.subscription_status || 'Inativo'}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {usr.created_at ? new Date(usr.created_at).toLocaleDateString('pt-BR') : '-'}
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
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" /> Integração WhatsApp
                  </h2>
                  <p className="text-green-50 max-w-xl leading-relaxed">
                    Conecte a <strong>Evolution API</strong> para permitir automações para todos os usuários da plataforma.
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Server className="w-4 h-4 text-gray-400" /> URL da Evolution API
                      </label>
                      <input 
                        type="url"
                        value={evolutionUrl}
                        onChange={e => setEvolutionUrl(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-gray-400" /> Global API Key
                      </label>
                      <input 
                        type="password"
                        value={evolutionKey}
                        onChange={e => setEvolutionKey(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={handleSaveEvolution}
                    disabled={saving}
                    className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md flex items-center gap-2"
                  >
                    {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    Salvar Configurações
                  </button>
                </div>
              </div>
            </div>
          )}
          
        </div>
      </div>

      {/* MODAL: Detalhes do Usuário */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <DialogContent className="sm:max-w-2xl bg-white p-0 overflow-hidden rounded-3xl">
          <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center gap-4">
            {selectedUser?.avatar_url ? (
              <img src={selectedUser.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-bold border-2 border-white shadow-sm">
                {selectedUser?.first_name ? selectedUser.first_name.substring(0,2).toUpperCase() : 'US'}
              </div>
            )}
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">
                {selectedUser?.first_name || 'Sem Nome'} {selectedUser?.last_name || ''}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-3 mt-1.5 text-sm text-gray-500 font-medium">
                {selectedUser?.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {selectedUser.email}</span>}
                {selectedUser?.phone && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {selectedUser.phone}</span>}
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
            
            {/* Informações da Assinatura (Stripe) */}
            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4 flex items-center gap-2">
                <CreditCard className="w-4 h-4" /> Status da Assinatura (Stripe)
              </h3>
              
              <div className="grid grid-cols-2 gap-4 mb-5">
                <div>
                  <p className="text-[11px] text-gray-500 font-medium mb-1">Status Atual</p>
                  <span className={`px-2.5 py-1 text-xs font-bold rounded-md border inline-block ${
                    selectedUser?.role === 'admin' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                    selectedUser?.subscription_status === 'active' ? 'bg-green-50 text-green-700 border-green-200' :
                    selectedUser?.subscription_status === 'trialing' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                    'bg-red-50 text-red-700 border-red-200'
                  }`}>
                    {selectedUser?.role === 'admin' ? 'Isento (Admin)' : (selectedUser?.subscription_status || 'Inativo')}
                  </span>
                </div>
                <div>
                  <p className="text-[11px] text-gray-500 font-medium mb-1">Plano</p>
                  <p className="text-sm font-bold text-gray-900 capitalize">{selectedUser?.plan_type || 'Mensal'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[11px] text-gray-500 font-medium mb-1">ID do Cliente no Stripe</p>
                  <p className="text-sm font-mono text-gray-700 bg-gray-50 p-2 rounded border border-gray-100">
                    {selectedUser?.stripe_customer_id || 'Não vinculado ao Stripe'}
                  </p>
                </div>
              </div>

              {selectedUser?.stripe_customer_id ? (
                <a 
                  href={`https://dashboard.stripe.com/customers/${selectedUser.stripe_customer_id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[#635BFF] hover:bg-[#4B45D6] text-white py-2.5 rounded-xl font-bold text-sm transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" /> Ver Histórico / Faturas no Stripe
                </a>
              ) : (
                <p className="text-xs text-gray-400 italic text-center">Este usuário ainda não passou pelo checkout e não possui faturas no Stripe.</p>
              )}
            </div>

            {/* Estatísticas de Uso do CRM */}
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Activity className="w-4 h-4" /> Utilização do CRM
              </h3>
              
              {loadingStats ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center"><Target className="w-5 h-5" /></div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{userStats.leads}</p>
                      <p className="text-xs font-semibold text-gray-500">Leads (Oportunidades)</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{userStats.clients}</p>
                      <p className="text-xs font-semibold text-gray-500">Clientes Fechados</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><Calculator className="w-5 h-5" /></div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{userStats.orcamentos}</p>
                      <p className="text-xs font-semibold text-gray-500">Orçamentos Criados</p>
                    </div>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center"><FileText className="w-5 h-5" /></div>
                    <div>
                      <p className="text-2xl font-black text-gray-900">{userStats.contracts}</p>
                      <p className="text-xs font-semibold text-gray-500">Contratos Gerados</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}