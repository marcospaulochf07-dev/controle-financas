import { useMemo } from "react";
import { motion } from "framer-motion";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { CATEGORY_LABELS, DriverDaily, ExpenseCategory, Expense, MonthlyRevenue } from "@/lib/types";
import { getMonthCostByCategory, getMonthCostTotal } from "@/lib/driver-daily-expenses";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface Props {
  allExpenses: Expense[];
  allDriverDailies: DriverDaily[];
  revenues: MonthlyRevenue[];
  year: number;
  month: number;
}

function getMonthKey(y: number, m: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function getPrev(y: number, m: number) {
  return m === 0 ? { y: y - 1, m: 11 } : { y, m: m - 1 };
}

function getMonthsBack(y: number, m: number, count: number) {
  const result: { y: number; m: number }[] = [];
  let cy = y, cm = m;
  for (let i = 0; i < count; i++) {
    result.unshift({ y: cy, m: cm });
    if (cm === 0) { cy--; cm = 11; } else { cm--; }
  }
  return result;
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

const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

interface TooltipEntry {
  dataKey: string;
  color: string;
  name: string;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipEntry[];
  label?: string;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (!active || !payload) return null;
  return (
    <div className="rounded-lg border bg-card p-3 shadow-lg text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: {fmt(p.value)}
        </p>
      ))}
    </div>
  );
};

export function MonthComparison({ allExpenses, allDriverDailies, revenues, year, month }: Props) {
  const prev = getPrev(year, month);
  const revenueMap = useMemo(() => new Map(revenues.map((item) => [item.monthKey, item.amount])), [revenues]);

  // 6-month trend data
  const trendData = useMemo(() => {
    const months = getMonthsBack(year, month, 6);
    return months.map(({ y, m }) => {
      const key = getMonthKey(y, m);
      const revenue = revenueMap.get(key) ?? 20000;
      const expenses = getMonthCostTotal(allExpenses, allDriverDailies, y, m);
      return {
        name: `${MONTHS[m].substring(0, 3)}/${y.toString().slice(-2)}`,
        Receita: revenue,
        Custos: expenses,
        Lucro: revenue - expenses,
      };
    });
  }, [allDriverDailies, allExpenses, month, revenueMap, year]);

  // Category comparison current vs previous
  const categoryData = useMemo(() => {
    const currentByCategory = getMonthCostByCategory(allExpenses, allDriverDailies, year, month);
    const previousByCategory = getMonthCostByCategory(allExpenses, allDriverDailies, prev.y, prev.m);
    const categories = new Set<ExpenseCategory>([
      ...Object.keys(currentByCategory) as ExpenseCategory[],
      ...Object.keys(previousByCategory) as ExpenseCategory[],
    ]);

    return Array.from(categories)
      .map((cat) => ({
        name: CATEGORY_LABELS[cat],
        "Mês Atual": currentByCategory[cat] || 0,
        "Mês Anterior": previousByCategory[cat] || 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [allDriverDailies, allExpenses, month, prev.m, prev.y, year]);

  // Summary comparison
  const comparison = useMemo(() => {
    const curKey = getMonthKey(year, month);
    const prevKey = getMonthKey(prev.y, prev.m);
    const curRevenue = revenueMap.get(curKey) ?? 20000;
    const prevRevenue = revenueMap.get(prevKey) ?? 20000;
    const curTotal = getMonthCostTotal(allExpenses, allDriverDailies, year, month);
    const prevTotal = getMonthCostTotal(allExpenses, allDriverDailies, prev.y, prev.m);
    return { curRevenue, prevRevenue, curTotal, prevTotal };
  }, [allDriverDailies, allExpenses, month, prev.m, prev.y, revenueMap, year]);

  const prevLabel = `${MONTHS[prev.m].substring(0, 3)}/${prev.y}`;
  const curLabel = `${MONTHS[month].substring(0, 3)}/${year}`;

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
      >
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          {curLabel} vs {prevLabel}
        </h3>
        <div className="space-y-3">
          {[
            { label: "Receita", current: comparison.curRevenue, previous: comparison.prevRevenue },
            { label: "Custo Total", current: comparison.curTotal, previous: comparison.prevTotal },
            { label: "Lucro", current: comparison.curRevenue - comparison.curTotal, previous: comparison.prevRevenue - comparison.prevTotal },
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
        </div>
      </motion.div>

      {/* 6-month trend chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
      >
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Evolução — Últimos 6 Meses
        </h3>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={trendData} barGap={4}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
            <XAxis dataKey="name" tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Receita" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Custos" fill="hsl(0, 84%, 60%)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Lucro" fill="hsl(217, 91%, 60%)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Category comparison chart */}
      {categoryData.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
        >
          <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            Custos por Categoria — {curLabel} vs {prevLabel}
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(250, categoryData.length * 45)}>
            <BarChart data={categoryData} layout="vertical" barGap={2}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} className="fill-muted-foreground" />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="Mês Atual" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} />
              <Bar dataKey="Mês Anterior" fill="hsl(217, 91%, 60%, 0.35)" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}
    </div>
  );
}
