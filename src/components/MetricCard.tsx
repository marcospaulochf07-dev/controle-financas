import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  type?: "neutral" | "profit" | "loss";
  delay?: number;
}

export function MetricCard({ label, value, type = "neutral", delay = 0 }: MetricCardProps) {
  const isProfit = type === "profit";
  const isLoss = type === "loss";

  const gradientClass = isProfit
    ? "from-profit/10 to-profit/5"
    : isLoss
      ? "from-loss/10 to-loss/5"
      : "from-primary/10 to-primary/5";

  const iconBgClass = isProfit
    ? "bg-profit/15 text-profit"
    : isLoss
      ? "bg-loss/15 text-loss"
      : "bg-primary/15 text-primary";

  const valueColorClass = isProfit
    ? "text-profit"
    : isLoss
      ? "text-loss"
      : "text-foreground";

  const Icon = isProfit ? TrendingUp : isLoss ? TrendingDown : DollarSign;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${gradientClass} border border-border/50 p-5 shadow-card transition-shadow duration-300 hover:shadow-card-hover`}
      role="region"
      aria-label={`${label}: ${value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br from-primary/5 to-transparent" aria-hidden="true" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {label}
          </p>
          <p className={`text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${valueColorClass}`}>
            {value.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>
        <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${iconBgClass}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
