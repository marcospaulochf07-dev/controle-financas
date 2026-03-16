import { useState, useCallback, useMemo } from "react";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
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
import { MonthComparison } from "@/components/MonthComparison";
import { VehicleManager } from "@/components/VehicleManager";
import { DriverDailies } from "@/components/DriverDailies";
import { RecurringReminders } from "@/components/RecurringReminders";
import { getExpenses, deleteExpense, getMonthlyRevenue, getVehicleName, updateExpenseStatus } from "@/lib/store";
import { getVehicles } from "@/lib/types";
import { toast } from "sonner";
import logo from "@/assets/logo.png";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function getMonthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

const Index = () => {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [vehicleFilter, setVehicleFilter] = useState("Todos");
  const [modalOpen, setModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const monthKey = getMonthKey(year, month);

  const vehicles = useMemo(() => {
    void refreshKey;
    return getVehicles();
  }, [refreshKey]);

  const allExpenses = useMemo(() => {
    void refreshKey;
    return getExpenses();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    return allExpenses.filter((e) => {
      const d = new Date(e.date);
      const matchMonth = d.getFullYear() === year && d.getMonth() === month;
      const matchVehicle = vehicleFilter === "Todos" || e.vehicle === vehicleFilter;
      return matchMonth && matchVehicle;
    });
  }, [allExpenses, year, month, vehicleFilter]);

  const totalCost = filtered.reduce((s, e) => s + e.amount, 0);
  const revenue = getMonthlyRevenue(monthKey);
  const margin = revenue - totalCost;

  const pendingExpenses = useMemo(
    () => filtered.filter((e) => e.status === "pendente"),
    [filtered]
  );

  const prevMonth = () => {
    if (month === 0) { setMonth(11); setYear(year - 1); }
    else setMonth(month - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setMonth(0); setYear(year + 1); }
    else setMonth(month + 1);
  };

  const handleDelete = (id: string) => {
    deleteExpense(id);
    refresh();
  };

  const handleMarkPaid = (id: string) => {
    updateExpenseStatus(id, "pago");
    toast.success("Pagamento concluído!");
    refresh();
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="FV Freitas Vidal" className="h-10 w-auto" />
            <div>
              <h1 className="text-lg font-semibold">Gestor de Rota</h1>
              <p className="text-xs text-muted-foreground">Freitas Vidal Serviços LTDA</p>
            </div>
          </div>
          <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" />
            Novo Lançamento
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <button onClick={prevMonth} className="rounded p-1 hover:bg-accent">
              <ChevronLeft className="h-4 w-4 text-muted-foreground" />
            </button>
            <span className="min-w-[140px] text-center text-sm font-medium">
              {MONTHS[month]} {year}
            </span>
            <button onClick={nextMonth} className="rounded p-1 hover:bg-accent">
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
          <Select value={vehicleFilter} onValueChange={setVehicleFilter}>
            <SelectTrigger className="h-8 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Todos">Todos</SelectItem>
              {vehicles.map((v) => (
                <SelectItem key={v} value={v}>{getVehicleName(v)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <MetricCard label="Receita Bruta (Usina)" value={revenue} />
            <div className="mt-2 px-1">
              <RevenueEditor month={monthKey} currentValue={revenue} onUpdated={refresh} />
            </div>
          </div>
          <MetricCard label="Custo Operacional Total" value={totalCost} />
          <MetricCard
            label="Margem Líquida"
            value={margin}
            type={margin >= 0 ? "profit" : "loss"}
          />
        </div>

        {/* Pending Reminders Banner */}
        {pendingExpenses.length > 0 && (
          <div className="rounded-xl border-2 border-warning/40 bg-warning/10 p-4">
            <PaymentReminders expenses={filtered} onMarkPaid={handleMarkPaid} />
          </div>
        )}

        {/* Tabs */}
        <Tabs defaultValue="lancamentos" className="w-full">
          <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="lancamentos" className="text-xs">Lançamentos</TabsTrigger>
            <TabsTrigger value="lembretes" className="text-xs">Lembretes</TabsTrigger>
            <TabsTrigger value="diarias" className="text-xs">Diárias</TabsTrigger>
            <TabsTrigger value="graficos" className="text-xs">Gráficos</TabsTrigger>
            <TabsTrigger value="comparativo" className="text-xs">Comparativo</TabsTrigger>
          </TabsList>

          <TabsContent value="lancamentos">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div className="shadow-card rounded-xl bg-card p-5 lg:col-span-2">
                <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Lançamentos — {MONTHS[month]} {year}
                </h3>
                <ExpenseTable expenses={filtered} onDelete={handleDelete} />
              </div>
              <div className="space-y-6">
                <CostBreakdown expenses={filtered} />
                <VehicleManager onUpdated={refresh} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="lembretes">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <PaymentReminders expenses={filtered} onMarkPaid={handleMarkPaid} />
              <RecurringReminders onUpdated={refresh} />
            </div>
          </TabsContent>

          <TabsContent value="diarias">
            <DriverDailies year={year} month={month} />
          </TabsContent>

          <TabsContent value="graficos">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <RevenueChart year={year} />
              <CostPieChart expenses={filtered} />
            </div>
          </TabsContent>

          <TabsContent value="comparativo">
            <MonthComparison year={year} month={month} />
          </TabsContent>
        </Tabs>
      </main>

      <NewExpenseModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />
    </div>
  );
};

export default Index;
