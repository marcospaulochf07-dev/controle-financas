import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { getExpenses, getMonthlyRevenue } from "@/lib/store";
import { CATEGORY_LABELS, ExpenseCategory } from "@/lib/types";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props { year: number; month: number; }

function getMonthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function getPrev(y: number, m: number) {
  return m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
}

function DiffBadge({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current === 0) return <Minus className="h-3.5 w-3.5 text-muted-foreground" />;
  const diff = previous === 0 ? 100 : ((current - previous) / previous) * 100;
  const isUp = diff > 0;
  const color = isUp ? "text-loss" : "text-profit";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-bold ${color} ${isUp ? 'bg-loss/10' : 'bg-profit/10'}`}>
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {Math.abs(diff).toFixed(0)}%
    </span>
  );
}

export function MonthComparison({ year, month }: Props) {
  const prev = getPrev(year, month);

  const comparison = useMemo(() => {
    const expenses = getExpenses();
    const curKey = getMonthKey(year, month);
    const prevKey = getMonthKey(prev.y, prev.m);
    const curRevenue = getMonthlyRevenue(curKey);
    const prevRevenue = getMonthlyRevenue(prevKey);
    const curExpenses = expenses.filter((e) => { const d = new Date(e.date); return d.getFullYear() === year && d.getMonth() === month; });
    const prevExpenses = expenses.filter((e) => { const d = new Date(e.date); return d.getFullYear() === prev.y && d.getMonth() === prev.m; });
    const curTotal = curExpenses.reduce((s, e) => s + e.amount, 0);
    const prevTotal = prevExpenses.reduce((s, e) => s + e.amount, 0);
    const categories = new Set<ExpenseCategory>();
    [...curExpenses, ...prevExpenses].forEach((e) => categories.add(e.category));
    const catData = Array.from(categories)
      .map((cat) => ({
        category: cat,
        current: curExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
        previous: prevExpenses.filter((e) => e.category === cat).reduce((s, e) => s + e.amount, 0),
      }))
      .sort((a, b) => CATEGORY_LABELS[a.category].localeCompare(CATEGORY_LABELS[b.category], "pt-BR"));
    return { curRevenue, prevRevenue, curTotal, prevTotal, catData };
  }, [year, month, prev.y, prev.m]);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const prevLabel = `${MONTHS[prev.m].substring(0, 3)}/${prev.y}`;
  const curLabel = `${MONTHS[month].substring(0, 3)}/${year}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
    >
      <h3 className="mb-5 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Comparativo: {curLabel} vs {prevLabel}
      </h3>

      <div className="space-y-3">
        {[
          { label: "Receita", current: comparison.curRevenue, previous: comparison.prevRevenue },
          { label: "Custo Total", current: comparison.curTotal, previous: comparison.prevTotal },
        ].map((item, index) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.1 + index * 0.1 }}
            className="flex items-center justify-between rounded-xl bg-accent/40 px-4 py-3"
          >
            <span className="text-sm font-medium">{item.label}</span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">{fmt(item.previous)}</span>
              <span className="text-sm font-bold tabular-nums">{fmt(item.current)}</span>
              <DiffBadge current={item.current} previous={item.previous} />
            </div>
          </motion.div>
        ))}

        {comparison.catData.length > 0 && (
          <div className="mt-4 space-y-2 pt-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Por Categoria</p>
            {comparison.catData.map(({ category, current, previous }, index) => (
              <motion.div
                key={category}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: 0.3 + index * 0.05 }}
                className="flex items-center justify-between rounded-lg px-4 py-2 hover:bg-accent/30 transition-colors"
              >
                <span className="text-sm text-muted-foreground">{CATEGORY_LABELS[category]}</span>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground tabular-nums">{fmt(previous)}</span>
                  <span className="tabular-nums font-semibold text-sm">{fmt(current)}</span>
                  <DiffBadge current={current} previous={previous} />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
