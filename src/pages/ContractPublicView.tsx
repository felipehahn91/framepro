import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Download, FileCheck, CheckCircle2, ShieldCheck, PenTool } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import SignaturePad from "react-signature-canvas";

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

  const fetchContract = async () => {
    try {
      const { data, error } = await supabase
        .from('contracts')
        .select('*, opportunities(name)')
        .eq('share_token', token)
        .single();

      if (error) {
        console.error("Supabase Error:", error);
        throw error;
      }
      setContract(data);
    } catch (error) {
      toast.error("Contrato não encontrado ou indisponível.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    if (!contractRef.current) return;
    toast.info("Gerando PDF, aguarde alguns segundos...");
    
    try {
      // Captura o DOM do contrato garantindo fundo branco e suporte a imagens externas (CORS)
      const canvas = await html2canvas(contractRef.current, { 
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      });
      
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      
      // Cálculos para fatiamento de múltiplas páginas
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      let heightLeft = pdfHeight;
      let position = 0;

      // Adiciona a primeira página
      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, pdfHeight);
      heightLeft -= pageHeight;

      // Enquanto houver conteúdo sobrando, adiciona novas páginas
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

      if (error) {
        throw new Error(error.message); 
      }
      
      setContract({ ...contract, ...updates });
      toast.success("Assinatura salva com sucesso!");
    } catch (error: any) {
      toast.error(`Erro ao salvar: ${error.message || "Tente novamente."}`);
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
  const supplierName = 'Fornecedor';

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans text-gray-900">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Toolbar superior */}
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

        {/* Integração Gov.br info */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 no-print">
          <div className="flex items-start gap-4">
            <ShieldCheck className="w-8 h-8 text-blue-600 shrink-0" />
            <div>
              <h3 className="font-bold text-blue-900 text-lg mb-1">Assinatura com Validade Legal (GOV.BR)</h3>
              <p className="text-sm text-blue-800 leading-relaxed mb-4">
                Para assinar este documento com certificação digital oficial do Governo Federal, baixe o PDF acima, acesse o portal <strong>assinador.iti.br</strong>, faça o login com sua conta gov.br e realize a assinatura gratuita.
              </p>
              <a href="https://assinador.iti.br/" target="_blank" rel="noreferrer" className="inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-bold rounded-lg text-sm hover:bg-blue-700 transition-colors">
                Acessar Portal GOV.BR
              </a>
            </div>
          </div>
        </div>

        {/* Papel do Documento */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
          {/* Adicionada cor de fundo forçada branca para o PDF exportado ficar perfeito */}
          <div ref={contractRef} className="p-8 sm:p-12 bg-white text-black" style={{ backgroundColor: '#ffffff' }}>
            
            {contract.contract_image && (
              <img 
                src={contract.contract_image} 
                crossOrigin="anonymous" 
                alt="Capa Contrato" 
                className="w-full h-[300px] object-cover rounded-xl mb-8 border border-gray-200" 
              />
            )}

            {/* Conteúdo HTML do Quill */}
            <div 
              className="prose max-w-none mb-16 text-black"
              dangerouslySetInnerHTML={{ __html: contract.description || '<p>Contrato vazio.</p>' }}
            />

            {/* Área de Assinaturas */}
            <div className="mt-16 pt-8 border-t border-gray-200 grid grid-cols-1 sm:grid-cols-2 gap-12">
              
              {/* Cliente */}
              <div className="flex flex-col items-center">
                <div className="h-32 w-full max-w-xs flex flex-col justify-end border-b-2 border-gray-800 relative mb-2">
                  {isSigned ? (
                    <img src={contract.client_signature} crossOrigin="anonymous" alt="Assinatura" className="max-h-24 mx-auto" />
                  ) : (
                    <div className="absolute inset-0 no-print border-2 border-dashed border-gray-200 rounded-lg bg-gray-50 flex items-center justify-center group overflow-hidden">
                      <SignaturePad 
                        ref={sigCanvas}
                        canvasProps={{ className: "w-full h-full" }}
                      />
                      <div className="absolute top-2 left-2 pointer-events-none text-xs font-bold text-gray-400 flex items-center gap-1 opacity-50 group-hover:opacity-0 transition-opacity">
                        <PenTool className="w-3 h-3" /> Assine aqui
                      </div>
                    </div>
                  )}
                </div>
                <p className="font-bold text-lg text-center text-black">{clientName}</p>
                <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Contratante</p>
                
                {!isSigned && (
                  <div className="flex gap-2 mt-4 no-print">
                    <button onClick={clearSignature} className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded">Limpar</button>
                    <button onClick={handleSaveSignature} disabled={savingSig} className="px-4 py-1.5 text-xs font-bold bg-orange-400 text-white rounded hover:bg-orange-500">
                      {savingSig ? 'Salvando...' : 'Salvar Assinatura'}
                    </button>
                  </div>
                )}
              </div>

              {/* Fornecedor */}
              <div className="flex flex-col items-center">
                <div className="h-32 w-full max-w-xs flex flex-col justify-end border-b-2 border-gray-800 relative mb-2">
                  {contract.supplier_signature ? (
                    <img src={contract.supplier_signature} crossOrigin="anonymous" alt="Assinatura Fornecedor" className="max-h-24 mx-auto" />
                  ) : (
                    <div className="text-center text-gray-300 font-medium mb-4">Pendente assinatura</div>
                  )}
                </div>
                <p className="font-bold text-lg text-center text-black">{supplierName}</p>
                <p className="text-sm text-gray-500 uppercase tracking-widest mt-1">Contratado</p>
              </div>

            </div>
          </div>
        </div>

      </div>
    </div>
  );
}