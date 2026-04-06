import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, Lock, Database, Server, Key, 
  CheckCircle2, ArrowLeft, FileText, EyeOff, 
  CreditCard, Zap, Code
} from 'lucide-react';
import { useSEO } from '@/hooks/use-seo';

export default function SecurityPage() {
  useSEO({
    title: "Segurança e Privacidade | Frame Pro",
    description: "Conheça a arquitetura de segurança de nível empresarial que protege os dados do seu estúdio e dos seus clientes no Frame Pro.",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  const fadeInUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] font-sans text-gray-900 selection:bg-orange-500 selection:text-white">
      
      {/* NAVBAR SIMPLIFICADA */}
      <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-b border-gray-200/50 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <img src="/logo.webp" alt="Frame Pro" className="h-10 w-auto object-contain" />
          </Link>
          <Link to="/" className="flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-gray-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Voltar ao Início
          </Link>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="pt-40 pb-20 px-4 sm:px-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-orange-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <motion.div 
            initial="hidden" animate="visible" variants={fadeInUp}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-50 border border-orange-100 text-orange-600 font-bold text-xs uppercase tracking-wider mb-8 shadow-sm"
          >
            <ShieldCheck className="w-4 h-4" />
            Segurança em Primeiro Lugar
          </motion.div>
          
          <motion.h1 
            initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-gray-900 tracking-tight leading-tight mb-6"
          >
            Seus dados protegidos com tecnologia de <span className="text-orange-500">nível empresarial.</span>
          </motion.h1>
          
          <motion.p 
            initial="hidden" animate="visible" variants={fadeInUp} transition={{ delay: 0.2 }}
            className="text-lg md:text-xl text-gray-500 font-medium max-w-2xl mx-auto leading-relaxed"
          >
            Entendemos que a confiança é a base do seu negócio. Por isso, construímos o Frame Pro com a mesma arquitetura de segurança utilizada por grandes bancos e empresas de tecnologia.
          </motion.p>
        </div>
      </section>

      {/* VISÃO AMIGÁVEL (Para Leigos) */}
      <section className="py-20 px-4 sm:px-6 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-black text-gray-900 mb-4">Como protegemos você e seus clientes</h2>
            <p className="text-gray-500 font-medium">Uma explicação simples de como nossa segurança funciona na prática.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <Lock className="w-6 h-6 text-blue-500" />,
                bg: "bg-blue-50",
                border: "border-blue-100",
                title: "Cofre Digital Isolado",
                desc: "Seus clientes, contratos e orçamentos ficam em um ambiente isolado. É fisicamente impossível que outro fotógrafo ou estúdio acesse as suas informações."
              },
              {
                icon: <EyeOff className="w-6 h-6 text-orange-500" />,
                bg: "bg-orange-50",
                border: "border-orange-100",
                title: "Links Blindados",
                desc: "Quando você envia um orçamento, o link gerado é único e criptografado. O cliente só consegue ver aquele documento específico, sem risco de vazamentos."
              },
              {
                icon: <CreditCard className="w-6 h-6 text-green-500" />,
                bg: "bg-green-50",
                border: "border-green-100",
                title: "Pagamentos Seguros",
                desc: "Nós não armazenamos dados de cartão de crédito. Todo o processamento financeiro é feito diretamente pela Stripe e PagHiper, líderes globais em segurança."
              },
              {
                icon: <FileText className="w-6 h-6 text-purple-500" />,
                bg: "bg-purple-50",
                border: "border-purple-100",
                title: "Contratos com Validade",
                desc: "As assinaturas digitais coletadas na plataforma registram metadados de segurança, garantindo a integridade e a validade jurídica do acordo."
              },
              {
                icon: <Zap className="w-6 h-6 text-yellow-500" />,
                bg: "bg-yellow-50",
                border: "border-yellow-100",
                title: "Privacidade no Google",
                desc: "Nossa integração com o Google Calendar pede apenas a permissão mínima necessária. Não lemos seus e-mails nem acessamos seus arquivos pessoais."
              },
              {
                icon: <Server className="w-6 h-6 text-slate-500" />,
                bg: "bg-slate-50",
                border: "border-slate-200",
                title: "Backups Automáticos",
                desc: "Seus dados são salvos continuamente em servidores redundantes. Você nunca perderá o histórico de um cliente ou um contrato assinado."
              }
            ].map((feature, idx) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.1 }}
                className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className={`w-14 h-14 rounded-2xl ${feature.bg} ${feature.border} border flex items-center justify-center mb-6`}>
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                <p className="text-gray-500 leading-relaxed font-medium">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LAUDO TÉCNICO (Para TI) */}
      <section className="py-24 px-4 sm:px-6 bg-gray-900 text-gray-300 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>
        
        <div className="max-w-5xl mx-auto relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <Code className="w-8 h-8 text-blue-400" />
            <h2 className="text-3xl md:text-4xl font-black text-white tracking-tight">Laudo Técnico de Arquitetura</h2>
          </div>

          <div className="space-y-8">
            
            {/* Bloco 1 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-8 md:p-10 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-blue-400" /> 1. Isolamento de Dados (Multi-tenant)
              </h3>
              <p className="mb-4 leading-relaxed">
                O Frame Pro utiliza o <strong>PostgreSQL</strong> hospedado na infraestrutura do <strong>Supabase</strong> (AWS). A separação de dados entre diferentes estúdios (tenants) é garantida nativamente pelo banco de dados através de <strong>Row Level Security (RLS)</strong>.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span>Políticas RLS estritas garantem que operações de <code>SELECT</code>, <code>INSERT</code>, <code>UPDATE</code> e <code>DELETE</code> só sejam executadas se o <code>auth.uid()</code> corresponder ao proprietário do registro.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span>Vazamento de dados por falha na camada de aplicação (Frontend/Backend) é mitigado, pois o próprio motor do banco de dados rejeita queries não autorizadas.</span>
                </li>
              </ul>
            </div>

            {/* Bloco 2 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-8 md:p-10 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Key className="w-5 h-5 text-orange-400" /> 2. Autenticação e Sessões
              </h3>
              <p className="mb-4 leading-relaxed">
                O gerenciamento de identidade é provido pelo <strong>GoTrue</strong> (Supabase Auth).
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span>Senhas nunca são armazenadas em texto limpo. Utiliza-se algoritmos de hash robustos (bcrypt/Argon2) com salt exclusivo por usuário.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span>Sessões são gerenciadas via <strong>JWT (JSON Web Tokens)</strong> assinados criptograficamente, com tempo de expiração curto e rotação automática de refresh tokens.</span>
                </li>
              </ul>
            </div>

            {/* Bloco 3 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-8 md:p-10 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" /> 3. Exposição Segura de Links Públicos
              </h3>
              <p className="mb-4 leading-relaxed">
                Documentos compartilhados com clientes finais (Orçamentos, Contratos e Formulários) não expõem as tabelas do banco de dados.
              </p>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span>O acesso público é feito exclusivamente através de <strong>RPCs (Remote Procedure Calls)</strong> com a flag <code>SECURITY DEFINER</code>.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span>A busca exige um token UUID v4 exato (128-bit). Tentativas de enumeração ou força bruta são matematicamente inviáveis.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span>As políticas RLS das tabelas principais permanecem fechadas para acesso anônimo, prevenindo extração de dados em massa.</span>
                </li>
              </ul>
            </div>

            {/* Bloco 4 */}
            <div className="bg-gray-800/50 border border-gray-700 rounded-3xl p-8 md:p-10 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <Server className="w-5 h-5 text-emerald-400" /> 4. Infraestrutura e Conformidade
              </h3>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span><strong>Criptografia em Trânsito:</strong> Todo o tráfego utiliza TLS 1.2/1.3 (HTTPS).</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span><strong>Criptografia em Repouso:</strong> Os dados armazenados nos servidores (AWS) são criptografados em repouso utilizando o padrão AES-256.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-400 shrink-0 mt-0.5" />
                  <span><strong>Conformidade:</strong> A infraestrutura base (Supabase) é auditada e possui certificação SOC2 Type II e conformidade com a HIPAA.</span>
                </li>
              </ul>
            </div>

          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-20 px-4 text-center bg-white">
        <h2 className="text-3xl font-black text-gray-900 mb-6">Pronto para profissionalizar seu estúdio?</h2>
        <Link 
          to="/signup" 
          className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white text-lg font-bold px-8 py-4 rounded-2xl shadow-lg transition-all hover:-translate-y-1 active:scale-95"
        >
          Criar Conta Segura
        </Link>
      </section>

    </div>
  );
}