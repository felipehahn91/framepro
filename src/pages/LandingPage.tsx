import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, Variants } from 'framer-motion';
import { 
  Camera, Video, LayoutTemplate, PenTool, CheckCircle2, 
  MessageSquare, Zap, Target, ArrowRight, ShieldCheck, 
  Star, DollarSign, BarChart3, Users, Check, Eye,
  Instagram, Youtube, Twitter, X
} from 'lucide-react';

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } }
};

const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

export default function LandingPage() {
  useEffect(() => {
    document.title = "Frame Pro | O CRM definitivo para Fotógrafos de Eventos";
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute("content", "Organize seus leads, envie propostas irresistíveis e assine contratos digitalmente. O sistema de gestão feito para fotógrafos de casamento e eventos.");
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 selection:bg-orange-500 selection:text-white overflow-hidden">
      
      {/* NAVBAR */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="fixed top-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-b border-gray-200/50 z-50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <span className="text-white font-black text-xl">F</span>
            </div>
            <span className="font-black text-xl tracking-tight text-gray-900">Frame Pro</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 font-bold text-sm text-gray-500">
            <a href="#recursos" className="hover:text-gray-900 transition-colors">Como Funciona</a>
            <a href="#propostas" className="hover:text-gray-900 transition-colors">Propostas</a>
            <a href="#planos" className="hover:text-gray-900 transition-colors">Planos</a>
          </div>

          <div className="flex items-center gap-4">
            <Link to="/login" className="hidden sm:block text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
              Entrar
            </Link>
            <Link to="/signup" className="bg-gray-900 hover:bg-black text-white text-sm font-bold px-6 py-3 rounded-2xl shadow-lg shadow-gray-900/20 transition-all active:scale-95 flex items-center gap-2">
              Teste Grátis
            </Link>
          </div>
        </div>
      </motion.nav>

      {/* HERO SECTION */}
      <section className="pt-32 pb-12 sm:pt-40 sm:pb-20 px-4 sm:px-6 relative flex flex-col items-center text-center">
        {/* Animated Background Orbs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <motion.div 
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[10%] w-[500px] h-[500px] bg-orange-400/20 rounded-full blur-[120px]" 
          />
          <motion.div 
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.4, 0.2] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-blue-400/10 rounded-full blur-[120px]" 
          />
        </div>

        <motion.div 
          initial="hidden"
          animate="visible"
          variants={staggerContainer}
          className="max-w-5xl mx-auto relative z-10 flex flex-col items-center"
        >
          <motion.div variants={fadeInUp} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-gray-200 text-gray-700 font-bold text-xs uppercase tracking-wider mb-8 shadow-sm">
            <Camera className="w-3.5 h-3.5 text-orange-500" />
            O CRM nº1 para Fotógrafos de Casamento e Eventos
          </motion.div>

          <motion.h1 variants={fadeInUp} className="text-5xl sm:text-6xl md:text-7xl font-black text-gray-900 tracking-tight leading-[1.05] mb-6">
            Pare de perder datas na agenda para fotógrafos com <span className="text-orange-500 relative">
              menos talento
              <motion.span 
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
                className="absolute -bottom-2 left-0 h-2 bg-orange-200/50 rounded-full -z-10"
              />
            </span> que você.
          </motion.h1>
          
          <motion.p variants={fadeInUp} className="text-lg sm:text-xl text-gray-500 font-medium mb-10 max-w-2xl leading-relaxed">
            Transforme noivas apenas "curiosas" em clientes apaixonadas. Envie orçamentos de cair o queixo, acompanhe seus leads e assine contratos digitalmente em minutos.
          </motion.p>

          <motion.div variants={fadeInUp} className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link to="/signup" className="w-full sm:w-auto bg-orange-500 hover:bg-orange-600 text-white text-lg font-black px-8 py-4 rounded-2xl shadow-xl shadow-orange-500/25 transition-all hover:-translate-y-1 active:scale-95 flex items-center justify-center gap-2 group">
              COMEÇAR 14 DIAS GRÁTIS 
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link to="#recursos" className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 text-lg font-bold px-8 py-4 rounded-2xl transition-all flex items-center justify-center shadow-sm">
              Ver recursos
            </Link>
          </motion.div>
          <motion.p variants={fadeInUp} className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-6">Sem necessidade de cartão de crédito</motion.p>
        </motion.div>

        {/* HERO IMAGE APP PREVIEW */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="max-w-6xl mx-auto mt-16 w-full px-4 sm:px-0 relative z-10 flex justify-center"
        >
          <motion.img 
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            src="/hero-mockup.webp" 
            alt="Dashboard Frame Pro" 
            className="rounded-3xl shadow-2xl w-full max-w-5xl object-cover border border-gray-200/50"
          />
        </motion.div>
      </section>

      {/* BENTO GRID FEATURES */}
      <section id="recursos" className="py-32 px-4 sm:px-6 bg-white relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={fadeInUp}
            className="mb-16 md:flex md:items-end md:justify-between"
          >
            <div className="max-w-2xl">
              <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-4 tracking-tight">Feito para a rotina do fotógrafo.</h2>
              <p className="text-xl text-gray-500 font-medium">Livre-se de planilhas desorganizadas e PDFs esquecidos. Tenha total controle do seu estúdio de fotografia.</p>
            </div>
          </motion.div>

          <motion.div 
            initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}
            className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]"
          >
            {/* Box 1 - Kanban */}
            <motion.div variants={fadeInUp} className="md:col-span-2 bg-[#FAFAFA] rounded-3xl p-8 border border-gray-200 flex flex-col justify-between relative overflow-hidden group hover:border-orange-300 transition-all duration-500 hover:shadow-xl">
              <div className="relative z-10 max-w-sm">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-gray-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Target className="w-6 h-6 text-orange-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Pipeline Visual (Kanban)</h3>
                <p className="text-gray-500 font-medium leading-relaxed">Saiba exatamente em que etapa cada noivo, debutante ou empresa está. Nunca mais perca o timing de um follow-up para fechar o evento.</p>
              </div>
              <motion.img 
                whileHover={{ scale: 1.05, rotate: 10 }}
                transition={{ duration: 0.5 }}
                src="https://images.unsplash.com/photo-1512314889357-e157c22f938d?q=80&w=800&auto=format&fit=crop" alt="Kanban" 
                className="absolute -bottom-20 -right-20 w-2/3 rounded-tl-3xl shadow-2xl opacity-40 group-hover:opacity-90 transition-opacity rotate-12" 
              />
            </motion.div>

            {/* Box 2 - Financeiro */}
            <motion.div variants={fadeInUp} className="bg-gray-900 rounded-3xl p-8 flex flex-col justify-between relative overflow-hidden group hover:shadow-2xl hover:shadow-gray-900/20 transition-all duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
              <div className="relative z-10">
                <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-6 border border-gray-700 group-hover:scale-110 transition-transform">
                  <DollarSign className="w-6 h-6 text-green-400" />
                </div>
                <h3 className="text-2xl font-black text-white mb-2">Previsibilidade de Caixa</h3>
                <p className="text-gray-400 font-medium leading-relaxed">Chega de calotes. Controle parcelamentos pré-evento, envie cobranças via PIX e saiba exatamente o que tem a receber.</p>
              </div>
            </motion.div>

            {/* Box 3 - Contratos */}
            <motion.div variants={fadeInUp} className="bg-blue-50/50 rounded-3xl p-8 border border-blue-100 flex flex-col justify-between relative overflow-hidden group hover:border-blue-300 hover:bg-blue-50 transition-all duration-500 hover:shadow-xl">
              <div className="relative z-10">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-blue-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <PenTool className="w-6 h-6 text-blue-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">Contratos sem Cartório</h3>
                <p className="text-gray-500 font-medium leading-relaxed">Contratos preenchidos sozinhos. O casal assina com o dedo na tela do celular e você recebe o PDF com validade jurídica.</p>
              </div>
            </motion.div>

            {/* Box 4 - Automação Whatsapp */}
            <motion.div variants={fadeInUp} className="md:col-span-2 bg-orange-50/50 rounded-3xl p-8 border border-orange-100 flex flex-col justify-between relative overflow-hidden group hover:border-orange-300 hover:bg-orange-50 transition-all duration-500 hover:shadow-xl">
              <div className="relative z-10 max-w-sm">
                <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-orange-100 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <MessageSquare className="w-6 h-6 text-green-500" />
                </div>
                <h3 className="text-2xl font-black text-gray-900 mb-2">WhatsApp no Piloto Automático</h3>
                <p className="text-gray-600 font-medium leading-relaxed">Crie "Fluxos de Cadência" para enviar mensagens de follow-up, lembretes de ensaio e boletos automaticamente para o WhatsApp do cliente.</p>
              </div>
              <motion.img 
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.5 }}
                src="https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=800&auto=format&fit=crop" alt="Automação" 
                className="absolute -right-10 top-1/2 -translate-y-1/2 w-1/2 rounded-l-3xl shadow-2xl opacity-50 group-hover:opacity-100 transition-opacity" 
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* SHOWCASE: PROPOSTAS */}
      <section id="propostas" className="py-32 px-4 sm:px-6 bg-gray-900 text-white overflow-hidden relative">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1511285560929-80b456fea0bc?q=80&w=2000&auto=format&fit=crop')] opacity-[0.03] bg-cover bg-center mix-blend-overlay pointer-events-none"></div>
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.8 }}
              className="space-y-8"
            >
              <div className="inline-flex items-center gap-2 bg-gray-800/50 backdrop-blur-md border border-gray-700 px-4 py-2 rounded-full text-sm font-bold text-gray-300">
                <LayoutTemplate className="w-4 h-4 text-orange-500" /> Landing Pages de Vendas
              </div>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight leading-tight">
                Seus orçamentos em formato de experiência.
              </h2>
              <p className="text-gray-400 text-xl leading-relaxed font-medium">
                Abandone os PDFs frios. Crie propostas ricas com galerias, vídeos e tabelas de preço interativas. Seu cliente pode aprovar a proposta e fechar negócio com um clique.
              </p>
              
              <ul className="space-y-5 pt-4">
                <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-700">
                  <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0 mt-1">
                    <Eye className="w-5 h-5 text-orange-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Avisos de Leitura</h4>
                    <p className="text-gray-400 font-medium">Receba uma notificação no exato momento que o cliente abrir seu orçamento.</p>
                  </div>
                </li>
                <li className="flex items-start gap-4 p-4 rounded-2xl hover:bg-gray-800/50 transition-colors border border-transparent hover:border-gray-700">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0 mt-1">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Mapa de Calor (Heatmap)</h4>
                    <p className="text-gray-400 font-medium">Veja as gravações da tela do cliente para descobrir qual pacote chamou mais atenção.</p>
                  </div>
                </li>
              </ul>
            </motion.div>
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.8, rotate: -5 }}
              whileInView={{ opacity: 1, scale: 1, rotate: 3 }}
              viewport={{ once: true }}
              transition={{ duration: 1, type: "spring" }}
              className="relative lg:h-[600px] flex items-center justify-center group"
            >
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-3/4 bg-orange-500/30 rounded-full blur-[120px] group-hover:bg-orange-500/40 transition-colors duration-700"></div>
              
              <img 
                src="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1000&auto=format&fit=crop" 
                alt="Orçamentos Interativos" 
                className="relative z-10 w-full max-w-md rounded-3xl shadow-2xl border-8 border-gray-800 group-hover:rotate-0 group-hover:scale-105 transition-all duration-500"
              />
            </motion.div>
          </div>
        </div>
      </section>

      {/* DEEP DIVE: CONTRACTS & PAYMENTS */}
      <section id="contratos" className="py-32 px-4 sm:px-6 bg-[#FAFAFA] overflow-hidden">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center flex-col-reverse lg:flex-row">
          
          <motion.div 
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="order-2 lg:order-1 relative"
          >
            <motion.div 
              animate={{ rotate: [-3, -1, -3] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="absolute inset-0 bg-blue-100 rounded-[3rem] transform -rotate-3 scale-105"
            ></motion.div>
            <div className="bg-white rounded-[3rem] p-10 border border-gray-100 relative shadow-xl flex flex-col items-center text-center z-10">
               <div className="w-full max-w-sm border-b-2 border-gray-800 pb-2 mb-6">
                 <img src="https://upload.wikimedia.org/wikipedia/commons/f/fa/Signature_of_John_Hancock.svg" alt="Assinatura" className="h-24 mx-auto opacity-80" />
               </div>
               <p className="font-bold text-gray-900 text-lg">João da Silva</p>
               <p className="text-xs text-gray-500 uppercase tracking-widest mt-1 font-bold">Contratante / Noivo</p>
               <div className="mt-8 w-full bg-green-50 border border-green-200 text-green-700 font-bold py-4 rounded-2xl flex justify-center items-center gap-2 shadow-sm">
                 <ShieldCheck className="w-6 h-6" /> Assinado Digitalmente
               </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="space-y-8 order-1 lg:order-2"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-50 border border-blue-200 text-blue-600 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Fechamento Imediato
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-gray-900 leading-tight tracking-tight">
              Contrato e pagamento fechados na mesma tela.
            </h2>
            <p className="text-gray-500 text-xl leading-relaxed font-medium">
              Ao invés de mandar um documento no WhatsApp e pedir os dados do casal, você envia nosso "Link de Fechamento". O cliente preenche o CPF, escolhe como vai parcelar o pagamento e o seu contrato de fotografia é preenchido automaticamente com as "variáveis mágicas".
            </p>
            <ul className="space-y-5 pt-2">
              {[
                "Variáveis mágicas preenchem o modelo do contrato",
                "Você define em até quantas vezes o casal pode parcelar",
                "O cliente assina com o dedo e um PDF é gerado e salvo",
                "O primeiro PIX é gerado e mandado via WhatsApp na hora"
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-4 text-gray-800 font-bold text-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5 text-blue-600" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </motion.div>
          
        </div>
      </section>

      {/* PLANOS / PRICING */}
      <section id="planos" className="py-32 px-4 sm:px-6 bg-white relative">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-20 max-w-3xl mx-auto">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="text-4xl md:text-5xl font-black text-gray-900 mb-6 tracking-tight"
            >
              Um investimento que se paga com um único ensaio.
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 }}
              className="text-xl text-gray-500 font-medium"
            >
              Comece hoje mesmo com 14 dias de teste gratuito. Cancele quando quiser.
            </motion.p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8 max-w-6xl mx-auto items-stretch">
            {/* STARTER */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="bg-white border border-gray-200 rounded-[2.5rem] p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all flex flex-col relative h-[95%]"
            >
              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-widest">Starter</h3>
              <p className="text-gray-500 font-medium mb-8">O essencial para fotógrafos organizarem o fluxo da agenda.</p>
              
              <div className="flex items-baseline gap-2 mb-8">
                <span className="text-6xl font-black text-gray-900 tracking-tighter">R$ 97</span>
                <span className="text-gray-500 font-bold">/mês</span>
              </div>

              <div className="h-px bg-gray-100 w-full mb-8"></div>

              <ul className="space-y-5 mb-10 flex-1">
                {[
                  "14 dias de teste GRÁTIS",
                  "Gestão ilimitada de clientes (Kanban)",
                  "Construtor de Orçamentos Interativos",
                  "Mapa de Calor: Gravação de Tela",
                  "Contratos com assinatura digital na tela",
                  "Controle de pagamentos (Financeiro)",
                  "Suporte por e-mail"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700 font-bold">
                    <div className="w-5 h-5 bg-gray-100 text-gray-900 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Link to="/signup" className="w-full py-4 bg-gray-100 text-gray-900 hover:bg-gray-200 font-black rounded-2xl transition-all flex items-center justify-center mt-auto">
                ASSINAR STARTER
              </Link>
            </motion.div>

            {/* PLUS */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.2 }}
              className="bg-gray-900 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_20px_60px_-15px_rgba(249,115,22,0.3)] relative overflow-hidden flex flex-col transform md:-translate-y-4 ring-2 ring-orange-500 h-[105%]"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500 rounded-full blur-3xl opacity-20 -mr-20 -mt-20"></div>
              
              <div className="absolute top-8 right-8 bg-orange-500 text-white px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest shadow-sm flex items-center gap-1">
                <Star className="w-3 h-3 fill-white" /> Mais Completo
              </div>
              
              <h3 className="text-2xl font-black text-orange-400 mb-2 uppercase tracking-widest">Plus</h3>
              <p className="text-gray-300 font-medium mb-8 relative z-10">Tudo do Starter + Automação total de comunicação e pagamentos.</p>
              
              <div className="flex items-baseline gap-2 mb-8 relative z-10">
                <span className="text-6xl font-black text-white tracking-tighter">R$ 147</span>
                <span className="text-gray-500 font-bold">/mês</span>
              </div>

              <div className="h-px bg-gray-800 w-full mb-8 relative z-10"></div>

              <ul className="space-y-5 mb-10 flex-1 relative z-10">
                {[
                  "Integração WhatsApp (Avisos de vencimento)",
                  "Sincronização Google Calendar e Meet",
                  "Geração automática de Pix e Boletos",
                  "Fluxo de Cadência Automático",
                  "Suporte prioritário via WhatsApp"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-white font-bold">
                    <div className="w-5 h-5 bg-orange-500 text-white rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-3 h-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Link to="/signup" className="w-full py-4 bg-orange-500 text-white font-black rounded-2xl shadow-xl hover:bg-orange-600 transition-all flex items-center justify-center gap-2 relative z-10 mt-auto">
                COMEÇAR TESTE DE 14 DIAS
              </Link>
            </motion.div>

            {/* FOUNDER */}
            <motion.div 
              initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: 0.4 }}
              className="bg-white border border-gray-200 rounded-[2.5rem] p-8 sm:p-10 shadow-xl hover:shadow-2xl transition-all flex flex-col relative mt-4 lg:mt-8 mb-4 lg:mb-0 h-[95%]"
            >
              <div className="absolute top-6 right-6 bg-gray-900 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest shadow-sm">
                VIP Anual
              </div>

              <h3 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-widest">Founder</h3>
              <p className="text-gray-500 font-medium mb-8">Desconto agressivo e benefícios vitalícios para os primeiros membros.</p>
              
              <div className="flex items-baseline gap-1 mb-1">
                <span className="text-6xl font-black text-gray-900 tracking-tighter">R$ 67</span>
                <span className="text-gray-500 font-bold">/mês</span>
              </div>
              <p className="text-orange-600 text-[11px] font-black uppercase tracking-wider mb-8 bg-orange-50 inline-block px-2 py-1 rounded-md border border-orange-100">
                Pagamento único de R$ 804 / 1 ano
              </p>

              <div className="h-px bg-gray-100 w-full mb-8"></div>

              <ul className="space-y-5 mb-10 flex-1">
                <li className="flex items-start gap-3 text-gray-900 font-bold">
                  <div className="w-5 h-5 bg-gray-100 text-gray-900 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <Check className="w-3 h-3" />
                  </div>
                  Tudo que está no plano Plus, mais:
                </li>
                {[
                  "Mais de 50% de desconto no ano",
                  "Desconto vitalício garantido na renovação",
                  "Selo 'Founder' no seu perfil",
                  "Grupo exclusivo de networking",
                  "Treinamento de Onboarding VIP (1h)"
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-3 text-gray-700 font-semibold">
                    <div className="w-5 h-5 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                      <ShieldCheck className="w-3 h-3" />
                    </div>
                    {item}
                  </li>
                ))}
              </ul>

              <Link to="/founder-signup" className="w-full py-4 bg-gray-900 text-white font-black rounded-2xl shadow-lg hover:bg-black transition-all flex items-center justify-center mt-auto">
                ASSINAR FOUNDER
              </Link>
            </motion.div>
          </div>

          <div className="text-center mt-12">
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Pagamento seguro via Stripe • Cancele a qualquer momento</p>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-32 px-4 sm:px-6 relative bg-white overflow-hidden">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="max-w-6xl mx-auto bg-orange-500 rounded-[3rem] p-12 md:p-24 text-center relative shadow-2xl"
        >
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1516035069371-29a1b244cc32?q=80&w=2000&auto=format&fit=crop')] opacity-10 bg-cover bg-center mix-blend-multiply"></div>
          
          <div className="relative z-10">
            <h2 className="text-5xl md:text-7xl font-black text-white mb-8 leading-tight tracking-tight">
              A sua fotografia merece um negócio organizado.
            </h2>
            <p className="text-2xl font-medium mb-12 text-orange-100 max-w-3xl mx-auto leading-relaxed">
              Leve exatamente 2 minutos para criar sua conta e configurar o seu primeiro orçamento interativo. O primeiro ensaio que o sistema te ajudar a fechar já paga o ano inteiro.
            </p>
            <Link to="/signup" className="inline-flex items-center justify-center gap-3 bg-gray-900 hover:bg-black text-white text-xl font-black px-12 py-6 rounded-2xl shadow-2xl transition-all hover:-translate-y-1 active:scale-95 w-full sm:w-auto group">
              CRIAR MINHA CONTA AGORA <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </motion.div>
      </section>

      {/* FOOTER PREMIUM */}
      <motion.footer 
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1 }}
        className="bg-gray-950 pt-20 pb-10 px-4 sm:px-6 border-t border-gray-900"
      >
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 mb-16">
            {/* Logo & Brand Info */}
            <div className="lg:col-span-2">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                  <span className="text-white font-black text-xl">F</span>
                </div>
                <span className="font-black text-2xl tracking-tight text-white">Frame Pro</span>
              </div>
              <p className="text-gray-400 font-medium text-sm max-w-sm mb-8 leading-relaxed">
                O CRM definitivo para fotógrafos e filmmakers. Organize sua agenda, crie propostas irresistíveis e feche contratos digitalmente sem dor de cabeça.
              </p>
              <div className="flex items-center gap-4">
                <a href="#" className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">
                  <Instagram className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">
                  <Youtube className="w-4 h-4" />
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center text-gray-400 hover:bg-orange-500 hover:text-white hover:border-orange-500 transition-all">
                  <Twitter className="w-4 h-4" />
                </a>
              </div>
            </div>
            
            {/* Produto */}
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Produto</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-400">
                <li><a href="#recursos" className="hover:text-orange-400 transition-colors">Recursos</a></li>
                <li><a href="#propostas" className="hover:text-orange-400 transition-colors">Propostas Interativas</a></li>
                <li><a href="#contratos" className="hover:text-orange-400 transition-colors">Assinatura Digital</a></li>
                <li><a href="#planos" className="hover:text-orange-400 transition-colors">Planos e Preços</a></li>
              </ul>
            </div>

            {/* Plataforma */}
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Plataforma</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-400">
                <li><Link to="/login" className="hover:text-orange-400 transition-colors">Fazer Login</Link></li>
                <li><Link to="/signup" className="hover:text-orange-400 transition-colors">Criar Conta Grátis</Link></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Tutoriais em Vídeo</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-bold mb-6 tracking-wide">Legal</h4>
              <ul className="space-y-4 text-sm font-medium text-gray-400">
                <li><a href="#" className="hover:text-orange-400 transition-colors">Termos de Uso</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Política de Privacidade</a></li>
                <li><a href="#" className="hover:text-orange-400 transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>

          <div className="pt-8 border-t border-gray-800/50 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 font-medium text-sm text-center md:text-left">
              © {new Date().getFullYear()} Frame Pro CRM. Todos os direitos reservados.
            </p>
            <div className="flex items-center gap-2 text-sm font-bold text-gray-500 bg-gray-900 border border-gray-800 px-4 py-2 rounded-full">
              Feito com <span className="text-red-500">♥</span> para criativos
            </div>
          </div>
        </div>
      </motion.footer>
    </div>
  );
}