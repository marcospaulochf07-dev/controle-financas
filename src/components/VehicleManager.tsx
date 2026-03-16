import { useState } from "react";
import { Pencil, Check, X, Truck, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getVehicleNames, setVehicleName } from "@/lib/store";
import { getVehicles, addVehicle, removeVehicle } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  onUpdated: () => void;
}

export function VehicleManager({ onUpdated }: Props) {
  const [vehicles, setVehicles] = useState(getVehicles);
  const names = getVehicleNames();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState("");

  const refreshVehicles = () => setVehicles(getVehicles());

  const startEdit = (vehicleId: string) => {
    setEditingId(vehicleId);
    setEditValue(names[vehicleId] || vehicleId);
  };

  const save = () => {
    if (editingId && editValue.trim()) {
      setVehicleName(editingId, editValue.trim());
      onUpdated();
    }
    setEditingId(null);
  };

  const handleAdd = () => {
    if (!newVehicle.trim()) return;
    addVehicle(newVehicle.trim());
    toast.success("Veículo adicionado!");
    setNewVehicle("");
    setAdding(false);
    refreshVehicles();
    onUpdated();
  };

  const handleRemove = (v: string) => {
    removeVehicle(v);
    toast("Veículo removido.");
    refreshVehicles();
    onUpdated();
  };

  return (
    <div className="shadow-card rounded-xl bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Veículos
        </h3>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Novo
        </Button>
      </div>

      {adding && (
        <div className="mb-3 flex gap-2">
          <Input
            placeholder="Nome do veículo"
            value={newVehicle}
            onChange={(e) => setNewVehicle(e.target.value)}
            className="h-8 text-sm"
            autoFocus
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <Button size="sm" className="h-8" onClick={handleAdd}>Adicionar</Button>
        </div>
      )}

      <div className="space-y-2">
        {vehicles.map((v) => (
          <div key={v} className="flex items-center justify-between rounded-lg bg-accent/30 px-3 py-2">
            {editingId === v ? (
              <div className="flex flex-1 items-center gap-2">
                <Input
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="h-7 text-sm"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && save()}
                />
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={save}>
                  <Check className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <Truck className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm font-medium">{names[v] || v}</span>
                  {names[v] && names[v] !== v && (
                    <span className="text-xs text-muted-foreground">({v})</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => startEdit(v)}
                    className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <Pencil className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleRemove(v)}
                    className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
