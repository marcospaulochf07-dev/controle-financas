import React, { useState, useMemo, useCallback, useEffect } from "react";
import { Plus, Trash2, Route, Users, UserPlus, CheckCircle2, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { getVehicles, Expense } from "@/lib/types";
import { saveDriverDailyAsync, deleteDriverDailyAsync, getVehicleName, getDrivers, addDriver, removeDriver, updateExpenseStatus } from "@/lib/store";
import { buildConsolidatedDriverExpenses, getDriverDailyDescription, syncDriverDailyExpenses } from "@/lib/driver-daily-expenses";
import { useDriverDailies } from "@/hooks/use-driver-dailies";
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

  const { dailies: allDailies, refresh: refreshDailies } = useDriverDailies();

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
    refreshDailies();
    onUpdated();
  }, [onUpdated, refreshDailies]);

  const drivers = useMemo(() => {
    void refreshKey;
    return getDrivers();
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

  const driverExpenses = useMemo(() => {
    return buildConsolidatedDriverExpenses(expenses, allDailies, year, month);
  }, [expenses, allDailies, year, month]);

  const syncingRef = React.useRef(false);
  useEffect(() => {
    if (syncingRef.current) return;
    syncingRef.current = true;
    void syncDriverDailyExpenses(expenses, allDailies, year, month).then((changed) => {
      syncingRef.current = false;
      if (changed) {
        onUpdated();
      }
    }).catch(() => { syncingRef.current = false; });
  }, [allDailies, year, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const getDriverExpense = (name: string) => {
    return driverExpenses.find((e) => e.description === getDriverDailyDescription(name, year, month));
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
    await saveDriverDailyAsync({
      date,
      driverName: driverName.trim(),
      routes: numRoutes,
      valuePerRoute: VALUE_PER_ROUTE,
      vehicle,
    });

    toast.success(`+${numRoutes} rota${numRoutes > 1 ? "s" : ""} para ${driverName.trim()} = R$ ${(numRoutes * VALUE_PER_ROUTE).toFixed(2)}`);
    setDriverName("");
    setRoutes("2");
    setAdding(false);
    refresh();
  };

  const handleDelete = async (id: string) => {
    const daily = allDailies.find((d) => d.id === id);
    await deleteDriverDailyAsync(id);

    if (daily) {
      const remainingDriverHasDailies = filtered.some((d) => d.driverName === daily.driverName && d.id !== id);
      if (!remainingDriverHasDailies) {
        toast("Última diária do motorista removida.");
      }
    }

    toast("Diária removida.");
    refresh();
  };

  const handleMarkPaid = async (name: string) => {
    const exp = getDriverExpense(name);
    if (exp) {
      await updateExpenseStatus(exp.id, "pago");
      toast.success(`Pagamento de ${name} marcado como pago!`);
      refresh();
    }
  };

  const handleMarkPending = async (name: string) => {
    const exp = getDriverExpense(name);
    if (exp) {
      await updateExpenseStatus(exp.id, "pendente");
      toast.success(`Pagamento de ${name} voltou para pendente.`);
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

  const pendingTotal = byDriver
    .filter(([name]) => getDriverExpense(name)?.status !== "pago")
    .reduce((s, [, d]) => s + d.value, 0);

  return (
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
        <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card space-y-4">
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
            <p className="text-sm text-muted-foreground">Nenhum motorista cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {drivers.map((name) => {
                const driverData = byDriver.find(([n]) => n === name);
                return (
                  <div key={name} className="flex items-center justify-between rounded-xl bg-accent/30 px-3 py-2.5">
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      {driverData ? (
                        <p className="text-xs text-muted-foreground">
                          {driverData[1].routes} rotas · {fmt(driverData[1].value)}
                        </p>
                      ) : (
                        <p className="text-xs text-muted-foreground">Sem diárias neste mês</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveDriver(name)}
                      className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss transition-colors"
                      aria-label={`Remover ${name}`}
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
          {/* LEFT: Registros individuais */}
          <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Registros de Diárias
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

            {/* Individual entries list */}
            {filtered.length > 0 ? (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {filtered.map((d) => (
                  <div
                    key={d.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2 border border-border/30 hover:bg-accent/30 transition-colors"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Route className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {d.driverName} — {d.routes} rota{d.routes > 1 ? "s" : ""}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getVehicleName(d.vehicle)} · {new Date(d.date).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-2">
                      <span className="text-sm tabular-nums font-semibold whitespace-nowrap">
                        {fmt(d.routes * d.valuePerRoute)}
                      </span>
                      <button
                        onClick={() => handleDelete(d.id)}
                        className="rounded-lg p-1 text-muted-foreground/40 hover:bg-destructive/10 hover:text-loss transition-colors"
                        aria-label={`Remover diária de ${d.driverName}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-24 flex-col items-center justify-center gap-1 text-sm text-muted-foreground">
                <Route className="h-5 w-5 text-muted-foreground/50" />
                <p>Nenhuma diária registrada neste mês.</p>
              </div>
            )}

            {/* Month totals */}
            {filtered.length > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-3">
                <span className="text-xs text-muted-foreground font-medium">{totalRoutes} rotas no mês</span>
                <span className="text-sm font-bold tabular-nums">{fmt(totalValue)}</span>
              </div>
            )}
          </div>

          {/* RIGHT: Somatória por motorista + status de pagamento */}
          <div className="lg:col-span-2 space-y-4">
            {/* Summary card */}
            <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card">
              <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-4">
                Somatória do Mês
              </h3>

              {byDriver.length > 0 ? (
                <div className="space-y-2.5">
                  {byDriver.map(([name, data]) => {
                    const exp = getDriverExpense(name);
                    const isPaid = exp?.status === "pago";
                    return (
                      <div
                        key={name}
                        className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
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
                            <p className="text-sm font-semibold truncate">{name}</p>
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
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Registre diárias para ver a somatória.</p>
              )}

              {/* Totals */}
              {byDriver.length > 0 && (
                <div className="mt-4 space-y-2 border-t border-border/50 pt-4">
                  {pendingTotal > 0 && (
                    <div className="flex items-center justify-between rounded-xl bg-warning/10 px-4 py-2.5">
                      <span className="text-xs font-semibold text-warning">Total Pendente</span>
                      <span className="text-sm font-bold tabular-nums text-warning">{fmt(pendingTotal)}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between rounded-xl bg-muted/40 px-4 py-2.5">
                    <span className="text-xs font-semibold text-muted-foreground">Total Geral do Mês</span>
                    <span className="text-sm font-bold tabular-nums">{fmt(totalValue)}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Info card */}
            <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-card">
              <div className="flex items-start gap-2">
                <DollarSign className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold text-foreground">Como funciona</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Cada diária registrada soma no total do motorista. O valor acumulado aparece automaticamente como <strong>pagamento pendente</strong> até ser marcado como pago.
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
