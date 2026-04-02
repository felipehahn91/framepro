import React, { useState, useEffect, useRef } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ShieldCheck, CheckCircle2, ArrowRight, User, CreditCard, PenTool, Calendar, DollarSign, PartyPopper, AlertCircle } from "lucide-react";
import SignaturePad from "react-signature-canvas";

const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

const formatDate = (dateStr: string) => {
  if (!dateStr) return '';
  if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
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
    cep: '',
    street: '',
    number: '',
    complement: '',
    neighborhood: '',
    city: '',
    state: ''
  });
  
  const [fetchingCep, setFetchingCep] = useState(false);

  // Condições Comerciais (Custom Installments)
  const [isCustomPlan, setIsCustomPlan] = useState(false);
  const [clientCanEdit, setClientCanEdit] = useState(false);
  const [customInstallments, setCustomInstallments] = useState<any[]>([]);
  
  // Legacy Fallback
  const [selectedInstallments, setSelectedInstallments] = useState(1);
  const [contractPreview, setContractPreview] = useState<string>("");

  useEffect(() => {
    if (token) fetchLinkData();
  }, [token]);

  const fetchLinkData = async () => {
    try {
      const { data, error } = await supabase.rpc('get_closing_link_data', {
        p_token: token
      });

      if (error || !data || !data.link) throw error || new Error("Link not found");
      
      setLinkData(data.link);
      setOpportunity(data.opportunity);
      setTemplate(data.template);

      if (data.link.installments && data.link.installments.length > 0) {
        setIsCustomPlan(true);
        setCustomInstallments(data.link.installments);
        setClientCanEdit(data.link.client_can_edit_installments || false);
        setSelectedInstallments(data.link.installments.length);
      }

    } catch (error) {
      console.error(error);
      toast.error("Link de fechamento inválido ou indisponível.");
    } finally {
      setLoading(false);
    }
  };

  const handleCepBlur = async (e: React.FocusEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    if (cep.length !== 8) return;

    setFetchingCep(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast.error("CEP não encontrado.");
        return;
      }

      setClientData(prev => ({
        ...prev,
        street: data.logradouro || '',
        neighborhood: data.bairro || '',
        city: data.localidade || '',
        state: data.uf || ''
      }));
    } catch (error) {
      toast.error("Erro ao buscar o CEP.");
    } finally {
      setFetchingCep(false);
    }
  };

  const customInstSum = customInstallments.reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
  const isSumValid = Math.abs(Number(linkData?.value || 0) - customInstSum) < 0.05;

  const handleNextStep = () => {
    if (step === 1) {
      if (!clientData.cpf || !clientData.profession || !clientData.cep || !clientData.street || !clientData.number || !clientData.neighborhood || !clientData.city || !clientData.state) {
        return toast.error("Preencha todos os campos obrigatórios para continuar.");
      }
    }
    if (step === 2) {
      if (isCustomPlan && clientCanEdit && !isSumValid) {
        return toast.error("A soma das parcelas deve ser igual ao valor total do contrato.");
      }

      try {
        const fullAddress = `${clientData.street}, ${clientData.number}${clientData.complement ? ` - ${clientData.complement}` : ''}, ${clientData.neighborhood}, ${clientData.city} - ${clientData.state}, CEP: ${clientData.cep}`;
        const amount = Number(linkData?.value || 0);
        const count = isCustomPlan ? customInstallments.length : selectedInstallments;
        
        let contractText = template?.description || 'Contrato Padrão';
        const oppName = opportunity?.name || 'Cliente';
        
        contractText = contractText.replace(/\{\{nome\}\}/gi, oppName);
        contractText = contractText.replace(/\{\{cpf\}\}/gi, clientData.cpf);
        contractText = contractText.replace(/\{\{endereco\}\}/gi, fullAddress);
        contractText = contractText.replace(/\{\{estado_civil\}\}/gi, clientData.civil_status);
        contractText = contractText.replace(/\{\{profissao\}\}/gi, clientData.profession);
        contractText = contractText.replace(/\{\{valor\}\}/gi, formatCurrency(amount));
        contractText = contractText.replace(/\{\{parcelas\}\}/gi, String(count));
        if (linkData?.event_date) {
          contractText = contractText.replace(/\{\{data_evento\}\}/gi, formatDate(linkData.event_date));
        }
        
        setContractPreview(contractText);
      } catch (err) {
        console.error("Error generating preview", err);
        setContractPreview('Contrato Padrão');
      }
    }
    
    setStep(prev => prev + 1);
    window.scrollTo(0, 0);
  };

  const handleFinish = async () => {
    if (!clientData.cpf || !clientData.profession || !clientData.cep || !clientData.street || !clientData.number || !clientData.neighborhood || !clientData.city || !clientData.state) {
      return toast.error("Preencha todos os campos obrigatórios na Etapa 1.");
    }

    if (sigCanvas.current?.isEmpty()) {
      return toast.error("Por favor, assine o contrato para finalizar.");
    }

    setSubmitting(true);
    try {
      const signatureImage = sigCanvas.current!.getCanvas().toDataURL('image/png');

      const amount = Number(linkData.value);
      const count = isCustomPlan ? customInstallments.length : selectedInstallments;
      
      let finalInstallments = [];
      
      // Verifica se o cliente alterou alguma coisa usando comparação direta dos valores e datas
      let hasEditedInstallments = false;

      if (isCustomPlan) {
        finalInstallments = customInstallments.map((inst, i) => ({
          ...inst,
          id: `inst_${i + 1}_${Date.now()}`,
          number: i + 1,
          status: 'Pendente',
          paidDate: null
        }));
        
        // Compara com os originais de forma segura
        if (clientCanEdit && linkData.installments) {
          const orig = linkData.installments.map((i: any) => ({ d: i.dueDate, a: Number(i.amount).toFixed(2) }));
          const curr = customInstallments.map((i: any) => ({ d: i.dueDate, a: Number(i.amount).toFixed(2) }));
          if (JSON.stringify(orig) !== JSON.stringify(curr)) {
            hasEditedInstallments = true;
          }
        }
      } else {
        const baseAmount = Math.floor((amount / count) * 100) / 100;
        const remainder = amount - (baseAmount * count);
        
        for (let i = 0; i < count; i++) {
          const d = new Date();
          d.setMonth(d.getMonth() + i);
          finalInstallments.push({
            id: `inst_${i + 1}_${Date.now()}`,
            number: i + 1,
            dueDate: d.toISOString(),
            amount: i === count - 1 ? Number((baseAmount + remainder).toFixed(2)) : baseAmount,
            status: 'Pendente',
            paidDate: null
          });
        }
      }

      const { data: result, error: rpcError } = await supabase.rpc('finalize_closing_link', {
        p_token: token,
        p_client_data: clientData,
        p_amount: amount,
        p_installment_count: count,
        p_installments: count > 1 ? finalInstallments : null,
        p_contract_preview: contractPreview,
        p_signature_image: signatureImage
      });

      if (rpcError) throw rpcError;

      const { transaction_id, contract_id, opportunity_name, opportunity_phone } = result as any;

      if (transaction_id) {
        const firstInstallmentId = count > 1 ? finalInstallments[0].id : null;
        const firstAmount = count > 1 ? finalInstallments[0].amount : amount;

        fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/public-closing-success', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            link_token: token,
            transaction_id: transaction_id,
            contract_id: contract_id,
            installment_id: firstInstallmentId,
            amount: firstAmount,
            payer_name: opportunity_name,
            payer_cpf: clientData.cpf,
            due_date: finalInstallments.length > 0 ? finalInstallments[0].dueDate : new Date().toISOString(),
            client_phone: opportunity_phone,
            client_edited_installments: hasEditedInstallments
          })
        }).catch(console.error);
      }

      setStep(4); 
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

  const installmentOptions = Array.from({ length: linkData.max_installments }, (_, i) => i + 1);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 font-sans text-gray-900 flex justify-center">
      
      {/* Estilo Global para forçar a quebra correta no texto do Quill */}
      <style dangerouslySetInnerHTML={{__html: `
        .contract-document {
          word-wrap: break-word;
          overflow-wrap: break-word;
        }
        .contract-document * {
          max-width: 100% !important;
          box-sizing: border-box !important;
        }
        .contract-document p, .contract-document span, .contract-document div {
          white-space: normal !important;
          word-break: normal !important;
          overflow-wrap: break-word !important;
        }
      `}} />

      <div className="max-w-2xl w-full space-y-6">
        
        {/* Header Resumo */}
        {step < 4 && (
          <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-top-4">
            <h1 className="text-2xl font-black text-gray-900 mb-1">Olá{opportunity?.name ? `, ${opportunity.name.split(' ')[0]}` : ''}!</h1>
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
                  type="text" required maxLength={18}
                  value={clientData.cpf} 
                  onChange={e => {
                    let v = e.target.value.replace(/\D/g, '');
                    if (v.length <= 11) {
                      v = v.replace(/(\d{3})(\d)/, '$1.$2');
                      v = v.replace(/(\d{3})(\d)/, '$1.$2');
                      v = v.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
                    } else {
                      v = v.replace(/^(\d{2})(\d)/, '$1.$2');
                      v = v.replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3');
                      v = v.replace(/\.(\d{3})(\d)/, '.$1/$2');
                      v = v.replace(/(\d{4})(\d)/, '$1-$2');
                    }
                    setClientData({...clientData, cpf: v});
                  }}
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
              <div className="pt-4 border-t border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Endereço</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="md:col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">CEP *</label>
                    <div className="relative">
                      <input 
                        type="text" required maxLength={9}
                        value={clientData.cep} 
                        onChange={e => setClientData({...clientData, cep: e.target.value.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2')})}
                        onBlur={handleCepBlur}
                        className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                      />
                      {fetchingCep && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Logradouro / Rua *</label>
                    <input 
                      type="text" required
                      value={clientData.street} onChange={e => setClientData({...clientData, street: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Número *</label>
                    <input 
                      type="text" required
                      value={clientData.number} onChange={e => setClientData({...clientData, number: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                    />
                  </div>
                  <div className="col-span-1 md:col-span-3">
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Complemento</label>
                    <input 
                      type="text"
                      value={clientData.complement} onChange={e => setClientData({...clientData, complement: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Bairro *</label>
                    <input 
                      type="text" required
                      value={clientData.neighborhood} onChange={e => setClientData({...clientData, neighborhood: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Cidade *</label>
                    <input 
                      type="text" required
                      value={clientData.city} onChange={e => setClientData({...clientData, city: e.target.value})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-1.5">Estado (UF) *</label>
                    <input 
                      type="text" required maxLength={2}
                      value={clientData.state} onChange={e => setClientData({...clientData, state: e.target.value.toUpperCase()})}
                      className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none transition-all font-medium uppercase"
                    />
                  </div>
                </div>
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
              <h2 className="text-xl font-bold">Plano de Pagamento</h2>
            </div>

            {isCustomPlan ? (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                    <p className="text-sm font-bold text-gray-700">Valores e Datas das Parcelas</p>
                    {clientCanEdit && <span className="text-[11px] bg-orange-100 text-orange-700 px-2 py-1 rounded-md font-bold uppercase tracking-wider">Você pode editar os dados</span>}
                </div>
                
                {clientCanEdit && (
                  <p className="text-xs text-gray-500 mb-4 bg-gray-50 p-3 rounded-lg border border-gray-100">
                    Ajuste os valores ou as datas como ficar melhor para você. <strong className="text-gray-700">Lembre-se que a soma total das parcelas precisa ser exatamente {formatCurrency(linkData.value)}.</strong>
                  </p>
                )}

                <div className="space-y-3">
                    {customInstallments.map((inst, idx) => (
                        <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <div className="w-8 h-8 rounded-full bg-white border border-gray-200 flex items-center justify-center font-bold text-gray-500 shrink-0">
                              {idx + 1}
                            </div>
                            
                            {clientCanEdit ? (
                                <div className="flex gap-3 w-full">
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Vencimento</label>
                                        <input 
                                            type="date" 
                                            value={inst.dueDate} 
                                            onChange={(e) => {
                                                const newInsts = [...customInstallments];
                                                newInsts[idx].dueDate = e.target.value;
                                                setCustomInstallments(newInsts);
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-medium focus:ring-2 focus:ring-orange-400 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1">
                                        <label className="text-[10px] uppercase font-bold text-gray-400 mb-1 block">Valor (R$)</label>
                                        <input 
                                            type="number" 
                                            step="0.01"
                                            value={inst.amount} 
                                            onChange={(e) => {
                                                const newInsts = [...customInstallments];
                                                newInsts[idx].amount = e.target.value;
                                                setCustomInstallments(newInsts);
                                            }}
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2.5 text-sm font-bold focus:ring-2 focus:ring-orange-400 outline-none"
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-1 w-full items-center justify-between pl-1">
                                    <span className="text-sm font-medium text-gray-600">Vencimento: <strong>{formatDate(inst.dueDate)}</strong></span>
                                    <span className="text-lg font-black text-gray-900">{formatCurrency(Number(inst.amount))}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>

                {clientCanEdit && (
                    <div className={`mt-6 p-4 rounded-xl border flex justify-between items-center text-sm font-bold transition-colors ${isSumValid ? 'bg-green-50 border-green-200 text-green-700' : 'bg-red-50 border-red-200 text-red-600'}`}>
                        <span>Soma das Parcelas: {formatCurrency(customInstSum)}</span>
                        {!isSumValid ? (
                          <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-red-100 shadow-sm">
                            <AlertCircle className="w-4 h-4" /> Diferença: {formatCurrency(Math.abs(Number(linkData.value) - customInstSum))}
                          </span>
                        ) : (
                          <span className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-green-100 shadow-sm text-green-600">
                            <CheckCircle2 className="w-4 h-4" /> Valores batem com o total
                          </span>
                        )}
                    </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Como prefere realizar o pagamento?</label>
                <div className="grid gap-3">
                  {Array.from({ length: linkData.max_installments }, (_, i) => i + 1).map(num => {
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
            )}

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
              <button 
                onClick={() => setStep(1)}
                className="w-1/3 bg-gray-100 text-gray-700 font-bold py-4 rounded-xl hover:bg-gray-200 transition-all"
              >
                Voltar
              </button>
              <button 
                onClick={handleNextStep}
                disabled={isCustomPlan && clientCanEdit && !isSumValid}
                className="w-2/3 bg-gray-900 text-white font-bold py-4 rounded-xl hover:bg-black transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50"
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
              
              <div className="space-y-3 mb-6 bg-white p-5 rounded-xl border border-gray-100 shadow-sm">
                <p className="text-sm flex justify-between border-b border-gray-50 pb-2"><strong className="text-gray-900">Nome:</strong> <span className="text-gray-600">{opportunity?.name || 'Cliente'}</span></p>
                <p className="text-sm flex justify-between border-b border-gray-50 pb-2"><strong className="text-gray-900">CPF:</strong> <span className="text-gray-600">{clientData.cpf}</span></p>
                <p className="text-sm flex justify-between border-b border-gray-50 pb-2"><strong className="text-gray-900">Total:</strong> <span className="text-gray-600">{formatCurrency(linkData?.value || 0)} em {isCustomPlan ? customInstallments.length : selectedInstallments}x</span></p>
                {linkData?.event_date && <p className="text-sm flex justify-between"><strong className="text-gray-900">Data do Evento:</strong> <span className="text-gray-600">{formatDate(linkData.event_date)}</span></p>}
              </div>

              <div className="mt-4">
                <h4 className="font-bold text-gray-900 mb-3 text-sm">Termos do Contrato</h4>
                <div className="bg-white rounded-xl border border-gray-200 shadow-inner relative w-full overflow-hidden">
                  <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-white to-transparent pointer-events-none z-10"></div>
                  <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-white to-transparent pointer-events-none z-10"></div>
                  <div className="text-sm text-gray-700 leading-relaxed text-justify max-h-[500px] overflow-y-auto overflow-x-hidden custom-scrollbar p-4 sm:p-6 pt-5 pb-10 prose max-w-none prose-sm prose-p:my-2 prose-headings:my-4 w-full contract-document">
                    <div className="w-full" dangerouslySetInnerHTML={{ __html: contractPreview }} />
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2 text-center">Role para baixo para ler o contrato completo</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-900 mb-3 text-center">Ao assinar abaixo você concorda com os termos acima:</label>
              <div className="border-2 border-dashed border-gray-300 rounded-2xl bg-white flex flex-col items-center justify-center overflow-hidden h-48 relative mx-auto max-w-md shadow-sm">
                <SignaturePad ref={sigCanvas} canvasProps={{ className: "w-full h-full absolute inset-0 cursor-crosshair" }} />
                <div className="pointer-events-none opacity-20 w-full px-8 absolute bottom-8 flex flex-col items-center">
                  <div className="w-full border-b-2 border-gray-400"></div>
                  <span className="text-xs uppercase font-bold mt-1 tracking-widest">{opportunity?.name || 'Cliente'}</span>
                </div>
              </div>
              <div className="flex justify-center mt-3">
                <button onClick={() => sigCanvas.current?.clear()} className="text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full transition-colors">
                  Limpar assinatura
                </button>
              </div>
            </div>

            <div className="flex gap-3 mt-8 pt-6 border-t border-gray-100">
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