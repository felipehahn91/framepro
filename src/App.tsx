import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { PWAProvider } from "./contexts/PWAContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { applyTheme, getActiveTheme } from "./lib/theme";

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
import FluxoCadencia from "./pages/FluxoCadencia";
import AdminDashboard from "./pages/AdminDashboard";
import SettingsPage from "./pages/SettingsPage";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import FounderSignup from "./pages/FounderSignup";
import LinkFormPage from "./pages/LinkFormPage";
import ClosingPublicView from "./pages/ClosingPublicView";
import Pricing from "./pages/Pricing";
import FounderPack from "./pages/FounderPack";
import BillingSuccess from "./pages/BillingSuccess";
import BillingCancel from "./pages/BillingCancel";
import UpdatePassword from "./pages/UpdatePassword";
import NotFound from "./pages/NotFound";
import LandingPage from "./pages/LandingPage";
import SecurityPage from "./pages/SecurityPage";

applyTheme(getActiveTheme());

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <PWAProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Páginas Públicas */}
              <Route path="/landing" element={<LandingPage />} />
              <Route path="/seguranca" element={<SecurityPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/update-password" element={<UpdatePassword />} />
              <Route path="/founder-signup" element={<FounderSignup />} />
              
              <Route path="/link-form/:id" element={<LinkFormPage />} />
              <Route path="/contratos/public/:token" element={<ContractPublicView />} />
              <Route path="/orcamentos/public/:token" element={<OrcamentoPublicView />} />
              <Route path="/fechar/:token" element={<ClosingPublicView />} />
              
              {/* Paginas de Pagamento */}
              <Route path="/precos" element={<ProtectedRoute><Pricing /></ProtectedRoute>} />
              <Route path="/founders" element={<ProtectedRoute><FounderPack /></ProtectedRoute>} />
              <Route path="/billing-success" element={<ProtectedRoute><BillingSuccess /></ProtectedRoute>} />
              <Route path="/billing-cancel" element={<ProtectedRoute><BillingCancel /></ProtectedRoute>} />
              
              {/* Páginas Protegidas do Sistema */}
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
              <Route path="/fluxo" element={<ProtectedRoute><FluxoCadencia /></ProtectedRoute>} />
              <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/admin" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </PWAProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;