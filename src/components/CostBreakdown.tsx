import { Expense, CATEGORY_LABELS, ExpenseCategory } from "@/lib/types";

interface Props {
  expenses: Expense[];
}

export function CostBreakdown({ expenses }: Props) {
  const grouped: Partial<Record<ExpenseCategory, number>> = {};
  expenses.forEach((e) => {
    grouped[e.category] = (grouped[e.category] || 0) + e.amount;
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sorted = Object.entries(grouped).sort(([, a], [, b]) => b - a);

  return (
    <div className="shadow-card rounded-xl bg-card p-5">
      <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-4">
        Custos por Categoria
      </h3>
      <div className="space-y-3">
        {sorted.map(([cat, amount]) => {
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between text-sm">
                <span>{CATEGORY_LABELS[cat as ExpenseCategory]}</span>
                <span className="tabular-nums font-medium">
                  {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full rounded-full bg-accent">
                <div
                  className="h-1.5 rounded-full bg-muted-foreground/30 transition-all duration-300"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
