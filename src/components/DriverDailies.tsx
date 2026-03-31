import { useMemo, useState } from "react";
import { CheckCircle2, Clock, DollarSign, Plus, Route, RotateCcw, Trash2, UserPlus, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  deactivateDriverAsync,
  deleteDriverDailyAsync,
  saveDriverAsync,
  saveDriverDailyAsync,
  updateDriverDailyPaidRoutesAsync,
} from "@/lib/store";
import { useDriverDailies } from "@/hooks/use-driver-dailies";
import { useDrivers } from "@/hooks/use-drivers";
import { useVehicles } from "@/hooks/use-vehicles";
import { buildDriverDailyRows, buildDriverDailySummaries } from "@/lib/driver-daily-expenses";
import { formatDateForDisplay, getTodayInTimeZone } from "@/lib/date-utils";
import { toast } from "sonner";

interface Props {
  year: number;
  month: number;
  onUpdated: () => void;
  vehicleNameMap: Record<string, string>;
}

const VALUE_PER_ROUTE = 45;

export function DriverDailies({ year, month, onUpdated, vehicleNameMap }: Props) {
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(getTodayInTimeZone());
  const [driverName, setDriverName] = useState("");
  const [routes, setRoutes] = useState("2");
  const [vehicle, setVehicle] = useState("Van 01");
  const [newDriver, setNewDriver] = useState("");

  const { dailies: allDailies, refresh: refreshDailies } = useDriverDailies();
  const { drivers, refresh: refreshDrivers } = useDrivers();
  const { vehicles } = useVehicles();

  const refresh = async () => {
    await Promise.all([refreshDailies(), refreshDrivers()]);
    onUpdated();
  };

  const rows = useMemo(() => buildDriverDailyRows(allDailies, year, month), [allDailies, year, month]);
  const summaries = useMemo(() => buildDriverDailySummaries(allDailies, year, month), [allDailies, year, month]);

  const totalRoutes = rows.reduce((sum, row) => sum + row.routes, 0);
  const totalValue = rows.reduce((sum, row) => sum + row.totalAmount, 0);
  const pendingTotal = rows.reduce((sum, row) => sum + row.unpaidAmount, 0);
  const paidTotal = rows.reduce((sum, row) => sum + row.paidAmount, 0);

  const fmt = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleAdd = async () => {
    const numRoutes = parseInt(routes, 10);
    if (!driverName.trim() || Number.isNaN(numRoutes) || numRoutes < 1 || numRoutes > 10) {
      toast.error("Preencha o nome do motorista e número de rotas (1-10).");
      return;
    }

    await saveDriverAsync(driverName.trim());
    await saveDriverDailyAsync({
      date,
      driverName: driverName.trim(),
      routes: numRoutes,
      paidRoutes: 0,
      valuePerRoute: VALUE_PER_ROUTE,
      vehicle,
      source: "manual",
    });

    toast.success(`+${numRoutes} rota${numRoutes > 1 ? "s" : ""} para ${driverName.trim()} = ${fmt(numRoutes * VALUE_PER_ROUTE)}`);
    setDate(getTodayInTimeZone());
    setDriverName("");
    setRoutes("2");
    setAdding(false);
    await refresh();
  };

  const handleDelete = async (id: string) => {
    await deleteDriverDailyAsync(id);
    toast("Diária removida.");
    await refresh();
  };

  const handleAddDriver = async () => {
    if (!newDriver.trim()) return;
    await saveDriverAsync(newDriver.trim());
    toast.success("Motorista adicionado!");
    setNewDriver("");
    await refresh();
  };

  const handleRemoveDriver = async (name: string) => {
    await deactivateDriverAsync(name);
    toast("Motorista removido.");
    await refresh();
  };

  const handlePayOneRoute = async (rowId: string, paidRoutes: number, routesTotal: number) => {
    const nextPaidRoutes = Math.min(paidRoutes + 1, routesTotal);
    await updateDriverDailyPaidRoutesAsync(rowId, nextPaidRoutes);
    toast.success("1 rota marcada como paga.");
    await refresh();
  };

  const handleUndoOneRoute = async (rowId: string, paidRoutes: number) => {
    const nextPaidRoutes = Math.max(paidRoutes - 1, 0);
    await updateDriverDailyPaidRoutesAsync(rowId, nextPaidRoutes);
    toast.success("1 rota voltou para pendente.");
    await refresh();
  };

  const handlePayAllRoutes = async (rowId: string, routesTotal: number) => {
    await updateDriverDailyPaidRoutesAsync(rowId, routesTotal);
    toast.success("Todas as rotas deste lançamento foram pagas.");
    await refresh();
  };

  return (
    <Tabs defaultValue="diarias">
      <TabsList className="mb-4">
        <TabsTrigger value="diarias" className="gap-1.5 text-sm">
          <Route className="h-3.5 w-3.5" /> Diárias
        </TabsTrigger>
        <TabsTrigger value="motoristas" className="gap-1.5 text-sm">
          <Users className="h-3.5 w-3.5" /> Motoristas
        </TabsTrigger>
      </TabsList>

      <TabsContent value="motoristas">
        <div className="space-y-4 rounded-2xl border border-border/50 bg-card p-5 shadow-card">
          <div className="flex gap-2">
            <Input
              placeholder="Nome do motorista"
              value={newDriver}
              onChange={(event) => setNewDriver(event.target.value)}
              className="h-9 text-sm"
              onKeyDown={(event) => event.key === "Enter" && void handleAddDriver()}
            />
            <Button size="sm" className="h-9 gap-1" onClick={() => void handleAddDriver()}>
              <UserPlus className="h-3.5 w-3.5" /> Adicionar
            </Button>
          </div>

          {drivers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum motorista cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {drivers.map((driver) => {
                const summary = summaries.find((entry) => entry.driverName === driver.name);
                return (
                  <div key={driver.name} className="flex items-center justify-between rounded-xl bg-accent/30 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{driver.name}</p>
                      {summary ? (
                        <p className="text-xs text-muted-foreground">
                          {summary.totalRoutes} rotas · {fmt(summary.totalAmount)} · saldo {fmt(summary.unpaidAmount)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sem diárias neste mês</p>
                      )}
                    </div>
                    <button
                      onClick={() => void handleRemoveDriver(driver.name)}
                      className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-loss"
                      aria-label={`Remover ${driver.name}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </TabsContent>

      <TabsContent value="diarias">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Registros de Diárias
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">R$ {VALUE_PER_ROUTE},00 por rota</p>
              </div>
              <Button size="sm" variant="outline" className="h-8 gap-1 text-xs" onClick={() => setAdding((value) => !value)}>
                <Plus className="h-3 w-3" />
                Registrar
              </Button>
            </div>

            {adding && (
              <div className="mb-4 space-y-2 rounded-xl border border-border/50 bg-muted/30 p-3">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Motorista</Label>
                    {drivers.length > 0 ? (
                      <Select value={driverName} onValueChange={setDriverName}>
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((driver) => (
                            <SelectItem key={driver.name} value={driver.name}>
                              {driver.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        placeholder="Nome do motorista"
                        value={driverName}
                        onChange={(event) => setDriverName(event.target.value)}
                        className="h-8 text-sm"
                      />
                    )}
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Rotas</Label>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={routes}
                      onChange={(event) => setRoutes(event.target.value)}
                      className="h-8 text-sm"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Data</Label>
                    <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="h-8 text-sm" />
                  </div>
                  <div className="flex-1">
                    <Label className="text-xs">Veículo</Label>
                    <Select value={vehicle} onValueChange={setVehicle}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {vehicles.filter((item) => item.id !== "Geral").map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-muted-foreground">
                    Total: {fmt(parseInt(routes || "0", 10) * VALUE_PER_ROUTE)}
                  </span>
                  <Button size="sm" className="h-8" onClick={() => void handleAdd()}>
                    Salvar
                  </Button>
                </div>
              </div>
            )}

            {rows.length > 0 ? (
              <div className="max-h-[460px] space-y-2 overflow-y-auto">
                {rows.map((row) => {
                  const fullyPaid = row.unpaidRoutes === 0;
                  return (
                    <div
                      key={row.id}
                      className={`rounded-xl border px-3 py-3 transition-colors ${
                        fullyPaid ? "border-profit/20 bg-profit/5" : "border-border/30 hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {row.driverName} — {row.routes} rota{row.routes > 1 ? "s" : ""}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {vehicleNameMap[row.vehicle] || row.vehicle} · {formatDateForDisplay(row.date)}
                          </p>
                          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                            <span className="rounded-full bg-muted px-2 py-0.5 text-muted-foreground">
                              Pagas: {row.paidRoutes}
                            </span>
                            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-warning">
                              Em aberto: {row.unpaidRoutes}
                            </span>
                            <span className="rounded-full bg-accent px-2 py-0.5 text-muted-foreground">
                              Total: {fmt(row.totalAmount)}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-2">
                          <span className={`text-sm font-bold tabular-nums ${fullyPaid ? "text-profit" : ""}`}>
                            {fmt(row.unpaidAmount)} em aberto
                          </span>
                          <div className="flex items-center gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-profit hover:bg-profit/10"
                              onClick={() => void handlePayOneRoute(row.id, row.paidRoutes, row.routes)}
                              disabled={row.unpaidRoutes === 0}
                              title="Pagar 1 rota"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-primary hover:bg-primary/10"
                              onClick={() => void handlePayAllRoutes(row.id, row.routes)}
                              disabled={row.unpaidRoutes === 0}
                              title="Pagar todas as rotas restantes"
                            >
                              <DollarSign className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 text-warning hover:bg-warning/10"
                              onClick={() => void handleUndoOneRoute(row.id, row.paidRoutes)}
                              disabled={row.paidRoutes === 0}
                              title="Desfazer 1 rota paga"
                            >
                              <RotateCcw className="h-3.5 w-3.5" />
                            </Button>
                            <button
                              onClick={() => void handleDelete(row.id)}
                              className="rounded-lg p-1 text-muted-foreground/40 transition-colors hover:bg-destructive/10 hover:text-loss"
                              aria-label={`Remover diária de ${row.driverName}`}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="flex h-24 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                <Route className="h-5 w-5 text-muted-foreground/50" />
                <p>Nenhuma diária registrada neste mês.</p>
              </div>
            )}

            {rows.length > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-xs font-medium text-muted-foreground">{totalRoutes} rotas no mês</span>
                <span className="text-sm font-bold tabular-nums">{fmt(totalValue)}</span>
              </div>
            )}
          </div>

          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                Saldo Devedor por Motorista
              </h3>

              {summaries.length > 0 ? (
                <div className="space-y-2.5">
                  {summaries.map((summary) => (
                    <div
                      key={summary.id}
                      className={`flex items-center justify-between rounded-xl border px-4 py-3 ${
                        summary.unpaidAmount > 0 ? "border-warning/30 bg-warning/5" : "border-profit/20 bg-profit/5"
                      }`}
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {summary.unpaidAmount > 0 ? (
                          <Clock className="h-4 w-4 shrink-0 text-warning" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-profit" />
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold">{summary.driverName}</p>
                          <p className="text-xs text-muted-foreground">
                            {summary.paidRoutes}/{summary.totalRoutes} rotas pagas · pago {fmt(summary.paidAmount)}
                          </p>
                        </div>
                      </div>
                      <span className={`ml-2 text-sm font-bold tabular-nums ${summary.unpaidAmount > 0 ? "text-warning" : "text-profit"}`}>
                        {fmt(summary.unpaidAmount)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Registre diárias para ver a somatória.</p>
              )}

              {summaries.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                  <div className="flex items-center justify-between rounded-xl bg-warning/10 px-4 py-2.5">
                    <span className="text-xs font-semibold text-warning">Total Devedor</span>
                    <span className="text-sm font-bold tabular-nums text-warning">{fmt(pendingTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-profit/10 px-4 py-2.5">
                    <span className="text-xs font-semibold text-profit">Total Pago</span>
                    <span className="text-sm font-bold tabular-nums text-profit">{fmt(paidTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">Total Geral do Mês</span>
                    <span className="text-sm font-bold tabular-nums">{fmt(totalValue)}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-card">
              <div className="flex items-start gap-2">
                <DollarSign className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Como funciona</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Cada lançamento guarda quantas rotas já foram pagas. O custo total do mês permanece o mesmo, mas o <strong>saldo devedor</strong> cai conforme você marca rotas como quitadas.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
