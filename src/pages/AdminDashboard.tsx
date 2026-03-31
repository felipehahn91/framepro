import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { useAuth } from "@/contexts/AuthContext";
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
  { name: "Jan", users: 12, revenue: 1200 },
  { name: "Fev", users: 19, revenue: 1900 },
  { name: "Mar", users: 27, revenue: 2700 },
  { name: "Abr", users: 45, revenue: 4500 },
  { name: "Mai", users: 68, revenue: 6800 },
  { name: "Jun", users: 104, revenue: 10400 },
];

export default function AdminDashboard() {
  const { profile, user } = useAuth();
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'evolution'>('overview');
  const [usersList, setUsersList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estados para Evolution API
  const [evolutionUrl, setEvolutionUrl] = useState("");
  const [evolutionKey, setEvolutionKey] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Carrega configurações locais da Evolution API (simulando banco de dados global)
    setEvolutionUrl(localStorage.getItem('evo_api_url') || "https://api.evolution.com");
    setEvolutionKey(localStorage.getItem('evo_api_key') || "");

    if (profile?.role === 'admin') {
      fetchUsers();
    } else {
      setLoading(false);
    }
  }, [profile]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setUsersList(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvolution = () => {
    setSaving(true);
    setTimeout(() => {
      localStorage.setItem('evo_api_url', evolutionUrl);
      localStorage.setItem('evo_api_key', evolutionKey);
      toast.success("Configurações da Evolution API salvas globalmente!");
      setSaving(false);
    }, 800);
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(`${window.location.origin}/api/webhooks/evolution`);
    setCopied(true);
    toast.success("URL de Webhook copiada!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return <Layout><div className="flex h-full items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-gray-400" /></div></Layout>;
  }

  // --- TELA DE BLOQUEIO DE ACESSO ---
  if (profile?.role !== 'admin') {
    return (
      <Layout>
        <div className="flex flex-col items-center justify-center h-full max-w-lg mx-auto text-center space-y-6">
          <div className="w-24 h-24 bg-red-50 rounded-full flex items-center justify-center mb-2">
            <ShieldAlert className="w-12 h-12 text-red-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Acesso Restrito</h1>
          <p className="text-gray-500 text-lg">
            Esta área é exclusiva para administradores do sistema. Você não tem permissão para visualizar o painel de controle global.
          </p>
        </div>
      </Layout>
    );
  }

  // --- PAINEL DO SUPER ADMIN ---
  return (
    <Layout>
      <div className="max-w-7xl mx-auto flex flex-col h-full space-y-6">
        
        {/* Cabeçalho Escuro Premium */}
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
              <p className="text-gray-400 max-w-xl">Gerencie usuários, acompanhe o crescimento do seu SaaS e configure integrações globais.</p>
            </div>
            
            <div className="flex gap-2 bg-gray-800/50 p-1.5 rounded-xl border border-gray-700 backdrop-blur-md">
              <button 
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Visão Geral
              </button>
              <button 
                onClick={() => setActiveTab('users')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'users' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Usuários
              </button>
              <button 
                onClick={() => setActiveTab('evolution')}
                className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'evolution' ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-white'}`}
              >
                Evolution API
              </button>
            </div>
          </div>
        </div>

        {/* CONTEÚDO DAS ABAS */}
        <div className="flex-1 overflow-y-auto pb-8">
          
          {/* ABA: VISÃO GERAL */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
              
              {/* Cards de Métricas SaaS */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><Users className="w-5 h-5" /></div>
                    <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+12%</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">{usersList.length}</h3>
                  <p className="text-sm font-medium text-gray-500">Usuários Totais</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-green-50 text-green-600 flex items-center justify-center"><DollarSign className="w-5 h-5" /></div>
                    <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">+24%</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">R$ 10.400</h3>
                  <p className="text-sm font-medium text-gray-500">MRR Estimado (Mock)</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center"><Activity className="w-5 h-5" /></div>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">1.248</h3>
                  <p className="text-sm font-medium text-gray-500">Oportunidades Criadas</p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center"><MessageSquare className="w-5 h-5" /></div>
                    <span className="text-xs font-bold text-green-500 bg-green-50 px-2 py-1 rounded-full">Online</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-900 mb-1">1</h3>
                  <p className="text-sm font-medium text-gray-500">Instância Evolution Ativa</p>
                </div>
              </div>

              {/* Gráfico de Crescimento */}
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Crescimento de Usuários</h2>
                    <p className="text-sm text-gray-500">Evolução de cadastros nos últimos 6 meses</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1.5 text-sm text-gray-600 font-medium"><div className="w-3 h-3 rounded-full bg-blue-500"></div> Usuários</span>
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
                      <Tooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area type="monotone" dataKey="users" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorUsers)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* ABA: USUÁRIOS */}
          {activeTab === 'users' && (
            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Usuários Cadastrados</h2>
                  <p className="text-sm text-gray-500">Lista de todas as contas registradas no seu sistema.</p>
                </div>
                {usersList.length === 1 && (
                  <div className="bg-blue-50 text-blue-700 px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 border border-blue-100 max-w-sm">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    Vendo apenas você? Lembre-se de configurar a política RLS no Supabase para permitir que o admin leia todos os perfis.
                  </div>
                )}
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50/80 border-b border-gray-100">
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">ID do Usuário</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Cargo</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Último Acesso</th>
                      <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {usersList.map((usr) => (
                      <tr key={usr.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">{usr.id.substring(0, 8)}...</td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-600">
                              {usr.first_name ? usr.first_name.substring(0,2).toUpperCase() : 'US'}
                            </div>
                            <span className="font-semibold text-gray-900">{usr.first_name || 'Sem Nome'} {usr.last_name || ''}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2.5 py-1 inline-flex text-[11px] leading-5 font-semibold rounded-full ${
                            usr.role === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-gray-100 text-gray-800 border border-gray-200'
                          }`}>
                            {usr.role === 'admin' ? 'Admin' : 'Usuário'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(usr.updated_at || new Date()).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="px-2.5 py-1 inline-flex text-[11px] leading-5 font-semibold rounded-full bg-green-100 text-green-800 border border-green-200">
                            Ativo
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ABA: EVOLUTION API */}
          {activeTab === 'evolution' && (
            <div className="max-w-4xl space-y-6 animate-in fade-in slide-in-from-bottom-4">
              
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 sm:p-8 text-white shadow-lg flex flex-col sm:flex-row items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
                    <MessageSquare className="w-6 h-6" /> Integração WhatsApp
                  </h2>
                  <p className="text-green-50 max-w-xl leading-relaxed">
                    Conecte a <strong>Evolution API</strong> para permitir o envio de mensagens automáticas de sistema, réguas de cobrança e fluxos de cadência para todos os usuários da plataforma.
                  </p>
                </div>
                <div className="shrink-0 bg-white/20 p-4 rounded-xl border border-white/30 backdrop-blur-sm text-center">
                  <p className="text-xs font-bold uppercase tracking-wider text-green-100 mb-1">Status da API</p>
                  <p className="text-xl font-black flex items-center justify-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-green-300 animate-pulse"></span> Conectado
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-gray-100">
                  <h3 className="text-lg font-bold text-gray-900">Configurações Globais (Instância Master)</h3>
                  <p className="text-sm text-gray-500 mt-1">Estas credenciais serão usadas como base pelo backend do sistema.</p>
                </div>

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
                        placeholder="https://api.suaevolution.com"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
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
                        placeholder="Sua Global API Key"
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-2 pt-4 border-t border-gray-100">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Link className="w-4 h-4 text-gray-400" /> Webhook URL (Para configurar na Evolution)
                    </label>
                    <div className="flex gap-2">
                      <div className="flex-1 px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl font-mono text-sm text-gray-500 overflow-hidden text-ellipsis">
                        {window.location.origin}/api/webhooks/evolution
                      </div>
                      <button 
                        onClick={handleCopyWebhook}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center justify-center shadow-sm"
                      >
                        {copied ? <Check className="w-5 h-5 text-green-500" /> : <Copy className="w-5 h-5 text-gray-500" />}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Copie esta URL e cole na configuração de Webhooks da sua Evolution API para receber atualizações de status de leitura e respostas.
                    </p>
                  </div>
                </div>

                <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end">
                  <button 
                    onClick={handleSaveEvolution}
                    disabled={saving}
                    className="px-8 py-3 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-md flex items-center gap-2 disabled:opacity-70"
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