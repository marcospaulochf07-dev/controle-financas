import { useState, useMemo, useEffect } from "react";
import { Bell, Plus, Trash2, CheckCircle2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RecurringReminder, ExpenseCategory, SORTED_CATEGORIES, CATEGORY_LABELS } from "@/lib/types";
import { getRecurringReminders, saveRecurringReminder, deleteRecurringReminder, toggleRecurringReminderPaid, saveExpense } from "@/lib/store";
import { toast } from "sonner";
import { useExpenses } from "@/hooks/use-expenses";

const DEFAULT_RECURRING: Omit<RecurringReminder, "id">[] = [
  { label: "Contador", dayOfMonth: 10, amount: 810, category: "contador" },
  { label: "Imposto da Nota (6%)", dayOfMonth: 15, amount: 1250, category: "imposto" },
  { label: "Parcela Financiamento", dayOfMonth: 5, amount: 4500, category: "financiamento" },
  { label: "Seguro", dayOfMonth: 10, amount: 400, category: "seguro" },
  { label: "Férias e 13º", dayOfMonth: 5, amount: 400, category: "salario" },
];

interface Props {
  onUpdated: () => void;
  driverDailiesTotal?: number;
}

function getMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function seedDefaults() {
  const existing = getRecurringReminders();
  if (existing.length === 0) {
    for (const item of DEFAULT_RECURRING) {
      saveRecurringReminder(item);
    }
    saveRecurringReminder({ label: "Diárias dos Motoristas", dayOfMonth: 30, amount: 0, category: "diaria" });
  }
}

// Check and reset paid status at beginning of each month
function checkMonthlyReset() {
  const LAST_RESET_KEY = "recurring-last-reset-month";
  const currentMonth = getMonthKey();
  const lastReset = localStorage.getItem(LAST_RESET_KEY);

  if (lastReset !== currentMonth) {
    // New month — reset all paid statuses to unpaid
    const reminders = getRecurringReminders();
    for (const r of reminders) {
      if (r.paid) {
        toggleRecurringReminderPaid(r.id); // toggle back to unpaid
      }
    }
    localStorage.setItem(LAST_RESET_KEY, currentMonth);
  }
}

// Sync recurring reminders as pending expenses in the DB for current month (returns true if any created)
async function syncRecurringToExpenses(reminders: RecurringReminder[], expenses: { category: string; source?: string; description: string; date: string }[]): Promise<boolean> {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
  let created = false;

  for (const r of reminders) {
    if (r.amount <= 0) continue;
    if (r.category === "diaria") continue;

    // Check if expense already exists for this recurring item this month
    const alreadyExists = expenses.some((e) => {
      const d = new Date(e.date);
      return (e.source === "recorrente-auto") &&
        e.description === r.label &&
        d.getFullYear() === year && d.getMonth() === month;
    });

    if (!alreadyExists) {
      const day = Math.min(r.dayOfMonth, 28);
      await saveExpense({
        date: `${monthStr}-${String(day).padStart(2, "0")}`,
        category: r.category,
        description: r.label,
        vehicle: "Geral",
        amount: r.amount,
        status: "pendente",
        source: "recorrente-auto",
      });
      created = true;
    }
  }
  return created;
}

