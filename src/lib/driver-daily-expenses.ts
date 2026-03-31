import { compareDateStringsAsc, compareDateStringsDesc, formatMonthKey, isDateInMonth } from "./date-utils";
import { DriverDaily, DriverDailyRow, DriverDailySummary, Expense, FinancialEntry } from "./types";

export function isLegacyDailyExpense(expense: Expense) {
  return expense.category === "diaria";
}

export function getDriverDailyDescription(driverName: string, year: number, month: number) {
  return `Diárias ${driverName} - ${formatMonthKey(year, month)}`;
}

export function buildDriverDailyRows(dailies: DriverDaily[], year: number, month: number, vehicleFilter = "Todos"): DriverDailyRow[] {
  return dailies
    .filter((daily) => isDateInMonth(daily.date, year, month))
    .filter((daily) => vehicleFilter === "Todos" || daily.vehicle === vehicleFilter)
    .sort((left, right) => compareDateStringsDesc(left.date, right.date) || (right.createdAt || "").localeCompare(left.createdAt || ""))
    .map((daily) => {
      const paidRoutes = Math.min(daily.paidRoutes, daily.routes);
      const unpaidRoutes = Math.max(daily.routes - paidRoutes, 0);
      return {
        id: daily.id,
        date: daily.date,
        driverName: daily.driverName,
        routes: daily.routes,
        paidRoutes,
        unpaidRoutes,
        valuePerRoute: daily.valuePerRoute,
        vehicle: daily.vehicle,
        totalAmount: daily.routes * daily.valuePerRoute,
        paidAmount: paidRoutes * daily.valuePerRoute,
        unpaidAmount: unpaidRoutes * daily.valuePerRoute,
        source: daily.source,
        createdAt: daily.createdAt,
      };
    });
}

export function buildDriverDailySummaries(dailies: DriverDaily[], year: number, month: number, vehicleFilter = "Todos"): DriverDailySummary[] {
  const rows = buildDriverDailyRows(dailies, year, month, vehicleFilter);
  const grouped = new Map<string, DriverDailySummary>();

  for (const row of rows) {
    const current = grouped.get(row.driverName) ?? {
      id: `${year}-${month}-${row.driverName}`,
      date: row.date,
      driverName: row.driverName,
      vehicle: vehicleFilter === "Todos" ? "Geral" : vehicleFilter,
      totalRoutes: 0,
      paidRoutes: 0,
      unpaidRoutes: 0,
      totalAmount: 0,
      paidAmount: 0,
      unpaidAmount: 0,
      status: "pendente" as const,
      source: "driver-daily",
    };

    grouped.set(row.driverName, {
      ...current,
      date: compareDateStringsDesc(row.date, current.date) > 0 ? row.date : current.date,
      totalRoutes: current.totalRoutes + row.routes,
      paidRoutes: current.paidRoutes + row.paidRoutes,
      unpaidRoutes: current.unpaidRoutes + row.unpaidRoutes,
      totalAmount: current.totalAmount + row.totalAmount,
      paidAmount: current.paidAmount + row.paidAmount,
      unpaidAmount: current.unpaidAmount + row.unpaidAmount,
      status: current.unpaidAmount + row.unpaidAmount === 0 ? "pago" : "pendente",
    });
  }

  return Array.from(grouped.values()).sort((left, right) => left.driverName.localeCompare(right.driverName, "pt-BR"));
}

export function getNonDailyExpensesForMonth(expenses: Expense[], year: number, month: number) {
  return expenses
    .filter((expense) => !isLegacyDailyExpense(expense))
    .filter((expense) => isDateInMonth(expense.date, year, month));
}

function buildDriverDailyFinancialEntries(
  summaries: DriverDailySummary[],
  mode: "total" | "paid" | "pending",
): FinancialEntry[] {
  return summaries
    .map((summary) => {
      const amount =
        mode === "paid" ? summary.paidAmount :
        mode === "pending" ? summary.unpaidAmount :
        summary.totalAmount;

      if (amount <= 0) return null;

      const status = mode === "paid" ? "pago" : mode === "pending" ? "pendente" : summary.status;

      return {
        id: `${mode}-${summary.id}`,
        date: summary.date,
        category: "diaria",
        description: getDriverDailyDescription(summary.driverName, Number(summary.date.slice(0, 4)), Number(summary.date.slice(5, 7)) - 1),
        vehicle: summary.vehicle,
        amount,
        status,
        source: "driver-daily",
        kind: "driver-daily" as const,
        driverName: summary.driverName,
        totalRoutes: summary.totalRoutes,
        paidRoutes: summary.paidRoutes,
        unpaidRoutes: summary.unpaidRoutes,
        paidAmount: summary.paidAmount,
        unpaidAmount: summary.unpaidAmount,
      };
    })
    .filter((entry): entry is FinancialEntry => Boolean(entry))
    .sort((left, right) => compareDateStringsDesc(left.date, right.date));
}

