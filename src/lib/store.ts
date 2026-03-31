import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import {
  DEFAULT_RECURRING_TEMPLATES,
  DEFAULT_VEHICLES,
  Driver,
  DriverDaily,
  Expense,
  MonthlyRevenue,
  RecurringTemplate,
  Vehicle,
} from "./types";
import { createDateString, getCurrentYearMonth, getMonthBounds } from "./date-utils";

type ExpenseRow = Database["public"]["Tables"]["expenses"]["Row"];
type DriverDailyRow = Database["public"]["Tables"]["driver_dailies"]["Row"];
type VehicleRow = Database["public"]["Tables"]["vehicles"]["Row"];
type DriverRow = Database["public"]["Tables"]["drivers"]["Row"];
type MonthlyRevenueRow = Database["public"]["Tables"]["monthly_revenues"]["Row"];
type RecurringTemplateRow = Database["public"]["Tables"]["recurring_templates"]["Row"];

interface LegacyRecurringReminder {
  label: string;
  dayOfMonth: number;
  amount: number;
  category: RecurringTemplate["category"];
  paid?: boolean;
}

interface LegacyDriverDailyRecord {
  date: string;
  driverName: string;
  routes: number;
  valuePerRoute?: number;
  vehicle?: string;
}

const LEGACY_REVENUE_KEY = "route-revenue";
const LEGACY_VEHICLE_NAMES_KEY = "route-vehicle-names";
const LEGACY_RECURRING_KEY = "route-recurring-reminders";
const LEGACY_DAILIES_KEY = "route-driver-dailies";
const LEGACY_DRIVERS_KEY = "route-drivers-list";
const LEGACY_VEHICLES_KEY = "route-vehicles-list";
const LEGACY_MIGRATION_FLAG = "supabase-first-migration-v1";

function hasBrowserStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readJson<T>(key: string, fallback: T): T {
  if (!hasBrowserStorage()) return fallback;

  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch (error) {
    console.error(`Failed to read ${key} from localStorage`, error);
    return fallback;
  }
}

function mapExpense(row: ExpenseRow): Expense {
  return {
    id: row.id,
    date: row.date,
    category: row.category,
    description: row.description,
    vehicle: row.vehicle,
    amount: Number(row.amount),
    status: row.status,
    source: row.source,
  };
}

function mapDriverDaily(row: DriverDailyRow): DriverDaily {
  return {
    id: row.id,
    date: row.date,
    driverName: row.driver_name,
    routes: Number(row.routes),
    paidRoutes: Number(row.paid_routes || 0),
    valuePerRoute: Number(row.value_per_route),
    vehicle: row.vehicle,
    source: row.source,
    createdAt: row.created_at,
  };
}

function mapVehicle(row: VehicleRow): Vehicle {
  return {
    id: row.id,
    displayName: row.display_name,
    active: row.active,
  };
}

function mapDriver(row: DriverRow): Driver {
  return {
    name: row.name,
    active: row.active,
  };
}

function mapMonthlyRevenue(row: MonthlyRevenueRow): MonthlyRevenue {
  return {
    monthKey: row.month_key,
    amount: Number(row.amount),
  };
}

function mapRecurringTemplate(row: RecurringTemplateRow): RecurringTemplate {
  return {
    id: row.id,
    label: row.label,
    dayOfMonth: Number(row.day_of_month),
    amount: Number(row.amount),
    category: row.category,
    active: row.active,
  };
}

async function ensureVehicleExists(vehicleId: string) {
  if (!vehicleId) return;

  const { error } = await supabase
    .from("vehicles")
    .upsert(
      {
        id: vehicleId,
        display_name: vehicleId,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) {
    console.error("Error ensuring vehicle exists:", error);
  }
}

async function ensureDriverExists(name: string) {
  if (!name.trim()) return;

  const { error } = await supabase
    .from("drivers")
    .upsert(
      {
        name: name.trim(),
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "name" },
    );

  if (error) {
    console.error("Error ensuring driver exists:", error);
  }
}

export async function getExpenses(): Promise<Expense[]> {
  const { data, error } = await supabase
    .from("expenses")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching expenses:", error);
    return [];
  }

  return (data || []).map(mapExpense);
}

export async function saveExpense(expense: Omit<Expense, "id">): Promise<Expense | null> {
  await ensureVehicleExists(expense.vehicle);

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      date: expense.date,
      category: expense.category,
      description: expense.description,
      vehicle: expense.vehicle,
      amount: expense.amount,
      status: expense.status,
      source: expense.source || "manual",
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving expense:", error);
    return null;
  }

  return mapExpense(data);
}

