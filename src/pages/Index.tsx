import React, { useState, useEffect } from "react";
import { Layout } from "@/components/Layout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Edit2, TrendingUp, Clock, AlertCircle, Users, Target, FileText } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
};

const Index = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [goal, setGoal] = useState<number>(0);
  const [realized, setRealized] = useState<number>(0);

  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [pendingRevenue, setPendingRevenue] = useState<number>(0);
  const [overdueRevenue, setOverdueRevenue] = useState<number>(0);

  const [totalClients, setTotalClients] = useState<number>(0);
  const [openOpportunities, setOpenOpportunities] = useState<number>(0);
  const [activeContracts, setActiveContracts] = useState<number>(0);

  const [pipelineData, setPipelineData] = useState<any[]>([]);
  const [recentTasks, setRecentTasks] = useState<any[]>([]);

  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [newGoal, setNewGoal] = useState<string>("");

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from("profiles")
        .select("monthly_revenue_goal")
        .eq("id", user?.id)
        .single();

      const currentGoal = profile?.monthly_revenue_goal || 0;
      setGoal(currentGoal);
      setNewGoal(currentGoal.toString());

      const { data: transactions, error: txError } = await supabase
        .from("transactions")
        .select("*")
        .eq("user_id", user?.id);

      if (txError && txError.code !== "42P01") {
        console.error("Error fetching transactions:", txError);
      }

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let calcRealized = 0;
      let calcTotalRevenue = 0;
      let calcPendingRevenue = 0;
      let calcOverdueRevenue = 0;

      if (transactions) {
        transactions.forEach((tx) => {
          let insts: any[] = [];
          if (tx.is_installment && tx.installments) {
            try {
              insts = typeof tx.installments === "string" ? JSON.parse(tx.installments) : tx.installments;
            } catch (e) {}
          }

          if (insts.length > 0) {
            insts.forEach((inst: any) => {
              const instDate = new Date(inst.dueDate);
              const isCurrentMonth = instDate.getMonth() === currentMonth && instDate.getFullYear() === currentYear;
              const isPaid = inst.status === "Pago" || inst.status === "Recebido";
              const isOverdue = instDate < today && !isPaid && inst.status !== "Cancelado";
              const amount = Number(inst.amount) || 0;

              if (isPaid) {
                calcTotalRevenue += amount;
                if (isCurrentMonth) calcRealized += amount;
              } else if (inst.status !== "Cancelado") {
                if (isOverdue || inst.status === "Atrasado") {
                  calcOverdueRevenue += amount;
                } else {
                  calcPendingRevenue += amount;
                }
              }
            });
          } else {
            const txDate = new Date(tx.date);
            const isCurrentMonth = txDate.getMonth() === currentMonth && txDate.getFullYear() === currentYear;
            const isPaid = tx.status === "Recebido" || tx.status === "Pago";
            const isOverdue = txDate < today && !isPaid && tx.status !== "Cancelado";
            const amount = Number(tx.amount) || 0;

            if (isPaid) {
              calcTotalRevenue += amount;
              if (isCurrentMonth) calcRealized += amount;
            } else if (tx.status !== "Cancelado") {
              if (isOverdue || tx.status === "Atrasado") {
                calcOverdueRevenue += amount;
              } else {
                calcPendingRevenue += amount;
              }
            }
          }
        });
      }

      setRealized(calcRealized);
      setTotalRevenue(calcTotalRevenue);
      setPendingRevenue(calcPendingRevenue);
      setOverdueRevenue(calcOverdueRevenue);

      const { data: opsData } = await supabase
        .from("opportunities")
        .select("id, is_client, column_id, columns:column_id(name)")
        .eq("user_id", user?.id);

      if (opsData) {
        setTotalClients(opsData.filter((op) => op.is_client).length);

        const openOps = opsData.filter((op) => !op.is_client);
        setOpenOpportunities(openOps.length);

        const pipelineCounts: Record<string, number> = {};
        openOps.forEach((op) => {
          const columnsObj = op.columns as any;
          const colName = columnsObj?.name ? columnsObj.name : "Sem Etapa";
          pipelineCounts[colName] = (pipelineCounts[colName] || 0) + 1;
        });

        const chartData = Object.keys(pipelineCounts).map((name) => ({
          name,
          quantidade: pipelineCounts[name],
        }));
        setPipelineData(chartData);
      }

      const { data: contractsData } = await supabase
        .from("contracts")
        .select("id")
        .eq("user_id", user?.id)
        .eq("status", "active");

      if (contractsData) {
        setActiveContracts(contractsData.length);
      }

      const { data: tasksData } = await supabase
        .from("tasks")
        .select("id, title, status, created_at")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false })
        .limit(5);

      if (tasksData) {
        setRecentTasks(tasksData);
      }
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      toast.error("Erro ao carregar dados do dashboard.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGoal = async () => {
    try {
      const numGoal = Number(newGoal);
      if (isNaN(numGoal) || numGoal < 0) {
        toast.error("Por favor, insira um valor válido.");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({ monthly_revenue_goal: numGoal })
        .eq("id", user?.id);

      if (error) throw error;

      setGoal(numGoal);
      setIsGoalModalOpen(false);
      toast.success("Meta atualizada com sucesso!");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao atualizar a meta.");
    }
  };

  const percentage = goal > 0 ? Math.min(Math.round((realized / goal) * 100), 100) : 0;

  return (
    <div className="min-h-full bg-[#e6e6e64c]">
      <div className="max-w-7xl mx-auto space-y-6 px-1 sm:px-0">
        <div className="pt-1">
          <h1 className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">Dashboard</h1>
          <p className="mt-3 text-lg font-medium text-[#666666]">Visão geral do seu negócio</p>
        </div>

        <div className="relative rounded-[22px] border border-[#e4e4e4] bg-white p-6 shadow-[0_8px_24px_rgba(0,0,0,0.06)] sm:p-8">
          <button
            onClick={() => setIsGoalModalOpen(true)}
            className="absolute right-5 top-5 text-[#1f1f1f] transition-opacity hover:opacity-70"
          >
            <Edit2 className="h-5 w-5" />
          </button>

          <h3 className="text-2xl font-extrabold text-[#1f1f1f] sm:text-[2.25rem]">Meta de Faturamento Mensal</h3>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-5">
            <span className="text-5xl font-black leading-none tracking-tight text-[#111111] sm:text-[4.5rem]">
              {formatCurrency(goal)}
            </span>
            <span className="pb-1 text-2xl font-bold text-[#3f3f3f] sm:text-[2rem]">
              {percentage}% alcançado
            </span>
          </div>

          <div className="mt-7 h-3.5 w-full overflow-hidden rounded-full bg-[#e5e5e5]">
            <div
              className="h-full rounded-full bg-orange-400 transition-all duration-500"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <p className="mt-5 text-2xl font-bold text-[#5a5a5a] sm:text-[1.05rem]">
            Realizado: {formatCurrency(realized)}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex h-40 flex-col justify-between rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-[1.05rem] font-bold text-[#666666]">Faturamento Total</h3>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">{formatCurrency(totalRevenue)}</span>
          </div>

          <div className="flex h-40 flex-col justify-between rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-[1.05rem] font-bold text-[#666666]">Faturamento Pendente</h3>
              <Clock className="h-6 w-6 text-orange-500" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">{formatCurrency(pendingRevenue)}</span>
          </div>

          <div className="flex h-40 flex-col justify-between rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-[1.05rem] font-bold text-[#666666]">Faturamento Atrasado</h3>
              <AlertCircle className="h-6 w-6 text-red-500" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">{formatCurrency(overdueRevenue)}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <div className="flex h-40 flex-col justify-between rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-[1.05rem] font-bold text-[#1f1f1f]">Total de clientes</h3>
              <Users className="h-6 w-6 text-[#6b6b6b]" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">{totalClients}</span>
          </div>

          <div className="flex h-40 flex-col justify-between rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-[1.05rem] font-bold text-[#1f1f1f]">Oportunidades abertas</h3>
              <Target className="h-6 w-6 text-[#6b6b6b]" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">{openOpportunities}</span>
          </div>

          <div className="flex h-40 flex-col justify-between rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <div className="flex items-start justify-between">
              <h3 className="text-[1.05rem] font-bold text-[#1f1f1f]">Contratos ativos</h3>
              <FileText className="h-6 w-6 text-[#6b6b6b]" />
            </div>
            <span className="text-4xl font-extrabold tracking-tight text-[#1f1f1f]">{activeContracts}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 pb-8 lg:grid-cols-2">
          <div className="min-h-[360px] rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-extrabold text-[#1f1f1f]">Pipeline de oportunidades</h3>
            <p className="mt-2 text-lg font-medium text-[#666666]">Distribuição por status</p>
            <div className="mt-8 h-[250px] w-full">
              {pipelineData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipelineData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#d9d9d9" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#5f5f5f", fontSize: 12 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: "#5f5f5f", fontSize: 12 }} />
                    <Tooltip
                      cursor={{ fill: "#f5f5f5" }}
                      contentStyle={{
                        borderRadius: "12px",
                        border: "1px solid #ececec",
                        boxShadow: "0 8px 20px rgba(0,0,0,0.08)",
                      }}
                    />
                    <Bar dataKey="quantidade" fill="#ff9800" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-[#7a7a7a]">Sem oportunidades no pipeline</div>
              )}
            </div>
          </div>

          <div className="min-h-[360px] rounded-[22px] border border-[#dfdfdf] bg-white p-6 shadow-sm">
            <h3 className="text-2xl font-extrabold text-[#1f1f1f]">Atividades recentes</h3>
            <p className="mt-2 text-lg font-medium text-[#666666]">Últimas tarefas criadas</p>
            <div className="mt-8 space-y-4">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => (
                  <div key={task.id} className="flex items-center gap-4 rounded-xl p-3 transition-colors hover:bg-[#f7f7f7]">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600">
                      <Target className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="truncate text-sm font-bold text-[#1f1f1f]">{task.title}</h4>
                      <p className="text-xs font-medium text-[#6f6f6f]">{new Date(task.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <div>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          task.status === "Concluída" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                        }`}
                      >
                        {task.status || "Pendente"}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex h-48 items-center justify-center text-[#7a7a7a]">Nenhuma atividade recente</div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isGoalModalOpen} onOpenChange={setIsGoalModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Configurar Meta Mensal</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <label className="mb-2 block text-sm font-medium text-gray-700">Qual é a sua meta de faturamento para este mês?</label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-gray-500">R$</span>
              <Input type="number" value={newGoal} onChange={(e) => setNewGoal(e.target.value)} className="pl-9" placeholder="0.00" step="0.01" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGoalModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleUpdateGoal} className="bg-orange-500 text-white hover:bg-orange-600">
              Salvar Meta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;