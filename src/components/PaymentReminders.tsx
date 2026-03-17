import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Expense, CATEGORY_LABELS } from "@/lib/types";
import { getVehicleName } from "@/lib/store";
import { Button } from "@/components/ui/button";

interface Props { expenses: Expense[]; onMarkPaid: (id: string) => void; isFutureMonth?: boolean; }

export function PaymentReminders({ expenses, onMarkPaid, isFutureMonth = false }: Props) {
  const pending = useMemo(
    () => expenses.filter((e) => e.status === "pendente").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [expenses]
  );

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-card" role="status">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">Pagamentos Pendentes</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CheckCircle2 className="h-4 w-4 text-profit" aria-hidden="true" />
          Tudo em dia! Nenhum pagamento pendente.
        </div>
      </div>
    );
  }

  const totalPending = pending.reduce((s, e) => s + e.amount, 0);

  return (
    <div className={`rounded-2xl border border-border/50 bg-card p-6 shadow-card ${isFutureMonth ? "opacity-50" : ""}`} role="region" aria-label="Pagamentos pendentes">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Pagamentos Pendentes</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-bold text-warning ring-1 ring-warning/20" role="status" aria-live="polite">
          <AlertTriangle className="h-3 w-3" aria-hidden="true" />{pending.length} pendente{pending.length > 1 ? "s" : ""}
        </span>
      </div>
      <div className="space-y-2.5 max-h-[400px] overflow-y-auto" role="list" aria-label="Lista de pagamentos pendentes">
        {pending.map((e, i) => (
          <motion.div
            key={e.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: i * 0.04 }}
            className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 px-4 py-3 transition-colors hover:bg-warning/10"
            role="listitem"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">{CATEGORY_LABELS[e.category]}</p>
              <p className="text-xs text-muted-foreground truncate">
                {e.description ? `${e.description} · ` : ""}{getVehicleName(e.vehicle)} · {new Date(e.date).toLocaleDateString("pt-BR")}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-3">
              <span className="text-sm font-bold tabular-nums text-warning whitespace-nowrap">
                {e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {!isFutureMonth && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 w-8 p-0 text-profit hover:bg-profit/10 hover:text-profit rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={() => onMarkPaid(e.id)}
                  aria-label={`Marcar ${CATEGORY_LABELS[e.category]} como pago`}
                >
                  <CheckCircle2 className="h-4.5 w-4.5" />
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-sm text-muted-foreground font-semibold">Total pendente</span>
        <span className="text-base font-bold tabular-nums text-warning" aria-live="polite">
          {totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>
    </div>
  );
}
