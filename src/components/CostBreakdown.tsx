import { motion } from "framer-motion";
import { Expense, CATEGORY_LABELS, ExpenseCategory } from "@/lib/types";

interface Props {
  expenses: Expense[];
}

const BAR_COLORS = [
  "bg-primary",
  "bg-blue-500",
  "bg-warning",
  "bg-loss",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-pink-500",
];

export function CostBreakdown({ expenses }: Props) {
  const grouped: Partial<Record<ExpenseCategory, number>> = {};
  expenses.forEach((e) => {
    grouped[e.category] = (grouped[e.category] || 0) + e.amount;
  });

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);
  const sorted = Object.entries(grouped).sort(([, a], [, b]) => b - a);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
    >
      <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-5">
        Custos por Categoria
      </h3>
      <div className="space-y-4">
        {sorted.map(([cat, amount], index) => {
          const pct = total > 0 ? (amount / total) * 100 : 0;
          return (
            <motion.div
              key={cat}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + index * 0.08 }}
            >
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="font-medium">{CATEGORY_LABELS[cat as ExpenseCategory]}</span>
                <span className="tabular-nums font-semibold">
                  {amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-accent overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + index * 0.08, ease: [0.22, 1, 0.36, 1] }}
                  className={`h-2 rounded-full ${BAR_COLORS[index % BAR_COLORS.length]}`}
                />
              </div>
            </motion.div>
          );
        })}
        {sorted.length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhum custo registrado.</p>
        )}
      </div>
    </motion.div>
  );
}
