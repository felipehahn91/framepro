import { useState } from "react";
import { Layout } from "@/components/Layout";
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
  Diamond
} from "lucide-react";

// --- Tipos ---
interface Opportunity {
  id: string;
  name: string;
  tag: string;
  email: string;
  phone: string;
  value: string;
  instagram: string;
  address: string;
  observations: string;
}

// --- Dados de Exemplo ---
const mockOpportunity: Opportunity = {
  id: "1",
  name: "Felipe Hahn",
  tag: "Casamento",
  email: "felipehah@gmail.com",
  phone: "51984766790",
  value: "R$ 12.000,00",
  instagram: "_felipehahn",
  address: "Casa",
  observations: "Teste"
};

// --- Componentes Internos ---

const KanbanCard = ({ 
  data, 
  onClick 
}: { 
  data: Opportunity; 
  onClick: () => void;
}) => (
  <div 
    onClick={onClick}
    className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm cursor-pointer hover:shadow-md transition-all group"
  >
    <div className="flex justify-between items-start mb-2.5">
      <div className="flex items-center gap-2.5">
        <div className="w-4 h-4 rounded-full border border-gray-300 group-hover:border-orange-400 transition-colors"></div>
        <span className="font-semibold text-gray-900 text-[15px]">{data.name}</span>
      </div>
      <div className="flex flex-col text-gray-400">
        <ChevronUp className="w-3.5 h-3.5" />
        <ChevronDown className="w-3.5 h-3.5 -mt-1" />
      </div>
    </div>
    
    <div className="mb-3 inline-flex items-center gap-1.5 bg-gray-100/80 px-2 py-0.5 rounded-md text-[11px] font-medium text-gray-600">
      <Diamond className="w-3 h-3 text-gray-500" /> {data.tag}
    </div>
    
    <div className="text-[13px] text-gray-500 mb-4 space-y-0.5 leading-relaxed">
      <div>{data.email}</div>
      <div>{data.phone}</div>
    </div>
    
    <div className="flex gap-2">
      <button 
        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        <UserPlus className="w-3.5 h-3.5" /> +Cliente
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

const KanbanColumn = ({ 
  title, 
  count, 
  children 
}: { 
  title: string; 
  count: number; 
  children?: React.ReactNode;
}) => (
  <div className="flex-1 min-w-[300px] max-w-[320px] bg-white rounded-xl border border-gray-200 flex flex-col h-[calc(100vh-280px)] min-h-[500px]">
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-gray-900 text-base">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 text-gray-500 text-xs font-medium px-2 py-0.5 rounded-full min-w-[24px] text-center">
            {count}
          </span>
          <button className="text-gray-400 hover:text-gray-600 transition-colors">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400 font-medium">
        <button className="hover:text-gray-600 transition-colors">Selecionar Todos</button>
        <span>|</span>
        <button className="hover:text-gray-600 transition-colors">Desmarcar Todos</button>
      </div>
    </div>
    <div className="flex-1 bg-gray-50/50 p-3 overflow-y-auto rounded-b-xl space-y-3">
      {children}
    </div>
  </div>
);

const OpportunityModal = ({ 
  data, 
  isOpen, 
  onClose 
}: { 
  data: Opportunity | null; 
  isOpen: boolean; 
  onClose: () => void;
}) => {
  if (!isOpen || !data) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-0">
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl w-full max-w-[500px] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-100">
          <div className="flex justify-between items-start w-full">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <h2 className="text-2xl font-bold text-gray-900">{data.name}</h2>
                <button className="text-red-500 hover:bg-red-50 p-1.5 rounded-md transition-colors mt-1">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex gap-2">
                <span className="px-2.5 py-1 bg-orange-50 text-orange-600 text-[11px] rounded-md font-semibold tracking-wide">
                  {data.tag}
                </span>
                <span className="px-2.5 py-1 bg-gray-100 text-gray-600 text-[11px] rounded-md font-semibold tracking-wide">
                  Novo
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1.5 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-6 pt-4 flex-1">
          
          {/* Action Buttons */}
          <div className="space-y-3 mb-8">
            <button className="w-full flex items-center gap-3 p-3.5 border border-blue-100 rounded-xl hover:bg-blue-50/50 transition-colors text-left group">
              <UserPlus className="w-5 h-5 text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="font-semibold text-blue-600 text-[15px]">Tornar Cliente</span>
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
              <div className="text-[22px] font-bold text-gray-900">{data.value}</div>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center gap-3 text-gray-700">
                <Mail className="w-4 h-4 text-gray-400" />
                <span className="text-[15px]">{data.email}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-[15px]">{data.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <Instagram className="w-4 h-4 text-gray-400" />
                <span className="text-[15px]">{data.instagram}</span>
              </div>
              <div className="flex items-center gap-3 text-gray-700">
                <MapPin className="w-4 h-4 text-gray-400" />
                <span className="text-[15px]">{data.address}</span>
              </div>
            </div>
            
            <div>
              <span className="text-xs text-gray-500 block mb-2 font-medium">Observações</span>
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-[15px] text-gray-700 min-h-[80px]">
                {data.observations}
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </div>
  );
};

// --- Página Principal ---

const Oportunidades = () => {
  const [selectedOpportunity, setSelectedOpportunity] = useState<Opportunity | null>(null);

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
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <button className="flex items-center justify-between w-[200px] px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 hover:bg-gray-50 shadow-sm transition-colors">
            Oportunidades
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-[13px] text-gray-700 font-medium hover:bg-gray-50 shadow-sm transition-colors">
            Nova Pipeline
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          <KanbanColumn title="Aberto" count={1}>
            <KanbanCard 
              data={mockOpportunity} 
              onClick={() => setSelectedOpportunity(mockOpportunity)} 
            />
          </KanbanColumn>
          <KanbanColumn title="Em Progresso" count={0} />
          <KanbanColumn title="Ganho" count={0} />
        </div>

        {/* Link Forms Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 flex flex-col items-start pb-8">
          <div className="flex items-center gap-2 text-gray-900 font-bold mb-2">
            <LinkIcon className="w-5 h-5 text-orange-400" />
            <h2>Formulários de Captação (Link Forms)</h2>
          </div>
          <p className="text-sm text-gray-500">
            Nenhum formulário criado ainda. Use o botão "Nova Oportunidade" para criar um.
          </p>
        </div>
      </div>

      {/* Modal Overlay */}
      <OpportunityModal 
        isOpen={!!selectedOpportunity} 
        data={selectedOpportunity} 
        onClose={() => setSelectedOpportunity(null)} 
      />
    </Layout>
  );
};

export default Oportunidades;