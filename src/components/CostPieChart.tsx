import { useMemo } from "react";
import { motion } from "framer-motion";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import { Expense, CATEGORY_LABELS } from "@/lib/types";

const COLORS = [
  "hsl(152 60% 42%)",
  "hsl(221 83% 53%)",
  "hsl(38 92% 50%)",
  "hsl(0 72% 51%)",
  "hsl(280 67% 55%)",
  "hsl(190 90% 50%)",
  "hsl(340 82% 52%)",
  "hsl(25 95% 53%)",
  "hsl(160 60% 45%)",
  "hsl(250 60% 55%)",
];

interface Props { expenses: Expense[]; }

export function CostPieChart({ expenses }: Props) {
  const data = useMemo(() => {
    const map: Record<string, number> = {};
    expenses.forEach((e) => {
      const label = CATEGORY_LABELS[e.category] || e.category;
      map[label] = (map[label] || 0) + e.amount;
    });
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [expenses]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  if (data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
      >
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Distribuição de Custos
        </h3>
        <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
    >
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Distribuição de Custos
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
              style={{ fontSize: 10, fontFamily: 'DM Sans' }}
              strokeWidth={0}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(0 0% 100%)",
                border: "1px solid hsl(220 13% 91%)",
                borderRadius: "0.625rem",
                fontSize: 12,
                fontFamily: 'DM Sans',
                boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
