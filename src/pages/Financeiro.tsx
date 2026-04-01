import React, { useState, useEffect, useMemo } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { sendTextMessage, sendMediaMessage } from "@/lib/evolution";
import { 
  Wallet, TrendingDown, TrendingUp, Plus, Filter, 
  Edit2, Trash2, CheckCircle2, Loader2, X, DollarSign,
  AlertCircle, Calendar as CalendarIcon, ChevronDown, ChevronUp, Link as LinkIcon, Copy, MessageCircle
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, Legend 
} from "recharts";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

interface Client {
  id: string;
  name: string;
}

interface Installment {
  id: string;
  number: number;
  dueDate: string;
  amount: number;
  status: string;
  paidDate: string | null;
  pix_url?: string;
  pix_code?: string;
}

interface Transaction {
  id: string;
  user_id: string;
  client_id: string | null;
  date: string;
  description: string;
  amount: number;
  status: string;
  is_installment: boolean;
  installment_count: number;
  installments: Installment[] | null | any; 
  clients?: { name: string };
  pix_url?: string;
  pix_code?: string;
}

const getInstallments = (t: Transaction): Installment[] => {
  if (!t.is_installment || !t.installments) return [];
  if (typeof t.installments === 'string') {
    try { return JSON.parse(t.installments); } catch (e) { return []; }
  }
  return t.installments as Installment[];
};

