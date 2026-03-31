import { useCallback, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { BarChart3, CheckSquare, ChevronLeft, ChevronRight, FileText, GitCompare, Plus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { deleteExpense, updateDriverDailyPaidRoutesAsync, updateExpenseStatus } from "@/lib/store";
import { useDriverDailies } from "@/hooks/use-driver-dailies";
import { useExpenses } from "@/hooks/use-expenses";
import { useVehicles } from "@/hooks/use-vehicles";
import { useMonthlyRevenues } from "@/hooks/use-monthly-revenues";
import { useAppBootstrap } from "@/hooks/use-app-bootstrap";
import logo from "@/assets/logo.png";
import { toast } from "sonner";
import {
  buildDriverDailyRows,
  buildMonthlyFinancialEntries,
  buildPaidFinancialEntries,
  buildPendingFinancialEntries,
  getMonthCostTotal,
  getMonthDriverDailyPendingTotal,
  getMonthDriverDailyTotal,
  getNonDailyExpensesForMonth,
} from "@/lib/driver-daily-expenses";
import { FinancialEntry } from "@/lib/types";
import { formatMonthKey, getCurrentYearMonth } from "@/lib/date-utils";

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

const tabAnimVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
  },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const now = getCurrentYearMonth();

const Index = () => {
  const [year, setYear] = useState(now.year);
  const [month, setMonth] = useState(now.monthIndex);
  const [vehicleFilter, setVehicleFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("lancamentos");

  const { expenses: allExpenses, refresh: refreshExpenses } = useExpenses();
  const { dailies: allDriverDailies, refresh: refreshDailies } = useDriverDailies();
  const { vehicles, refresh: refreshVehicles } = useVehicles();
  const { revenues, refresh: refreshRevenues } = useMonthlyRevenues();

  const refresh = useCallback(async () => {
    await Promise.all([refreshExpenses(), refreshDailies(), refreshVehicles(), refreshRevenues()]);
  }, [refreshDailies, refreshExpenses, refreshRevenues, refreshVehicles]);

  useAppBootstrap(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const monthKey = formatMonthKey(year, month);
  const vehicleNameMap = useMemo(
    () => Object.fromEntries(vehicles.map((vehicle) => [vehicle.id, vehicle.displayName])),
    [vehicles],
  );
  const revenueMap = useMemo(
    () => Object.fromEntries(revenues.map((item) => [item.monthKey, item.amount])),
    [revenues],
  );

  const isFutureMonth = year > now.year || (year === now.year && month > now.monthIndex);

  const monthExpenses = useMemo(() => getNonDailyExpensesForMonth(allExpenses, year, month), [allExpenses, year, month]);
  const filteredLaunchExpenses = useMemo(
    () => monthExpenses.filter((expense) => vehicleFilter === "Todos" || expense.vehicle === vehicleFilter),
    [monthExpenses, vehicleFilter],
  );

  const monthFinancialEntries = useMemo(
    () => buildMonthlyFinancialEntries(allExpenses, allDriverDailies, year, month, vehicleFilter),
    [allDriverDailies, allExpenses, month, vehicleFilter, year],
  );

  const pendingEntries = useMemo(
    () => buildPendingFinancialEntries(allExpenses, allDriverDailies, year, month),
    [allDriverDailies, allExpenses, month, year],
  );

  const paidEntries = useMemo(
    () => buildPaidFinancialEntries(allExpenses, allDriverDailies, year, month),
    [allDriverDailies, allExpenses, month, year],
  );

  const totalCost = useMemo(() => getMonthCostTotal(allExpenses, allDriverDailies, year, month), [allDriverDailies, allExpenses, month, year]);
  const revenue = revenueMap[monthKey] ?? 20000;
  const margin = revenue - totalCost;

  const driverDailiesTotal = useMemo(
    () => getMonthDriverDailyTotal(allDriverDailies, year, month),
    [allDriverDailies, month, year],
  );
  const driverDailiesPendingTotal = useMemo(
    () => getMonthDriverDailyPendingTotal(allDriverDailies, year, month),
    [allDriverDailies, month, year],
  );

  const prevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setYear((value) => value - 1);
      return;
    }

    setMonth((value) => value - 1);
  };

  const nextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setYear((value) => value + 1);
      return;
    }

    setMonth((value) => value + 1);
  };

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id);
    await refresh();
  };

  const handleMarkPaid = async (entry: FinancialEntry) => {
    if (entry.kind === "expense") {
      await updateExpenseStatus(entry.id, "pago");
      toast.success("Pagamento concluído!");
      await refresh();
      return;
    }

    const rows = buildDriverDailyRows(allDriverDailies, year, month)
      .filter((row) => row.driverName === entry.driverName)
      .filter((row) => row.unpaidRoutes > 0)
      .sort((left, right) => left.date.localeCompare(right.date) || (left.createdAt || "").localeCompare(right.createdAt || ""));

    for (const row of rows) {
      await updateDriverDailyPaidRoutesAsync(row.id, row.routes);
    }

    toast.success(`Todas as rotas pendentes de ${entry.driverName} foram marcadas como pagas.`);
    await refresh();
  };

  const handleMarkPending = async (entry: FinancialEntry) => {
    if (entry.kind === "expense") {
      await updateExpenseStatus(entry.id, "pendente");
      toast.success("Voltou para pendente.");
      await refresh();
      return;
    }

    const rows = buildDriverDailyRows(allDriverDailies, year, month)
      .filter((row) => row.driverName === entry.driverName)
      .filter((row) => row.paidRoutes > 0);

    for (const row of rows) {
      await updateDriverDailyPaidRoutesAsync(row.id, 0);
    }

    toast.success(`As rotas pagas de ${entry.driverName} voltaram para pendente.`);
    await refresh();
  };

  return (
    <div className="min-h-screen bg-background notranslate" translate="no">
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
              <p className="text-[11px] font-medium tracking-wide text-muted-foreground">FREITAS VIDAL SERVIÇOS LTDA</p>
            </div>
          </motion.div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}>
            <Button
              onClick={() => setModalOpen(true)}
              size="sm"
              className="gap-1.5 rounded-xl font-semibold shadow-md transition-shadow hover:shadow-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              aria-label="Adicionar novo lançamento"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Novo Lançamento</span>
              <span className="sm:hidden">Novo</span>
            </Button>
          </motion.div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6" role="main">
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
              className="rounded-lg p-1.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="min-w-[150px] text-center text-sm font-bold tracking-tight" aria-live="polite">
              {MONTHS[month]} {year}
            </span>
            <button
              onClick={nextMonth}
              className="rounded-lg p-1.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
              aria-label="Próximo mês"
            >
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="h-9 w-48 rounded-xl border-border/50 text-xs font-medium shadow-card" aria-label="Filtrar por veículo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos os veículos</SelectItem>
              {vehicles.map((vehicle) => (
                <SelectItem key={vehicle.id} value={vehicle.id}>
                  {vehicle.displayName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3" role="region" aria-label="Métricas financeiras">
          <div>
            <MetricCard label="Receita Bruta (Usina)" value={revenue} delay={0.1} />
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-2 px-1">
              <RevenueEditor month={monthKey} currentValue={revenue} onUpdated={() => void refresh()} />
            </motion.div>
          </div>
          <MetricCard label="Custo Operacional Total" value={totalCost} delay={0.2} />
          <MetricCard label="Margem Líquida" value={margin} type={margin >= 0 ? "profit" : "loss"} delay={0.3} />
        </div>

        <div className="w-full">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.3 }}>
            <div className="mb-4 flex w-full flex-wrap justify-start gap-1.5 p-0" role="tablist" aria-label="Seções do painel">
              {[
                { value: "lancamentos", label: "Lançamentos", icon: FileText },
                { value: "diarias", label: "Diárias", icon: Users },
                { value: "pagos", label: "Pagamentos Realizados", icon: CheckSquare },
                { value: "graficos", label: "Gráficos", icon: BarChart3 },
                { value: "comparativo", label: "Comparativo", icon: GitCompare },
              ].map(({ value, label, icon: TabIcon }) => (
                <button
                  key={value}
                  role="tab"
                  aria-selected={activeTab === value}
                  onClick={() => setActiveTab(value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 text-sm font-semibold transition-all focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 ${
                    activeTab === value
                      ? "border-primary/20 bg-primary/10 text-primary shadow-sm"
                      : "border-transparent hover:bg-accent/60"
                  }`}
                >
                  <TabIcon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>
          </motion.div>

          {activeTab === "lancamentos" && (
            <motion.div key="lancamentos" variants={tabAnimVariants} initial="hidden" animate="visible">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
                <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card lg:col-span-3">
                  <h2 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    Lançamentos — {MONTHS[month]} {year}
                  </h2>
                  <ExpenseTable expenses={filteredLaunchExpenses} onDelete={handleDeleteExpense} vehicleNameMap={vehicleNameMap} />
                </div>
                <div className="space-y-6">
                  <CostBreakdown expenses={monthFinancialEntries} />
                  <VehicleManager onUpdated={() => void refresh()} />
                </div>
              </div>

              <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-5" role="region" aria-label="Lembretes de pagamento" aria-live="polite">
                <div className="lg:col-span-3">
                  <PaymentReminders
                    expenses={pendingEntries}
                    onMarkPaid={handleMarkPaid}
                    isFutureMonth={isFutureMonth}
                    vehicleNameMap={vehicleNameMap}
                  />
                </div>
                <div className="lg:col-span-2">
                  <RecurringReminders
                    expenses={allExpenses}
                    onUpdated={() => void refresh()}
                    driverDailiesTotal={driverDailiesTotal}
                    driverDailiesPendingTotal={driverDailiesPendingTotal}
                    selectedYear={year}
                    selectedMonth={month}
                  />
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "diarias" && (
            <motion.div key="diarias" variants={tabAnimVariants} initial="hidden" animate="visible">
              <DriverDailies year={year} month={month} onUpdated={() => void refresh()} vehicleNameMap={vehicleNameMap} />
            </motion.div>
          )}

          {activeTab === "pagos" && (
            <motion.div key="pagos" variants={tabAnimVariants} initial="hidden" animate="visible">
              <PaidExpenses expenses={paidEntries} onMarkPending={handleMarkPending} vehicleNameMap={vehicleNameMap} />
            </motion.div>
          )}

          {activeTab === "graficos" && (
            <motion.div key="graficos" variants={tabAnimVariants} initial="hidden" animate="visible">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <RevenueChart allExpenses={allExpenses} allDriverDailies={allDriverDailies} revenues={revenues} year={year} />
                <CostPieChart expenses={monthFinancialEntries} />
              </div>
            </motion.div>
          )}

          {activeTab === "comparativo" && (
            <motion.div key="comparativo" variants={tabAnimVariants} initial="hidden" animate="visible">
              <MonthComparison allExpenses={allExpenses} allDriverDailies={allDriverDailies} revenues={revenues} year={year} month={month} />
            </motion.div>
          )}
        </div>
      </main>

      <NewExpenseModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={() => void refresh()} />
    </div>
  );
};

export default Index;
