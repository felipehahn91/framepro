import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Index from "./pages/Index";
import Oportunidades from "./pages/Oportunidades";
import Clientes from "./pages/Clientes";
import Tarefas from "./pages/Tarefas";
import Agenda from "./pages/Agenda";
import Financeiro from "./pages/Financeiro";
import Contratos from "./pages/Contratos";
import ContractEditor from "./pages/ContractEditor";
import ContractPublicView from "./pages/ContractPublicView";
import Orcamentos from "./pages/Orcamentos";
import OrcamentoEditor from "./pages/OrcamentoEditor";
import OrcamentoPublicView from "./pages/OrcamentoPublicView";
import OrcamentoAnalytics from "./pages/OrcamentoAnalytics";
import AdminDashboard from "./pages/AdminDashboard";
import Login from "./pages/Login";
import LinkFormPage from "./pages/LinkFormPage";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Rotas Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/link-form/:id" element={<LinkFormPage />} />
            <Route path="/contratos/public/:token" element={<ContractPublicView />} />
            <Route path="/orcamentos/public/:token" element={<OrcamentoPublicView />} />
            
            {/* Rotas Privadas */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/oportunidades" element={<ProtectedRoute><Oportunidades /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
            <Route path="/agenda" element={<ProtectedRoute><Agenda /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            
            <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
            <Route path="/contratos/novo" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
            <Route path="/contratos/editar/:id" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />

            <Route path="/orcamentos" element={<ProtectedRoute><Orcamentos /></ProtectedRoute>} />
            <Route path="/orcamentos/editar/:id" element={<ProtectedRoute><OrcamentoEditor /></ProtectedRoute>} />
            <Route path="/orcamentos/analytics/:id" element={<ProtectedRoute><OrcamentoAnalytics /></ProtectedRoute>} />
            
            {/* Super Admin */}
            <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />

            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;