import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { Expense, CATEGORY_LABELS } from "@/lib/types";
import { getVehicleName } from "@/lib/store";
import { Button } from "@/components/ui/button";

interface Props { expenses: Expense[]; onMarkPaid: (id: string) => void; }

export function PaymentReminders({ expenses, onMarkPaid }: Props) {
  const pending = useMemo(
    () => expenses.filter((e) => e.status === "pendente").sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [expenses]
  );
  const recentlyPaid = useMemo(
    () => expenses.filter((e) => e.status === "pago").sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5),
    [expenses]
  );

  if (pending.length === 0 && recentlyPaid.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card" role="status">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Lembretes de Pagamento</h3>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" aria-hidden="true" />
          Nenhum pagamento registrado.
        </div>
      </div>
    );
  }

  const totalPending = pending.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="rounded-2xl border border-border/50 bg-card p-5 shadow-card" role="region" aria-label="Lembretes de pagamento">
      {pending.length > 0 && (
        <>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Pagamentos Pendentes</h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2.5 py-0.5 text-xs font-bold text-warning ring-1 ring-warning/20" role="status" aria-live="polite">
              <AlertTriangle className="h-3 w-3" aria-hidden="true" />{pending.length} pendente{pending.length > 1 ? "s" : ""}
            </span>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto" role="list" aria-label="Lista de pagamentos pendentes">
            {pending.map((e, i) => (
              <motion.div
                key={e.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="flex items-center justify-between rounded-xl border border-warning/20 bg-warning/5 px-3 py-2.5 transition-colors hover:bg-warning/10"
                role="listitem"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{CATEGORY_LABELS[e.category]}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {e.description ? `${e.description} · ` : ""}{getVehicleName(e.vehicle)} · {new Date(e.date).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  <span className="text-sm font-bold tabular-nums text-warning whitespace-nowrap">
                    {e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-profit hover:bg-profit/10 hover:text-profit rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    onClick={() => onMarkPaid(e.id)}
                    aria-label={`Marcar ${CATEGORY_LABELS[e.category]} como pago`}
                  >
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between border-t pt-3">
            <span className="text-xs text-muted-foreground font-medium">Total pendente</span>
            <span className="text-sm font-bold tabular-nums text-warning" aria-live="polite">{totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
          </div>
        </>
      )}

      {recentlyPaid.length > 0 && (
        <div className={pending.length > 0 ? "mt-4 pt-4 border-t" : ""}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">Últimos Pagos</h3>
          <div className="space-y-1.5 max-h-36 overflow-y-auto" role="list" aria-label="Pagamentos recentes">
            {recentlyPaid.map((e) => (
              <div key={e.id} className="flex items-center justify-between rounded-xl px-3 py-2 bg-profit/5 transition-colors hover:bg-profit/10" role="listitem">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-muted-foreground">{CATEGORY_LABELS[e.category]}</p>
                  <p className="text-xs text-muted-foreground/70 truncate">{new Date(e.date).toLocaleDateString("pt-BR")}</p>
                </div>
                <span className="text-sm tabular-nums font-semibold text-profit">{e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
