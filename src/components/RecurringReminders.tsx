import { useEffect, useMemo, useState } from "react";
import { Bell, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CATEGORY_LABELS, Expense, ExpenseCategory, RecurringTemplate, SORTED_CATEGORIES } from "@/lib/types";
import {
  deactivateRecurringTemplateAsync,
  ensureRecurringExpensesForMonth,
  saveRecurringTemplateAsync,
  saveExpense,
  updateExpenseStatus,
} from "@/lib/store";
import { toast } from "sonner";
import { useRecurringTemplates } from "@/hooks/use-recurring-templates";
import { createDateString } from "@/lib/date-utils";

interface Props {
  expenses: Expense[];
  onUpdated: () => void;
  driverDailiesTotal?: number;
  driverDailiesPendingTotal?: number;
  selectedYear: number;
  selectedMonth: number;
}

interface ReminderRow {
  id: string;
  label: string;
  dayOfMonth: number;
  amount: number;
  category: ExpenseCategory;
  status: "pago" | "pendente";
  readOnly: boolean;
  expenseId?: string;
}

function buildReminderRows(
  templates: RecurringTemplate[],
  expenses: Expense[],
  selectedYear: number,
  selectedMonth: number,
  driverDailiesTotal: number,
  driverDailiesPendingTotal: number,
): ReminderRow[] {
  const monthKey = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const selectedMonthExpenses = expenses.filter((expense) => expense.source === "recorrente-auto" && expense.date.startsWith(monthKey));
  const byDescription = new Map(selectedMonthExpenses.map((expense) => [expense.description, expense]));

  return templates.map((template) => {
    if (template.category === "diaria") {
      return {
        id: template.id,
        label: template.label,
        dayOfMonth: template.dayOfMonth,
        amount: driverDailiesTotal,
        category: template.category,
        status: driverDailiesPendingTotal > 0 ? "pendente" : "pago",
        readOnly: true,
      };
    }

    const occurrence = byDescription.get(template.label);
    return {
      id: template.id,
      label: template.label,
      dayOfMonth: template.dayOfMonth,
      amount: template.amount,
      category: template.category,
      status: occurrence?.status || "pendente",
      readOnly: false,
      expenseId: occurrence?.id,
    };
  });
}