export default function Financeiro() {
  const { user, session } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("faturamento");
  const [listStatusTab, setListStatusTab] = useState("pendentes");
  
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  
  const [expandedTxIds, setExpandedTxIds] = useState<Set<string>>(new Set());
  const [period, setPeriod] = useState("this_month");
  const [customDateRange, setCustomDateRange] = useState({ start: "", end: "" });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);

  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: "",
    amount: "",
    status: "Pendente",
    client_id: "none",
    installment_count: "1"
  });

  // PagHiper States
  const [paghiperModalOpen, setPaghiperModalOpen] = useState(false);
  const [paghiperLoading, setPaghiperLoading] = useState(false);
  const [paghiperData, setPaghiperData] = useState<any>(null);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txRes, clientsRes] = await Promise.all([
        supabase.from('transactions').select('*, clients:client_id(name)').eq('user_id', user?.id).order('date', { ascending: false }),
        supabase.from('opportunities').select('id, name').eq('user_id', user?.id).eq('is_client', true)
      ]);

      if (txRes.error && txRes.error.code !== '42P01') throw txRes.error;
      
      setTransactions(txRes.data || []);
      setClients(clientsRes.data || []);
    } catch (error) {
      toast.error("Erro ao carregar dados financeiros.");
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedTxIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const dateRange = useMemo(() => {
    const now = new Date();
    let start = new Date(0);
    let end = new Date("2100-01-01");

    switch (period) {
      case 'this_month':
        start = new Date(now.getFullYear(), now.getMonth(), 1);
        end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'next_month':
        start = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        end = new Date(now.getFullYear(), now.getMonth() + 2, 0, 23, 59, 59, 999);
        break;
      case '30d':
        start = new Date(now);
        start.setDate(now.getDate() - 30);
        end = new Date(now);
        end.setHours(23, 59, 59, 999);
        break;
      case '1y':
        start = new Date(now.getFullYear(), 0, 1);
        end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom': 
        start = customDateRange.start ? new Date(customDateRange.start) : new Date(0);
        if (customDateRange.end) {
          end = new Date(customDateRange.end);
          end.setHours(23, 59, 59, 999);
        }
        break;
      case 'all':
      default:
        start = new Date(0);
        end = new Date("2100-01-01");
        break;
    }
    return { start, end };
  }, [period, customDateRange]);

  const metrics = useMemo(() => {
    let atual = 0;
    let passado = 0;
    let previsto = 0;

    transactions.forEach(t => {
      const tDate = new Date(t.date);
      const isPaid = t.status === 'Recebido' || t.status === 'Pago';
      
      const insts = getInstallments(t);
      if (insts.length > 0) {
        insts.forEach(inst => {
          const iDate = new Date(inst.dueDate);
          const iPaid = inst.status === 'Pago';
          
          if (iPaid) {
            if (iDate >= dateRange.start && iDate <= dateRange.end) atual += inst.amount;
            else if (iDate < dateRange.start) passado += inst.amount;
          } else {
            if (iDate >= dateRange.start && iDate <= dateRange.end) previsto += inst.amount;
          }
        });
      } else {
        if (isPaid) {
          if (tDate >= dateRange.start && tDate <= dateRange.end) atual += t.amount;
          else if (tDate < dateRange.start) passado += t.amount;
        } else {
          if (tDate >= dateRange.start && tDate <= dateRange.end) previsto += t.amount;
        }
      }
    });

    return { atual, passado, previsto };
  }, [transactions, dateRange]);

  const monthlyChartData = useMemo(() => {
    const months: Record<string, any> = {};
    const now = new Date();
    for (let i = -2; i <= 3; i++) { 
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const key = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
      months[key] = { name: key, Pago: 0, Pendente: 0, Atrasado: 0 };
    }

    transactions.forEach(t => {
      const insts = getInstallments(t);
      if (insts.length > 0) {
        insts.forEach(inst => {
          const d = new Date(inst.dueDate);
          const key = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
          if (months[key]) {
            if (inst.status === 'Pago') months[key].Pago += inst.amount;
            else if (d < new Date(new Date().setHours(0,0,0,0))) months[key].Atrasado += inst.amount;
            else months[key].Pendente += inst.amount;
          }
        });
      } else {
        const d = new Date(t.date);
        const key = `${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
        if (months[key]) {
          if (t.status === 'Recebido' || t.status === 'Pago') months[key].Pago += t.amount;
          else if (t.status === 'Cancelado') { /* ignore */ }
          else if (d < new Date(new Date().setHours(0,0,0,0))) months[key].Atrasado += t.amount;
          else months[key].Pendente += t.amount;
        }
      }
    });

    return Object.values(months);
  }, [transactions]);

  const annualChartData = useMemo(() => {
    const years: Record<string, any> = {};
    const currentYear = new Date().getFullYear();
    for (let i = -1; i <= 1; i++) {
      const y = currentYear + i;
      years[y.toString()] = { name: y.toString(), Total: 0 };
    }

    transactions.forEach(t => {
      const insts = getInstallments(t);
      if (insts.length > 0) {
        insts.forEach(inst => {
          if (inst.status === 'Pago') {
            const y = new Date(inst.paidDate || inst.dueDate).getFullYear();
            if (years[y.toString()]) years[y.toString()].Total += inst.amount;
          }
        });
      } else {
        const d = new Date(t.date);
        if (t.status === 'Recebido' || t.status === 'Pago') {
          const y = d.getFullYear();
          if (years[y.toString()]) years[y.toString()].Total += t.amount;
        }
      }
    });

    return Object.values(years);
  }, [transactions]);

  const handleOpenModal = (tx?: Transaction) => {
    if (tx) {
      setEditingTx(tx);
      setFormData({
        date: tx.date.split('T')[0],
        description: tx.description,
        amount: tx.amount.toString(),
        status: tx.status,
        client_id: tx.client_id || "none",
        installment_count: tx.installment_count.toString()
      });
    } else {
      setEditingTx(null);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: "",
        amount: "",
        status: "Pendente",
        client_id: "none",
        installment_count: "1"
      });
    }
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.date) return toast.error("Preencha todos os campos obrigatórios");

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) return toast.error("Valor inválido");

    setIsSubmitting(true);
    try {
      const count = parseInt(formData.installment_count, 10);
      const isInstallment = count > 1;
      let installments = null;
      let initialStatus = formData.status === 'Atrasado' ? 'Pendente' : formData.status;

      if (isInstallment && !editingTx) {
        installments = [];
        const baseAmount = Math.floor((amount / count) * 100) / 100;
        const remainder = amount - (baseAmount * count);
        
        for (let i = 0; i < count; i++) {
          const d = new Date(formData.date);
          d.setUTCHours(12); 
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
        initialStatus = 'Pendente';
      }

      const payload = {
        user_id: user?.id,
        date: formData.date,
        description: formData.description,
        amount: amount,
        status: initialStatus,
        client_id: formData.client_id === 'none' ? null : formData.client_id,
        is_installment: editingTx ? editingTx.is_installment : isInstallment,
        installment_count: editingTx ? editingTx.installment_count : count,
        installments: editingTx ? editingTx.installments : installments
      };

      if (editingTx) {
        await supabase.from('transactions').update(payload).eq('id', editingTx.id);
        toast.success("Recebimento atualizado");
      } else {
        await supabase.from('transactions').insert(payload);
        toast.success("Recebimento criado");
      }

      setIsModalOpen(false);
      fetchData();
    } catch (error) {
      toast.error("Erro ao salvar recebimento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkAsPaid = async (txId: string) => {
    try {
      const { data: updatedTx, error } = await supabase
        .from('transactions')
        .update({ 
          status: 'Pago',
          paid_at: new Date().toISOString().split('T')[0]
        })
        .eq('id', txId)
        .select('*, opportunities(name)')
        .single();
        
      if (error) throw error;
      
      if (user && updatedTx) {
        const clientName = updatedTx.opportunities?.name || 'Cliente';
        await supabase.from('notifications').insert({
          user_id: user.id,
          title: 'Pagamento Recebido',
          content: `A cobrança de ${formatCurrency(updatedTx.amount)} do cliente ${clientName} foi marcada como paga.`,
          type: 'success',
          related_entity_type: 'transaction',
          related_entity_id: txId
        });
      }
      
      toast.success("Transação marcada como paga!");
      fetchData();
    } catch (error) {
      toast.error("Erro ao atualizar status.");
    }
  };

  const handleMarkInstallmentPaid = async (tx: Transaction, instId: string) => {
    const insts = getInstallments(tx);
    if (!insts.length) return;
    
    try {
      const updatedInsts = insts.map(i => i.id === instId ? { ...i, status: 'Pago', paidDate: new Date().toISOString() } : i);
      const allPaid = updatedInsts.every(i => i.status === 'Pago');
      const newStatus = allPaid ? 'Recebido' : 'Pendente';

      await supabase.from('transactions').update({ installments: updatedInsts, status: newStatus }).eq('id', tx.id);
      setTransactions(prev => prev.map(t => t.id === tx.id ? { ...t, installments: updatedInsts, status: newStatus } : t));
      toast.success("Parcela recebida!");
    } catch (e) {
      toast.error("Erro ao atualizar parcela.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir?")) return;
    try {
      await supabase.from('transactions').delete().eq('id', id);
      setTransactions(prev => prev.filter(t => t.id !== id));
      toast.success("Excluído com sucesso.");
    } catch (e) {
      toast.error("Erro ao excluir.");
    }
  };

  // --- PAGHIPER HANDLERS ---
  const handleOpenPaghiperModal = async (tx: Transaction, inst?: Installment) => {
    let cpf = "";
    let email = "";
    let name = tx.clients?.name || "Cliente";

    if (tx.client_id) {
      const { data } = await supabase.from('opportunities').select('cpf, email').eq('id', tx.client_id).single();
      if (data) {
        cpf = data.cpf || "";
        email = data.email || "";
      }
    }

    setPaghiperData({
      tx,
      inst,
      amount: inst ? inst.amount : tx.amount,
      dueDate: inst ? inst.dueDate : tx.date,
      description: inst ? `${tx.description} (Parcela ${inst.number}/${tx.installment_count})` : tx.description,
      payer_name: name,
      payer_cpf: cpf,
      payer_email: email
    });
    setPaghiperModalOpen(true);
  };

  const handleGeneratePaghiper = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paghiperData.payer_cpf) return toast.error("O CPF/CNPJ é obrigatório para emissão de Pix.");
    setPaghiperLoading(true);

    try {
      const response = await fetch('https://wsytmrzgvkvbufpqqxwi.supabase.co/functions/v1/paghiper-create-boleto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({
          transaction_id: paghiperData.tx.id,
          installment_id: paghiperData.inst?.id,
          amount: paghiperData.amount,
          description: paghiperData.description,
          payer_name: paghiperData.payer_name,
          payer_email: paghiperData.payer_email,
          payer_cpf: paghiperData.payer_cpf,
          due_date: paghiperData.dueDate
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Erro desconhecido na API.");

      const { pix_url, pix_code } = result;

      // Update Supabase and Local State
      if (paghiperData.inst) {
        const insts = getInstallments(paghiperData.tx);
        const updatedInsts = insts.map(i => i.id === paghiperData.inst.id ? { ...i, pix_url, pix_code } : i);
        await supabase.from('transactions').update({ installments: updatedInsts }).eq('id', paghiperData.tx.id);
        setTransactions(prev => prev.map(t => t.id === paghiperData.tx.id ? { ...t, installments: updatedInsts } : t));
      } else {
        await supabase.from('transactions').update({ pix_url, pix_code }).eq('id', paghiperData.tx.id);
        setTransactions(prev => prev.map(t => t.id === paghiperData.tx.id ? { ...t, pix_url, pix_code } : t));
      }

      toast.success("Pix gerado com sucesso!");
      setPaghiperModalOpen(false);

    } catch (error: any) {
      toast.error(error.message || "Erro ao gerar Pix.");
    } finally {
      setPaghiperLoading(false);
    }
  };

  const handleSendWhatsApp = async (e: React.MouseEvent, tx: Transaction, inst?: Installment) => {
    e.stopPropagation();
    
    try {
      let phone = "";
      let clientName = tx.clients?.name || "Cliente";
      
      if (tx.client_id) {
        const { data } = await supabase.from('opportunities').select('phone').eq('id', tx.client_id).single();
        if (data?.phone) phone = data.phone;
      }

      if (!phone) return toast.error("Este cliente não possui telefone cadastrado.");

      const { data: instanceData } = await supabase
        .from('whatsapp_instances')
        .select('instance_name')
        .eq('user_id', user?.id)
        .eq('status', 'connected')
        .single();
        
      if (!instanceData) return toast.error("WhatsApp não está conectado. Vá em Configurações para conectar.");

      const amount = inst ? inst.amount : tx.amount;
      const pixCode = inst ? inst.pix_code : tx.pix_code;
      const pixUrl = inst ? inst.pix_url : tx.pix_url;
      const description = inst ? `${tx.description} (Parcela ${inst.number})` : tx.description;

      const message1 = `Olá ${clientName.split(' ')[0]}!\n\nAqui está a cobrança referente a:\n*${description}*\nValor: *${formatCurrency(amount)}*\n\nAbaixo estão os dados para pagamento via Pix:`;

      // 1. Enviar mensagem de texto introdutória
      await sendTextMessage(instanceData.instance_name, phone, message1);

      // 2. Se tiver QR Code, envia a imagem
      if (pixUrl) {
        await new Promise(r => setTimeout(r, 1000));
        await sendMediaMessage(
          instanceData.instance_name, 
          phone, 
          pixUrl, 
          'image', 
          'image/png', 
          'QR Code Pix'
        );
      }

      // 3. Enviar apenas o código Copia e Cola para facilitar a cópia
      if (pixCode) {
        await new Promise(r => setTimeout(r, 1500));
        await sendTextMessage(instanceData.instance_name, phone, pixCode);
      }
      
      // Notify internal system
      await supabase.from('notifications').insert({
        user_id: user?.id,
        title: 'Cobrança Manual Enviada',
        content: `A cobrança de ${formatCurrency(amount)} foi enviada para ${clientName} via WhatsApp.`,
        type: 'info',
        related_entity_type: 'transaction',
        related_entity_id: tx.id
      });

      toast.success("Cobrança enviada por WhatsApp!");
    } catch(e) {
      toast.error("Erro ao enviar mensagem via WhatsApp.");
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  
  const getStatusBadge = (status: string, dateStr?: string) => {
    if (status === 'Recebido' || status === 'Pago') {
      return <span className="bg-green-50 text-green-600 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-green-100">Pago</span>;
    }
    if (status === 'Cancelado') {
      return <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-gray-200">Cancelado</span>;
    }
    
    const isOverdue = dateStr && new Date(dateStr) < new Date(new Date().setHours(0,0,0,0));
    if (status === 'Atrasado' || isOverdue) {
      return <span className="bg-red-50 text-red-600 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-red-100">Atrasado</span>;
    }
    
    return <span className="bg-orange-50 text-orange-500 px-2.5 py-1 rounded-md text-[11px] font-semibold border border-orange-100">Pendente</span>;
  };

  const listToRender = useMemo(() => {
    if (listStatusTab === 'pendentes') {
      return transactions.filter(t => t.status !== 'Recebido' && t.status !== 'Pago');
    }
    return transactions.filter(t => t.status === 'Recebido' || t.status === 'Pago');
  }, [transactions, listStatusTab]);

  if (loading) {
    return <Layout><div className="flex items-center justify-center h-full"><Loader2 className="w-8 h-8 animate-spin text-orange-400" /></div></Layout>;
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto space-y-8 pb-32">
        
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1">Financeiro</h1>
          <p className="text-sm text-gray-500">Acompanhe suas receitas, parcelas e faturamento</p>
        </div>

        <div className="flex bg-gray-100/80 p-1 rounded-xl w-full max-w-full sm:max-w-[350px]">
          <button
            onClick={() => setActiveTab('faturamento')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'faturamento' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Faturamento Anual
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'relatorios' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Relatórios
          </button>
        </div>

        {activeTab === 'faturamento' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 bg-white border border-gray-200 rounded-2xl shadow-sm">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 hidden sm:flex">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600 font-medium">Filtrar período:</span>
                </div>
                <select
                  value={period} onChange={(e) => setPeriod(e.target.value)}
                  className="w-full sm:w-auto bg-white border border-gray-200 rounded-xl sm:rounded-lg text-sm py-3 sm:py-1.5 px-3 focus:outline-none focus:ring-2 focus:ring-orange-400"
                >
                  <option value="this_month">Este Mês</option>
                  <option value="next_month">Próximo Mês</option>
                  <option value="30d">Últimos 30 dias</option>
                  <option value="1y">Este Ano</option>
                  <option value="all">Todos os Registros</option>
                </select>
              </div>
              <button
                onClick={() => handleOpenModal()}
                className="w-full sm:w-auto px-5 py-3 sm:py-2.5 bg-orange-400 text-white font-bold rounded-xl sm:rounded-lg hover:bg-orange-500 transition-colors flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" /> Novo Recebimento
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Faturamento Atual</span>
                  <Wallet className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.atual)}</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Recebido no período selecionado</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Faturamento Passado</span>
                  <TrendingDown className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.passado)}</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Recebido antes do período</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm font-medium text-gray-500">Faturamento Previsto</span>
                  <TrendingUp className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <h3 className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.previsto)}</h3>
                  <p className="text-[11px] text-gray-400 mt-1">Pendente/Atrasado no período</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-1">Previsão Mensal</h3>
                <p className="text-xs text-gray-500 mb-6">Distribuição e estimativa para os próximos meses</p>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={monthlyChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#f8fafc' }} />
                      <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '20px' }} iconType="square" />
                      <Bar dataKey="Pago" stackId="a" fill="#22c55e" radius={[0, 0, 4, 4]} barSize={32} />
                      <Bar dataKey="Pendente" stackId="a" fill="#f59e0b" barSize={32} />
                      <Bar dataKey="Atrasado" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                <h3 className="font-bold text-gray-900 mb-1">Receita Anual</h3>
                <p className="text-xs text-gray-500 mb-6">Total recebido histórico</p>
                <div className="h-[250px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={annualChartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(val) => `R$ ${val/1000}k`} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} cursor={{ fill: '#f8fafc' }} />
                      <Bar dataKey="Total" fill="#fb923c" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                <h3 className="text-xl font-bold text-gray-900">Movimentações Financeiras</h3>
                <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
                  <button
                    onClick={() => setListStatusTab('pendentes')}
                    className={`flex-1 sm:flex-none px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${listStatusTab === 'pendentes' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Pendentes
                  </button>
                  <button
                    onClick={() => setListStatusTab('pagos')}
                    className={`flex-1 sm:flex-none px-6 py-1.5 text-xs font-bold rounded-lg transition-all ${listStatusTab === 'pagos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                  >
                    Pagos
                  </button>
                </div>
              </div>
              
              {listToRender.length > 0 ? (
                <div className="space-y-3">
                  {listToRender.map((tx) => {
                    const insts = getInstallments(tx);
                    const isExpanded = expandedTxIds.has(tx.id);

                    return (
                    <div key={tx.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                      {insts.length > 0 ? (
                        <div className="space-y-1">
                          <div 
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 cursor-pointer hover:bg-gray-50 -mx-4 px-4 pt-1 rounded-t-xl transition-colors"
                            onClick={() => toggleExpand(tx.id)}
                          >
                            <div className="flex items-start sm:items-center gap-3">
                              <button className="text-gray-400 hover:text-orange-500 transition-colors mt-1 sm:mt-0">
                                {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                              </button>
                              <div>
                                <p className="font-bold text-gray-900">{tx.description}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{tx.clients?.name || 'Sem cliente'} • {tx.installment_count} parcelas</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 self-end sm:self-auto">
                              <span className="font-bold text-gray-900">{formatCurrency(tx.amount)}</span>
                              {getStatusBadge(tx.status)}
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDelete(tx.id); }} 
                                className="text-gray-400 hover:text-red-500 p-1.5 rounded-md hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="space-y-2 pl-4 sm:pl-10 border-l-2 border-orange-100 pt-3 pb-1 animate-in fade-in slide-in-from-top-2">
                              {insts.map((inst: Installment) => (
                                <div key={inst.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-gray-50 p-2.5 rounded-lg border border-gray-100 gap-2">
                                  <div className="flex items-center gap-3">
                                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 shrink-0">
                                      {inst.number}
                                    </div>
                                    <div>
                                      <p className="font-semibold text-sm text-gray-900">{formatCurrency(inst.amount)}</p>
                                      <p className="text-[11px] text-gray-500">Vence: {new Date(inst.dueDate).toLocaleDateString('pt-BR')}</p>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 self-end sm:self-auto">
                                    {getStatusBadge(inst.status, inst.dueDate)}
                                    
                                    {inst.pix_code ? (
                                      <div className="flex items-center gap-1">
                                        <button onClick={(e) => handleSendWhatsApp(e, tx, inst)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-md text-[11px] font-semibold transition-colors">
                                          <MessageCircle className="w-3 h-3" /> WhatsApp
                                        </button>
                                        <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(inst.pix_code!); toast.success("Pix copiado!"); }} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-md text-[11px] font-semibold transition-colors">
                                          <Copy className="w-3 h-3" /> Copiar Pix
                                        </button>
                                      </div>
                                    ) : (
                                      inst.status !== 'Pago' && (
                                        <button onClick={(e) => { e.stopPropagation(); handleOpenPaghiperModal(tx, inst); }} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-[11px] font-semibold transition-colors">
                                          <DollarSign className="w-3 h-3 text-blue-500" /> Gerar Pix
                                        </button>
                                      )
                                    )}

                                    {inst.status !== 'Pago' && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleMarkInstallmentPaid(tx, inst.id); }}
                                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-green-200 text-green-600 hover:bg-green-50 rounded-md text-[11px] font-semibold transition-colors shadow-sm"
                                      >
                                        <CheckCircle2 className="w-3.5 h-3.5" /> Receber
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                          <div>
                            <p className="font-bold text-gray-900">{tx.description}</p>
                            <p className="text-xs text-gray-500 mt-0.5">{tx.clients?.name || 'Sem cliente'} • {new Date(tx.date).toLocaleDateString('pt-BR')}</p>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 self-end sm:self-auto">
                            <span className="font-bold text-gray-900">{formatCurrency(tx.amount)}</span>
                            {getStatusBadge(tx.status, tx.date)}
                            
                            <div className="flex items-center gap-1.5 ml-2">
                              {tx.pix_code ? (
                                <div className="flex items-center gap-1">
                                  <button onClick={(e) => handleSendWhatsApp(e, tx)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 rounded-md text-[11px] font-semibold transition-colors">
                                    <MessageCircle className="w-3 h-3" /> WhatsApp
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(tx.pix_code!); toast.success("Pix copiado!"); }} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-blue-50 border border-blue-200 text-blue-600 hover:bg-blue-100 rounded-md text-[11px] font-semibold transition-colors">
                                    <Copy className="w-3 h-3" /> Copiar Pix
                                  </button>
                                </div>
                              ) : (
                                (tx.status !== 'Recebido' && tx.status !== 'Pago' && tx.status !== 'Cancelado') && (
                                  <button onClick={() => handleOpenPaghiperModal(tx)} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-md text-[11px] font-semibold transition-colors">
                                    <DollarSign className="w-3 h-3 text-blue-500" /> Gerar Pix
                                  </button>
                                )
                              )}

                              {(tx.status !== 'Recebido' && tx.status !== 'Pago' && tx.status !== 'Cancelado') && (
                                <button 
                                  onClick={() => handleMarkAsPaid(tx.id)}
                                  className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-green-200 text-green-600 hover:bg-green-50 rounded-md text-[11px] font-semibold transition-colors shadow-sm"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" /> Receber
                                </button>
                              )}
                              <button onClick={() => handleOpenModal(tx)} className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-md transition-colors">
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button onClick={() => handleDelete(tx.id)} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl p-12 text-center shadow-sm">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3">
                    <DollarSign className="w-6 h-6 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-bold text-gray-900">Nenhum registro encontrado</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {listStatusTab === 'pendentes' ? 'Não há cobranças pendentes no momento.' : 'Nenhum recebimento foi concluído ainda.'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'relatorios' && (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center h-64 flex flex-col items-center justify-center shadow-sm">
            <h3 className="text-lg font-bold text-gray-900">Relatórios Avançados</h3>
            <p className="text-sm text-gray-500 mt-1">Módulo em desenvolvimento.</p>
          </div>
        )}
      </div>

      {/* Modal Nova Transação / Editar */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95">
            <div className="px-6 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-3xl">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{editingTx ? 'Editar Recebimento' : 'Novo Recebimento'}</h2>
                <p className="text-sm text-gray-500 mt-1">Adicione um novo recebimento ou parcelamento ao seu financeiro</p>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 bg-white rounded-full border border-gray-200 shadow-sm transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Data Inicial *</label>
                  <div className="relative">
                    <input 
                      type="date" required
                      value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 text-gray-700 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Valor Total *</label>
                  <input 
                    type="number" step="0.01" required placeholder="0.00"
                    value={formData.amount} onChange={e => setFormData({...formData, amount: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Descrição *</label>
                <input 
                  required
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  placeholder="Ex: Casamento João e Maria"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">Cliente</label>
                  <select 
                    value={formData.client_id} onChange={e => setFormData({...formData, client_id: e.target.value})}
                    className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                  >
                    <option value="none">Nenhum</option>
                    {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>

                {!editingTx ? (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Número de Parcelas</label>
                    <select 
                      value={formData.installment_count} onChange={e => setFormData({...formData, installment_count: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(n => (
                        <option key={n} value={n}>{n} {n === 1 ? 'vez (À vista)' : 'vezes'}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Status</label>
                    <select 
                      value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})}
                      className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-all"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Recebido">Recebido</option>
                      <option value="Cancelado">Cancelado</option>
                    </select>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-6 pb-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-gray-700 font-semibold border border-gray-200 hover:bg-gray-50 rounded-xl transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={isSubmitting} className="px-8 py-2.5 bg-orange-400 text-white font-bold rounded-xl hover:bg-orange-500 transition-colors flex items-center justify-center shadow-md disabled:opacity-50">
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Salvar Recebimento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal PagHiper PIX */}
      <Dialog open={paghiperModalOpen} onOpenChange={(open) => !open && setPaghiperModalOpen(false)}>
        <DialogContent className="sm:max-w-[400px] bg-white rounded-3xl p-0 overflow-hidden shadow-2xl">
          <div className="px-6 py-6 border-b border-gray-100 bg-blue-50/50">
            <DialogTitle className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-blue-500" />
              Gerar Pix
            </DialogTitle>
          </div>

          <form onSubmit={handleGeneratePaghiper} className="p-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">Nome do Pagador *</label>
              <input 
                required type="text"
                value={paghiperData?.payer_name || ''} 
                onChange={e => setPaghiperData({...paghiperData, payer_name: e.target.value})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">CPF do Pagador *</label>
              <input 
                required type="text" placeholder="000.000.000-00"
                value={paghiperData?.payer_cpf || ''} 
                onChange={e => setPaghiperData({...paghiperData, payer_cpf: e.target.value})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
              <p className="text-[10px] text-gray-500 font-medium">Requisito obrigatório do banco emissor.</p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-gray-700">E-mail do Pagador</label>
              <input 
                type="email" placeholder="Opcional"
                value={paghiperData?.payer_email || ''} 
                onChange={e => setPaghiperData({...paghiperData, payer_email: e.target.value})}
                className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 outline-none"
              />
            </div>

            <DialogFooter className="mt-6">
              <button type="button" onClick={() => setPaghiperModalOpen(false)} className="px-5 py-2.5 text-gray-600 font-bold hover:bg-gray-100 rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={paghiperLoading} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm flex items-center gap-2 disabled:opacity-50">
                {paghiperLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Gerar Cobrança'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}