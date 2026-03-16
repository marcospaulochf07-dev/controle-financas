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
}

export interface RecurringReminder {
  id: string;
  label: string;
  dayOfMonth: number;
  amount: number;
  category: ExpenseCategory;
  paid?: boolean;
}

export interface DriverDaily {
  id: string;
  date: string;
  driverName: string;
  routes: number; // 2-4
  valuePerRoute: number;
  vehicle: string;
}

// Sorted alphabetically
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

const VEHICLES_KEY = "route-vehicles-list";

export function getVehicles(): string[] {
  const raw = localStorage.getItem(VEHICLES_KEY);
  if (raw) return JSON.parse(raw);
  return ["Van 01", "Van 02", "Van 03", "Geral"];
}

export function addVehicle(name: string): void {
  const vehicles = getVehicles();
  if (!vehicles.includes(name)) {
    vehicles.push(name);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
  }
}

export function removeVehicle(name: string): void {
  const vehicles = getVehicles().filter((v) => v !== name);
  localStorage.setItem(VEHICLES_KEY, JSON.stringify(vehicles));
}

// Keep VEHICLES as a getter for backward compat
export const VEHICLES = getVehicles();
