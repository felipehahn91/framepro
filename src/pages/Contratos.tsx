import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, FileText, Loader2, Edit2, Trash2, ExternalLink, Copy,
  DollarSign, Calendar, Download, Mail
} from "lucide-react";
import { toast } from "sonner";

interface Contract {
  id: string;
  client_id: string;
  value: number;
  start_date: string;
  status: string;
  signature_status: string;
  share_token: string;
  opportunities?: { name: string };
}

export default function Contratos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, opportunities(name)')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error && error.code !== '42P01') throw error;
      setContracts(data || []);
    } catch (error) {
      toast.error("Erro ao carregar contratos.");
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = useMemo(() => {
    if (!searchQuery) return contracts;
    return contracts.filter(c => 
      c.opportunities?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contracts, searchQuery]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este contrato?")) return;
    try {
      await supabase.from('contracts').delete().eq('id', id);
      setContracts(prev => prev.filter(c => c.id !== id));
      toast.success("Contrato excluído.");
    } catch (err) {
      toast.error("Erro ao excluir.");
    }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex flex-col h-full space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Contratos</h1>
            <p className="text-sm text-gray-500">Crie, envie e gerencie assinaturas de contratos.</p>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar contratos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-shadow"
              />
            </div>
            <button 
              onClick={() => navigate('/contratos/novo')}
              className="px-5 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> Novo Contrato
            </button>
          </div>
        </div>

        {/* Listagem de Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {filteredContracts.length > 0 ? (
            filteredContracts.map(contract => (
              <div 
                key={contract.id} 
                className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
              >
                {/* Card Content Area */}
                <div className="p-6 space-y-5 flex-1">
                  {/* Top Line: Label & Status */}
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 text-gray-400">
                      <FileText className="w-4 h-4" />
                      <span className="text-[11px] font-bold uppercase tracking-widest">CONTRATO</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-[11px] font-bold ${
                      contract.signature_status === 'Assinado 2/2' 
                        ? 'bg-green-50 text-green-700' 
                        : 'bg-yellow-50 text-yellow-700'
                    }`}>
                      {contract.signature_status || 'Pendente'}
                    </div>
                  </div>

                  {/* Client Name */}
                  <h3 className="text-xl font-bold text-gray-900 truncate">
                    {contract.opportunities?.name || 'Cliente não definido'}
                  </h3>

                  {/* Info Blocks */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <DollarSign className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-bold text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-orange-400" />
                      <span className="text-sm font-semibold text-gray-500">
                        {new Date(contract.start_date).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>

                  <div className="h-px bg-gray-100 w-full my-4"></div>

                  {/* Central Download Button */}
                  <button 
                    onClick={() => { /* Lógica de download seria aqui */ toast.info("Iniciando download..."); }}
                    className="w-full flex items-center justify-center gap-2 py-3 bg-orange-50 border border-orange-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-orange-100 transition-colors"
                  >
                    <Download className="w-4 h-4" /> Baixar PDF
                  </button>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => navigate(`/contratos/editar/${contract.id}`)}
                      className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
                      title="Editar"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button 
                      className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all"
                      title="Enviar por Email"
                    >
                      <Mail className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={(e) => handleDelete(contract.id, e)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <button 
                    onClick={() => window.open(`/contratos/public/${contract.share_token}`, '_blank')}
                    className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-orange-500 shadow-sm hover:shadow-md flex items-center gap-2 transition-all"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Ver / Assinar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 shadow-sm">
              <FileText className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum contrato encontrado</h3>
              <p className="text-sm text-gray-500 mb-6">Crie seu primeiro contrato clicando no botão no topo.</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}