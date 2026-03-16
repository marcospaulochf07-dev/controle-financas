export type ExpenseCategory =
  | "manutencao"
  | "combustivel"
  | "imposto"
  | "salario"
  | "fgts"
  | "financiamento"
  | "contador"
  | "seguro"
  | "rastreador"
  | "diaria"
  | "outros";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  vehicle: string;
  amount: number;
  status: "pago" | "pendente";
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  manutencao: "Manutenção",
  combustivel: "Combustível",
  imposto: "Imposto",
  salario: "Salário",
  fgts: "FGTS",
  financiamento: "Financiamento",
  contador: "Contador",
  seguro: "Seguro",
  rastreador: "Rastreador",
  diaria: "Diária",
  outros: "Outros",
};

export const VEHICLES = ["Van 01", "Van 02", "Van 03", "Geral"];