export function RecurringReminders({
  expenses,
  onUpdated,
  driverDailiesTotal = 0,
  driverDailiesPendingTotal = 0,
  selectedYear,
  selectedMonth,
}: Props) {
  const { templates, refresh } = useRecurringTemplates();
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState("");
  const [day, setDay] = useState("5");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<ExpenseCategory>("imposto");

  useEffect(() => {
    if (templates.length === 0) return;

    let cancelled = false;

    const syncMonth = async () => {
      const changed = await ensureRecurringExpensesForMonth(selectedYear, selectedMonth, templates);
      if (changed && !cancelled) {
        onUpdated();
      }
    };

    void syncMonth();

    return () => {
      cancelled = true;
    };
  }, [onUpdated, selectedMonth, selectedYear, templates]);

  const rows = useMemo(
    () =>
      buildReminderRows(
        templates,
        expenses,
        selectedYear,
        selectedMonth,
        driverDailiesTotal,
        driverDailiesPendingTotal,
      ),
    [templates, expenses, selectedYear, selectedMonth, driverDailiesTotal, driverDailiesPendingTotal],
  );

  const refreshAll = async () => {
    await refresh();
    onUpdated();
  };

  const handleAdd = async () => {
    const numAmount = parseFloat(amount.replace(",", "."));
    const dayOfMonth = parseInt(day, 10);

    if (!label.trim() || Number.isNaN(numAmount) || numAmount <= 0 || Number.isNaN(dayOfMonth) || dayOfMonth < 1 || dayOfMonth > 31) {
      toast.error("Preencha todos os campos.");
      return;
    }

    await saveRecurringTemplateAsync({
      label: label.trim(),
      dayOfMonth,
      amount: numAmount,
      category,
    });

    toast.success("Lembrete recorrente adicionado.");
    setLabel("");
    setDay("5");
    setAmount("");
    setAdding(false);
    await refreshAll();
  };

  const handleDelete = async (templateId: string) => {
    await deactivateRecurringTemplateAsync(templateId);
    toast("Lembrete removido.");
    await refreshAll();
  };

  const handleTogglePaid = async (row: ReminderRow) => {
    if (row.readOnly) return;

    const nextStatus = row.status === "pago" ? "pendente" : "pago";
    const occurrenceDate = createDateString(selectedYear, selectedMonth, row.dayOfMonth);

    if (row.expenseId) {
      await updateExpenseStatus(row.expenseId, nextStatus);
    } else {
      await saveExpense({
        date: occurrenceDate,
        category: row.category,
        description: row.label,
        vehicle: "Geral",
        amount: row.amount,
        status: nextStatus,
        source: "recorrente-auto",
      });
    }

    toast.success("Status atualizado!");
    await refreshAll();
  };

  const totalMonthly = rows.reduce((sum, row) => sum + row.amount, 0);
  const pendingRows = rows.filter((row) => row.status !== "pago");
  const paidRows = rows.filter((row) => row.status === "pago");

  return (
    <div className="shadow-card rounded-2xl border border-border/50 bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Custos Fixos Mensais
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Total mensal:{" "}
            <span className="font-bold text-foreground">
              {totalMonthly.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
            </span>
          </p>
        </div>
        <Button size="sm" variant="ghost" className="h-7 gap-1 text-xs" onClick={() => setAdding((value) => !value)}>
          <Plus className="h-3 w-3" />
          Novo
        </Button>
      </div>

      {adding && (
        <div className="mb-4 space-y-2 rounded-xl border border-border/50 bg-muted/30 p-3">
          <Input
            placeholder="Ex: Imposto da nota fiscal"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            className="h-8 text-sm"
          />
          <div className="flex gap-2">
            <Select value={category} onValueChange={(value) => setCategory(value as ExpenseCategory)}>
              <SelectTrigger className="h-8 flex-1 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORTED_CATEGORIES.filter(([key]) => key !== "diaria").map(([key, optionLabel]) => (
                  <SelectItem key={key} value={key}>
                    {optionLabel}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="Dia"
              value={day}
              onChange={(event) => setDay(event.target.value)}
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
              onChange={(event) => setAmount(event.target.value)}
              className="h-8 flex-1 text-sm"
            />
            <Button size="sm" className="h-8" onClick={() => void handleAdd()}>
              Salvar
            </Button>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum lembrete recorrente.</p>
      ) : (
        <>
          {pendingRows.length > 0 && (
            <div className="space-y-2">
              {pendingRows.map((row) => (
                <div key={row.id} className="flex items-center justify-between rounded-xl border border-border/50 bg-muted/20 px-4 py-3">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <Bell className={`h-3.5 w-3.5 shrink-0 ${row.readOnly ? "text-primary" : "text-warning"}`} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{row.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[row.category]} · Dia {row.dayOfMonth} ·{" "}
                        <span className="font-semibold">
                          {row.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="ml-2 flex items-center gap-1">
                    {!row.readOnly && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-profit hover:bg-profit/10 hover:text-profit"
                        onClick={() => void handleTogglePaid(row)}
                        title="Marcar como pago"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                    )}
                    {!row.readOnly && (
                      <button
                        onClick={() => void handleDelete(row.id)}
                        className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {paidRows.length > 0 && (
            <div className={pendingRows.length > 0 ? "mt-4 border-t pt-4" : ""}>
              <h4 className="mb-2 text-xs font-medium text-muted-foreground">Pagos neste mês</h4>
              <div className="space-y-1.5">
                {paidRows.map((row) => (
                  <div
                    key={row.id}
                    className="flex items-center justify-between rounded-xl border border-profit/20 bg-profit/5 px-4 py-2.5"
                  >
                    <div className="flex min-w-0 flex-1 items-center gap-2">
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-profit" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-muted-foreground">{row.label}</p>
                        <p className="text-xs text-muted-foreground/70">
                          {row.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                        </p>
                      </div>
                    </div>
                    <div className="ml-2 flex items-center gap-1">
                      {!row.readOnly && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-warning hover:bg-warning/10"
                          onClick={() => void handleTogglePaid(row)}
                          title="Voltar para pendente"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      {!row.readOnly && (
                        <button
                          onClick={() => void handleDelete(row.id)}
                          className="rounded p-1 text-muted-foreground/50 hover:bg-destructive/10 hover:text-loss"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
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