export function buildMonthlyFinancialEntries(
  expenses: Expense[],
  dailies: DriverDaily[],
  year: number,
  month: number,
  vehicleFilter = "Todos",
): FinancialEntry[] {
  const monthExpenses = getNonDailyExpensesForMonth(expenses, year, month)
    .filter((expense) => vehicleFilter === "Todos" || expense.vehicle === vehicleFilter)
    .map((expense) => ({
      ...expense,
      source: expense.source || "manual",
      kind: "expense" as const,
    }));

  const summaries = buildDriverDailySummaries(dailies, year, month, vehicleFilter);
  return [...monthExpenses, ...buildDriverDailyFinancialEntries(summaries, "total")]
    .sort((left, right) => compareDateStringsDesc(left.date, right.date));
}

export function buildPendingFinancialEntries(
  expenses: Expense[],
  dailies: DriverDaily[],
  year: number,
  month: number,
): FinancialEntry[] {
  const pendingExpenses = getNonDailyExpensesForMonth(expenses, year, month)
    .filter((expense) => expense.status === "pendente")
    .map((expense) => ({
      ...expense,
      source: expense.source || "manual",
      kind: "expense" as const,
    }));

  const summaries = buildDriverDailySummaries(dailies, year, month);
  return [...pendingExpenses, ...buildDriverDailyFinancialEntries(summaries, "pending")]
    .sort((left, right) => compareDateStringsDesc(left.date, right.date));
}

export function buildPaidFinancialEntries(
  expenses: Expense[],
  dailies: DriverDaily[],
  year: number,
  month: number,
): FinancialEntry[] {
  const paidExpenses = getNonDailyExpensesForMonth(expenses, year, month)
    .filter((expense) => expense.status === "pago")
    .map((expense) => ({
      ...expense,
      source: expense.source || "manual",
      kind: "expense" as const,
    }));

  const summaries = buildDriverDailySummaries(dailies, year, month);
  return [...paidExpenses, ...buildDriverDailyFinancialEntries(summaries, "paid")]
    .sort((left, right) => compareDateStringsDesc(left.date, right.date));
}

export function getMonthCostTotal(expenses: Expense[], dailies: DriverDaily[], year: number, month: number) {
  const expenseTotal = getNonDailyExpensesForMonth(expenses, year, month).reduce((sum, expense) => sum + expense.amount, 0);
  const driverTotal = buildDriverDailySummaries(dailies, year, month).reduce((sum, summary) => sum + summary.totalAmount, 0);
  return expenseTotal + driverTotal;
}

export function getMonthDriverDailyPendingTotal(dailies: DriverDaily[], year: number, month: number) {
  return buildDriverDailySummaries(dailies, year, month).reduce((sum, summary) => sum + summary.unpaidAmount, 0);
}

export function getMonthDriverDailyTotal(dailies: DriverDaily[], year: number, month: number) {
  return buildDriverDailySummaries(dailies, year, month).reduce((sum, summary) => sum + summary.totalAmount, 0);
}

export function getMonthCostByCategory(expenses: Expense[], dailies: DriverDaily[], year: number, month: number) {
  const entries = buildMonthlyFinancialEntries(expenses, dailies, year, month);
  return entries.reduce<Record<string, number>>((totals, entry) => {
    totals[entry.category] = (totals[entry.category] || 0) + entry.amount;
    return totals;
  }, {});
}

export function getOldestUnpaidDriverDailyRows(
  dailies: DriverDaily[],
  driverName: string,
  year: number,
  month: number,
) {
  return buildDriverDailyRows(dailies, year, month)
    .filter((row) => row.driverName.localeCompare(driverName, "pt-BR", { sensitivity: "base" }) === 0)
    .filter((row) => row.unpaidRoutes > 0)
    .sort((left, right) => compareDateStringsAsc(left.date, right.date) || (left.createdAt || "").localeCompare(right.createdAt || ""));
}
