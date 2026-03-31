import { motion } from "framer-motion";
import { Banknote, ReceiptText, TrendingDown, TrendingUp } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: number;
  type?: "neutral" | "revenue" | "cost" | "profit" | "loss";
  delay?: number;
}

export function MetricCard({ label, value, type = "neutral", delay = 0 }: MetricCardProps) {
  const isRevenue = type === "revenue";
  const isCost = type === "cost";
  const isProfit = type === "profit";
  const isLoss = type === "loss";

  const gradientClass =
    isRevenue
      ? "from-sky-500/12 via-cyan-500/8 to-background"
      : isCost
        ? "from-amber-500/14 via-orange-500/10 to-background"
        : isProfit
          ? "from-profit/14 via-profit/8 to-background"
          : isLoss
            ? "from-loss/14 via-loss/8 to-background"
            : "from-primary/10 to-primary/5";

  const iconBgClass =
    isRevenue
      ? "bg-sky-100 text-sky-700 ring-1 ring-sky-200"
      : isCost
        ? "bg-amber-100 text-amber-700 ring-1 ring-amber-200"
        : isProfit
          ? "bg-profit/15 text-profit ring-1 ring-profit/15"
          : isLoss
            ? "bg-loss/15 text-loss ring-1 ring-loss/15"
            : "bg-primary/15 text-primary ring-1 ring-primary/15";

  const valueColorClass =
    isRevenue
      ? "text-sky-950"
      : isCost
        ? "text-amber-950"
        : isProfit
          ? "text-profit"
          : isLoss
            ? "text-loss"
            : "text-foreground";

  const orbClass =
    isRevenue
      ? "from-sky-400/12"
      : isCost
        ? "from-amber-400/14"
        : isProfit
          ? "from-profit/12"
          : isLoss
            ? "from-loss/12"
            : "from-primary/8";

  const Icon =
    isRevenue ? Banknote :
    isCost ? ReceiptText :
    isProfit ? TrendingUp :
    isLoss ? TrendingDown :
    Banknote;

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
      <div className={`absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br ${orbClass} to-transparent`} aria-hidden="true" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-foreground/65">
            {label}
          </p>
          <p className={`text-2xl font-bold tabular-nums tracking-tight sm:text-3xl ${valueColorClass}`}>
            {value.toLocaleString("pt-BR", {
              style: "currency",
              currency: "BRL",
            })}
          </p>
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl shadow-sm ${iconBgClass}`} aria-hidden="true">
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}
