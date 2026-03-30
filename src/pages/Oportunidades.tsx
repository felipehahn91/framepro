import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { v4 as uuidv4 } from "uuid";
import { 
  Trash2, 
  Link as LinkIcon, 
  ChevronDown, 
  ChevronUp,
  Upload, 
  UserPlus, 
  MessageCircle, 
  FileText, 
  Calculator, 
  Mail, 
  Phone, 
  Instagram, 
  MapPin,
  X,
  Diamond,
  Plus,
  MoreVertical
} from "lucide-react";
import { toast } from "sonner";

// --- Tipos ---
interface Pipeline {
  id: string;
  name: string;
}

interface Column {
  id: string;
  pipelineId: string;
  name: string;
  order: number;
}

interface Opportunity {
  id: string;
  pipelineId: string;
  columnId: string;
  name: string;
  tag: string;
  email: string;
  phone: string;
  value: string;
  instagram: string;
  address: string;
  observations: string;
  isClient?: boolean;
}

// --- Dados Iniciais de Exemplo ---
const defaultPipelines: Pipeline[] = [
  { id: "pipe-1", name: "Vendas Principais" }
];

const defaultColumns: Column[] = [
  { id: "col-1", pipelineId: "pipe-1", name: "Aberto", order: 0 },
  { id: "col-2", pipelineId: "pipe-1", name: "Em Progresso", order: 1 },
  { id: "col-3", pipelineId: "pipe-1", name: "Ganho", order: 2 },
];

const defaultOpportunities: Opportunity[] = [
  {
    id: "opp-1",
    pipelineId: "pipe-1",
    columnId: "col-1",
    name: "Felipe Hahn",
    tag: "Casamento",
    email: "felipehah@gmail.com",
    phone: "51984766790",
    value: "R$ 12.000,00",
    instagram: "_felipehahn",
    address: "Casa",
    observations: "Cliente demonstrou interesse no pacote premium."
  }
];

// --- Hook para LocalStorage ---
function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return [storedValue, setValue] as const;
}

// --- Componentes Internos ---

