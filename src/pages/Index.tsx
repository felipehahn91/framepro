import { Layout } from "@/components/Layout";
import { Edit2, TrendingUp, Clock, AlertCircle, Users, Target, FileText } from "lucide-react";

const Index = () => {
  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Visão geral do seu negócio</p>
        </div>

        {/* Meta Section */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 relative">
          <button className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
            <Edit2 className="w-4 h-4" />
          </button>
          
          <h3 className="text-sm font-medium text-gray-900 mb-2">Meta de Faturamento Mensal</h3>
          <div className="flex items-baseline gap-3 mb-6">
            <span className="text-4xl font-bold text-gray-900">R$ 0,00</span>
            <span className="text-sm font-medium text-gray-900">0% alcançado</span>
          </div>
          
          <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mb-2">
            <div className="h-full bg-orange-400 w-0 rounded-full"></div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Realizado: R$ 0,00</p>
        </div>

        {/* Faturamento Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-500">Faturamento Total</h3>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="text-2xl font-bold text-gray-900">R$ 0,00</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-500">Faturamento Pendente</h3>
              <Clock className="w-4 h-4 text-orange-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">R$ 0,00</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-500">Faturamento Atrasado</h3>
              <AlertCircle className="w-4 h-4 text-red-500" />
            </div>
            <span className="text-2xl font-bold text-gray-900">R$ 1.000,00</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-900">Total de clientes</h3>
              <Users className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">0</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-900">Oportunidades abertas</h3>
              <Target className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">0</span>
          </div>

          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col justify-between h-32">
            <div className="flex justify-between items-start">
              <h3 className="text-sm font-medium text-gray-900">Contratos ativos</h3>
              <FileText className="w-4 h-4 text-gray-400" />
            </div>
            <span className="text-2xl font-bold text-gray-900">0</span>
          </div>
        </div>

        {/* Bottom Large Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-8">
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[300px]">
            <h3 className="font-bold text-gray-900 mb-1">Pipeline de oportunidades</h3>
            <p className="text-sm text-gray-500">Distribuição por status</p>
          </div>
          
          <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 min-h-[300px]">
            <h3 className="font-bold text-gray-900 mb-1">Atividades recentes</h3>
            <p className="text-sm text-gray-500">Últimas tarefas criadas</p>
          </div>
        </div>

      </div>
    </Layout>
  );
};

export default Index;