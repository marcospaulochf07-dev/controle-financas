import { Expense, RecurringReminder, DriverDaily } from "./types";
import { supabase } from "@/integrations/supabase/client";

const REVENUE_KEY = "route-revenue";
const VEHICLE_NAMES_KEY = "route-vehicle-names";
const RECURRING_KEY = "route-recurring-reminders";
const DAILIES_KEY = "route-driver-dailies";
const DRIVERS_KEY = "route-drivers-list";

// === Expenses (Supabase) ===
export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    category: row.category as Expense["category"],
    description: row.description,
    vehicle: row.vehicle,
    amount: Number(row.amount),
    status: row.status as Expense["status"],
    source: row.source,
  }));
}

export async function saveExpense(expense: Omit<Expense, "id">): Promise<Expense | null> {
  const { data, error } = await supabase
    .from("expenses")
    .insert({
      date: expense.date,
      category: expense.category as string,
      description: expense.description,
      vehicle: expense.vehicle,
      amount: expense.amount,
      status: expense.status as string,
      source: expense.source || "manual",
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving expense:", error);
    return null;
  }

  return {
    id: data.id,
    date: data.date,
    category: data.category as Expense["category"],
    description: data.description,
    vehicle: data.vehicle,
    amount: Number(data.amount),
    status: data.status as Expense["status"],
    source: data.source,
  };
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) console.error("Error deleting expense:", error);
}

export async function updateExpenseStatus(id: string, status: "pago" | "pendente"): Promise<void> {
  const { error } = await supabase
    .from("expenses")
    .update({ status })
    .eq("id", id);
  if (error) console.error("Error updating expense status:", error);
}

// === Revenue (localStorage - keep for now) ===
export function getMonthlyRevenue(month: string): number {
  const revenues = JSON.parse(localStorage.getItem(REVENUE_KEY) || "{}");
  return revenues[month] ?? 20000;
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

// === Driver Dailies (Supabase) ===
export async function getDriverDailiesAsync(): Promise<DriverDaily[]> {
  const { data, error } = await supabase
    .from("driver_dailies")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching driver dailies:", error);
    return [];
  }

  return (data || []).map((row: any) => ({
    id: row.id,
    date: row.date,
    driverName: row.driver_name,
    routes: Number(row.routes),
    valuePerRoute: Number(row.value_per_route),
    vehicle: row.vehicle,
    source: row.source,
  }));
}

export async function saveDriverDailyAsync(daily: Omit<DriverDaily, "id">): Promise<DriverDaily | null> {
  const { data, error } = await supabase
    .from("driver_dailies")
    .insert({
      date: daily.date,
      driver_name: daily.driverName,
      routes: daily.routes,
      value_per_route: daily.valuePerRoute,
      vehicle: daily.vehicle,
      source: (daily as any).source || "manual",
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving driver daily:", error);
    return null;
  }

  return {
    id: data.id,
    date: data.date,
    driverName: data.driver_name,
    routes: Number(data.routes),
    valuePerRoute: Number(data.value_per_route),
    vehicle: data.vehicle,
  };
}

export async function deleteDriverDailyAsync(id: string): Promise<void> {
  const { error } = await supabase.from("driver_dailies").delete().eq("id", id);
  if (error) console.error("Error deleting driver daily:", error);
}

// Legacy localStorage functions kept for backward compat
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

function generateId(): string {
  return Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}
