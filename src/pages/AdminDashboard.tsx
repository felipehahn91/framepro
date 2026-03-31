import React, { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import {
  ShieldAlert, Users, Activity, Settings, Server,
  MessageSquare, Database, TrendingUp, Key, Copy, Check, Save, Loader2, Link, ShieldCheck, DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from "recharts";

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
  const [copied, setCopied] = useState(false);

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
      const { data: users, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsersList(users || []);

      // Busca total de oportunidades globais
      const { count } = await supabase
        .from('opportunities')
        .select('*', { count: 'exact', head: true });
      
      setTotalOpps(count || 0);

    } catch (error) {
      console.error(error);
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

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/evolution`);
    setCopied(true);
    toast.success("URL de Webhook copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  // Cálculo de MRR Real baseado nas assinaturas
  const calculateMRR = () => {
    let mrr = 0;
    usersList.forEach(u => {
      // Se a assinatura está ativa ou em trial
      if (u.subscription_status === 'active' || u.subscription_status === 'trialing') {
        if (u.plan_type === 'founder') {
          mrr += 67; // Mensalidade equivalente do plano founder
        } else {
          mrr += 97; // Valor do plano mensal
        }
      }
    });
    return mrr;
  };

  if (loading) {
    return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div></Layout>;
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
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
        
        <div className="bg-gray-900 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
          <div className="absolute bottom-0 right-40 w-64 h-64 bg-purple-500 rounded-full blur-3xl opacity-20 -mb-20"></div>
          
          <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <ShieldCheck className="w-5 h-5" />
                <span className="font-bold tracking-wider text-sm uppercase">Super Admin</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-2">Painel de Controle</h1>
              <p className="text-gray-400 max-w-xl">Gerencie usuários, assinaturas e configure integrações globais.</p>
            </div>
            
            <div className="flex gap-2 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700 backdrop-blur-md">
              <button onClick={() => setActiveTab('overview')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}>Visão Geral</button>
              <button onClick={() => setActiveTab('users')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}>Usuários e Assinaturas</button>
              <button onClick={() => setActiveTab('evolution')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'evolution' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}>Evolution API</button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pb-8">
          
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
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
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
                <p className="text-sm text-gray-500">Controle e status de pagamentos via Stripe.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Plano</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Status do Pagamento</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase">Cargo</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase text-right">Acesso</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600">
                              {usr.first_name ? usr.first_name.substring(0,2).toUpperCase() : 'US'}
                            </div>
                            <span className="font-semibold text-gray-900">{usr.first_name || 'Sem Nome'} {usr.last_name || ''}</span>
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
                              Período de Teste
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 text-[11px] font-bold rounded-full bg-red-100 text-red-700 border border-red-200">
                              Inativo / Pendente
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-500 capitalize">{usr.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                          {new Date(usr.created_at || new Date()).toLocaleDateString('pt-BR')}
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
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                        <Key className="w-4 h-4 text-gray-400" /> Global API Key
                      </label>
                      <input 
                        type="password"
                        value={evolutionKey}
                        onChange={e => setEvolutionKey(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
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
    </Layout>
  );
}