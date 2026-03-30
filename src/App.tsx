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
import Financeiro from "./pages/Financeiro";
import Contratos from "./pages/Contratos";
import ContractEditor from "./pages/ContractEditor";
import ContractPublicView from "./pages/ContractPublicView";
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
            
            {/* Rotas Privadas */}
            <Route path="/" element={<ProtectedRoute><Index /></ProtectedRoute>} />
            <Route path="/oportunidades" element={<ProtectedRoute><Oportunidades /></ProtectedRoute>} />
            <Route path="/clientes" element={<ProtectedRoute><Clientes /></ProtectedRoute>} />
            <Route path="/tarefas" element={<ProtectedRoute><Tarefas /></ProtectedRoute>} />
            <Route path="/financeiro" element={<ProtectedRoute><Financeiro /></ProtectedRoute>} />
            
            <Route path="/contratos" element={<ProtectedRoute><Contratos /></ProtectedRoute>} />
            <Route path="/contratos/novo" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
            <Route path="/contratos/editar/:id" element={<ProtectedRoute><ContractEditor /></ProtectedRoute>} />
            
            {/* Fallback */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;