import { Expense } from "./types";

const STORAGE_KEY = "route-expenses";
const REVENUE_KEY = "route-revenue";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

export function getExpenses(): Expense[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveExpense(expense: Omit<Expense, "id">): Expense {
  const expenses = getExpenses();
  const newExpense = { ...expense, id: generateId() };
  expenses.unshift(newExpense);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
  return newExpense;
}

export function deleteExpense(id: string): void {
  const expenses = getExpenses().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

export function getMonthlyRevenue(month: string): number {
  const revenues = JSON.parse(localStorage.getItem(REVENUE_KEY) || "{}");
  return revenues[month] || 0;
}

export function setMonthlyRevenue(month: string, value: number): void {
  const revenues = JSON.parse(localStorage.getItem(REVENUE_KEY) || "{}");
  revenues[month] = value;
  localStorage.setItem(REVENUE_KEY, JSON.stringify(revenues));
}
