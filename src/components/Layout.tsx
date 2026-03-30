import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Target,
  Users,
  CheckSquare,
  DollarSign,
  FileText,
  Calculator,
  Calendar,
  Settings,
  Bell,
  Sun,
  GitBranch,
} from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/", icon: LayoutDashboard },
  { name: "Oportunidades", path: "/oportunidades", icon: Target },
  { name: "Clientes", path: "/clientes", icon: Users },
  { name: "Tarefas", path: "/tarefas", icon: CheckSquare },
  { name: "Financeiro", path: "/financeiro", icon: DollarSign },
  { name: "Contratos", path: "/contratos", icon: FileText },
  { name: "Orçamentos", path: "/orcamentos", icon: Calculator },
  { name: "Agenda", path: "/agenda", icon: Calendar },
  { name: "Fluxo de Cadência", path: "/fluxo", icon: GitBranch },
  { name: "Configurações", path: "/configuracoes", icon: Settings },
];

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();

  return (
    <div className="flex h-screen bg-[#f8fafc] overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold text-lg">
            F
          </div>
          <span className="font-bold text-xl text-gray-900">Frame Pro</span>
        </div>

        <nav className="flex-1 px-4 py-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-orange-400 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <item.icon
                  className={`w-5 h-5 ${
                    isActive ? "text-white" : "text-gray-400"
                  }`}
                />
                {item.name}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center gap-3 md:hidden">
            <div className="w-8 h-8 rounded-full bg-orange-400 flex items-center justify-center text-white font-bold">
              F
            </div>
            <span className="font-bold text-lg text-gray-900">Frame Pro</span>
          </div>
          <div className="hidden md:block"></div> {/* Spacer for desktop */}
          
          <div className="flex items-center gap-4">
            <button className="text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700">
              <Sun className="w-5 h-5" />
            </button>
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-medium text-sm ml-2">
              FH
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto p-8">
          {children}
        </div>
      </main>
    </div>
  );
};