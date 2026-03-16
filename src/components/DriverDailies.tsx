import { useState, useMemo, useCallback } from "react";
import { Plus, Trash2, Route, Users, UserPlus, CheckCircle2, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVehicles, Expense } from "@/lib/types";
import { getDriverDailies, saveDriverDaily, deleteDriverDaily, getVehicleName, getDrivers, addDriver, removeDriver, saveExpense, updateExpenseStatus, deleteExpense } from "@/lib/store";
import { toast } from "sonner";

interface Props {
  year: number;
  month: number;
  expenses: Expense[];
  onUpdated: () => void;
}

const VALUE_PER_ROUTE = 45;

export function DriverDailies({ year, month, expenses, onUpdated }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [driverName, setDriverName] = useState("");
  const [routes, setRoutes] = useState("2");
  const [vehicle, setVehicle] = useState("Van 01");
  const [newDriver, setNewDriver] = useState("");

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    onUpdated();
  }, [onUpdated]);

  const drivers = useMemo(() => {
    void refreshKey;
    return getDrivers();
  }, [refreshKey]);

  const allDailies = useMemo(() => {
    void refreshKey;
    return getDriverDailies();
  }, [refreshKey]);

  const filtered = useMemo(() => {
    return allDailies.filter((d) => {
      const dt = new Date(d.date);
      return dt.getFullYear() === year && dt.getMonth() === month;
    });
  }, [allDailies, year, month]);

  const totalRoutes = filtered.reduce((s, d) => s + d.routes, 0);
  const totalValue = filtered.reduce((s, d) => s + d.routes * d.valuePerRoute, 0);

  const byDriver = useMemo(() => {
    const map: Record<string, { routes: number; value: number }> = {};
    for (const d of filtered) {
      if (!map[d.driverName]) map[d.driverName] = { routes: 0, value: 0 };
      map[d.driverName].routes += d.routes;
      map[d.driverName].value += d.routes * d.valuePerRoute;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  // Find existing driver salary expenses for this month
  const driverExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const d = new Date(e.date);
      return e.category === "diaria" && e.source === "diaria-auto" &&
        d.getFullYear() === year && d.getMonth() === month;
    });
  }, [expenses, year, month]);

  const getDriverExpense = (driverName: string) => {
    return driverExpenses.find((e) => e.description.includes(driverName));
  };

  const syncDriverExpense = async (driverName: string, totalAmount: number) => {
    const existing = getDriverExpense(driverName);
    const monthLabel = `${String(month + 1).padStart(2, "0")}/${year}`;

    if (existing) {
      // Delete old and create new with updated amount (since we can't update amount via updateExpenseStatus)
      if (existing.amount !== totalAmount) {
        await deleteExpense(existing.id);
        await saveExpense({
          date: `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
          category: "diaria",
          description: `Diárias ${driverName} - ${monthLabel}`,
          vehicle: "Geral",
          amount: totalAmount,
          status: "pendente",
          source: "diaria-auto",
        });
      }
    } else if (totalAmount > 0) {
      await saveExpense({
        date: `${year}-${String(month + 1).padStart(2, "0")}-${String(new Date().getDate()).padStart(2, "0")}`,
        category: "diaria",
        description: `Diárias ${driverName} - ${monthLabel}`,
        vehicle: "Geral",
        amount: totalAmount,
        status: "pendente",
        source: "diaria-auto",
      });
    }
  };

  const handleAdd = async () => {
    const numRoutes = parseInt(routes);
    if (!driverName.trim() || numRoutes < 1 || numRoutes > 10) {
      toast.error("Preencha o nome do motorista e número de rotas (1-10).");
      return;
    }
    if (!drivers.includes(driverName.trim())) {
      addDriver(driverName.trim());
    }
    saveDriverDaily({
      date,
      driverName: driverName.trim(),
      routes: numRoutes,
      valuePerRoute: VALUE_PER_ROUTE,
      vehicle,
    });

    // Calculate new total for this driver
    const currentTotal = filtered
      .filter((d) => d.driverName === driverName.trim())
      .reduce((s, d) => s + d.routes * d.valuePerRoute, 0);
    const newTotal = currentTotal + numRoutes * VALUE_PER_ROUTE;

    await syncDriverExpense(driverName.trim(), newTotal);

    toast.success(`Diária registrada: ${numRoutes} rota${numRoutes > 1 ? "s" : ""} = R$ ${(numRoutes * VALUE_PER_ROUTE).toFixed(2)}`);
    setDriverName("");
    setRoutes("2");
    setAdding(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    const daily = allDailies.find((d) => d.id === id);
    deleteDriverDaily(id);

    if (daily) {
      const remainingTotal = filtered
        .filter((d) => d.driverName === daily.driverName && d.id !== id)
        .reduce((s, d) => s + d.routes * d.valuePerRoute, 0);

      if (remainingTotal === 0) {
        const exp = getDriverExpense(daily.driverName);
        if (exp) await deleteExpense(exp.id);
      } else {
        await syncDriverExpense(daily.driverName, remainingTotal);
      }
    }

    toast("Diária removida.");
    refresh();
  };

  const handleMarkPaid = async (driverName: string) => {
    const exp = getDriverExpense(driverName);
    if (exp) {
      await updateExpenseStatus(exp.id, "pago");
      toast.success(`Pagamento de ${driverName} marcado como pago!`);
      refresh();
    }
  };

  const handleMarkPending = async (driverName: string) => {
    const exp = getDriverExpense(driverName);
    if (exp) {
      await updateExpenseStatus(exp.id, "pendente");
      toast.success(`Pagamento de ${driverName} voltou para pendente.`);
      refresh();
    }
  };

  const handleAddDriver = () => {
    if (!newDriver.trim()) return;
    addDriver(newDriver.trim());
    toast.success("Motorista adicionado!");
    setNewDriver("");
    refresh();
  };

  const handleRemoveDriver = (name: string) => {
    removeDriver(name);
    toast("Motorista removido.");
    refresh();
  };

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="shadow-card rounded-xl bg-card p-5">
      <Tabs defaultValue="diarias">
        <TabsList className="mb-4">
          <TabsTrigger value="diarias" className="text-sm gap-1.5">
            <Route className="h-3.5 w-3.5" /> Diárias
          </TabsTrigger>
          <TabsTrigger value="motoristas" className="text-sm gap-1.5">
            <Users className="h-3.5 w-3.5" /> Motoristas
          </TabsTrigger>
        </TabsList>

        <TabsContent value="motoristas">
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nome do motorista"
                value={newDriver}
                onChange={(e) => setNewDriver(e.target.value)}
                className="h-9 text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddDriver()}
              />
              <Button size="sm" className="h-9 gap-1" onClick={handleAddDriver}>
                <UserPlus className="h-3.5 w-3.5" /> Adicionar
              </Button>
            </div>

            {drivers.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum motorista cadastrado. Adicione acima ou registre uma diária.</p>
            ) : (
              <div className="space-y-2">
                {drivers.map((name) => {
                  const driverData = byDriver.find(([n]) => n === name);
                  return (
                    <div key={name} className="flex items-center justify-between rounded-lg bg-accent/30 px-3 py-2">
                      <div>
                        <p className="text-sm font-medium">{name}</p>
                        {driverData ? (
                          <p className="text-xs text-muted-foreground">
                            {driverData[1].routes} rotas · Salário:{" "}
                            <span className="font-semibold text-foreground">
                              {fmt(driverData[1].value)}
                            </span>
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">Sem diárias neste mês</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveDriver(name)}
                        className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss transition-colors"
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
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Diárias dos Motoristas
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                R$ {VALUE_PER_ROUTE},00 por rota
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="h-8 gap-1 text-xs"
              onClick={() => setAdding(!adding)}
            >
              <Plus className="h-3 w-3" />
              Registrar
            </Button>
          </div>

          {adding && (
            <div className="mb-4 space-y-2 rounded-lg border bg-muted/30 p-3">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Motorista</Label>
                  {drivers.length > 0 ? (
                    <Select value={driverName} onValueChange={setDriverName}>
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        {drivers.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Input
                      placeholder="Nome do motorista"
                      value={driverName}
                      onChange={(e) => setDriverName(e.target.value)}
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
                    onChange={(e) => setRoutes(e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label className="text-xs">Data</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-sm" />
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Veículo</Label>
                  <Select value={vehicle} onValueChange={setVehicle}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getVehicles().filter((v) => v !== "Geral").map((v) => (
                        <SelectItem key={v} value={v}>{getVehicleName(v)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-muted-foreground">
                  Total: R$ {(parseInt(routes || "0") * VALUE_PER_ROUTE).toFixed(2)}
                </span>
                <Button size="sm" className="h-8" onClick={handleAdd}>
                  Salvar
                </Button>
              </div>
            </div>
          )}

          {/* Summary by driver with salary and payment status */}
          {byDriver.length > 0 && (
            <div className="mb-4 space-y-1.5">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Salário do Mês — Pagamento</h4>
              {byDriver.map(([name, data]) => {
                const exp = getDriverExpense(name);
                const isPaid = exp?.status === "pago";
                return (
                  <div
                    key={name}
                    className={`flex items-center justify-between rounded-lg px-3 py-2.5 border ${
                      isPaid ? "bg-profit/5 border-profit/20" : "bg-warning/5 border-warning/30"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {isPaid ? (
                        <CheckCircle2 className="h-4 w-4 text-profit shrink-0" />
                      ) : (
                        <Clock className="h-4 w-4 text-warning shrink-0" />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        <p className="text-xs text-muted-foreground">
                          {data.routes} rotas · {isPaid ? "Pago" : "Pendente"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className={`text-sm font-bold tabular-nums ${isPaid ? "text-profit" : "text-warning"}`}>
                        {fmt(data.value)}
                      </span>
                      {isPaid ? (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-warning hover:bg-warning/10"
                          onClick={() => handleMarkPending(name)}
                          title="Voltar para pendente"
                        >
                          <Clock className="h-3.5 w-3.5" />
                        </Button>
                      ) : (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-profit hover:bg-profit/10"
                          onClick={() => handleMarkPaid(name)}
                          title="Marcar como pago"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Total pending */}
              {(() => {
                const pendingTotal = byDriver
                  .filter(([name]) => getDriverExpense(name)?.status !== "pago")
                  .reduce((s, [, d]) => s + d.value, 0);
                return pendingTotal > 0 ? (
                  <div className="flex items-center justify-between rounded-lg bg-warning/10 px-3 py-2 mt-2">
                    <span className="text-xs font-semibold text-warning">Total Pendente</span>
                    <span className="text-sm font-bold tabular-nums text-warning">{fmt(pendingTotal)}</span>
                  </div>
                ) : null;
              })()}
            </div>
          )}

          {/* Recent entries */}
          {filtered.length > 0 ? (
            <div className="space-y-1">
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Registros</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {filtered.slice(0, 20).map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-lg px-3 py-1.5 border border-border/50 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Route className="h-3.5 w-3.5 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-sm truncate">
                          {d.driverName} — {d.routes} rota{d.routes > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getVehicleName(d.vehicle)} · {new Date(d.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-sm tabular-nums font-medium whitespace-nowrap">
                        R$ {(d.routes * d.valuePerRoute).toFixed(2)}
                      </span>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma diária registrada neste mês.</p>
          )}

          {/* Totals */}
          {filtered.length > 0 && (
            <div className="mt-3 flex items-center justify-between border-t pt-3">
              <span className="text-xs text-muted-foreground">{totalRoutes} rotas no mês</span>
              <span className="text-sm font-bold tabular-nums">
                {fmt(totalValue)}
              </span>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
