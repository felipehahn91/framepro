import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, FileText, Loader2, Edit2, Trash2, ExternalLink, Copy
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
      toast.error("Erro ao carregar contratos. Certifique-se de ter criado a tabela.");
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

  const handleCopyLink = (token: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/contratos/public/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Link copiado para a área de transferência!");
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

        {/* Corpo principal */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm flex-1 p-6">
          {filteredContracts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredContracts.map(contract => (
                <div 
                  key={contract.id} 
                  onClick={() => navigate(`/contratos/editar/${contract.id}`)}
                  className="border border-gray-100 rounded-xl p-5 hover:border-orange-200 hover:shadow-md transition-all cursor-pointer group flex flex-col bg-gray-50/50 hover:bg-white"
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-500 shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={(e) => handleCopyLink(contract.share_token, e)} className="p-1.5 text-gray-400 hover:text-orange-500 bg-white rounded-md shadow-sm" title="Copiar link público">
                        <Copy className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); window.open(`/contratos/public/${contract.share_token}`, '_blank'); }} className="p-1.5 text-gray-400 hover:text-blue-500 bg-white rounded-md shadow-sm" title="Abrir link">
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button onClick={(e) => handleDelete(contract.id, e)} className="p-1.5 text-gray-400 hover:text-red-500 bg-white rounded-md shadow-sm">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-900 text-lg mb-1 truncate">{contract.opportunities?.name || 'Cliente não definido'}</h3>
                    <p className="text-gray-500 text-sm mb-4">Início: {new Date(contract.start_date).toLocaleDateString('pt-BR')}</p>
                  </div>

                  <div className="flex items-center justify-between mt-auto pt-4 border-t border-gray-100">
                    <span className="font-semibold text-gray-900">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contract.value)}
                    </span>
                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider ${
                      contract.signature_status === 'Assinado 2/2' ? 'bg-green-100 text-green-700' :
                      contract.signature_status === 'Assinado 1/2' ? 'bg-blue-100 text-blue-700' :
                      'bg-orange-100 text-orange-600'
                    }`}>
                      {contract.signature_status || 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full py-16">
              <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                <FileText className="w-8 h-8 text-orange-400" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Nenhum contrato encontrado</h3>
              <p className="text-sm text-gray-500 mb-8 max-w-sm text-center">
                Você ainda não possui contratos. Crie seu primeiro documento para enviar aos clientes e coletar assinaturas digitais.
              </p>
              <button 
                onClick={() => navigate('/contratos/novo')}
                className="px-6 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-md"
              >
                <Plus className="w-4 h-4" /> Criar Primeiro Contrato
              </button>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}