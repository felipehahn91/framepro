import { Layout } from "@/components/Layout";
import { Trash2, Link as LinkIcon, ChevronDown, Upload } from "lucide-react";

const KanbanColumn = ({ title }: { title: string }) => (
  <div className="flex-1 min-w-[280px] bg-white rounded-xl border border-gray-200 flex flex-col h-[600px]">
    <div className="p-4 border-b border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold text-gray-900">{title}</h3>
        <div className="flex items-center gap-2">
          <span className="bg-gray-100 text-gray-600 text-xs font-medium px-2 py-0.5 rounded-full">
            0
          </span>
          <button className="text-gray-400 hover:text-gray-600">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <button className="hover:text-gray-600">Selecionar Todos</button>
        <span>|</span>
        <button className="hover:text-gray-600">Desmarcar Todos</button>
      </div>
    </div>
    <div className="flex-1 bg-gray-50/50 p-2 overflow-y-auto rounded-b-xl">
      {/* Área para os cartões vazia por enquanto */}
    </div>
  </div>
);

const Oportunidades = () => {
  return (
    <Layout>
      <div className="max-w-full mx-auto flex flex-col h-full">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Oportunidades</h1>
          <div className="flex items-center gap-3 ml-auto">
             <button className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 flex items-center justify-center">
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-6">
          <button className="flex items-center justify-between w-48 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            Oportunidades
            <ChevronDown className="w-4 h-4 text-gray-400" />
          </button>
          <button className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 font-medium hover:bg-gray-50 shadow-sm">
            Nova Pipeline
          </button>
        </div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4 flex-1">
          <KanbanColumn title="Aberto" />
          <KanbanColumn title="Em Progresso" />
          <KanbanColumn title="Ganho" />
          <KanbanColumn title="Perdido" />
        </div>

        {/* Link Forms Section */}
        <div className="mt-8 pt-6 border-t border-gray-200 flex flex-col items-start pb-8">
          <div className="flex items-center gap-2 text-gray-900 font-bold mb-2">
            <LinkIcon className="w-5 h-5 text-orange-400" />
            <h2>Formulários de Captação (Link Forms)</h2>
          </div>
          <p className="text-sm text-gray-500">
            Nenhum formulário criado ainda. Use o botão "Nova Oportunidade" para criar um.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Oportunidades;