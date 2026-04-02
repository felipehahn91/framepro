import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Camera, Video, LayoutTemplate, PenTool, CheckCircle2, 
  MessageSquare, Zap, Target, ArrowRight, ShieldCheck 
} from 'lucide-react';

export default function LandingPage() {
  useEffect(() => {
    document.title = "Frame Pro | O CRM definitivo para Fotógrafos e Filmmakers";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Organize seus leads, envie propostas irresistíveis e assine contratos digitalmente. O sistema de gestão focado no mercado audiovisual.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] font-sans text-gray-900 selection:bg-orange-500/30">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-gray-100 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-black text-xl">F</span>
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900">Frame Pro</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-semibold text-sm text-gray-600">
            <a href="#recursos" className="hover:text-orange-500 transition-colors">Recursos</a>
            <a href="#propostas" className="hover:text-orange-500 transition-colors">Propostas</a>
            <a href="#contratos" className="hover:text-orange-500 transition-colors">Contratos</a>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login" className="hidden sm:block text-sm font-bold text-gray-600 hover:text-gray-900 px-4 py-2">
              Entrar
            </Link>
            <Link to="/signup" className="bg-gray-900 hover:bg-black text-white text-sm font-bold px-6 py-2.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2">
              Teste Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-400/10 rounded-full blur-3xl -z-10"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-200 text-orange-600 font-bold text-xs uppercase tracking-wider mb-8 shadow-sm">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
            </span>
            Feito para profissionais do audiovisual
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.1] mb-6">
            Pare de perder clientes para profissionais <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-red-500">menos talentosos</span> que você.
          </h1>
          
          <p className="text-lg sm:text-xl text-gray-500 font-medium mb-10 max-w-2xl mx-auto leading-relaxed">
            O Frame Pro é o CRM que organiza seus leads, envia orçamentos irresistíveis e automatiza seus contratos. Foque na sua arte, nós cuidamos das suas vendas.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/signup" className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white text-lg font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/20 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2">
              COMEÇAR TESTE GRÁTIS <ArrowRight className="w-5 h-5" />
            </Link>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest sm:hidden">Sem cartão de crédito</p>
          </div>
          <p className="hidden sm:block text-xs font-bold text-gray-400 uppercase tracking-widest mt-4">14 dias grátis • Sem cartão de crédito</p>
        </div>

        {/* HERO MOCKUP */}
        <div className="max-w-6xl mx-auto mt-20 relative">
          <div className="absolute inset-0 bg-gradient-to-t from-[#fafafa] via-transparent to-transparent z-10 h-full w-full bottom-0"></div>
          <img 
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?q=80&w=2426&auto=format&fit=crop" 
            alt="Dashboard Frame Pro" 
            className="rounded-t-3xl shadow-2xl border border-gray-200 object-cover h-[400px] w-full object-top opacity-90"
          />
        </div>
      </section>

      {/* FEATURES GRID */}
      <section id="recursos" className="py-24 px-4 sm:px-6 bg-white relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-black text-gray-900 mb-4">Você é um artista, não um robô de planilhas.</h2>
            <p className="text-gray-500 font-medium">Reunimos todas as ferramentas que um fotógrafo ou videomaker precisa para fechar negócios com postura premium.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-gray-50 border border-gray-100 p-8 rounded-3xl hover:border-orange-200 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Target className="w-7 h-7 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Funil de Vendas (Kanban)</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Acompanhe cada noiva, debutante ou empresa em um painel visual. Nunca mais esqueça de fazer aquele follow-up no WhatsApp.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-100 p-8 rounded-3xl hover:border-blue-200 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LayoutTemplate className="w-7 h-7 text-blue-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Propostas Interativas</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Crie orçamentos em formato de landing page. Saiba exatamente quando o cliente abriu sua proposta e quanto tempo ele passou lendo.
              </p>
            </div>

            <div className="bg-gray-50 border border-gray-100 p-8 rounded-3xl hover:border-green-200 transition-colors group">
              <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <PenTool className="w-7 h-7 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-3">Contratos com Assinatura</h3>
              <p className="text-gray-500 font-medium leading-relaxed">
                Modelos de contrato com variáveis automáticas. Seu cliente assina direto pelo celular com o dedo, garantindo validade jurídica.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* DEEP DIVE: PROPOSALS */}
      <section id="propostas" className="py-24 px-4 sm:px-6 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-full bg-[url('https://images.unsplash.com/photo-1600880292203-757bb62b4baf?q=80&w=2000&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-overlay"></div>
        
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center relative z-10">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/20 text-white font-bold text-xs uppercase tracking-wider">
              <Camera className="w-4 h-4" /> Orçamentos que convertem
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight">
              Pare de enviar PDFs chatos pelo WhatsApp.
            </h2>
            <p className="text-gray-400 text-lg leading-relaxed">
              Com o Frame Pro, seu orçamento se torna uma experiência. Mostre seu portfólio, insira vídeos, crie tabelas de preços claras e permita que o cliente aprove a proposta com um clique.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-gray-300 font-medium">
                <CheckCircle2 className="w-6 h-6 text-orange-500 shrink-0" />
                Receba alertas quando o cliente abrir a proposta
              </li>
              <li className="flex items-center gap-3 text-gray-300 font-medium">
                <CheckCircle2 className="w-6 h-6 text-orange-500 shrink-0" />
                Mapa de calor (Heatmap) para saber onde ele mais clicou
              </li>
              <li className="flex items-center gap-3 text-gray-300 font-medium">
                <CheckCircle2 className="w-6 h-6 text-orange-500 shrink-0" />
                Aprovação via WhatsApp a um toque de distância
              </li>
            </ul>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-orange-500 to-purple-600 rounded-3xl transform rotate-3 scale-105 opacity-50 blur-lg"></div>
            <div className="bg-white rounded-3xl p-2 relative shadow-2xl">
               <img src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1000&auto=format&fit=crop" alt="Proposta" className="rounded-2xl w-full h-auto object-cover border border-gray-100" />
            </div>
          </div>
        </div>
      </section>

      {/* DEEP DIVE: CONTRACTS & PAYMENTS */}
      <section id="contratos" className="py-24 px-4 sm:px-6 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center flex-col-reverse lg:flex-row">
          
          <div className="order-2 lg:order-1 relative">
            <div className="absolute inset-0 bg-blue-100 rounded-3xl transform -rotate-3 scale-105"></div>
            <div className="bg-white rounded-3xl p-8 border border-gray-100 relative shadow-xl flex flex-col items-center text-center">
               <div className="w-full max-w-sm border-b-2 border-gray-800 pb-2 mb-4">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Signature_of_John_Hancock.svg" alt="Assinatura" className="h-20 mx-auto opacity-80" />
               </div>
               <p className="font-bold text-gray-900">João da Silva</p>
               <p className="text-xs text-gray-500 uppercase tracking-widest mt-1">Contratante</p>
               <div className="mt-8 w-full bg-green-50 border border-green-200 text-green-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2">
                 <ShieldCheck className="w-5 h-5" /> Assinado Digitalmente
               </div>
            </div>
          </div>

          <div className="space-y-8 order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Burocracia Zero
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight">
              Fechamento e pagamento no piloto automático.
            </h2>
            <p className="text-gray-500 text-lg leading-relaxed font-medium">
              Esqueça o vai e vem de arquivos Word. Configure o modelo base, gere um "Link de Fechamento" e deixe o cliente preencher os dados, escolher a forma de pagamento e assinar na mesma tela.
            </p>
            <ul className="space-y-4">
              <li className="flex items-center gap-3 text-gray-700 font-bold">
                <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0" />
                Variáveis que preenchem o contrato sozinhas
              </li>
              <li className="flex items-center gap-3 text-gray-700 font-bold">
                <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0" />
                Geração de PIX integrado com seu financeiro
              </li>
              <li className="flex items-center gap-3 text-gray-700 font-bold">
                <CheckCircle2 className="w-6 h-6 text-blue-500 shrink-0" />
                PDF gerado automaticamente após assinatura dupla
              </li>
            </ul>
          </div>
          
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-24 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-orange-500"></div>
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2000&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-multiply"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10 text-white">
          <h2 className="text-4xl md:text-6xl font-black mb-6 leading-tight">
            Pronto para profissionalizar seu estúdio?
          </h2>
          <p className="text-xl font-medium mb-10 text-orange-100 max-w-2xl mx-auto">
            Junte-se a dezenas de fotógrafos e videomakers que pararam de perder tempo com planilhas e começaram a focar na arte.
          </p>
          <Link to="/signup" className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-black text-white text-lg font-black px-10 py-5 rounded-2xl shadow-2xl transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto">
            CRIAR CONTA GRÁTIS <ArrowRight className="w-5 h-5" />
          </Link>
          <p className="mt-6 text-sm font-bold text-orange-200">14 dias de teste grátis • Cancele quando quiser</p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-gray-900 py-12 px-4 text-center border-t border-gray-800">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-black">F</span>
          </div>
          <span className="font-black text-xl tracking-tight text-white">Frame Pro</span>
        </div>
        <p className="text-gray-500 font-medium text-sm">
          © {new Date().getFullYear()} Frame Pro CRM. Todos os direitos reservados.
        </p>
      </footer>
    </div>
  );
}