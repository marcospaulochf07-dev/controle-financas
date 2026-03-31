import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExpenseCategory, CATEGORY_LABELS, MANUAL_EXPENSE_CATEGORIES } from "@/lib/types";
import { saveExpense } from "@/lib/store";
import { toast } from "sonner";
import { useVehicles } from "@/hooks/use-vehicles";
import { getTodayInTimeZone } from "@/lib/date-utils";

interface Props { open: boolean; onClose: () => void; onSaved: () => void; }

export function NewExpenseModal({ open, onClose, onSaved }: Props) {
  const { vehicles } = useVehicles();
  const [date, setDate] = useState(getTodayInTimeZone());
  const [category, setCategory] = useState<ExpenseCategory>("manutencao");
  const [description, setDescription] = useState("");
  const [vehicle, setVehicle] = useState("Geral");
  const [amount, setAmount] = useState("");
  const [status, setStatus] = useState<"pago" | "pendente">("pago");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount.replace(",", "."));
    if (isNaN(numAmount) || numAmount <= 0) { toast.error("Informe um valor válido."); return; }
    await saveExpense({ date, category, description, vehicle, amount: numAmount, status });
    toast(`Gasto registrado: R$ ${numAmount.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} (${CATEGORY_LABELS[category]})`);
    setDate(getTodayInTimeZone());
    setDescription(""); setAmount(""); onSaved(); onClose();
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-card shadow-elevated"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 220 }}
          >
            <div className="flex items-center justify-between border-b px-6 py-4">
              <h2 className="text-base font-bold tracking-tight">Novo Lançamento</h2>
              <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-4 overflow-y-auto p-6">
              <div><Label className="text-xs font-semibold">Data</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg" /></div>
              <div><Label className="text-xs font-semibold">Categoria</Label>
                <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{MANUAL_EXPENSE_CATEGORIES.map(([key, label]) => (<SelectItem key={key} value={key}>{label}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold">Descrição</Label><Input placeholder="Ex: Troca de pneus dianteiros" value={description} onChange={(e) => setDescription(e.target.value)} className="rounded-lg" /></div>
              <div><Label className="text-xs font-semibold">Veículo</Label>
                <Select value={vehicle} onValueChange={setVehicle}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>{vehicles.map((v) => (<SelectItem key={v.id} value={v.id}>{v.displayName}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div><Label className="text-xs font-semibold">Valor (R$)</Label><Input placeholder="0,00" value={amount} onChange={(e) => setAmount(e.target.value)} className="tabular-nums rounded-lg" /></div>
              <div><Label className="text-xs font-semibold">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as "pago" | "pendente")}>
                  <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="pago">Pago</SelectItem><SelectItem value="pendente">Pendente</SelectItem></SelectContent>
                </Select>
              </div>
              <div className="mt-auto pt-4">
                <Button type="submit" className="w-full rounded-xl font-semibold shadow-md hover:shadow-lg transition-shadow">Registrar Lançamento</Button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
