import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { DriverDaily, Expense, MonthlyRevenue } from "@/lib/types";
import { getMonthCostTotal } from "@/lib/driver-daily-expenses";

const MONTH_LABELS = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

interface Props {
  allExpenses: Expense[];
  allDriverDailies: DriverDaily[];
  revenues: MonthlyRevenue[];
  year: number;
}

export function RevenueChart({ allExpenses, allDriverDailies, revenues, year }: Props) {
  const data = useMemo(() => {
    const revenueMap = new Map(revenues.map((item) => [item.monthKey, item.amount]));
    return MONTH_LABELS.map((label, i) => {
      const key = `${year}-${String(i + 1).padStart(2, "0")}`;
      const revenue = revenueMap.get(key) ?? 20000;
      const cost = getMonthCostTotal(allExpenses, allDriverDailies, year, i);
      return { name: label, receita: revenue, custo: cost };
    });
  }, [allDriverDailies, allExpenses, revenues, year]);

  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-2xl border border-border/50 bg-card p-5 shadow-card"
    >
      <h3 className="mb-4 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Receita vs Custo — {year}
      </h3>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 5, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 91%)" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fontFamily: 'DM Sans' }} stroke="hsl(220 10% 46%)" />
            <YAxis tick={{ fontSize: 10, fontFamily: 'DM Sans' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} stroke="hsl(220 10% 46%)" />
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
            <Legend wrapperStyle={{ fontSize: 11, fontFamily: 'DM Sans' }} />
            <Bar dataKey="receita" name="Receita" fill="hsl(152 60% 42%)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="custo" name="Custo" fill="hsl(0 72% 51%)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </motion.div>
  );
}