export async function deleteExpense(id: string): Promise<void> {
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) console.error("Error deleting expense:", error);
}

export async function updateExpenseStatus(id: string, status: "pago" | "pendente"): Promise<void> {
  const { error } = await supabase.from("expenses").update({ status }).eq("id", id);
  if (error) console.error("Error updating expense status:", error);
}

export async function getMonthlyRevenues(): Promise<MonthlyRevenue[]> {
  const { data, error } = await supabase.from("monthly_revenues").select("*").order("month_key", { ascending: true });

  if (error) {
    console.error("Error fetching monthly revenues:", error);
    return [];
  }

  return (data || []).map(mapMonthlyRevenue);
}

export async function setMonthlyRevenue(monthKey: string, value: number): Promise<void> {
  const { error } = await supabase
    .from("monthly_revenues")
    .upsert(
      {
        month_key: monthKey,
        amount: value,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "month_key" },
    );

  if (error) console.error("Error setting monthly revenue:", error);
}

export async function getVehiclesAsync(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from("vehicles").select("*").eq("active", true).order("id", { ascending: true });

  if (error) {
    console.error("Error fetching vehicles:", error);
    return [];
  }

  return (data || []).map(mapVehicle);
}

export async function saveVehicleAsync(vehicleId: string, displayName?: string): Promise<void> {
  const id = vehicleId.trim();
  if (!id) return;

  const { error } = await supabase
    .from("vehicles")
    .upsert(
      {
        id,
        display_name: displayName?.trim() || id,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" },
    );

  if (error) console.error("Error saving vehicle:", error);
}

export async function updateVehicleDisplayNameAsync(vehicleId: string, displayName: string): Promise<void> {
  const { error } = await supabase
    .from("vehicles")
    .update({
      display_name: displayName.trim(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (error) console.error("Error updating vehicle name:", error);
}

export async function deactivateVehicleAsync(vehicleId: string): Promise<void> {
  const { error } = await supabase
    .from("vehicles")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (error) console.error("Error deactivating vehicle:", error);
}

export async function getDriversAsync(): Promise<Driver[]> {
  const { data, error } = await supabase.from("drivers").select("*").eq("active", true).order("name", { ascending: true });

  if (error) {
    console.error("Error fetching drivers:", error);
    return [];
  }

  return (data || []).map(mapDriver);
}

export async function saveDriverAsync(name: string): Promise<void> {
  await ensureDriverExists(name);
}

export async function deactivateDriverAsync(name: string): Promise<void> {
  const { error } = await supabase
    .from("drivers")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("name", name);

  if (error) console.error("Error deactivating driver:", error);
}

export async function getRecurringTemplatesAsync(): Promise<RecurringTemplate[]> {
  const { data, error } = await supabase
    .from("recurring_templates")
    .select("*")
    .eq("active", true)
    .order("day_of_month", { ascending: true })
    .order("label", { ascending: true });

  if (error) {
    console.error("Error fetching recurring templates:", error);
    return [];
  }

  return (data || []).map(mapRecurringTemplate);
}

export async function saveRecurringTemplateAsync(template: Omit<RecurringTemplate, "id" | "active">): Promise<void> {
  const { error } = await supabase
    .from("recurring_templates")
    .upsert(
      {
        label: template.label.trim(),
        day_of_month: template.dayOfMonth,
        amount: template.amount,
        category: template.category,
        active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "label" },
    );

  if (error) console.error("Error saving recurring template:", error);
}

export async function deactivateRecurringTemplateAsync(id: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_templates")
    .update({
      active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) console.error("Error deactivating recurring template:", error);
}

export async function ensureRecurringExpensesForMonth(
  year: number,
  monthIndex: number,
  templates: RecurringTemplate[],
): Promise<boolean> {
  const activeTemplates = templates.filter((template) => template.active && template.category !== "diaria");
  if (activeTemplates.length === 0) return false;

  const { start, endExclusive } = getMonthBounds(year, monthIndex);
  const { data, error } = await supabase
    .from("expenses")
    .select("id, description, amount, category, vehicle, date")
    .eq("source", "recorrente-auto")
    .gte("date", start)
    .lt("date", endExclusive);

  if (error) {
    console.error("Error ensuring recurring expenses:", error);
    return false;
  }

  const existingByLabel = new Map((data || []).map((row) => [row.description, row]));
  const inserts: Array<Record<string, unknown>> = [];
  const updates: Array<{ id: string; payload: Record<string, unknown> }> = [];

  for (const template of activeTemplates) {
    const desiredDate = createDateString(year, monthIndex, template.dayOfMonth);
    const existing = existingByLabel.get(template.label);

    if (!existing) {
      inserts.push({
        date: desiredDate,
        category: template.category,
        description: template.label,
        vehicle: "Geral",
        amount: template.amount,
        status: "pendente",
        source: "recorrente-auto",
      });
      continue;
    }

    if (
      Number(existing.amount) !== template.amount ||
      existing.category !== template.category ||
      existing.vehicle !== "Geral" ||
      existing.date !== desiredDate
    ) {
      updates.push({
        id: existing.id,
        payload: {
          date: desiredDate,
          category: template.category,
          description: template.label,
          vehicle: "Geral",
          amount: template.amount,
        },
      });
    }
  }

  if (inserts.length > 0) {
    const { error: insertError } = await supabase.from("expenses").insert(inserts);
    if (insertError) {
      console.error("Error inserting recurring expenses:", insertError);
      return false;
    }
  }

  for (const update of updates) {
    const { error: updateError } = await supabase.from("expenses").update(update.payload).eq("id", update.id);
    if (updateError) {
      console.error("Error updating recurring expense:", updateError);
      return false;
    }
  }

  return inserts.length > 0 || updates.length > 0;
}

export async function getDriverDailiesAsync(): Promise<DriverDaily[]> {
  const { data, error } = await supabase
    .from("driver_dailies")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching driver dailies:", error);
    return [];
  }

  return (data || []).map(mapDriverDaily);
}

export async function saveDriverDailyAsync(
  daily: Omit<DriverDaily, "id">,
): Promise<DriverDaily | null> {
  await Promise.all([ensureDriverExists(daily.driverName), ensureVehicleExists(daily.vehicle)]);

  const { data, error } = await supabase
    .from("driver_dailies")
    .insert({
      date: daily.date,
      driver_name: daily.driverName,
      routes: daily.routes,
      paid_routes: daily.paidRoutes,
      value_per_route: daily.valuePerRoute,
      vehicle: daily.vehicle,
      source: daily.source || "manual",
    })
    .select()
    .single();

  if (error) {
    console.error("Error saving driver daily:", error);
    return null;
  }

  return mapDriverDaily(data);
}

export async function updateDriverDailyPaidRoutesAsync(id: string, paidRoutes: number): Promise<void> {
  const { error } = await supabase
    .from("driver_dailies")
    .update({ paid_routes: paidRoutes })
    .eq("id", id);

  if (error) console.error("Error updating paid routes:", error);
}

export async function deleteDriverDailyAsync(id: string): Promise<void> {
  const { error } = await supabase.from("driver_dailies").delete().eq("id", id);
  if (error) console.error("Error deleting driver daily:", error);
}

async function ensureDefaultVehicles() {
  const payload = DEFAULT_VEHICLES.map((vehicle) => ({
    id: vehicle.id,
    display_name: vehicle.displayName,
    active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("vehicles").upsert(payload, { onConflict: "id" });
  if (error) console.error("Error seeding default vehicles:", error);
}

async function ensureDefaultRecurringTemplates() {
  const payload = DEFAULT_RECURRING_TEMPLATES.map((template) => ({
    label: template.label,
    day_of_month: template.dayOfMonth,
    amount: template.amount,
    category: template.category,
    active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("recurring_templates").upsert(payload, { onConflict: "label" });
  if (error) console.error("Error seeding recurring templates:", error);
}

async function migrateLegacyVehicles() {
  const vehicleIds = readJson<string[]>(LEGACY_VEHICLES_KEY, []);
  const vehicleNames = readJson<Record<string, string>>(LEGACY_VEHICLE_NAMES_KEY, {});

  if (vehicleIds.length === 0 && Object.keys(vehicleNames).length === 0) return;

  const allIds = new Set<string>([...vehicleIds, ...Object.keys(vehicleNames), ...DEFAULT_VEHICLES.map((vehicle) => vehicle.id)]);
  const payload = Array.from(allIds).map((vehicleId) => ({
    id: vehicleId,
    display_name: vehicleNames[vehicleId] || vehicleId,
    active: true,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabase.from("vehicles").upsert(payload, { onConflict: "id" });
  if (error) console.error("Error migrating vehicles:", error);
}

async function migrateLegacyDrivers() {
  const drivers = readJson<string[]>(LEGACY_DRIVERS_KEY, []);
  if (drivers.length === 0) return;

  const payload = drivers
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      name,
      active: true,
      updated_at: new Date().toISOString(),
    }));

  if (payload.length === 0) return;

  const { error } = await supabase.from("drivers").upsert(payload, { onConflict: "name" });
  if (error) console.error("Error migrating drivers:", error);
}

async function migrateLegacyMonthlyRevenues() {
  const revenues = readJson<Record<string, number>>(LEGACY_REVENUE_KEY, {});
  const payload = Object.entries(revenues).map(([monthKey, amount]) => ({
    month_key: monthKey,
    amount,
    updated_at: new Date().toISOString(),
  }));

  if (payload.length === 0) return;

  const { error } = await supabase.from("monthly_revenues").upsert(payload, { onConflict: "month_key" });
  if (error) console.error("Error migrating revenues:", error);
}

async function migrateLegacyRecurringTemplates() {
  const reminders = readJson<LegacyRecurringReminder[]>(LEGACY_RECURRING_KEY, []);
  if (reminders.length === 0) return;

  const payload = reminders.map((reminder) => ({
    label: reminder.label,
    day_of_month: Number(reminder.dayOfMonth),
    amount: Number(reminder.amount || 0),
    category: reminder.category,
    active: true,
    updated_at: new Date().toISOString(),
  }));

  if (payload.length > 0) {
    const { error } = await supabase.from("recurring_templates").upsert(payload, { onConflict: "label" });
    if (error) {
      console.error("Error migrating recurring templates:", error);
      return;
    }
  }

  const { year, monthIndex } = getCurrentYearMonth();
  const { start, endExclusive } = getMonthBounds(year, monthIndex);

  for (const reminder of reminders) {
    if (reminder.category === "diaria") continue;

    const desiredDate = createDateString(year, monthIndex, Number(reminder.dayOfMonth));
    const desiredStatus = reminder.paid ? "pago" : "pendente";
    const { data, error } = await supabase
      .from("expenses")
      .select("id, status")
      .eq("source", "recorrente-auto")
      .eq("description", reminder.label)
      .gte("date", start)
      .lt("date", endExclusive)
      .limit(1);

    if (error) {
      console.error("Error migrating recurring expense state:", error);
      continue;
    }

    if (!data || data.length === 0) {
      await saveExpense({
        date: desiredDate,
        category: reminder.category,
        description: reminder.label,
        vehicle: "Geral",
        amount: Number(reminder.amount || 0),
        status: desiredStatus,
        source: "recorrente-auto",
      });
      continue;
    }

    if (data[0].status !== desiredStatus) {
      await updateExpenseStatus(data[0].id, desiredStatus);
    }
  }
}

async function migrateLegacyDriverDailies() {
  const legacyDailies = readJson<LegacyDriverDailyRecord[]>(LEGACY_DAILIES_KEY, []);
  if (legacyDailies.length === 0) return;

  for (const daily of legacyDailies) {
    const date = String(daily.date || "").trim();
    const driverName = String(daily.driverName || "").trim();
    const routes = Number(daily.routes || 0);
    const vehicle = String(daily.vehicle || "Geral").trim() || "Geral";
    const valuePerRoute = Number(daily.valuePerRoute || 45);

    if (!date || !driverName || routes <= 0) continue;

    const { data, error } = await supabase
      .from("driver_dailies")
      .select("id")
      .eq("date", date)
      .eq("driver_name", driverName)
      .eq("routes", routes)
      .eq("value_per_route", valuePerRoute)
      .eq("vehicle", vehicle)
      .limit(1);

    if (error) {
      console.error("Error checking migrated legacy dailies:", error);
      continue;
    }

    if (data && data.length > 0) continue;

    await saveDriverDailyAsync({
      date,
      driverName,
      routes,
      paidRoutes: 0,
      valuePerRoute,
      vehicle,
      source: "legacy-local",
    });
  }
}

export async function initializeSupabaseData(): Promise<void> {
  await Promise.all([ensureDefaultVehicles(), ensureDefaultRecurringTemplates()]);

  if (!hasBrowserStorage()) return;
  if (window.localStorage.getItem(LEGACY_MIGRATION_FLAG) === "done") return;

  await migrateLegacyVehicles();
  await migrateLegacyDrivers();
  await migrateLegacyMonthlyRevenues();
  await migrateLegacyRecurringTemplates();
  await migrateLegacyDriverDailies();

  window.localStorage.setItem(LEGACY_MIGRATION_FLAG, "done");
}
