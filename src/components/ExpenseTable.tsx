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
          <tr className="border-b text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">
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
          {expenses.map((expense) => (
            <tr
              key={expense.id}
              className="border-b border-border/50 transition-colors duration-150 hover:bg-accent/50"
            >
              <td className="py-3 pr-4 tabular-nums">
                {new Date(expense.date).toLocaleDateString("pt-BR")}
              </td>
              <td className="py-3 pr-4">
                {CATEGORY_LABELS[expense.category]}
              </td>
              <td className="py-3 pr-4 text-muted-foreground">
                {expense.description}
              </td>
              <td className="py-3 pr-4">{getVehicleName(expense.vehicle)}</td>
              <td className="py-3 pr-4 text-right tabular-nums font-medium">
                {expense.amount.toLocaleString("pt-BR", {
                  minimumFractionDigits: 2,
                })}
              </td>
              <td className="py-3 pr-4">
                <span
                  className={`inline-flex rounded-md px-2 py-0.5 text-xs font-medium ${
                    expense.status === "pago"
                      ? "bg-primary/10 text-profit"
                      : "bg-warning/10 text-warning"
                  }`}
                >
                  {expense.status === "pago" ? "Pago" : "Pendente"}
                </span>
              </td>
              <td className="py-3">
                <button
                  onClick={() => onDelete(expense.id)}
                  className="rounded p-1 text-muted-foreground/50 transition-colors hover:bg-destructive/10 hover:text-loss"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
