import { useMemo } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RotateCcw } from "lucide-react";
import { Expense, CATEGORY_LABELS } from "@/lib/types";
import { getVehicleName } from "@/lib/store";
import { Button } from "@/components/ui/button";

interface Props {
  expenses: Expense[];
  onMarkPending: (id: string) => void;
}

export function PaidExpenses({ expenses, onMarkPending }: Props) {
  const paid = useMemo(
    () =>
      expenses
        .filter((e) => e.status === "pago")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );

  if (paid.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-card" role="status">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Pagamentos Realizados
        </h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-muted-foreground/50" aria-hidden="true" />
          Nenhum pagamento realizado neste mês.
        </div>
      </div>
    );
  }

  const totalPaid = paid.reduce((s, e) => s + e.amount, 0);

  const sourceLabel = (source?: string) => {
    if (source === "recorrente-auto") return "Custo fixo";
    if (source === "diaria-auto") return "Diária";
    if (source === "whatsapp") return "WhatsApp";
    return "Manual";
  };

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-card" role="region" aria-label="Pagamentos realizados">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Pagamentos Realizados
        </h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-profit/10 px-2.5 py-0.5 text-xs font-bold text-profit ring-1 ring-profit/20">
          <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
          {paid.length} pago{paid.length > 1 ? "s" : ""}
        </span>
      </div>

      <div className="space-y-2.5 max-h-[500px] overflow-y-auto" role="list">
        {paid.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.03 }}
            className="flex items-center justify-between rounded-xl border border-profit/20 bg-profit/5 px-4 py-3 transition-colors hover:bg-profit/10"
            role="listitem"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{CATEGORY_LABELS[e.category]}</p>
              <p className="text-xs text-muted-foreground truncate">
                {e.description ? `${e.description} · ` : ""}
                {getVehicleName(e.vehicle)} · {new Date(e.date).toLocaleDateString("pt-BR")}
                {" · "}
                <span className="text-muted-foreground/70">{sourceLabel(e.source)}</span>
              </p>
            </div>
            <div className="flex items-center gap-3 ml-3">
              <span className="text-sm font-bold tabular-nums text-profit whitespace-nowrap">
                {e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-warning hover:bg-warning/10 hover:text-warning rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                onClick={() => onMarkPending(e.id)}
                aria-label={`Voltar ${CATEGORY_LABELS[e.category]} para pendente`}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-sm text-muted-foreground font-semibold">Total pago</span>
        <span className="text-base font-bold tabular-nums text-profit" aria-live="polite">
          {totalPaid.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>
    </div>
  );
}
