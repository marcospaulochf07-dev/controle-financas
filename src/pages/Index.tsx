import React, { useState, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, ChevronLeft, ChevronRight, BarChart3, FileText, Users, GitCompare, CheckSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricCard } from "@/components/MetricCard";
import { ExpenseTable } from "@/components/ExpenseTable";
import { NewExpenseModal } from "@/components/NewExpenseModal";
import { RevenueEditor } from "@/components/RevenueEditor";
import { CostBreakdown } from "@/components/CostBreakdown";
import { RevenueChart } from "@/components/RevenueChart";
import { CostPieChart } from "@/components/CostPieChart";
import { PaymentReminders } from "@/components/PaymentReminders";
import { PaidExpenses } from "@/components/PaidExpenses";
import { MonthComparison } from "@/components/MonthComparison";
import { VehicleManager } from "@/components/VehicleManager";
import { DriverDailies } from "@/components/DriverDailies";
import { RecurringReminders } from "@/components/RecurringReminders";
import { deleteExpense, getMonthlyRevenue, getVehicleName, updateExpenseStatus } from "@/lib/store";
import { useDriverDailies } from "@/hooks/use-driver-dailies";
import { useExpenses } from "@/hooks/use-expenses";
import { getVehicles } from "@/lib/types";
import { toast } from "sonner";
import logo from "@/assets/logo.png";
import { buildConsolidatedDriverExpenses, isDriverDailyExpense, syncDriverDailyExpenses } from "@/lib/driver-daily-expenses";

