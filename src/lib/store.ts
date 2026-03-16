import { Expense, RecurringReminder, DriverDaily } from "./types";

const STORAGE_KEY = "route-expenses";
const REVENUE_KEY = "route-revenue";
const VEHICLE_NAMES_KEY = "route-vehicle-names";
const RECURRING_KEY = "route-recurring-reminders";
const DAILIES_KEY = "route-driver-dailies";
const DRIVERS_KEY = "route-drivers-list";

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

// === Expenses ===
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

export function updateExpenseStatus(id: string, status: "pago" | "pendente"): void {
  const expenses = getExpenses().map((e) =>
    e.id === id ? { ...e, status } : e
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expenses));
}

// === Revenue ===
export function getMonthlyRevenue(month: string): number {
  const revenues = JSON.parse(localStorage.getItem(REVENUE_KEY) || "{}");
  return revenues[month] || 0;
}

export function setMonthlyRevenue(month: string, value: number): void {
  const revenues = JSON.parse(localStorage.getItem(REVENUE_KEY) || "{}");
  revenues[month] = value;
  localStorage.setItem(REVENUE_KEY, JSON.stringify(revenues));
}

// === Vehicle names ===
export function getVehicleNames(): Record<string, string> {
  const raw = localStorage.getItem(VEHICLE_NAMES_KEY);
  if (!raw) return {};
  return JSON.parse(raw);
}

export function setVehicleName(vehicleId: string, name: string): void {
  const names = getVehicleNames();
  names[vehicleId] = name;
  localStorage.setItem(VEHICLE_NAMES_KEY, JSON.stringify(names));
}

export function getVehicleName(vehicleId: string): string {
  const names = getVehicleNames();
  return names[vehicleId] || vehicleId;
}

// === Recurring Reminders ===
export function getRecurringReminders(): RecurringReminder[] {
  const raw = localStorage.getItem(RECURRING_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveRecurringReminder(reminder: Omit<RecurringReminder, "id">): RecurringReminder {
  const reminders = getRecurringReminders();
  const newReminder = { ...reminder, id: generateId() };
  reminders.push(newReminder);
  localStorage.setItem(RECURRING_KEY, JSON.stringify(reminders));
  return newReminder;
}

export function deleteRecurringReminder(id: string): void {
  const reminders = getRecurringReminders().filter((r) => r.id !== id);
  localStorage.setItem(RECURRING_KEY, JSON.stringify(reminders));
}

export function toggleRecurringReminderPaid(id: string): void {
  const reminders = getRecurringReminders().map((r) =>
    r.id === id ? { ...r, paid: !r.paid } : r
  );
  localStorage.setItem(RECURRING_KEY, JSON.stringify(reminders));
}

// === Drivers ===
export function getDrivers(): string[] {
  const raw = localStorage.getItem(DRIVERS_KEY);
  if (raw) return JSON.parse(raw);
  return [];
}

export function addDriver(name: string): void {
  const drivers = getDrivers();
  if (!drivers.includes(name)) {
    drivers.push(name);
    localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers));
  }
}

export function removeDriver(name: string): void {
  const drivers = getDrivers().filter((d) => d !== name);
  localStorage.setItem(DRIVERS_KEY, JSON.stringify(drivers));
}

// === Driver Dailies ===
export function getDriverDailies(): DriverDaily[] {
  const raw = localStorage.getItem(DAILIES_KEY);
  if (!raw) return [];
  return JSON.parse(raw);
}

export function saveDriverDaily(daily: Omit<DriverDaily, "id">): DriverDaily {
  const dailies = getDriverDailies();
  const newDaily = { ...daily, id: generateId() };
  dailies.unshift(newDaily);
  localStorage.setItem(DAILIES_KEY, JSON.stringify(dailies));
  return newDaily;
}

export function deleteDriverDaily(id: string): void {
  const dailies = getDriverDailies().filter((d) => d.id !== id);
  localStorage.setItem(DAILIES_KEY, JSON.stringify(dailies));
}
