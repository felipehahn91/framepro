import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, FileCheck, CheckCircle2, ShieldCheck, PenTool } from "lucide-react";
import jsPDF from "jspdf";
import SignaturePad from "react-signature-canvas";
import html2canvas from "html2canvas";

export default function ContractPublicView() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [contract, setContract] = useState<any>(null);
  const [savingSig, setSavingSig] = useState(false);
  
  const contractRef = useRef<HTMLDivElement>(null);
  const sigCanvas = useRef<SignaturePad>(null);

  useEffect(() => {
    if (token) fetchContract();
  }, [token]);

  useEffect(() => {
    if (contract) {
      document.title = `Contrato - ${contract.opportunities?.name || 'Documento'} | Frame Pro`;
    }
  }, [contract]);

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, opportunities(name)')
        .eq('share_token', token)
        .single();

      if (error) throw error;
      setContract(data);
    } catch (error) {
      toast.error("Contrato não encontrado ou indisponível.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contractRef.current) return;
    toast.info("Gerando PDF...");
    
    try {
      const canvas = await html2canvas(contractRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
        windowWidth: 800, // Força a largura para 800px no momento do print para o PDF sair perfeito
        windowHeight: contractRef.current.scrollHeight
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      const pageHeight = pdf.internal.pageSize.getHeight();
      
      let heightLeft = pdfHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, pdfHeight);
        heightLeft -= pageHeight;
      }
      
      pdf.save(`Contrato_${contract.opportunities?.name || 'Documento'}.pdf`);
      toast.success("PDF baixado com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar PDF.");
      console.error(error);
    }
  };

  const handleSaveSignature = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      return toast.error("Desenhe sua assinatura.");
    }
    
    setSavingSig(true);
    try {
      const signatureImage = sigCanvas.current.getCanvas().toDataURL('image/png');
      
      const updates: any = {};
      if (!contract.client_signature) {
        updates.client_signature = signatureImage;
        updates.signature_status = contract.supplier_signature ? 'Assinado 2/2' : 'Assinado 1/2';
      }

      const { error } = await supabase
        .from('contracts')
        .update(updates)
        .eq('share_token', token);

      if (error) throw error;
      
      setContract({ ...contract, ...updates });
      toast.success("Assinatura salva com sucesso!");
    } catch (error: any) {
      toast.error("Erro ao salvar assinatura.");
    } finally {
      setSavingSig(false);
    }
  };

  const clearSignature = () => {
    if (sigCanvas.current) sigCanvas.current.clear();
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div>;
  if (!contract) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50"><h2 className="text-2xl font-bold">Contrato Inválido</h2><p className="text-gray-500">O link expirou ou não existe.</p></div>;

  const isSigned = !!contract.client_signature;
  const clientName = contract.opportunities?.name || 'Contratante';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${contract.signature_status === 'Assinado 2/2' ? 'bg-green-100 text-green-600' : 'bg-orange-100 text-orange-500'}`}>
              {contract.signature_status === 'Assinado 2/2' ? <CheckCircle2 className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
            </div>
            <div>
              <h1 className="font-bold text-xl">Visualização de Contrato</h1>
              <p className="text-sm text-gray-500 font-medium">Status: {contract.signature_status}</p>
            </div>
          </div>
          <button onClick={handleDownloadPDF} className="px-5 py-2.5 bg-gray-900 text-white font-semibold rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-2">
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 no-print">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-bold text-blue-900 text-lg mb-1">Assinatura Digital</h3>
              <p className="text-sm text-blue-800 leading-relaxed">Assine este documento digitalmente abaixo. O contrato assinado fica registrado permanentemente.</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          <div ref={contractRef} className="p-6 sm:p-10 bg-white text-black mx-auto" style={{ width: '100%', maxWidth: '800px', backgroundColor: '#ffffff' }}>
            {contract.contract_image && (
              <img src={contract.contract_image} crossOrigin="anonymous" alt="Capa" className="w-full h-[280px] object-cover rounded-xl mb-8 border border-gray-200" />
            )}
            <div 
              className="prose max-w-none mb-16 text-black text-justify leading-relaxed break-words" 
              style={{ wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              dangerouslySetInnerHTML={{ __html: contract.description }} 
            />
            
            <div className="mt-16 pt-8 border-t border-gray-200 grid grid-cols-2 gap-6 sm:gap-12">
              <div className="flex flex-col items-center">
                <div className="h-20 sm:h-24 w-full flex flex-col justify-end border-b border-gray-800 relative mb-2">
                  {isSigned ? (
                    <img src={contract.client_signature} crossOrigin="anonymous" alt="Assinatura" className="max-h-16 sm:max-h-20 mx-auto object-contain" />
                  ) : (
                    <div className="absolute inset-0 no-print border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center overflow-hidden">
                      <SignaturePad ref={sigCanvas} canvasProps={{ className: "w-full h-full" }} />
                    </div>
                  )}
                </div>
                <p className="font-bold text-xs sm:text-sm text-black text-center">{clientName}</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1 text-center">Contratante</p>
                {!isSigned && (
                  <div className="flex gap-2 mt-4 no-print">
                    <button onClick={clearSignature} className="px-3 py-1 text-[10px] font-bold text-gray-500 hover:bg-gray-100 rounded">Limpar</button>
                    <button onClick={handleSaveSignature} disabled={savingSig} className="px-4 py-1.5 text-[10px] font-bold bg-orange-400 text-white rounded hover:bg-orange-500 shadow-sm">
                      {savingSig ? 'Salvando...' : 'Assinar'}
                    </button>
                  </div>
                )}
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="h-20 sm:h-24 w-full flex flex-col justify-end border-b border-gray-800 relative mb-2">
                  {contract.supplier_signature ? (
                    <img src={contract.supplier_signature} crossOrigin="anonymous" className="max-h-16 sm:max-h-20 mx-auto object-contain" />
                  ) : (
                    <div className="text-gray-300 text-[10px] mb-4">Pendente assinatura</div>
                  )}
                </div>
                <p className="font-bold text-xs sm:text-sm text-black">Fornecedor</p>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-1">Contratado</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}