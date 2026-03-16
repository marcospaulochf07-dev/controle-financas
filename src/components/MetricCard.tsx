interface MetricCardProps {
  label: string;
  value: number;
  type?: "neutral" | "profit" | "loss";
}

export function MetricCard({ label, value, type = "neutral" }: MetricCardProps) {
  const colorClass =
    type === "profit"
      ? "text-profit"
      : type === "loss"
        ? "text-loss"
        : "text-foreground";

  return (
    <div className="shadow-card rounded-xl bg-card p-5">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 text-3xl font-bold tabular-nums ${colorClass}`}>
        {value.toLocaleString("pt-BR", {
          style: "currency",
          currency: "BRL",
        })}
      </p>
    </div>
  );
}