const KanbanCard = ({ 
  data, 
  onClick,
  onDelete
}: { 
  data: Opportunity; 
  onClick: () => void;
  onDelete: (id: string) => void;
}) => (
  <div 
    onClick={onClick}
    className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-all group relative"
  >
    <div className="flex justify-between items-start mb-2.5">
      <div className="flex items-center gap-2.5 truncate pr-6">
        <div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-orange-400 transition-colors shrink-0"></div>
        <span className="font-semibold text-gray-900 text-[15px] truncate">{data.name}</span>
      </div>
      <button 
        onClick={(e) => { e.stopPropagation(); onDelete(data.id); }}
        className="absolute top-3.5 right-3.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
    
    {data.tag && (
      <div className="mb-3 inline-flex items-center gap-1.5 bg-gray-100/80 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
        <Diamond className="w-3 h-3 text-gray-500" /> {data.tag}
      </div>
    )}
    
    <div className="text-[13px] text-gray-500 mb-4 space-y-0.5 leading-relaxed truncate">
      {data.email && <div className="truncate">{data.email}</div>}
      {data.phone && <div className="truncate">{data.phone}</div>}
    </div>
    
    <div className="flex gap-2">
      <button 
        className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 border rounded-lg text-xs font-medium transition-colors ${
          data.isClient ? 'bg-orange-50 border-orange-200 text-orange-600' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <UserPlus className="w-3.5 h-3.5" /> {data.isClient ? 'Cliente' : '+Cliente'}
      </button>
      <button 
        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <MessageCircle className="w-3.5 h-3.5 text-green-600" /> Cadência
      </button>
    </div>
  </div>
);

// --- Página Principal ---

const Oportunidades = () => {
  // Estados
  const [pipelines, setPipelines] = useLocalStorage<Pipeline[]>("dyad_pipelines", defaultPipelines);
  const [columns, setColumns] = useLocalStorage<Column[]>("dyad_columns", defaultColumns);
  const [opportunities, setOpportunities] = useLocalStorage<Opportunity[]>("dyad_opportunities", defaultOpportunities);
  
  const [activePipelineId, setActivePipelineId] = useState<string>(pipelines[0]?.id || "");
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

  // Modais de Criação
  const [isNewOppModalOpen, setIsNewOppModalOpen] = useState(false);
  const [isNewColumnModalOpen, setIsNewColumnModalOpen] = useState(false);
  
  // Form States
  const [newOppData, setNewOppData] = useState<Partial<Opportunity>>({});
  const [newColName, setNewColName] = useState("");

  // Derivados
  const activeColumns = columns
    .filter(c => c.pipelineId === activePipelineId)
    .sort((a, b) => a.order - b.order);

  // Drag and Drop Logic
  const onDragEnd = (result: any) => {
    const { destination, source, draggableId, type } = result;

    if (!destination) return;
    if (destination.droppableId === source.droppableId && destination.index === source.index) return;

    if (type === "column") {
      const newCols = Array.from(activeColumns);
      const [removed] = newCols.splice(source.index, 1);
      newCols.splice(destination.index, 0, removed);

      const updatedCols = newCols.map((col, index) => ({ ...col, order: index }));
      
      setColumns(prev => prev.map(c => {
        const updated = updatedCols.find(uc => uc.id === c.id);
        return updated ? updated : c;
      }));
      return;
    }

    // Moving Cards
    const sourceColId = source.droppableId;
    const destColId = destination.droppableId;
    
    const updatedOpps = Array.from(opportunities);
    const oppIndex = updatedOpps.findIndex(o => o.id === draggableId);
    
    if (oppIndex > -1) {
      updatedOpps[oppIndex] = { ...updatedOpps[oppIndex], columnId: destColId };
      
      // Reordenação na mesma coluna não é estritamente necessária se não salvarmos order das opps,
      // mas atualizar a coluna é essencial.
      
      setOpportunities(updatedOpps);
      toast.success("Oportunidade movida!");
    }
  };

  // Handlers de Criação
  const handleCreateOpportunity = () => {
    if (!newOppData.name || !activeColumns.length) {
      toast.error("Nome é obrigatório e deve haver pelo menos uma coluna.");
      return;
    }
    
    const newOpp: Opportunity = {
      id: uuidv4(),
      pipelineId: activePipelineId,
      columnId: activeColumns[0].id, // Cai na primeira coluna
      name: newOppData.name || "",
      tag: newOppData.tag || "",
      email: newOppData.email || "",
      phone: newOppData.phone || "",
      value: newOppData.value || "R$ 0,00",
      instagram: newOppData.instagram || "",
      address: newOppData.address || "",
      observations: newOppData.observations || "",
      isClient: false
    };

    setOpportunities([newOpp, ...opportunities]);
    setNewOppData({});
    setIsNewOppModalOpen(false);
    toast.success("Oportunidade criada com sucesso!");
  };

  const handleCreateColumn = () => {
    if (!newColName) return;
    const newCol: Column = {
      id: uuidv4(),
      pipelineId: activePipelineId,
      name: newColName,
      order: activeColumns.length
    };
    setColumns([...columns, newCol]);
    setNewColName("");
    setIsNewColumnModalOpen(false);
    toast.success("Coluna criada com sucesso!");
  };

  const handleDeleteColumn = (colId: string) => {
    if (confirm("Deletar esta coluna? As oportunidades não serão perdidas, mas ficarão ocultas.")) {
      setColumns(columns.filter(c => c.id !== colId));
    }
  };

  const handleDeleteOpportunity = (id: string) => {
    if (confirm("Deletar oportunidade?")) {
      setOpportunities(opportunities.filter(o => o.id !== id));
      toast.success("Oportunidade deletada.");
      if (selectedOpportunity?.id === id) setSelectedOpportunity(null);
    }
  };

  return (
    <Layout>
      <div className="max-w-full mx-auto flex flex-col h-full">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Oportunidades</h1>
          <div className="flex items-center gap-3 ml-auto">
             <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center transition-colors">
              <Upload className="w-4 h-4" />
            </button>
            <button 
              onClick={() => setIsNewOppModalOpen(true)}
              className="px-4 py-2 bg-orange-400 text-white font-medium rounded-lg hover:bg-orange-500 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" /> Nova Oportunidade
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <select 
            value={activePipelineId}
            onChange={(e) => setActivePipelineId(e.target.value)}
            className="w-[200px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 shadow-sm transition-colors outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent appearance-none cursor-pointer"
          >
            {pipelines.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <button 
            onClick={() => {
              const name = prompt("Nome do novo pipeline:");
              if (name) {
                const newPipe = { id: uuidv4(), name };
                setPipelines([...pipelines, newPipe]);
                setActivePipelineId(newPipe.id);
                // Criar colunas padrão
                setColumns([...columns, 
                  { id: uuidv4(), pipelineId: newPipe.id, name: "Aberto", order: 0 },
                  { id: uuidv4(), pipelineId: newPipe.id, name: "Em Progresso", order: 1 }
                ]);
              }
            }}
            className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 font-medium hover:bg-gray-50 shadow-sm transition-colors"
          >
            Nova Pipeline
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1 items-start">
          <DragDropContext onDragEnd={onDragEnd}>
            <Droppable droppableId="board" direction="horizontal" type="column">
              {(provided) => (
                <div 
                  className="flex gap-4 h-full"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {activeColumns.map((col, index) => {
                    const colOpps = opportunities.filter(o => o.columnId === col.id);
                    return (
                      <Draggable key={col.id} draggableId={col.id} index={index}>
                        {(provided) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex-1 min-w-[300px] max-w-[320px] bg-white rounded-xl border border-gray-200 flex flex-col max-h-[calc(100vh-220px)] shadow-sm"
                          >
                            <div 
                              className="p-4 border-b border-gray-100 bg-gray-50/50 rounded-t-xl"
                              {...provided.dragHandleProps}
                            >
                              <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-gray-900 text-base">{col.name}</h3>
                                <div className="flex items-center gap-2">
                                  <span className="bg-white border border-gray-200 text-gray-500 text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center shadow-sm">
                                    {colOpps.length}
                                  </span>
                                  <button 
                                    onClick={() => handleDeleteColumn(col.id)}
                                    className="text-gray-400 hover:text-red-500 transition-colors"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                            
                            <Droppable droppableId={col.id} type="card">
                              {(provided, snapshot) => (
                                <div 
                                  ref={provided.innerRef}
                                  {...provided.droppableProps}
                                  className={`flex-1 p-3 overflow-y-auto rounded-b-xl space-y-3 transition-colors ${
                                    snapshot.isDraggingOver ? 'bg-orange-50/50' : 'bg-gray-50/30'
                                  }`}
                                  style={{ minHeight: '150px' }}
                                >
                                  {colOpps.map((opp, index) => (
                                    <Draggable key={opp.id} draggableId={opp.id} index={index}>
                                      {(provided, snapshot) => (
                                        <div
                                          ref={provided.innerRef}
                                          {...provided.draggableProps}
                                          {...provided.dragHandleProps}
                                          style={{
                                            ...provided.draggableProps.style,
                                            opacity: snapshot.isDragging ? 0.9 : 1
                                          }}
                                        >
                                          <KanbanCard 
                                            data={opp} 
                                            onClick={() => setSelectedOpportunity(opp)} 
                                            onDelete={handleDeleteOpportunity}
                                          />
                                        </div>
                                      )}
                                    </Draggable>
                                  ))}
                                  {provided.placeholder}
                                </div>
                              )}
                            </Droppable>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  
                  {/* Adicionar Coluna */}
                  <button 
                    onClick={() => setIsNewColumnModalOpen(true)}
                    className="min-w-[300px] max-w-[320px] bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all max-h-[100px] h-[100px] font-medium"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Nova Coluna
                  </button>
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>

      {/* Modal Nova Oportunidade */}
      {isNewOppModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsNewOppModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4">Nova Oportunidade</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Nome *</label>
                <input 
                  type="text" 
                  value={newOppData.name || ''} 
                  onChange={e => setNewOppData({...newOppData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="Nome do contato"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Valor</label>
                  <input 
                    type="text" 
                    value={newOppData.value || ''} 
                    onChange={e => setNewOppData({...newOppData, value: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Categoria (Tag)</label>
                  <input 
                    type="text" 
                    value={newOppData.tag || ''} 
                    onChange={e => setNewOppData({...newOppData, tag: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                    placeholder="Ex: Casamento"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Telefone</label>
                <input 
                  type="text" 
                  value={newOppData.phone || ''} 
                  onChange={e => setNewOppData({...newOppData, phone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                  placeholder="(00) 00000-0000"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">Observações</label>
                <textarea 
                  value={newOppData.observations || ''} 
                  onChange={e => setNewOppData({...newOppData, observations: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none h-24"
                  placeholder="Detalhes adicionais..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsNewOppModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateOpportunity}
                className="px-4 py-2 bg-orange-400 text-white font-medium rounded-lg hover:bg-orange-500 transition-colors"
              >
                Criar Oportunidade
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nova Coluna */}
      {isNewColumnModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsNewColumnModalOpen(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in fade-in zoom-in-95">
            <h2 className="text-xl font-bold mb-4">Nova Coluna</h2>
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-1">Nome da etapa</label>
              <input 
                type="text" 
                value={newColName} 
                onChange={e => setNewColName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateColumn()}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                placeholder="Ex: Em Negociação"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button 
                onClick={() => setIsNewColumnModalOpen(false)}
                className="px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={handleCreateColumn}
                className="px-4 py-2 bg-orange-400 text-white font-medium rounded-lg hover:bg-orange-500 transition-colors"
              >
                Adicionar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Detalhes Oportunidade */}
      {selectedOpportunity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
            onClick={() => setSelectedOpportunity(null)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-[500px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-gray-100">
              <div className="flex justify-between items-start w-full">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <h2 className="text-2xl font-bold text-gray-900">{selectedOpportunity.name}</h2>
                    <button 
                      onClick={() => handleDeleteOpportunity(selectedOpportunity.id)}
                      className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex gap-2">
                    {selectedOpportunity.tag && (
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-[11px] rounded-md font-semibold tracking-wide">
                        {selectedOpportunity.tag}
                      </span>
                    )}
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] rounded-md font-semibold tracking-wide">
                      {columns.find(c => c.id === selectedOpportunity.columnId)?.name || 'Sem etapa'}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedOpportunity(null)}
                  className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-6 pt-4 flex-1">
              {/* Action Buttons */}
              <div className="space-y-3 mb-8">
                <button 
                  onClick={() => {
                    const updated = { ...selectedOpportunity, isClient: !selectedOpportunity.isClient };
                    setOpportunities(opportunities.map(o => o.id === updated.id ? updated : o));
                    setSelectedOpportunity(updated);
                    toast.success(updated.isClient ? "Tornado cliente com sucesso!" : "Removido de clientes.");
                  }}
                  className={`w-full flex items-center gap-3 p-3.5 border rounded-xl transition-colors text-left group ${
                    selectedOpportunity.isClient 
                    ? 'border-red-200 bg-red-50 hover:bg-red-100' 
                    : 'border-blue-100 hover:bg-blue-50/50'
                  }`}
                >
                  <UserPlus className={`w-5 h-5 group-hover:scale-110 transition-transform ${
                    selectedOpportunity.isClient ? 'text-red-500' : 'text-blue-500'
                  }`} />
                  <span className={`font-semibold text-[15px] ${
                    selectedOpportunity.isClient ? 'text-red-600' : 'text-blue-600'
                  }`}>
                    {selectedOpportunity.isClient ? 'Remover Cliente' : 'Tornar Cliente'}
                  </span>
                </button>
                <button className="w-full flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left group">
                  <FileText className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-gray-900 text-[15px]">Enviar Contrato</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left group">
                  <Calculator className="w-5 h-5 text-emerald-500 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-gray-900 text-[15px]">Enviar Orçamento</span>
                </button>
                <button className="w-full flex items-center gap-3 p-3.5 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-left group">
                  <MessageCircle className="w-5 h-5 text-orange-400 group-hover:scale-110 transition-transform" />
                  <span className="font-semibold text-gray-900 text-[15px]">Fazer Follow Up</span>
                </button>
              </div>

              {/* Details */}
              <div>
                <h4 className="text-[11px] font-bold text-gray-400 mb-4 tracking-widest uppercase">Detalhes</h4>
                
                <div className="mb-6">
                  <span className="text-xs text-gray-500 block mb-1 font-medium">Valor</span>
                  <div className="text-[22px] font-bold text-gray-900">{selectedOpportunity.value || 'R$ 0,00'}</div>
                </div>
                
                <div className="space-y-4 mb-8">
                  {selectedOpportunity.email && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="text-[15px]">{selectedOpportunity.email}</span>
                    </div>
                  )}
                  {selectedOpportunity.phone && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-[15px]">{selectedOpportunity.phone}</span>
                    </div>
                  )}
                  {selectedOpportunity.instagram && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <Instagram className="w-4 h-4 text-gray-400" />
                      <span className="text-[15px]">{selectedOpportunity.instagram}</span>
                    </div>
                  )}
                  {selectedOpportunity.address && (
                    <div className="flex items-center gap-3 text-gray-700">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span className="text-[15px]">{selectedOpportunity.address}</span>
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="text-xs text-gray-500 block mb-2 font-medium">Observações</span>
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-[15px] text-gray-700 min-h-[80px] whitespace-pre-wrap">
                    {selectedOpportunity.observations || 'Nenhuma observação registrada.'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Oportunidades;