"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2, FileText } from 'lucide-react';

// Usando CDN para garantir que o worker seja carregado corretamente e evitar erros de importação no Vite
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PDFDocumentViewerProps {
  url: string;
  onLoadSuccessCallback?: () => void;
}

export const PDFDocumentViewer: React.FC<PDFDocumentViewerProps> = ({ url, onLoadSuccessCallback }) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };
    
    // Pequeno delay para garantir que o container já assumiu a largura correta (ex: Largo, Estreito, 100%)
    setTimeout(updateWidth, 100);
    window.addEventListener('resize', updateWidth);
    
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  return (
    <div ref={containerRef} className="w-full flex flex-col items-center min-h-[500px]">
      {containerWidth > 0 && (
        <Document
          file={url}
          onLoadSuccess={({ numPages }) => {
            setNumPages(numPages);
            if (onLoadSuccessCallback) {
              // Adiciona um pequeno delay para garantir que as páginas renderizaram o canvas antes de exibir os botões
              setTimeout(onLoadSuccessCallback, 300);
            }
          }}
          loading={
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 w-full min-h-[60vh] animate-in fade-in duration-500">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full animate-pulse"></div>
                <div className="w-16 h-16 bg-white rounded-2xl shadow-xl border border-gray-100 flex items-center justify-center relative z-10">
                  <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                </div>
              </div>
              <h3 className="text-xl font-black text-gray-900 mb-2">Preparando a sua proposta...</h3>
              <p className="font-medium text-gray-500 text-center max-w-xs">
                Estamos ajustando os últimos detalhes do documento para você.
              </p>
            </div>
          }
          error={
            <div className="flex flex-col items-center justify-center p-12 text-gray-500 w-full h-64">
              <FileText className="w-12 h-12 text-red-300 mb-4" />
              <p className="font-bold text-red-500">Erro ao carregar a proposta.</p>
              <p className="text-sm mt-1 text-gray-400">O arquivo PDF pode estar corrompido ou indisponível.</p>
            </div>
          }
          className="w-full flex flex-col items-center"
        >
          {Array.from(new Array(numPages || 0), (el, index) => (
            <Page
              key={`page_${index + 1}`}
              pageNumber={index + 1}
              width={containerWidth}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="mb-1 bg-white shadow-sm" // Margem muito pequena para criar a sensação de folha única longa
            />
          ))}
        </Document>
      )}
    </div>
  );
};