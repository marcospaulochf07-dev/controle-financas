import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Check, X, Truck, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { deactivateVehicleAsync, saveVehicleAsync, updateVehicleDisplayNameAsync } from "@/lib/store";
import { toast } from "sonner";
import { useVehicles } from "@/hooks/use-vehicles";

interface Props { onUpdated: () => void; }

export function VehicleManager({ onUpdated }: Props) {
  const { vehicles, refresh } = useVehicles();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [adding, setAdding] = useState(false);
  const [newVehicle, setNewVehicle] = useState("");

  const startEdit = (vehicleId: string, currentName: string) => {
    setEditingId(vehicleId);
    setEditValue(currentName);
  };

  const save = async () => {
    if (editingId && editValue.trim()) {
      await updateVehicleDisplayNameAsync(editingId, editValue.trim());
      await refresh();
      onUpdated();
    }

    setEditingId(null);
  };

  const handleAdd = async () => {
    if (!newVehicle.trim()) return;
    await saveVehicleAsync(newVehicle.trim(), newVehicle.trim());
    toast.success("Veículo adicionado!");
    setNewVehicle("");
    setAdding(false);
    await refresh();
    onUpdated();
  };

  const handleRemove = async (vehicleId: string) => {
    await deactivateVehicleAsync(vehicleId);
    toast("Veículo removido.");
    await refresh();
    onUpdated();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Veículos</h3>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs rounded-lg" onClick={() => setAdding(!adding)}>
          <Plus className="h-3 w-3" /> Novo
        </Button>
      </div>

      <AnimatePresence>
        {adding && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mb-3 overflow-hidden">
            <div className="flex gap-2">
              <Input placeholder="Nome do veículo" value={newVehicle} onChange={(e) => setNewVehicle(e.target.value)} className="h-8 text-sm rounded-lg" autoFocus onKeyDown={(e) => e.key === "Enter" && handleAdd()} />
              <Button size="sm" className="h-8 rounded-lg" onClick={handleAdd}>Adicionar</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {vehicles.map((vehicle, i) => (
          <motion.div
            key={vehicle.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
            className="group flex items-center justify-between rounded-xl bg-accent/30 px-3 py-2.5 transition-colors hover:bg-accent/50"
          >
            {editingId === vehicle.id ? (
              <div className="flex flex-1 items-center gap-2">
                <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} className="h-7 text-sm rounded-lg" autoFocus onKeyDown={(e) => e.key === "Enter" && save()} />
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={save}><Check className="h-3.5 w-3.5" /></Button>
                <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={() => setEditingId(null)}><X className="h-3.5 w-3.5" /></Button>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                    <Truck className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <span className="text-sm font-medium">{vehicle.displayName}</span>
                  {vehicle.displayName !== vehicle.id && <span className="text-xs text-muted-foreground">({vehicle.id})</span>}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => startEdit(vehicle.id, vehicle.displayName)} className="rounded-lg p-1 text-muted-foreground hover:text-foreground transition-colors"><Pencil className="h-3 w-3" /></button>
                  <button onClick={() => void handleRemove(vehicle.id)} className="rounded-lg p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss transition-colors"><Trash2 className="h-3 w-3" /></button>
                </div>
              </>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}