export function RecurringReminders({ onUpdated, driverDailiesTotal = 0 }: Props) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [day, setDay] = useState("5");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("imposto");
  const { expenses: allExpenses } = useExpenses();

  useEffect(() => {
    seedDefaults();
    checkMonthlyReset();
    setRefreshKey((k) => k + 1);
  }, []);

  const reminders = useMemo(() => {
    void refreshKey;
    return getRecurringReminders().map((r) => {
      if (r.category === "diaria" && r.label.toLowerCase().includes("diária")) {
        return { ...r, amount: driverDailiesTotal };
      }
      return r;
    });
  }, [refreshKey, driverDailiesTotal]);

  // No longer auto-syncing to expenses table to avoid duplication

  const refresh = () => {
    setRefreshKey((k) => k + 1);
    onUpdated();
  };

  const handleAdd = () => {
    const numAmount = parseFloat(amount.replace(",", "."));
    if (!label.trim() || isNaN(numAmount) || numAmount <= 0) {
      toast.error("Preencha todos os campos.");
      return;
    }
    saveRecurringReminder({
      label: label.trim(),
      dayOfMonth: parseInt(day),
      amount: numAmount,
      category,
    });
    toast.success("Lembrete recorrente adicionado.");
    setLabel("");
    setAmount("");
    setAdding(false);
    refresh();
  };

  const handleDelete = (id: string) => {
    deleteRecurringReminder(id);
    toast("Lembrete removido.");
    refresh();
  };

  const handleTogglePaid = (id: string) => {
    toggleRecurringReminderPaid(id);
    toast.success("Status atualizado!");
    refresh();
  };

  const today = new Date().getDate();
  const totalMonthly = reminders.reduce((s, r) => s + r.amount, 0);

  const pendingReminders = reminders.filter((r) => !r.paid);
  const paidReminders = reminders.filter((r) => r.paid);

  return (
    <div className="shadow-card rounded-2xl border border-border/50 bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Custos Fixos Mensais
          </h3>
          <p className="text-xs text-muted-foreground mt-1">
            Total mensal: <span className="font-bold text-foreground">{totalMonthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 gap-1 text-xs"
          onClick={() => setAdding(!adding)}
        >
          <Plus className="h-3 w-3" />
          Novo
        </Button>
      </div>

      {adding && (
        <div className="mb-4 space-y-2 rounded-xl border border-border/50 bg-muted/30 p-3">
          <Input
            placeholder="Ex: Imposto da nota fiscal"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTED_CATEGORIES.map(([key, lbl]) => (
                  <SelectItem key={key} value={key}>{lbl}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Dia"
              value={day}
              onChange={(e) => setDay(e.target.value)}
              type="number"
              min={1}
              max={31}
              className="h-8 w-16 text-sm"
            />
          </div>
          <div className="flex gap-2">
            <Input
              placeholder="Valor R$"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="h-8 text-sm flex-1"
            />
            <Button size="sm" className="h-8" onClick={handleAdd}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {pendingReminders.length === 0 && paidReminders.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum lembrete recorrente.</p>
      ) : (
        <>
          {pendingReminders.length > 0 && (
            <div className="space-y-2">
              {pendingReminders.map((r) => {
                const isNear = Math.abs(r.dayOfMonth - today) <= 3 || (today > 25 && r.dayOfMonth <= 3);
                return (
                  <div
                    key={r.id}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 border ${
                      isNear
                        ? "border-warning/30 bg-warning/5"
                        : "border-border/50 bg-muted/20"
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Bell className={`h-3.5 w-3.5 shrink-0 ${isNear ? "text-warning" : "text-muted-foreground"}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.label}</p>
                        <p className="text-xs text-muted-foreground">
                          {CATEGORY_LABELS[r.category]} · Dia {r.dayOfMonth} ·{" "}
                          <span className="font-semibold">{r.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-profit hover:bg-profit/10 hover:text-profit"
                        onClick={() => handleTogglePaid(r.id)}
                        title="Marcar como pago"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {paidReminders.length > 0 && (
            <div className={pendingReminders.length > 0 ? "mt-4 pt-4 border-t" : ""}>
              <h4 className="text-xs font-medium text-muted-foreground mb-2">Pagos este mês</h4>
              <div className="space-y-1.5">
                {paidReminders.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl px-4 py-2.5 bg-profit/5 border border-profit/20"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <CheckCircle2 className="h-3.5 w-3.5 text-profit shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-muted-foreground truncate">{r.label}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {r.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 ml-2">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-warning hover:bg-warning/10"
                        onClick={() => handleTogglePaid(r.id)}
                        title="Voltar para pendente"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                      </Button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
