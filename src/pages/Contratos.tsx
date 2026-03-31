import React, { useState, useEffect, useMemo, useRef } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { 
  Search, Plus, FileText, Loader2, Edit2, Trash2, ExternalLink, Copy,
  DollarSign, Calendar, Download, Mail
} from "lucide-react";
import { toast } from "sonner";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface Contract {
  id: string;
  client_id: string;
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
}

export default function Contratos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Ref para renderização oculta do PDF
  const pdfTemplateRef = useRef<HTMLDivElement>(null);
  const [activePdfContract, setActivePdfContract] = useState<Contract | null>(null);

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

  const handleDownloadPDF = async (contract: Contract) => {
    setDownloadingId(contract.id);
    setActivePdfContract(contract);
    toast.info("Preparando documento...");

    // Aguarda o React renderizar o template oculto
    setTimeout(async () => {
      if (!pdfTemplateRef.current) return;
      try {
        const canvas = await html2canvas(pdfTemplateRef.current, { 
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const imgData = canvas.toDataURL("image/png");
        const pdf = new jsPDF("p", "mm", "a4");
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        let heightLeft = pdfHeight;
        let position = 0;

        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;

        while (heightLeft > 0) {
          position = position - pageHeight;
          pdf.addPage();
          pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
          heightLeft -= pageHeight;
        }
        
        pdf.save(`Contrato_${contract.opportunities?.name || 'Documento'}.pdf`);
        toast.success("PDF baixado com sucesso!");
      } catch (error) {
        toast.error("Erro ao gerar PDF.");
      } finally {
        setDownloadingId(null);
        setActivePdfContract(null);
      }
    }, 500);
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

        {/* TEMPLATE OCULTO PARA GERAÇÃO DE PDF */}
        <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none">
          {activePdfContract && (
            <div 
              ref={pdfTemplateRef} 
              className="bg-white p-12 text-black w-[210mm]"
              style={{ minHeight: '297mm' }}
            >
              {activePdfContract.contract_image && (
                <img src={activePdfContract.contract_image} crossOrigin="anonymous" className="w-full h-64 object-cover rounded-xl mb-10" />
              )}
              <div className="prose max-w-none mb-16" dangerouslySetInnerHTML={{ __html: activePdfContract.description }} />
              
              <div className="mt-20 pt-10 border-t border-gray-200 grid grid-cols-2 gap-12">
                <div className="text-center">
                  <div className="h-24 flex items-end justify-center border-b border-black mb-2">
                    {activePdfContract.client_signature && <img src={activePdfContract.client_signature} crossOrigin="anonymous" className="max-h-20" />}
                  </div>
                  <p className="font-bold">{activePdfContract.opportunities?.name}</p>
                  <p className="text-sm uppercase">Contratante</p>
                </div>
                <div className="text-center">
                  <div className="h-24 flex items-end justify-center border-b border-black mb-2">
                    {activePdfContract.supplier_signature && <img src={activePdfContract.supplier_signature} crossOrigin="anonymous" className="max-h-20" />}
                  </div>
                  <p className="font-bold">Fornecedor</p>
                  <p className="text-sm uppercase">Contratado</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}