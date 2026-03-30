
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import SignaturePad from '@/components/SignaturePad.jsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileCheck, Loader2, CheckCircle2, Download, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const ContractPublicView = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [savingSignature, setSavingSignature] = useState(false);
  const contractRef = useRef(null);

  useEffect(() => {
    const fetchContract = async () => {
      if (!id) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        const record = await pb.collection('contracts').getOne(id, {
          expand: 'clientId,userId',
          token: shareToken,
          $autoCancel: false
        });
        setContract(record);
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching contract:', err);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [id, shareToken]);

  const handleSaveClientSignature = async (base64String) => {
    const sizeInBytes = Math.round((base64String.length * 3) / 4);
    if (sizeInBytes > 5242880) {
      toast.error('A imagem excede o limite de 5MB');
      return;
    }

    setSavingSignature(true);
    try {
      await pb.collection('contracts').update(contract.id, {
        clientSignature: base64String
      }, {
        token: shareToken,
        $autoCancel: false
      });
      
      setContract(prev => ({ ...prev, clientSignature: base64String }));
      await checkAndUpdateStatus(base64String, contract.supplierSignature);
      toast.success('Assinatura salva com sucesso!');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao salvar assinatura do cliente:', err);
        toast.error('Erro ao salvar assinatura. Verifique sua conexão.');
      }
    } finally {
      setSavingSignature(false);
    }
  };

  const handleSaveSupplierSignature = async (base64String) => {
    const sizeInBytes = Math.round((base64String.length * 3) / 4);
    if (sizeInBytes > 5242880) {
      toast.error('A imagem excede o limite de 5MB');
      return;
    }

    setSavingSignature(true);
    try {
      await pb.collection('contracts').update(contract.id, {
        supplierSignature: base64String
      }, {
        token: shareToken,
        $autoCancel: false
      });
      
      setContract(prev => ({ ...prev, supplierSignature: base64String }));
      await checkAndUpdateStatus(contract.clientSignature, base64String);
      toast.success('Assinatura salva com sucesso!');
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Erro ao salvar assinatura do fornecedor:', err);
        toast.error('Erro ao salvar assinatura. Verifique sua conexão.');
      }
    } finally {
      setSavingSignature(false);
    }
  };

  const checkAndUpdateStatus = async (clientSig, supplierSig) => {
    const hasClient = !!clientSig;
    const hasSupplier = !!supplierSig;
    
    let newStatus = 'Pendente';
    if (hasClient && hasSupplier) newStatus = 'Assinado 2/2';
    else if (hasClient || hasSupplier) newStatus = 'Assinado 1/2';

    if (newStatus !== contract.signatureStatus) {
      try {
        await pb.collection('contracts').update(contract.id, { 
          signatureStatus: newStatus 
        }, { 
          token: shareToken,
          $autoCancel: false 
        });
        setContract(prev => ({ ...prev, signatureStatus: newStatus }));
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to update status', err);
        }
      }
    }
  };

  const generatePDF = async () => {
    if (!contractRef.current) return;
    
    try {
      toast.info('Gerando PDF, aguarde...');
      const canvas = await html2canvas(contractRef.current, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false,
        backgroundColor: '#ffffff',
        scrollY: -window.scrollY,
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
      
      pdf.save(`Contrato_${contract.expand?.clientId?.name || 'Documento'}.pdf`);
      toast.success('PDF gerado com sucesso!');
    } catch (err) {
      console.error('Error generating PDF:', err);
      toast.error('Erro ao gerar PDF.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="w-full max-w-4xl space-y-6">
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8 shadow-lg border-border/50">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-2">Contrato Indisponível</h2>
          <p className="text-muted-foreground">O link que você acessou é inválido, expirou ou o contrato foi removido.</p>
        </Card>
      </div>
    );
  }

  const isFullySigned = contract.signatureStatus === 'Assinado 2/2';
  const clientName = contract.expand?.clientId?.name || 'Cliente';
  const supplierName = contract.expand?.userId?.name || contract.expand?.userId?.company || 'Fornecedor';

  return (
    <>
      <Helmet>
        <title>{`Contrato - ${clientName}`}</title>
      </Helmet>

      <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="no-print flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${isFullySigned ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                {isFullySigned ? <CheckCircle2 className="w-6 h-6" /> : <FileCheck className="w-6 h-6" />}
              </div>
              <div>
                <h1 className="font-bold text-xl text-slate-900">Visualização de Contrato</h1>
                <p className="text-sm text-slate-500 font-medium">Status: {contract.signatureStatus || 'Pendente'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={generatePDF}>
                <Download className="w-4 h-4 mr-2" /> Baixar PDF
              </Button>
            </div>
          </div>

          <Card className="shadow-xl border-slate-200 overflow-hidden bg-white rounded-2xl">
            <CardContent className="p-8 sm:p-12" ref={contractRef}>
              
              {contract.contractImage && (
                <div className="mb-8 rounded-xl overflow-hidden border border-slate-200">
                  <img 
                    src={pb.files.getUrl(contract, contract.contractImage)} 
                    alt="Referência do Contrato" 
                    className="w-full max-h-[400px] object-cover"
                    loading="lazy"
                  />
                </div>
              )}

              <div 
                className="contract-document mb-16 prose max-w-none text-slate-800"
                dangerouslySetInnerHTML={{ __html: contract.description || '<p>Nenhum conteúdo redigido.</p>' }}
              />

              <Separator className="my-12 bg-slate-200" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-bold text-lg text-slate-900">{clientName}</h4>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Contratante</p>
                  </div>
                  <div className="no-print">
                    <SignaturePad 
                      initialSignature={contract.clientSignature} 
                      onSave={handleSaveClientSignature}
                      readOnly={!!contract.clientSignature}
                      loading={savingSignature}
                    />
                  </div>
                  {contract.clientSignature && (
                    <div className="hidden print:block border-b-2 border-slate-800 pb-2 text-center">
                      <img src={contract.clientSignature} alt="Assinatura Cliente" className="h-24 mx-auto object-contain" loading="lazy" />
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <div className="text-center">
                    <h4 className="font-bold text-lg text-slate-900">{supplierName}</h4>
                    <p className="text-sm text-slate-500 font-medium uppercase tracking-wider">Contratado</p>
                  </div>
                  <div className="no-print">
                    <SignaturePad 
                      initialSignature={contract.supplierSignature} 
                      onSave={handleSaveSupplierSignature}
                      readOnly={!!contract.supplierSignature}
                      loading={savingSignature}
                    />
                  </div>
                  {contract.supplierSignature && (
                    <div className="hidden print:block border-b-2 border-slate-800 pb-2 text-center">
                      <img src={contract.supplierSignature} alt="Assinatura Fornecedor" className="h-24 mx-auto object-contain" loading="lazy" />
                    </div>
                  )}
                </div>
              </div>

            </CardContent>
          </Card>

        </div>
      </div>
    </>
  );
};

export default ContractPublicView;
