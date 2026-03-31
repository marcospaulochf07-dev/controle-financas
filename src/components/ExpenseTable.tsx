import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Expense, CATEGORY_LABELS } from "@/lib/types";
import { Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { compareDateStringsDesc, formatDateForDisplay } from "@/lib/date-utils";

interface ExpenseTableProps {
  expenses: Expense[];
  onDelete: (id: string) => void;
  vehicleNameMap: Record<string, string>;
}

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export function ExpenseTable({ expenses, onDelete, vehicleNameMap }: ExpenseTableProps) {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Sort by date descending (newest first)
  const sorted = useMemo(
    () => [...expenses].sort((a, b) => compareDateStringsDesc(a.date, b.date)),
    [expenses]
  );

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = sorted.slice((safePage - 1) * pageSize, safePage * pageSize);

  // Reset page when pageSize changes
  const handlePageSizeChange = (val: string) => {
    setPageSize(Number(val));
    setCurrentPage(1);
  };

  if (expenses.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-2 text-sm text-muted-foreground" role="status">
        <p className="font-medium">Nenhum lançamento registrado.</p>
        <p className="text-xs">Clique em "Novo Lançamento" para adicionar.</p>
      </div>
    );
  }

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | "...")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      for (let i = Math.max(2, safePage - 1); i <= Math.min(totalPages - 1, safePage + 1); i++) {
        pages.push(i);
      }
      if (safePage < totalPages - 2) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <>
      <div className="overflow-x-auto" role="region" aria-label="Tabela de lançamentos">
        <table className="w-full text-sm" aria-label="Lançamentos do mês">
          <thead>
            <tr className="border-b text-left text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <th className="pb-3 pr-4" scope="col">Data</th>
              <th className="pb-3 pr-4" scope="col">Categoria</th>
              <th className="pb-3 pr-4" scope="col">Descrição</th>
              <th className="pb-3 pr-4" scope="col">Veículo</th>
              <th className="pb-3 pr-4 text-right" scope="col">Valor (R$)</th>
              <th className="pb-3 pr-4" scope="col">Status</th>
              <th className="pb-3 w-10" scope="col"><span className="sr-only">Ações</span></th>
            </tr>
          </thead>
          <tbody>
            {paginated.map((expense, index) => (
              <motion.tr
                key={expense.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.03 }}
                className="group border-b border-border/30 transition-colors duration-200 hover:bg-accent/40"
              >
                <td className="py-3.5 pr-4 tabular-nums text-muted-foreground">
                  {formatDateForDisplay(expense.date)}
                </td>
                <td className="py-3.5 pr-4 font-medium">
                  {CATEGORY_LABELS[expense.category]}
                </td>
                <td className="py-3.5 pr-4 text-muted-foreground max-w-[200px] truncate" title={expense.description}>
                  {expense.description}
                </td>
                <td className="py-3.5 pr-4">{vehicleNameMap[expense.vehicle] || expense.vehicle}</td>
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
                    role="status"
                  >
                    {expense.status === "pago" ? "Pago" : "Pendente"}
                  </span>
                </td>
                <td className="py-3.5">
                  <button
                    onClick={() => setDeleteId(expense.id)}
                    className="rounded-lg p-1.5 text-muted-foreground/40 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:bg-destructive/10 hover:text-loss focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                    aria-label={`Excluir ${expense.description || "lançamento"}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Exibir</span>
          <Select value={String(pageSize)} onValueChange={handlePageSizeChange}>
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span>de {sorted.length} registros</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={safePage <= 1}
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {getPageNumbers().map((page, i) =>
            page === "..." ? (
              <span key={`ellipsis-${i}`} className="px-1.5 text-xs text-muted-foreground">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === safePage ? "default" : "outline"}
                size="icon"
                className="h-8 w-8 text-xs"
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            )
          )}

          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={safePage >= totalPages}
            aria-label="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Confirmação de exclusão */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este lançamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (deleteId) {
                  onDelete(deleteId);
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
