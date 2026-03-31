import { useMemo } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { CATEGORY_LABELS, FinancialEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { compareDateStringsDesc, formatDateForDisplay } from "@/lib/date-utils";

interface Props {
  expenses: FinancialEntry[];
  onMarkPaid: (entry: FinancialEntry) => void;
  isFutureMonth?: boolean;
  vehicleNameMap: Record<string, string>;
}

export function PaymentReminders({ expenses, onMarkPaid, isFutureMonth = false, vehicleNameMap }: Props) {
  const pending = useMemo(
    () => expenses.filter((e) => e.status === "pendente").sort((a, b) => compareDateStringsDesc(a.date, b.date)),
    [expenses]
  );

  if (pending.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-card" role="status">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-foreground/65">Pagamentos Pendentes</h3>
        <div className="flex items-center gap-2 text-sm text-foreground/72">
          <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
          Tudo em dia! Nenhum pagamento pendente.
        </div>
      </div>
    );
  }

  const totalPending = pending.reduce((s, e) => s + e.amount, 0);

  return (
    <div className={`rounded-2xl border border-border/50 bg-card p-6 shadow-card ${isFutureMonth ? "opacity-50" : ""}`} role="region" aria-label="Pagamentos pendentes">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/65">Pagamentos Pendentes</h3>
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700 ring-1 ring-amber-200" role="status" aria-live="polite">
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
            className={`flex items-center justify-between rounded-xl border px-4 py-3 transition-colors ${
              i % 2 === 0
                ? "border-amber-200 bg-amber-50/70 hover:bg-amber-50"
                : "border-amber-200/80 bg-background hover:bg-amber-50/40"
            }`}
            role="listitem"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[e.category]}</p>
                <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700 ring-1 ring-amber-200">
                  Em aberto
                </span>
              </div>
              <p className="mt-1 truncate text-xs leading-5 text-foreground/72">
                {e.description ? `${e.description} · ` : ""}{vehicleNameMap[e.vehicle] || e.vehicle} · {formatDateForDisplay(e.date)}
              </p>
            </div>
            <div className="flex items-center gap-3 ml-3">
              <span className="whitespace-nowrap text-sm font-bold tabular-nums text-amber-800">
                {e.amount.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </span>
              {!isFutureMonth && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 gap-1 rounded-lg border-emerald-200 bg-emerald-50 px-2 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  onClick={() => onMarkPaid(e)}
                  aria-label={`Marcar ${CATEGORY_LABELS[e.category]} como pago`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="hidden sm:inline">Pagar</span>
                </Button>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-border/50 pt-4">
        <span className="text-sm font-semibold text-foreground/72">Total pendente</span>
        <span className="text-base font-bold tabular-nums text-amber-800" aria-live="polite">
          {totalPending.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
        </span>
      </div>
    </div>
  );
}
