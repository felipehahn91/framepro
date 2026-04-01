import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, CheckCircle2, ArrowRight, User, CreditCard, PenTool, Calendar, DollarSign, PartyPopper } from "lucide-react";
import SignaturePad from "react-signature-canvas";

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
};

export default function ClosingPublicView() {
  const { token } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [linkData, setLinkData] = useState<any>(null);
  const [opportunity, setOpportunity] = useState<any>(null);
  const [template, setTemplate] = useState<any>(null);

  const [step, setStep] = useState(1);
  const sigCanvas = useRef<SignaturePad>(null);

  // Formulário do Cliente
  const [clientData, setClientData] = useState({
    cpf: '',
    civil_status: 'Solteiro(a)',
    profession: '',
    address: ''
  });
  
  // Condições Comerciais
  const [selectedInstallments, setSelectedInstallments] = useState(1);

  useEffect(() => {
    if (token) fetchLinkData();
  }, [token]);

  const fetchLinkData = async () => {
    try {
      const { data: link, error } = await supabase
        .from('closing_links')
        .select('*, opportunities(*)')
        .eq('token', token)
        .single();

      if (error) throw error;
      setLinkData(link);
      setOpportunity(link.opportunities);

      if (link.contract_template_id) {
        const { data: tpl } = await supabase
          .from('contracts')
          .select('description, supplier_signature')
          .eq('id', link.contract_template_id)
          .single();
        setTemplate(tpl);
      }
    } catch (error) {
      toast.error("Link de fechamento inválido ou indisponível.");
    } finally {
      setLoading(false);
    }
  };

  const handleNextStep = () => {
    if (step === 1) {
      if (!clientData.cpf || !clientData.address || !clientData.profession) {
        return toast.error("Preencha todos os campos obrigatórios para continuar.");
      }
    }
    setStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleFinish = async () => {
    if (!sigCanvas.current || sigCanvas.current.isEmpty()) {
      return toast.error("Por favor, desenhe sua assinatura para concluir.");
    }

    setSubmitting(true);
    try {
      const signatureImage = sigCanvas.current.getCanvas().toDataURL('image/png');

      // 1. Atualiza Oportunidade (Torna Cliente e salva documentos)
      await supabase.from('opportunities').update({
        is_client: true,
        cpf: clientData.cpf,
        civil_status: clientData.civil_status,
        profession: clientData.profession,
        address: clientData.address
      }).eq('id', opportunity.id);

      // 2. Gera as Parcelas e cria no Financeiro (Transações)
      const count = selectedInstallments;
      const amount = Number(linkData.value);
      const baseAmount = Math.floor((amount / count) * 100) / 100;
      const remainder = amount - (baseAmount * count);
      
      const installments = [];
      for (let i = 0; i < count; i++) {
        const d = new Date();
        d.setMonth(d.getMonth() + i);
        installments.push({
          id: `inst_${i + 1}_${Date.now()}`,
          number: i + 1,
          dueDate: d.toISOString(),
          amount: i === count - 1 ? Number((baseAmount + remainder).toFixed(2)) : baseAmount,
          status: 'Pendente',
          paidDate: null
        });
      }

      const { data: newTx, error: txError } = await supabase.from('transactions').insert({
        user_id: linkData.user_id,
        client_id: opportunity.id,
        date: new Date().toISOString().split('T')[0],
        description: `Fechamento: ${opportunity.name}`,
        amount: amount,
        status: 'Pendente',
        is_installment: count > 1,
        installment_count: count,
        installments: count > 1 ? installments : null
      }).select('id').single();

      if (txError) throw txError;

      // 3. Monta e Cria o Contrato
      let contractText = template?.description || 'Contrato Padrão';
      
      // Substituição de Variáveis
      contractText = contractText.replace(/\{\{nome\}\}/gi, opportunity.name);
      contractText = contractText.replace(/\{\{cpf\}\}/gi, clientData.cpf);
      contractText = contractText.replace(/\{\{endereco\}\}/gi, clientData.address);
      contractText = contractText.replace(/\{\{estado_civil\}\}/gi, clientData.civil_status);
      contractText = contractText.replace(/\{\{profissao\}\}/gi, clientData.profession);
      contractText = contractText.replace(/\{\{valor\}\}/gi, formatCurrency(amount));
      contractText = contractText.replace(/\{\{parcelas\}\}/gi, String(count));
      if (linkData.event_date) {
        contractText = contractText.replace(/\{\{data_evento\}\}/gi, formatDate(linkData.event_date));
      }

      await supabase.from('contracts').insert({
        user_id: linkData.user_id,
        client_id: opportunity.id,
        value: amount,
        start_date: new Date().toISOString().split('T')[0],
        description: contractText,
        client_signature: signatureImage,
        supplier_signature: template?.supplier_signature || null,
        signature_status: 'Assinado 2/2',
        status: 'Ativo',
        share_token: crypto.randomUUID() // token próprio para o contrato
      });

      // 4. Adiciona na Agenda (Tarefas)
      if (linkData.event_date) {
        await supabase.from('tasks').insert({
          user_id: linkData.user_id,
          title: `🎉 EVENTO: ${opportunity.name}`,
          description: `Evento fechado automaticamente via link.\n\nLocal/Endereço: ${clientData.address || opportunity.address || 'Não informado'}\nTelefone: ${opportunity.phone}`,
          status: 'Pendente',
          priority: 'Alta',
          due_date: linkData.event_date
        });
      }

      // 5. Invalida o Link de Fechamento
      await supabase.from('closing_links').update({ status: 'completed' }).eq('id', linkData.id);

      // 6. Gerar Pix e Enviar WhatsApp via Edge Function
      if (newTx?.id) {
        const firstInstallmentId = count > 1 ? installments[0].id : null;
        const firstAmount = count > 1 ? installments[0].amount : amount;

        // Fire and forget edge function
        fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/public-closing-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            link_token: token,
            transaction_id: newTx.id,
            installment_id: firstInstallmentId,
            amount: firstAmount,
            payer_name: opportunity.name,
            payer_cpf: clientData.cpf,
            due_date: new Date().toISOString(),
            client_phone: opportunity.phone
          })
        }).catch(console.error);
      }

      setStep(4); // Sucesso!
    } catch (error) {
      console.error(error);
      toast.error("Erro ao finalizar processo. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-50"><Loader2 className="w-8 h-8 animate-spin text-orange-500" /></div>;
  if (!linkData) return <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4"><ShieldCheck className="w-16 h-16 text-gray-300 mb-4" /><h2 className="text-2xl font-bold">Link Inválido</h2><p className="text-gray-500">Este link não existe ou foi removido.</p></div>;
  
  if (linkData.status === 'completed' && step !== 4) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-center p-4">
        <CheckCircle2 className="w-20 h-20 text-green-500 mb-4" />
        <h2 className="text-2xl font-black text-gray-900 mb-2">Tudo Certo!</h2>
        <p className="text-gray-500 max-w-sm">Os detalhes deste contrato já foram preenchidos e finalizados com sucesso.</p>
      </div>
    );
  }

  // Opções de parcelamento permitidas
  const installmentOptions = Array.from({ length: linkData.max_installments }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans text-gray-900 flex justify-center">
      <div className="max-w-2xl w-full space-y-6">
        
        {/* Header Resumo */}
        {step < 4 && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-top-4">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Olá, {opportunity?.name.split(' ')[0]}!</h1>
            <p className="text-gray-500 font-medium mb-6">Falta pouco para garantirmos a data do seu evento.</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4">
                <DollarSign className="w-6 h-6 text-orange-500 mx-auto mb-2" />
                <p className="text-[10px] uppercase font-bold text-orange-600/70 tracking-wider">Valor Acordado</p>
                <p className="font-black text-gray-900 text-lg mt-1">{formatCurrency(linkData.value)}</p>
              </div>
              <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                <Calendar className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-[10px] uppercase font-bold text-blue-600/70 tracking-wider">Data do Evento</p>
                <p className="font-black text-gray-900 text-lg mt-1">
                  {linkData.event_date ? formatDate(linkData.event_date) : 'A definir'}
                </p>
              </div>
            </div>

            {/* Stepper Visual */}
            <div className="flex items-center justify-center gap-2 mt-8">
              <div className={`h-2 flex-1 rounded-full ${step >= 1 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
              <div className={`h-2 flex-1 rounded-full ${step >= 2 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
              <div className={`h-2 flex-1 rounded-full ${step >= 3 ? 'bg-orange-500' : 'bg-gray-200'}`}></div>
            </div>
            <div className="flex justify-between text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-wider px-2">
              <span className={step >= 1 ? 'text-orange-500' : ''}>Dados</span>
              <span className={step >= 2 ? 'text-orange-500' : ''}>Pagamento</span>
              <span className={step >= 3 ? 'text-orange-500' : ''}>Assinatura</span>
            </div>
          </div>
        )}

        {/* STEP 1: Dados Pessoais */}
        {step === 1 && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                <User className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Seus Dados</h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">CPF / CNPJ *</label>
                <input 
                  type="text" required
                  value={clientData.cpf} onChange={e => setClientData({...clientData, cpf: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Estado Civil *</label>
                  <select 
                    value={clientData.civil_status} onChange={e => setClientData({...clientData, civil_status: e.target.value})}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                  >
                    <option value="Solteiro(a)">Solteiro(a)</option>
                    <option value="Casado(a)">Casado(a)</option>
                    <option value="Divorciado(a)">Divorciado(a)</option>
                    <option value="Viúvo(a)">Viúvo(a)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1.5">Profissão *</label>
                  <input 
                    type="text" required
                    value={clientData.profession} onChange={e => setClientData({...clientData, profession: e.target.value})}
                    className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Endereço Completo (com CEP) *</label>
                <textarea 
                  required rows={3}
                  value={clientData.address} onChange={e => setClientData({...clientData, address: e.target.value})}
                  className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium resize-none"
                />
              </div>
            </div>

            <button 
              onClick={handleNextStep}
              className="w-full mt-8 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95"
            >
              Avançar para Pagamento <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* STEP 2: Pagamento */}
        {step === 2 && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Forma de Pagamento</h2>
            </div>

            <div className="space-y-4">
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Como prefere realizar o pagamento?</label>
              <div className="grid gap-3">
                {installmentOptions.map(num => {
                  const instValue = linkData.value / num;
                  return (
                    <label 
                      key={num} 
                      className={`flex items-center justify-between p-4 rounded-2xl border-2 cursor-pointer transition-all ${selectedInstallments === num ? 'border-orange-500 bg-orange-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-300'}`}
                    >
                      <div className="flex items-center gap-3">
                        <input 
                          type="radio" 
                          name="installment" 
                          checked={selectedInstallments === num}
                          onChange={() => setSelectedInstallments(num)}
                          className="w-5 h-5 accent-orange-500"
                        />
                        <div>
                          <span className="font-bold text-gray-900 block">{num === 1 ? 'À vista' : `Parcelado em ${num}x`}</span>
                          {num > 1 && <span className="text-xs text-gray-500 font-medium">Sem juros</span>}
                        </div>
                      </div>
                      <span className="font-black text-gray-900 text-lg">{formatCurrency(instValue)}</span>
                    </label>
                  )
                })}
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all"
              >
                Voltar
              </button>
              <button 
                onClick={handleNextStep}
                className="w-2/3 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                Ir para Assinatura <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Assinatura */}
        {step === 3 && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                <PenTool className="w-5 h-5" />
              </div>
              <h2 className="text-xl font-bold">Assinatura Digital</h2>
            </div>
            
            <div className="bg-gray-50 rounded-2xl p-4 sm:p-6 mb-8 border border-gray-200">
              <h3 className="font-bold text-sm text-gray-400 uppercase tracking-widest mb-4">Resumo do Contrato</h3>
              
              <div className="space-y-3 mb-6 bg-white p-4 rounded-xl border border-gray-100">
                <p className="text-sm"><strong className="text-gray-900">Nome:</strong> <span className="text-gray-600">{opportunity.name}</span></p>
                <p className="text-sm"><strong className="text-gray-900">CPF:</strong> <span className="text-gray-600">{clientData.cpf}</span></p>
                <p className="text-sm"><strong className="text-gray-900">Total:</strong> <span className="text-gray-600">{formatCurrency(linkData.value)} em {selectedInstallments}x</span></p>
                {linkData.event_date && <p className="text-sm"><strong className="text-gray-900">Data:</strong> <span className="text-gray-600">{formatDate(linkData.event_date)}</span></p>}
              </div>

              <div className="text-xs text-gray-500 leading-relaxed text-justify max-h-[150px] overflow-y-auto custom-scrollbar pr-2 mb-2">
                O Contrato completo com as cláusulas será gerado com os dados acima e assinado digitalmente nesta etapa. Você receberá uma cópia do documento no momento em que clicar em finalizar.
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">Desenhe sua assinatura abaixo:</label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-gray-50 flex items-center justify-center overflow-hidden h-40">
                <SignaturePad ref={sigCanvas} canvasProps={{ className: "w-full h-full" }} />
              </div>
              <button onClick={() => sigCanvas.current?.clear()} className="mt-2 text-xs font-bold text-gray-500 hover:text-gray-800">
                Limpar assinatura
              </button>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setStep(2)}
                disabled={submitting}
                className="w-1/3 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all disabled:opacity-50"
              >
                Voltar
              </button>
              <button 
                onClick={handleFinish}
                disabled={submitting}
                className="w-2/3 bg-green-500 text-white font-bold py-4 rounded-xl hover:bg-green-600 transition-all flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-green-500/20 disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                {submitting ? 'Finalizando...' : 'ASSINAR E FECHAR NEGÓCIO'}
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Sucesso */}
        {step === 4 && (
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-sm border border-gray-100 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-100 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 border-8 border-green-50">
              <PartyPopper className="w-12 h-12" />
            </div>
            <h2 className="text-3xl font-black text-gray-900 mb-4">Negócio Fechado!</h2>
            <p className="text-lg text-gray-500 mb-8 max-w-md mx-auto">
              Seu contrato foi assinado e salvo com sucesso. Fique de olho no seu WhatsApp, entraremos em contato com as instruções para o pagamento e próximos passos.
            </p>
            <div className="bg-gray-50 rounded-2xl p-4 inline-block font-bold text-gray-600">
              Você já pode fechar esta página.
            </div>
          </div>
        )}

      </div>
    </div>
  );
}