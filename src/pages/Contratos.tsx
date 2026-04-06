import React, { useState, useEffect, useMemo, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, FileText, Loader2, Edit2, Trash2, ExternalLink, Copy,
  DollarSign, Calendar, Download, Mail, LayoutTemplate, Wand2, Users, Eye, CheckCircle2, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface Contract {
  id: string;
  client_id: string;
  title?: string;
  value: number;
  start_date: string;
  status: string;
  signature_status: string;
  share_token: string;
  description: string;
  contract_image: string;
  client_signature: string;
  supplier_signature: string;
  opportunities?: { name: string };
  created_at: string;
  updated_at: string;
}

export default function Contratos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [activePdfContract, setActivePdfContract] = useState<Contract | null>(null);

  // Modal de Detalhes Rápidos
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [contractTransaction, setContractTransaction] = useState<any>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    if (user) fetchContracts();
  }, [user]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, opportunities(name)')
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
    return contracts.filter(c => {
      const clientName = c.opportunities?.name?.toLowerCase() || '';
      const titleName = c.title?.toLowerCase() || '';
      return clientName.includes(searchQuery.toLowerCase()) || titleName.includes(searchQuery.toLowerCase());
    });
  }, [contracts, searchQuery]);

  const handleDuplicate = async (contract: Contract) => {
    try {
      const { id, created_at, updated_at, opportunities, ...copyData } = contract;
      copyData.share_token = crypto.randomUUID();
      if (copyData.title) {
        copyData.title = `${copyData.title} (Cópia)`;
      }
      
      const { data, error } = await supabase.from('contracts').insert(copyData).select('*, opportunities(name)').single();
      if (error) throw error;
      
      setContracts(prev => [data, ...prev]);
      toast.success("Duplicado com sucesso!");
    } catch (err) {
      toast.error("Erro ao duplicar.");
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Tem certeza que deseja excluir este documento?")) return;
    try {
      await supabase.from('contracts').delete().eq('id', id);
      setContracts(prev => prev.filter(c => c.id !== id));
      toast.success("Excluído com sucesso.");
    } catch (err) {
      toast.error("Erro ao excluir.");
    }
  };

  const handleDownloadPDF = async (contract: Contract) => {
    setDownloadingId(contract.id);
    setActivePdfContract(contract);
    toast.info("Preparando documento...");

    setTimeout(async () => {
      if (!pdfTemplateRef.current) return;
      
      try {
        const doc = new jsPDF({
          orientation: 'p',
          unit: 'mm',
          format: 'a4',
          putOnlyUsedFonts: true
        });

        await doc.html(pdfTemplateRef.current, {
          callback: function (doc) {
            doc.save(`Contrato_${contract.opportunities?.name || 'Documento'}.pdf`);
            setDownloadingId(null);
            setActivePdfContract(null);
            toast.success("PDF baixado com sucesso!");
          },
          x: 10,
          y: 10,
          width: 190, 
          windowWidth: 800, 
          autoPaging: 'text' 
        });
      } catch (error) {
        console.error(error);
        toast.error("Erro ao gerar PDF.");
        setDownloadingId(null);
        setActivePdfContract(null);
      }
    }, 600);
  };

  const handleOpenDetails = async (contract: Contract) => {
    setSelectedContract(contract);
    setIsDetailsOpen(true);
    setLoadingDetails(true);
    setContractTransaction(null);

    try {
      if (contract.client_id) {
        const { data } = await supabase
          .from('transactions')
          .select('*')
          .eq('client_id', contract.client_id)
          .eq('amount', contract.value)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data) setContractTransaction(data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingDetails(false);
    }
  };

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto flex flex-col h-full space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-1">Contratos</h1>
            <p className="text-sm text-gray-500">Crie modelos dinâmicos, gerencie e assine contratos.</p>
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative w-full sm:w-[280px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text"
                placeholder="Buscar cliente ou modelo..."
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
          {filteredContracts.length > 0 ? (
            filteredContracts.map(contract => {
              const isTemplate = !contract.client_id;
              
              return isTemplate ? (
                // --- CARD DE MODELO (TEMPLATE) ---
                <div 
                  key={contract.id} 
                  className="bg-gradient-to-b from-purple-50/40 to-white border border-purple-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col relative"
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-purple-400"></div>
                  <div className="p-6 space-y-5 flex-1">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-2 text-purple-600">
                        <LayoutTemplate className="w-4 h-4" />
                        <span className="text-[11px] font-bold uppercase tracking-widest">MODELO BASE</span>
                      </div>
                      <div className="px-3 py-1 rounded-full text-[10px] font-bold bg-purple-100 text-purple-700 uppercase tracking-wide">
                        Template
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 line-clamp-2">
                      {contract.title || 'Modelo sem título'}
                    </h3>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Wand2 className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-600">
                          Variáveis dinâmicas ativas
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-purple-400" />
                        <span className="text-sm font-medium text-gray-600">
                          Pronto p/ link de fechamento
                        </span>
                      </div>
                    </div>

                    <div className="h-px bg-purple-100/50 w-full my-4"></div>

                    <button 
                      onClick={() => navigate(`/contratos/editar/${contract.id}`)}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-purple-50 border border-purple-200 rounded-xl text-sm font-bold text-purple-700 hover:bg-purple-100 transition-colors shadow-sm"
                    >
                      <Edit2 className="w-4 h-4" /> Editar Modelo
                    </button>
                  </div>

                  <div className="px-5 py-4 bg-purple-50/30 border-t border-purple-100 flex items-center justify-between">
                    <button onClick={(e) => handleDelete(contract.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-white rounded-lg transition-all" title="Excluir">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    
                    <button onClick={() => handleDuplicate(contract)} className="px-4 py-2 bg-white border border-purple-100 rounded-xl text-xs font-bold text-purple-600 shadow-sm hover:shadow-md flex items-center gap-2 transition-all">
                      <Copy className="w-3.5 h-3.5" /> Duplicar
                    </button>
                  </div>
                </div>
              ) : (
                // --- CARD DE CONTRATO REAL ---
                <div 
                  key={contract.id} 
                  className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all overflow-hidden flex flex-col"
                >
                  <div className="p-6 space-y-5 flex-1">
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

                    <h3 className="text-xl font-bold text-gray-900 truncate">
                      {contract.opportunities?.name || 'Cliente não definido'}
                    </h3>

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

                    <button 
                      onClick={() => handleDownloadPDF(contract)}
                      disabled={downloadingId === contract.id}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-orange-50 border border-orange-100 rounded-xl text-sm font-bold text-gray-700 hover:bg-orange-100 transition-colors disabled:opacity-50"
                    >
                      {downloadingId === contract.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                      Baixar PDF
                    </button>
                  </div>

                  <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleOpenDetails(contract)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all" title="Ver Detalhes"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => navigate(`/contratos/editar/${contract.id}`)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all" title="Editar"><Edit2 className="w-4 h-4" /></button>
                      <button onClick={() => handleDuplicate(contract)} className="p-2 text-gray-400 hover:text-gray-900 hover:bg-white rounded-lg transition-all" title="Duplicar"><Copy className="w-4 h-4" /></button>
                      <button onClick={(e) => handleDelete(contract.id, e)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => window.open(`/contratos/public/${contract.share_token}`, '_blank')} className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-xs font-bold text-orange-500 shadow-sm hover:shadow-md flex items-center gap-2 transition-all">
                      <ExternalLink className="w-3.5 h-3.5" /> Ver / Assinar
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full bg-white border border-gray-100 rounded-2xl flex flex-col items-center justify-center py-20 shadow-sm">
              <FileText className="w-12 h-12 text-gray-200 mb-4" />
              <h3 className="text-lg font-bold text-gray-900 mb-1">Nenhum contrato encontrado</h3>
              <p className="text-sm text-gray-500 mb-6">Crie seu primeiro contrato ou modelo clicando no botão no topo.</p>
            </div>
          )}
        </div>

        {/* TEMPLATE OCULTO PARA GERAÇÃO DE PDF */}
        <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
          {activePdfContract && (
            <div 
              ref={pdfTemplateRef} 
              className="bg-white p-8 text-black"
              style={{ 
                width: '780px', 
                fontSize: '14px', 
                fontFamily: 'Arial, sans-serif', 
                lineHeight: '1.6' 
              }}
            >
              {activePdfContract.contract_image && (
                <img src={activePdfContract.contract_image} crossOrigin="anonymous" className="w-full h-72 object-cover rounded-xl mb-10" />
              )}
              
              <div 
                style={{ textAlign: 'justify', color: '#000' }}
                dangerouslySetInnerHTML={{ __html: activePdfContract.description }} 
              />
              
              <div className="mt-16 pt-8 border-t border-gray-300 grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="h-20 flex items-end justify-center border-b border-black mb-2 pb-1">
                    {activePdfContract.client_signature && <img src={activePdfContract.client_signature} crossOrigin="anonymous" className="max-h-16" />}
                  </div>
                  <p className="font-bold text-xs">{activePdfContract.opportunities?.name}</p>
                  <p className="text-[10px] uppercase text-gray-500">Contratante</p>
                </div>
                <div className="text-center">
                  <div className="h-20 flex items-end justify-center border-b border-black mb-2 pb-1">
                    {activePdfContract.supplier_signature && <img src={activePdfContract.supplier_signature} crossOrigin="anonymous" className="max-h-16" />}
                  </div>
                  <p className="font-bold text-xs">Fornecedor</p>
                  <p className="text-[10px] uppercase text-gray-500">Contratado</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODAL: Detalhes do Contrato */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[500px] bg-white rounded-3xl p-0 overflow-hidden shadow-2xl">
            {selectedContract && (
              <>
                <div className="px-6 py-6 border-b border-gray-100 bg-gray-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <DialogTitle className="text-xl font-bold text-gray-900 mb-1">
                        Detalhes do Contrato
                      </DialogTitle>
                      <DialogDescription className="text-sm font-medium text-gray-500">
                        {selectedContract.opportunities?.name || 'Cliente não definido'}
                      </DialogDescription>
                    </div>
                    <div className={`px-3 py-1.5 rounded-full text-xs font-bold ${
                      selectedContract.signature_status === 'Assinado 2/2' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {selectedContract.signature_status || 'Pendente'}
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  
                  {/* Info Básica */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4">
                      <p className="text-[10px] uppercase font-bold text-orange-600/70 tracking-wider mb-1">Valor do Contrato</p>
                      <p className="font-black text-gray-900 text-lg">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedContract.value)}</p>
                    </div>
                    <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                      <p className="text-[10px] uppercase font-bold text-blue-600/70 tracking-wider mb-1">Data de Início</p>
                      <p className="font-black text-gray-900 text-lg">{new Date(selectedContract.start_date).toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>

                  {/* Assinaturas */}
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Status de Assinaturas</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-gray-700 mb-2">Cliente</p>
                        {selectedContract.client_signature ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                            <img src={selectedContract.client_signature} alt="Assinatura" className="h-12 object-contain" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center opacity-50">
                            <AlertCircle className="w-5 h-5 text-yellow-500 mb-2" />
                            <span className="text-xs font-medium">Pendente</span>
                          </div>
                        )}
                      </div>
                      <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
                        <p className="text-xs font-bold text-gray-700 mb-2">Fornecedor (Você)</p>
                        {selectedContract.supplier_signature ? (
                          <div className="flex flex-col items-center">
                            <CheckCircle2 className="w-5 h-5 text-green-500 mb-2" />
                            <img src={selectedContract.supplier_signature} alt="Assinatura" className="h-12 object-contain" />
                          </div>
                        ) : (
                          <div className="flex flex-col items-center opacity-50">
                            <AlertCircle className="w-5 h-5 text-yellow-500 mb-2" />
                            <span className="text-xs font-medium">Pendente</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Plano de Pagamento */}
                  <div>
                    <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-3">Plano de Pagamento Vinculado</h3>
                    {loadingDetails ? (
                      <div className="flex items-center justify-center p-6"><Loader2 className="w-6 h-6 animate-spin text-orange-400" /></div>
                    ) : contractTransaction ? (
                      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-sm font-bold text-gray-700">Status Financeiro:</span>
                          <span className={`text-xs font-bold uppercase px-2 py-1 rounded-md ${contractTransaction.status === 'Recebido' || contractTransaction.status === 'Pago' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                            {contractTransaction.status}
                          </span>
                        </div>

                        {contractTransaction.is_installment && contractTransaction.installments ? (
                          <div className="space-y-2 mt-4">
                            {(typeof contractTransaction.installments === 'string' ? JSON.parse(contractTransaction.installments) : contractTransaction.installments).map((inst: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-sm p-3 bg-white rounded-lg border border-gray-100 shadow-sm">
                                <div className="flex items-center gap-3">
                                  <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">{inst.number}</div>
                                  <span className="font-bold text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inst.amount)}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                  <span className="text-gray-500 font-medium text-xs">{new Date(inst.dueDate).toLocaleDateString('pt-BR')}</span>
                                  <span className={`w-2 h-2 rounded-full ${inst.status === 'Pago' ? 'bg-green-500' : 'bg-yellow-500'}`} title={inst.status}></span>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-sm p-3 bg-white rounded-lg border border-gray-100 shadow-sm flex justify-between items-center mt-2">
                            <span className="font-bold text-gray-700">Pagamento Único</span>
                            <span className="font-black text-gray-900">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(contractTransaction.amount)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="bg-gray-50 border border-gray-200 border-dashed rounded-xl p-6 text-center text-gray-500 text-sm">
                        Nenhuma transação financeira vinculada a este contrato.
                      </div>
                    )}
                  </div>

                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
                  <button onClick={() => setIsDetailsOpen(false)} className="px-6 py-2.5 text-gray-600 font-bold hover:bg-gray-200 rounded-xl transition-colors">
                    Fechar
                  </button>
                  <button onClick={() => window.open(`/contratos/public/${selectedContract.share_token}`, '_blank')} className="px-6 py-2.5 bg-gray-900 text-white font-bold rounded-xl hover:bg-black transition-all flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" /> Ver Link Público
                  </button>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </Layout>
  );
}