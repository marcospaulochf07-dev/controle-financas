export type ExpenseCategory =
  | "contador"
  | "diaria"
  | "fgts"
  | "financiamento"
  | "imposto"
  | "manutencao"
  | "outros"
  | "rastreador"
  | "salario"
  | "seguro";

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  vehicle: string;
  amount: number;
  status: "pago" | "pendente";
  source?: string;
}

export interface DriverDaily {
  id: string;
  date: string;
  driverName: string;
  routes: number;
  paidRoutes: number;
  valuePerRoute: number;
  vehicle: string;
  source?: string;
  createdAt?: string;
}

export interface Vehicle {
  id: string;
  displayName: string;
  active: boolean;
}

export interface Driver {
  name: string;
  active: boolean;
}

export interface MonthlyRevenue {
  monthKey: string;
  amount: number;
}

export interface RecurringTemplate {
  id: string;
  label: string;
  dayOfMonth: number;
  amount: number;
  category: ExpenseCategory;
  active: boolean;
}

export interface FinancialEntry {
  id: string;
  date: string;
  category: ExpenseCategory;
  description: string;
  vehicle: string;
  amount: number;
  status: "pago" | "pendente";
  source: string;
  kind: "expense" | "driver-daily";
  driverName?: string;
  totalRoutes?: number;
  paidRoutes?: number;
  unpaidRoutes?: number;
  paidAmount?: number;
  unpaidAmount?: number;
}

export interface DriverDailyRow {
  id: string;
  date: string;
  driverName: string;
  routes: number;
  paidRoutes: number;
  unpaidRoutes: number;
  valuePerRoute: number;
  vehicle: string;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  source?: string;
  createdAt?: string;
}

export interface DriverDailySummary {
  id: string;
  date: string;
  driverName: string;
  vehicle: string;
  totalRoutes: number;
  paidRoutes: number;
  unpaidRoutes: number;
  totalAmount: number;
  paidAmount: number;
  unpaidAmount: number;
  status: "pago" | "pendente";
  source: string;
}

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  contador: "Contador",
  diaria: "Diária",
  fgts: "FGTS",
  financiamento: "Financiamento",
  imposto: "Imposto",
  manutencao: "Manutenção",
  outros: "Outros",
  rastreador: "Rastreador",
  salario: "Salário",
  seguro: "Seguro",
};

export const SORTED_CATEGORIES = (Object.entries(CATEGORY_LABELS) as [ExpenseCategory, string][])
  .sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"));

export const MANUAL_EXPENSE_CATEGORIES = SORTED_CATEGORIES.filter(([key]) => key !== "diaria");

export const DEFAULT_VEHICLES: Vehicle[] = [
  { id: "Van 01", displayName: "Van 01", active: true },
  { id: "Van 02", displayName: "Van 02", active: true },
  { id: "Van 03", displayName: "Van 03", active: true },
  { id: "Geral", displayName: "Geral", active: true },
];

export const DEFAULT_RECURRING_TEMPLATES: Omit<RecurringTemplate, "id" | "active">[] = [
  { label: "Contador", dayOfMonth: 10, amount: 810, category: "contador" },
  { label: "Imposto da Nota (6%)", dayOfMonth: 15, amount: 1250, category: "imposto" },
  { label: "Parcela Financiamento", dayOfMonth: 5, amount: 4500, category: "financiamento" },
  { label: "Seguro", dayOfMonth: 10, amount: 400, category: "seguro" },
  { label: "Férias e 13º", dayOfMonth: 5, amount: 400, category: "salario" },
  { label: "Diárias dos Motoristas", dayOfMonth: 30, amount: 0, category: "diaria" },
];
