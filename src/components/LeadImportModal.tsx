import React, { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { X, Upload, Loader2, FileText, ArrowRight, Trello, Table } from 'lucide-react';

interface LeadImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  pipelines: any[];
  columns: any[];
  userId: string | undefined;
  onImportSuccess: () => void;
}

export default function LeadImportModal({ isOpen, onClose, pipelines, columns, userId, onImportSuccess }: LeadImportModalProps) {
  const [importMode, setImportMode] = useState<'csv' | 'trello'>('csv');
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  
  // CSV Data
  const [headers, setHeaders] = useState<string[]>([]);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [targetPipeline, setTargetPipeline] = useState('');
  const [targetColumn, setTargetColumn] = useState('');
  const [mapping, setMapping] = useState({
    name: '', email: '', phone: '', value: '', instagram: '', observations: ''
  });

  // Trello Data
  const [trelloData, setTrelloData] = useState<{
    boardName: string;
    lists: any[];
    cards: any[];
  } | null>(null);

  if (!isOpen) return null;

  const resetState = () => {
    setStep(1);
    setFile(null);
    setHeaders([]);
    setCsvData([]);
    setTargetPipeline('');
    setTargetColumn('');
    setTrelloData(null);
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  // ==========================================
  // LÓGICA CSV
  // ==========================================
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) throw new Error("O arquivo CSV está vazio ou não possui dados suficientes.");

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

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.csv')) return toast.error("Por favor, selecione um arquivo .csv");

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const { parsedHeaders, data } = parseCSV(text);
        
        setHeaders(parsedHeaders);
        setCsvData(data);
        
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

  const handleCsvImport = async () => {
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
        is_client: false
      }));

      const { error } = await supabase.from('opportunities').insert(leadsToInsert);
      if (error) throw error;

      toast.success(`${leadsToInsert.length} leads importados com sucesso!`);
      handleClose();
    } catch (error) {
      console.error(error);
      toast.error("Erro ao importar leads. Verifique os dados.");
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // LÓGICA TRELLO
  // ==========================================
  const handleTrelloUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    if (!selectedFile.name.endsWith('.json')) return toast.error("Por favor, selecione o arquivo .json do Trello");

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);
        
        if (!data.name || !data.lists || !data.cards) {
          throw new Error("Arquivo JSON inválido. Certifique-se de ser um export do Trello.");
        }

        const lists = data.lists.filter((l: any) => !l.closed).sort((a: any, b: any) => a.pos - b.pos);
        const cards = data.cards.filter((c: any) => !c.closed);

        setTrelloData({
          boardName: data.name,
          lists,
          cards
        });
      } catch (err: any) {
        toast.error(err.message || "Erro ao ler o arquivo JSON.");
        setFile(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleTrelloImport = async () => {
    if (!trelloData) return;
    setLoading(true);

    try {
      // 1. Criar a Pipeline com o nome do quadro do Trello
      const { data: pipe, error: pipeErr } = await supabase
        .from('pipelines')
        .insert({ name: trelloData.boardName, user_id: userId })
        .select()
        .single();

      if (pipeErr) throw pipeErr;

      // 2. Criar as Colunas
      const columnsToInsert = trelloData.lists.map((l, idx) => ({
        name: l.name,
        pipeline_id: pipe.id,
        user_id: userId,
        order_index: idx
      }));

      const { data: cols, error: colsErr } = await supabase
        .from('columns')
        .insert(columnsToInsert)
        .select();

      if (colsErr) throw colsErr;

      // Mapear IDs do Trello para os IDs recém criados no Supabase
      const listMap: Record<string, string> = {};
      trelloData.lists.forEach((tList, idx) => {
        const sCol = cols.find(c => c.name === tList.name && c.order_index === idx);
        if (sCol) listMap[tList.id] = sCol.id;
      });

      // 3. Criar as Oportunidades (Cartões)
      const oppsToInsert = trelloData.cards
        .filter(c => listMap[c.idList]) // Apenas cartões em listas não arquivadas
        .map(c => ({
          name: c.name || 'Sem Nome',
          observations: c.desc || null,
          event_date: c.due ? c.due.split('T')[0] : null,
          pipeline_id: pipe.id,
          column_id: listMap[c.idList],
          user_id: userId,
          is_client: false
        }));

      if (oppsToInsert.length > 0) {
        const { error: oppsErr } = await supabase.from('opportunities').insert(oppsToInsert);
        if (oppsErr) throw oppsErr;
      }

      toast.success(`Quadro "${trelloData.boardName}" importado com sucesso!`);
      onImportSuccess();
      handleClose();
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao importar do Trello. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const activeColumns = columns.filter(c => c.pipeline_id === targetPipeline).sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 sm:p-8 animate-in fade-in zoom-in-95 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Importar Dados</h2>
            <p className="text-sm text-gray-500 mt-1">Traga seus leads e fluxos de outras ferramentas.</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5"/></button>
        </div>

        {/* Tabs */}
        {step === 1 && (
          <div className="flex bg-gray-50 p-1 rounded-xl mb-6">
            <button 
              onClick={() => { setImportMode('csv'); resetState(); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${importMode === 'csv' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
              <Table className="w-4 h-4" /> CSV / Planilha
            </button>
            <button 
              onClick={() => { setImportMode('trello'); resetState(); setImportMode('trello'); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${importMode === 'trello' ? 'bg-[#0079BF] text-white shadow-sm' : 'text-gray-500 hover:text-[#0079BF]'}`}
            >
              <Trello className="w-4 h-4" /> Trello
            </button>
          </div>
        )}

        {/* MODO CSV */}
        {importMode === 'csv' && (
          <>
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
                  <input type="file" accept=".csv" onChange={handleCsvUpload} className="hidden" id="csv-upload" />
                  <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center">
                    <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-orange-400" />
                    </div>
                    <p className="font-semibold text-gray-900 mb-1">{file ? file.name : "Clique para selecionar seu CSV"}</p>
                    <p className="text-sm text-gray-500">{file ? `${csvData.length} linhas encontradas` : "Apenas arquivos .csv são suportados"}</p>
                  </label>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button onClick={handleClose} className="px-6 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
                  <button onClick={() => setStep(2)} disabled={!file || !targetPipeline || !targetColumn} className="px-6 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 disabled:opacity-50 flex items-center gap-2">
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
                    { key: 'name', label: 'Nome do Lead *' },
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
                  <button onClick={() => setStep(1)} className="px-6 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">Voltar</button>
                  <button onClick={handleCsvImport} disabled={loading || !mapping.name} className="px-6 py-2.5 bg-orange-400 text-white font-semibold rounded-lg hover:bg-orange-500 disabled:opacity-50 flex items-center gap-2">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} Importar {csvData.length} Leads
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* MODO TRELLO */}
        {importMode === 'trello' && (
          <div className="space-y-6">
            <div className="bg-blue-50 text-blue-800 p-4 rounded-lg flex gap-3 text-sm">
              <Trello className="w-5 h-5 shrink-0" />
              <div>
                <p className="font-semibold mb-1">Como exportar do Trello:</p>
                <ol className="list-decimal pl-4 space-y-1">
                  <li>Abra seu Quadro no Trello</li>
                  <li>Vá no menu lateral (três pontinhos)</li>
                  <li>Clique em <strong>Imprimir e Exportar</strong></li>
                  <li>Escolha <strong>Exportar em JSON</strong> e salve o arquivo</li>
                </ol>
              </div>
            </div>

            <div className="border-2 border-dashed border-blue-200 rounded-xl p-8 text-center bg-blue-50 hover:bg-blue-100/50 transition-colors">
              <input type="file" accept=".json" onChange={handleTrelloUpload} className="hidden" id="trello-upload" />
              <label htmlFor="trello-upload" className="cursor-pointer flex flex-col items-center">
                <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center mb-3">
                  <Trello className="w-6 h-6 text-[#0079BF]" />
                </div>
                <p className="font-semibold text-gray-900 mb-1">{file ? file.name : "Clique para selecionar o JSON do Trello"}</p>
                <p className="text-sm text-gray-500">Apenas arquivos .json são suportados</p>
              </label>
            </div>

            {trelloData && (
              <div className="bg-white border border-gray-200 rounded-lg p-4">
                <h3 className="font-bold text-gray-900 mb-2">Resumo da Importação:</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li><strong>Novo Funil:</strong> {trelloData.boardName}</li>
                  <li><strong>Colunas:</strong> {trelloData.lists.length} listas encontradas</li>
                  <li><strong>Oportunidades:</strong> {trelloData.cards.length} cartões encontrados</li>
                </ul>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <button onClick={handleClose} className="px-6 py-2.5 text-gray-700 font-semibold border border-gray-200 rounded-lg hover:bg-gray-50">Cancelar</button>
              <button 
                onClick={handleTrelloImport} 
                disabled={!trelloData || loading} 
                className="px-6 py-2.5 bg-[#0079BF] text-white font-semibold rounded-lg hover:bg-[#026AA7] disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />} 
                Importar Quadro
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}