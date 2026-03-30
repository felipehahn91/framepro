import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Upload, Loader2, FileText, ArrowRight } from 'lucide-react';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelines: any[];
  columns: any[];
  userId: string | undefined;
}

export default function LeadImportModal({ isOpen, onClose, pipelines, columns, userId }: LeadImportModalProps) {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // CSV Data
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  
  // Settings
  const [targetPipeline, setTargetPipeline] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  
  // Mapping
  const [mapping, setMapping] = useState({
    name: '',
    email: '',
    phone: '',
    value: '',
    instagram: '',
    observations: ''
  });

  if (!isOpen) return null;

  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error("O arquivo CSV está vazio ou não possui dados suficientes.");

    // Regex para lidar com vírgulas dentro de aspas duplas no CSV
    const splitRegex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;

    const parsedHeaders = lines[0].split(splitRegex).map(h => h.trim().replace(/^"|"$/g, ''));
    const data = lines.slice(1).map(line => {
      const values = line.split(splitRegex).map(v => v.trim().replace(/^"|"$/g, ''));
      return parsedHeaders.reduce((obj: any, header, i) => {
        obj[header] = values[i] || '';
        return obj;
      }, {});
    });

    return { parsedHeaders, data };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    
    if (!selectedFile.name.endsWith('.csv')) {
      return toast.error("Por favor, selecione um arquivo .csv");
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { parsedHeaders, data } = parseCSV(text);
        
        setHeaders(parsedHeaders);
        setCsvData(data);
        
        // Auto-mapping básico tentando adivinhar as colunas
        const autoMap = { name: '', email: '', phone: '', value: '', instagram: '', observations: '' };
        parsedHeaders.forEach(h => {
          const lower = h.toLowerCase();
          if (lower.includes('nome') || lower === 'name') autoMap.name = h;
          else if (lower.includes('email') || lower.includes('e-mail')) autoMap.email = h;
          else if (lower.includes('telefone') || lower.includes('celular') || lower.includes('whatsapp') || lower.includes('phone')) autoMap.phone = h;
          else if (lower.includes('valor') || lower.includes('preço') || lower.includes('value')) autoMap.value = h;
          else if (lower.includes('instagram') || lower.includes('ig')) autoMap.instagram = h;
          else if (lower.includes('obs') || lower.includes('desc') || lower.includes('nota')) autoMap.observations = h;
        });
        
        setMapping(autoMap);
      } catch (err: any) {
        toast.error(err.message || "Erro ao ler o arquivo CSV.");
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const activeColumns = columns.filter(c => c.pipeline_id === targetPipeline).sort((a, b) => a.order_index - b.order_index);

  const handleImport = async () => {
    if (!targetPipeline || !targetColumn) return toast.error("Selecione o funil e a coluna de destino.");
    if (!mapping.name) return toast.error("Você precisa mapear a coluna 'Nome' obrigatoriamente.");

    setLoading(true);
    try {
      const leadsToInsert = csvData.map(row => ({
        user_id: userId,
        pipeline_id: targetPipeline,
        column_id: targetColumn,
        name: row[mapping.name] || 'Sem Nome',
        email: mapping.email ? row[mapping.email] : null,
        phone: mapping.phone ? row[mapping.phone] : null,
        value: mapping.value ? row[mapping.value] : null,
        instagram: mapping.instagram ? row[mapping.instagram] : null,
        observations: mapping.observations ? row[mapping.observations] : null,
        status: 'Novo',
        is_client: false
      }));

      // Inserção em lote (Batch Insert) no Supabase
      const { error } = await supabase.from('opportunities').insert(leadsToInsert);
      
      if (error) throw error;

      toast.success(`${leadsToInsert.length} leads importados com sucesso!`);
      
      // Reset & Close
      setStep(1);
      setFile(null);
      onClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao importar leads. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Importar Leads (CSV)</h2>
            <p className="text-sm text-gray-500 mt-1">Adicione vários contatos de uma vez usando uma planilha.</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Funil de Destino</label>
                <select 
                  value={targetPipeline} 
                  onChange={e => { setTargetPipeline(e.target.value); setTargetColumn(''); }}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="">Selecione o pipeline</option>
                  {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Coluna de Destino</label>
                <select 
                  value={targetColumn} 
                  onChange={e => setTargetColumn(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  disabled={!targetPipeline}
                >
                  <option value="">Selecione a etapa</option>
                  {activeColumns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
              <input 
                type="file" 
                accept=".csv" 
                onChange={handleFileUpload} 
                className="hidden" 
                id="csv-upload"
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <Upload className="w-6 h-6 text-orange-400" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">
                  {file ? file.name : "Clique para selecionar seu CSV"}
                </p>
                <p className="text-sm text-gray-500">
                  {file ? `${csvData.length} linhas encontradas` : "Apenas arquivos .csv são suportados"}
                </p>
              </label>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={onClose} className="px-6 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">
                Cancelar
              </button>
              <button 
                onClick={() => setStep(2)} 
                disabled={!file || !targetPipeline || !targetColumn}
                className="px-6 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                Próximo Passo <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="bg-orange-50 text-orange-800 p-4 rounded-lg flex gap-3 text-sm">
              <FileText className="w-5 h-5 shrink-0" />
              <p>Mapeie as colunas do seu arquivo CSV para os campos correspondentes no sistema. O campo "Nome" é obrigatório.</p>
            </div>

            <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
              {[
                { key: 'name', label: 'Nome do Lead *', required: true },
                { key: 'email', label: 'E-mail' },
                { key: 'phone', label: 'Telefone / WhatsApp' },
                { key: 'value', label: 'Valor (R$)' },
                { key: 'instagram', label: 'Instagram' },
                { key: 'observations', label: 'Observações' }
              ].map((field) => (
                <div key={field.key} className="flex items-center justify-between gap-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <span className="font-medium text-sm text-gray-700 min-w-[150px]">{field.label}</span>
                  <select 
                    value={mapping[field.key as keyof typeof mapping]} 
                    onChange={(e) => setMapping({...mapping, [field.key]: e.target.value})}
                    className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                  >
                    <option value="">Não importar</option>
                    {headers.map(h => <option key={h} value={h}>{h}</option>)}
                  </select>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <button onClick={() => setStep(1)} className="px-6 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">
                Voltar
              </button>
              <button 
                onClick={handleImport} 
                disabled={loading || !mapping.name}
                className="px-6 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                Importar {csvData.length} Leads
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}