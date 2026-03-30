
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import pb from '@/lib/pocketbaseClient';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Download, Eye, Calendar, AlertCircle } from 'lucide-react';
import { initHeatmap } from '@/lib/heatmap';
import { initReplay } from '@/lib/replay';
import OrçamentoPreview from '@/components/OrçamentoPreview';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const getDeviceType = () => {
  const width = window.innerWidth;
  const ua = navigator.userAgent.toLowerCase();
  if (width < 768 || ua.includes('mobile')) return 'mobile';
  if (width >= 768 && width <= 1024 || ua.includes('tablet')) return 'tablet';
  return 'desktop';
};

const generateSessionId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

const OrçamentoPublicView = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const shareToken = searchParams.get('token');
  
  const [orcamento, setOrcamento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const orcamentoRef = useRef(null);

  useEffect(() => {
    const fetchOrcamento = async () => {
      if (!id) {
        setError(true);
        setLoading(false);
        return;
      }

      try {
        // Fetch without authentication, relying on shareToken query param for access
        const record = await pb.collection('orcamentos').getOne(id, { 
          token: shareToken,
          $autoCancel: false 
        });
        setOrcamento(record);
        
        // Increment view count
        try {
          await pb.collection('orcamentos').update(record.id, {
            viewCount: (record.viewCount || 0) + 1
          }, { 
            token: shareToken,
            $autoCancel: false 
          });
        } catch (updateErr) {
          console.warn('Could not update view count:', updateErr);
        }

      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Error fetching orcamento:', err);
          setError(true);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOrcamento();
  }, [id, shareToken]);

  // Tracking Scripts
  useEffect(() => {
    if (!orcamento) return;

    const sessionId = generateSessionId();
    const deviceType = getDeviceType();
    
    const cleanupHeatmap = initHeatmap(orcamento.id, sessionId, deviceType);
    const cleanupReplay = initReplay(orcamento.id, sessionId, deviceType);

    return () => {
      cleanupHeatmap();
      cleanupReplay();
    };
  }, [orcamento]);

  const calculateTotal = (sections) => {
    if (!sections) return 0;
    return sections.reduce((acc, section) => {
      const sectionTotal = section.items?.reduce((sum, item) => sum + (item.quantity * item.price), 0) || 0;
      return acc + sectionTotal;
    }, 0);
  };

  const generatePDF = async () => {
    if (!orcamentoRef.current) return;
    
    try {
      toast.info('Gerando PDF, aguarde...');
      const canvas = await html2canvas(orcamentoRef.current, {
        scale: 2,
        useCORS: true,
        logging: false
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Orcamento_${orcamento.name || 'Proposta'}.pdf`);
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

  if (error || !orcamento) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <Card className="max-w-md w-full text-center p-8 shadow-lg border-border/50">
          <AlertCircle className="w-16 h-16 mx-auto text-destructive mb-4 opacity-80" />
          <h2 className="text-2xl font-bold mb-2">Orçamento Indisponível</h2>
          <p className="text-muted-foreground">O link que você acessou é inválido, expirou ou a proposta foi removida.</p>
        </Card>
      </div>
    );
  }

  const totalValue = calculateTotal(orcamento.sections);

  return (
    <>
      <Helmet>
        <title>{`${orcamento.name} - Proposta Comercial`}</title>
        <meta name="description" content="Proposta Comercial" />
      </Helmet>
      
      <div className="min-h-screen bg-slate-50 py-4 sm:py-8 px-2 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-8">
          
          {/* Header Controls */}
          <div className="no-print flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-4 sm:p-5 rounded-2xl shadow-sm border border-slate-200">
            <div>
              <h1 className="font-bold text-lg sm:text-xl text-slate-900">{orcamento.name}</h1>
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 mt-2 text-xs sm:text-sm text-slate-500">
                <span className="flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {orcamento.viewCount || 1} visualizações
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> {new Date(orcamento.updated).toLocaleDateString('pt-BR')}
                </span>
                <span className="font-semibold text-primary">
                  Total: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue)}
                </span>
              </div>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <Button onClick={generatePDF} className="bg-primary text-primary-foreground w-full sm:w-auto">
                <Download className="w-4 h-4 mr-2" /> Baixar PDF
              </Button>
            </div>
          </div>

          {/* Document Content */}
          <div ref={orcamentoRef} className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden w-full">
            <OrçamentoPreview sections={orcamento.sections || []} />
          </div>

        </div>
      </div>
    </>
  );
};

export default OrçamentoPublicView;
