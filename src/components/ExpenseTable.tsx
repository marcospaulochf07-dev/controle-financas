import { motion } from "framer-motion";
import { Expense, CATEGORY_LABELS } from "@/lib/types";
import { getVehicleName } from "@/lib/store";
import { Trash2 } from "lucide-react";

interface ExpenseTableProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
}

export function ExpenseTable({ expenses, onDelete }: ExpenseTableProps) {
  if (expenses.length === 0) {
    return (
      <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
        Nenhum lançamento registrado.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            <th className="pb-3 pr-4">Data</th>
            <th className="pb-3 pr-4">Categoria</th>
            <th className="pb-3 pr-4">Descrição</th>
            <th className="pb-3 pr-4">Veículo</th>
            <th className="pb-3 pr-4 text-right">Valor (R$)</th>
            <th className="pb-3 pr-4">Status</th>
            <th className="pb-3 w-10"></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((expense, index) => (
            <motion.tr
              key={expense.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.03 }}
              className="group border-b border-border/30 transition-colors duration-200 hover:bg-accent/40"
            >
              <td className="py-3.5 pr-4 tabular-nums text-muted-foreground">
                {new Date(expense.date).toLocaleDateString("pt-BR")}
              </td>
              <td className="py-3.5 pr-4 font-medium">
                {CATEGORY_LABELS[expense.category]}
              </td>
              <td className="py-3.5 pr-4 text-muted-foreground max-w-[200px] truncate">
                {expense.description}
              </td>
              <td className="py-3.5 pr-4">{getVehicleName(expense.vehicle)}</td>
              <td className="py-3.5 pr-4 text-right tabular-nums font-semibold">
                {expense.amount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="py-3.5 pr-4">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                    expense.status === "pago"
                      ? "bg-profit/10 text-profit ring-1 ring-profit/20"
                      : "bg-warning/10 text-warning ring-1 ring-warning/20"
                  }`}
                >
                  {expense.status === "pago" ? "Pago" : "Pendente"}
                </span>
              </td>
              <td className="py-3.5">
                <button
                  onClick={() => onDelete(expense.id)}
                  className="rounded-lg p-1.5 text-muted-foreground/40 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-destructive/10 hover:text-loss"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