const MONTHS = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const tabAnimVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const Index = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [vehicleFilter, setVehicleFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState("lancamentos");

  const { expenses: allExpenses, refresh: refreshExpenses } = useExpenses();
  const { dailies: allDriverDailies, refresh: refreshDailies } = useDriverDailies();

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refreshExpenses();
    refreshDailies();
  }, [refreshExpenses, refreshDailies]);

  const monthKey = getMonthKey(year, month);
  const isCurrentMonth = year === now.getFullYear() && month === now.getMonth();
  const isFutureMonth = year > now.getFullYear() || (year === now.getFullYear() && month > now.getMonth());

  const vehicles = useMemo(() => {
    void refreshKey;
    return getVehicles();
  }, [refreshKey]);

  // All expenses for this month (diárias sempre consolidadas pela soma real dos registros)
  const allMonthExpenses = useMemo(() => {
    const monthExpenses = allExpenses.filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === year && d.getMonth() === month;
    });

    const nonDriverDailyExpenses = monthExpenses.filter((expense) => !isDriverDailyExpense(expense));
    const consolidatedDriverExpenses = buildConsolidatedDriverExpenses(allExpenses, allDriverDailies, year, month);

    return [...nonDriverDailyExpenses, ...consolidatedDriverExpenses];
  }, [allExpenses, allDriverDailies, year, month]);

  // Filtered for lançamentos table (excludes diarias, applies vehicle filter)
  const filtered = useMemo(() => {
    return allMonthExpenses.filter((e) => {
      const matchVehicle = vehicleFilter === "Todos" || e.vehicle === vehicleFilter;
      return matchVehicle;
    });
  }, [allMonthExpenses, vehicleFilter]);

  const totalCost = allMonthExpenses.reduce((s, e) => s + e.amount, 0);
  const revenue = getMonthlyRevenue(monthKey);
  const margin = revenue - totalCost;

  const syncingRef = React.useRef(false);
  useEffect(() => {
    if (syncingRef.current) return;
    let cancelled = false;

    const syncDailies = async () => {
      syncingRef.current = true;
      const changed = await syncDriverDailyExpenses(allExpenses, allDriverDailies, year, month);
      syncingRef.current = false;
      if (changed && !cancelled) {
        refreshExpenses();
      }
    };

    void syncDailies();

    return () => {
      cancelled = true;
    };
  }, [allDriverDailies, year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear(year - 1);
    } else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear(year + 1);
    } else setMonth(month + 1);
  };

  const handleDelete = async (id: string) => {
    await deleteExpense(id);
    refresh();
  };

  const handleMarkPaid = async (id: string) => {
    await updateExpenseStatus(id, "pago");
    toast.success("Pagamento concluído!");
    refresh();
  };

  const handleMarkPending = async (id: string) => {
    await updateExpenseStatus(id, "pendente");
    toast.success("Voltou para pendente.");
    refresh();
  };

  const driverDailiesTotal = useMemo(() => {
    return allDriverDailies
      .filter((d) => {
        const dt = new Date(d.date);
        return dt.getFullYear() === year && dt.getMonth() === month;
      })
      .reduce((s, d) => s + d.routes * d.valuePerRoute, 0);
  }, [allDriverDailies, year, month]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-border/50 gradient-header glass" role="banner">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center gap-3"
          >
            <div className="rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 p-1.5">
              <img src={logo} alt="FV Freitas Vidal" className="h-12 w-auto" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Gestor de Frota</h1>
              <p className="text-[11px] font-medium text-muted-foreground tracking-wide">FREITAS VIDAL SERVIÇOS LTDA</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Button
              onClick={() => setModalOpen(true)}
              size="sm"
              className="gap-1.5 rounded-xl font-semibold shadow-md hover:shadow-lg transition-shadow focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Adicionar novo lançamento"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6" role="main">
        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="flex flex-wrap items-center gap-3"
          role="navigation"
          aria-label="Filtros de período e veículo"
        >
          <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-card px-2 py-1 shadow-card">
            <button
              onClick={prevMonth}
              className="rounded-lg p-1.5 hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="min-w-[150px] text-center text-sm font-bold tracking-tight" aria-live="polite">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1.5 hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger
              className="h-9 w-40 rounded-xl border-border/50 text-xs font-medium shadow-card"
              aria-label="Filtrar por veículo"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os veículos</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v} value={v}>
                  {getVehicleName(v)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="region" aria-label="Métricas financeiras">
          <div>
            <MetricCard label="Receita Bruta (Usina)" value={revenue} delay={0.1} />
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-2 px-1"
            >
              <RevenueEditor month={monthKey} currentValue={revenue} onUpdated={refresh} />
            </motion.div>
          </div>
          <MetricCard label="Custo Operacional Total" value={totalCost} delay={0.2} />
          <MetricCard label="Margem Líquida" value={margin} type={margin >= 0 ? "profit" : "loss"} delay={0.3} />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <TabsList
              className="w-full justify-start flex-wrap h-auto gap-1.5 bg-transparent p-0 mb-4"
              aria-label="Seções do painel"
            >
              {[
                { value: "lancamentos", label: "Lançamentos", icon: FileText },
                { value: "diarias", label: "Diárias", icon: Users },
                { value: "pagos", label: "Pagamentos Realizados", icon: CheckSquare },
                { value: "graficos", label: "Gráficos", icon: BarChart3 },
                { value: "comparativo", label: "Comparativo", icon: GitCompare },
              ].map(({ value, label, icon: TabIcon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="gap-1.5 rounded-xl border border-transparent px-4 py-2 text-sm font-semibold transition-all data-[state=active]:border-primary/20 data-[state=active]:bg-primary/10 data-[state=active]:text-primary data-[state=active]:shadow-sm hover:bg-accent/60 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </motion.div>

          <AnimatePresence mode="wait">
            <TabsContent value="lancamentos" key="lancamentos" asChild>
              <motion.div variants={tabAnimVariants} initial="hidden" animate="visible" exit="exit">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                  <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card lg:col-span-3">
                    <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      Lançamentos — {MONTHS[month]} {year}
                    </h2>
                    <ExpenseTable expenses={filtered} onDelete={handleDelete} />
                  </div>
                  <div className="space-y-6">
                    <CostBreakdown expenses={filtered} />
                    <VehicleManager onUpdated={refresh} />
                  </div>
                </div>

                {/* Lembretes abaixo dos lançamentos */}
                <div
                  className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5"
                  role="region"
                  aria-label="Lembretes de pagamento"
                  aria-live="polite"
                >
                  <div className="lg:col-span-3">
                    <PaymentReminders expenses={allMonthExpenses} onMarkPaid={handleMarkPaid} isFutureMonth={isFutureMonth} />
                  </div>
                  <div className="lg:col-span-2">
                    <RecurringReminders onUpdated={refresh} driverDailiesTotal={driverDailiesTotal} selectedYear={year} selectedMonth={month} />
                  </div>
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="diarias" key="diarias" asChild>
              <motion.div variants={tabAnimVariants} initial="hidden" animate="visible" exit="exit">
                <DriverDailies year={year} month={month} expenses={allExpenses} onUpdated={refresh} />
              </motion.div>
            </TabsContent>

            <TabsContent value="pagos" key="pagos" asChild>
              <motion.div variants={tabAnimVariants} initial="hidden" animate="visible" exit="exit">
                <PaidExpenses expenses={allMonthExpenses} onMarkPending={handleMarkPending} />
              </motion.div>
            </TabsContent>

            <TabsContent value="graficos" key="graficos" asChild>
              <motion.div variants={tabAnimVariants} initial="hidden" animate="visible" exit="exit">
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                  <RevenueChart allExpenses={allExpenses} year={year} />
                  <CostPieChart expenses={filtered} />
                </div>
              </motion.div>
            </TabsContent>

            <TabsContent value="comparativo" key="comparativo" asChild>
              <motion.div variants={tabAnimVariants} initial="hidden" animate="visible" exit="exit">
                <MonthComparison allExpenses={allExpenses} year={year} month={month} />
              </motion.div>
            </TabsContent>
          </AnimatePresence>
        </Tabs>
      </main>

      <NewExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={refresh} />
    </div>
  );
};

export default Index;
