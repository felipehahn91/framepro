"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Loader2 } from 'lucide-react';

// Importando o worker diretamente como uma URL estática (Padrão ouro no Vite)
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PDFDocumentViewerProps {
  url: string;
}

export const PDFDocumentViewer: React.FC<PDFDocumentViewerProps> = ({ url }) => {
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
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={
            <div className="flex flex-col items-center justify-center p-12 text-gray-400 w-full h-64">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-orange-400" />
              <p className="font-medium">Renderizando páginas do PDF...</p>
            </div>
          }
          error={
            <div className="p-8 text-center text-red-500 w-full h-64 flex items-center justify-center">
              <p className="font-bold">Erro ao carregar o PDF. O arquivo pode ser inválido.</p>
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
              className="mb-1" // Margem muito pequena para criar a sensação de folha única longa
            />
          ))}
        </Document>
      )}
    </div>
  );
};