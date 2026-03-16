import { useMemo } from "react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { Expense, CATEGORY_LABELS } from "@/lib/types";

const COLORS = [
  "hsl(142 71% 45%)",
  "hsl(221 83% 53%)",
  "hsl(38 92% 50%)",
  "hsl(0 84% 60%)",
  "hsl(280 67% 55%)",
  "hsl(190 90% 50%)",
  "hsl(340 82% 52%)",
  "hsl(25 95% 53%)",
  "hsl(160 60% 45%)",
  "hsl(250 60% 55%)",
  "hsl(60 70% 50%)",
];

interface Props {
  expenses: Expense[];
}

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
      <div className="shadow-card rounded-xl bg-card p-5">
        <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Distribuição de Custos
        </h3>
        <p className="text-sm text-muted-foreground">Nenhum lançamento no período.</p>
      </div>
    );
  }

  return (
    <div className="shadow-card rounded-xl bg-card p-5">
      <h3 className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Distribuição de Custos
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              labelLine={{ strokeWidth: 1 }}
              style={{ fontSize: 10 }}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: "hsl(0 0% 100%)",
                border: "1px solid hsl(240 6% 90%)",
                borderRadius: "0.375rem",
                fontSize: 12,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
