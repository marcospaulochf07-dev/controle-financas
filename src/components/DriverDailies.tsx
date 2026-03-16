import { useState, useMemo } from "react";
import { Plus, Trash2, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getVehicles } from "@/lib/types";
import { getDriverDailies, saveDriverDaily, deleteDriverDaily, getVehicleName } from "@/lib/store";
import { toast } from "sonner";

interface Props {
  year: number;
  month: number;
}

const VALUE_PER_ROUTE = 45;

export function DriverDailies({ year, month }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [driverName, setDriverName] = useState("");
  const [routes, setRoutes] = useState("2");
  const [vehicle, setVehicle] = useState("Van 01");

  const refresh = () => setRefreshKey((k) => k + 1);

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

  // Group by driver
  const byDriver = useMemo(() => {
    const map: Record<string, { routes: number; value: number }> = {};
    for (const d of filtered) {
      if (!map[d.driverName]) map[d.driverName] = { routes: 0, value: 0 };
      map[d.driverName].routes += d.routes;
      map[d.driverName].value += d.routes * d.valuePerRoute;
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const handleAdd = () => {
    const numRoutes = parseInt(routes);
    if (!driverName.trim() || numRoutes < 1 || numRoutes > 10) {
      toast.error("Preencha o nome do motorista e número de rotas (1-10).");
      return;
    }
    saveDriverDaily({
      date,
      driverName: driverName.trim(),
      routes: numRoutes,
      valuePerRoute: VALUE_PER_ROUTE,
      vehicle,
    });
    toast.success(`Diária registrada: ${numRoutes} rota${numRoutes > 1 ? "s" : ""} = R$ ${(numRoutes * VALUE_PER_ROUTE).toFixed(2)}`);
    setDriverName("");
    setRoutes("2");
    setAdding(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteDriverDaily(id);
    toast("Diária removida.");
    refresh();
  };

  return (
    <div className="shadow-card rounded-xl bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Diárias dos Motoristas
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            R$ {VALUE_PER_ROUTE},00 por rota
          </p>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 gap-1 text-xs"
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
              <Input
                placeholder="Nome do motorista"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                className="h-8 text-sm"
              />
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

      {/* Summary by driver */}
      {byDriver.length > 0 && (
        <div className="mb-4 space-y-1.5">
          {byDriver.map(([name, data]) => (
            <div key={name} className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2">
              <div>
                <p className="text-sm font-medium">{name}</p>
                <p className="text-xs text-muted-foreground">{data.routes} rotas no mês</p>
              </div>
              <span className="text-sm font-semibold tabular-nums">
                {data.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
            </div>
          ))}
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
            {totalValue.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </span>
        </div>
      )}
    </div>
  );
}
