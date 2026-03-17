import { DriverDaily, Expense } from "@/lib/types";
import { deleteExpense, saveExpense } from "@/lib/store";

function isSameMonth(dateString: string, year: number, month: number) {
  const date = new Date(dateString);
  return date.getFullYear() === year && date.getMonth() === month;
}

export function isDriverDailyExpense(expense: Expense) {
  return expense.category === "diaria" && expense.source === "diaria-auto";
}

export function getDriverDailyDescription(driverName: string, year: number, month: number) {
  return `Diárias ${driverName} - ${String(month + 1).padStart(2, "0")}/${year}`;
}

export function extractDriverNameFromDailyDescription(description: string) {
  const match = description.match(/^Diárias\s+(.+?)\s+-\s+\d{2}\/\d{4}$/);
  return match?.[1] ?? null;
}

export function buildConsolidatedDriverExpenses(
  expenses: Expense[],
  dailies: DriverDaily[],
  year: number,
  month: number,
): Expense[] {
  const monthDailies = dailies.filter((daily) => isSameMonth(daily.date, year, month));
  const monthDriverExpenses = expenses.filter(
    (expense) => isDriverDailyExpense(expense) && isSameMonth(expense.date, year, month),
  );

  const groupedDailies = new Map<
    string,
    { routes: number; amount: number; lastDate: string }
  >();

  for (const daily of monthDailies) {
    const current = groupedDailies.get(daily.driverName) ?? {
      routes: 0,
      amount: 0,
      lastDate: daily.date,
    };

    groupedDailies.set(daily.driverName, {
      routes: current.routes + daily.routes,
      amount: current.amount + daily.routes * daily.valuePerRoute,
      lastDate: daily.date > current.lastDate ? daily.date : current.lastDate,
    });
  }

  const expenseRowsByDriver = new Map<string, Expense[]>();

  for (const expense of monthDriverExpenses) {
    const driverName = extractDriverNameFromDailyDescription(expense.description);
    if (!driverName) continue;

    const current = expenseRowsByDriver.get(driverName) ?? [];
    current.push(expense);
    expenseRowsByDriver.set(driverName, current);
  }

  return Array.from(groupedDailies.entries())
    .sort(([driverA], [driverB]) => driverA.localeCompare(driverB, "pt-BR"))
    .map(([driverName, totals]) => {
      const existingRows = expenseRowsByDriver.get(driverName) ?? [];
      const preservedStatus = existingRows.some((expense) => expense.status === "pago") ? "pago" : "pendente";
      const primaryRow = existingRows[0];

      return {
        id: primaryRow?.id ?? `diaria-${year}-${month}-${driverName}`,
        date: primaryRow?.date ?? totals.lastDate,
        category: "diaria" as const,
        description: getDriverDailyDescription(driverName, year, month),
        vehicle: "Geral",
        amount: totals.amount,
        status: preservedStatus,
        source: "diaria-auto",
      };
    });
}

export async function syncDriverDailyExpenses(
  expenses: Expense[],
  dailies: DriverDaily[],
  year: number,
  month: number,
) {
  const consolidatedExpenses = buildConsolidatedDriverExpenses(expenses, dailies, year, month);
  const monthDriverExpenses = expenses.filter(
    (expense) => isDriverDailyExpense(expense) && isSameMonth(expense.date, year, month),
  );

  const existingRowsByDriver = new Map<string, Expense[]>();

  for (const expense of monthDriverExpenses) {
    const driverName = extractDriverNameFromDailyDescription(expense.description);
    if (!driverName) continue;

    const current = existingRowsByDriver.get(driverName) ?? [];
    current.push(expense);
    existingRowsByDriver.set(driverName, current);
  }

  const desiredRowsByDriver = new Map(
    consolidatedExpenses.map((expense) => [extractDriverNameFromDailyDescription(expense.description)!, expense]),
  );

  for (const [driverName, existingRows] of existingRowsByDriver.entries()) {
    if (desiredRowsByDriver.has(driverName)) continue;

    for (const row of existingRows) {
      await deleteExpense(row.id);
    }
  }

  for (const [driverName, desiredExpense] of desiredRowsByDriver.entries()) {
    const existingRows = existingRowsByDriver.get(driverName) ?? [];
    const currentRow = existingRows[0];

    const needsReplace =
      existingRows.length !== 1 ||
      !currentRow ||
      currentRow.amount !== desiredExpense.amount ||
      currentRow.status !== desiredExpense.status ||
      currentRow.date !== desiredExpense.date ||
      currentRow.description !== desiredExpense.description ||
      currentRow.vehicle !== desiredExpense.vehicle;

    if (!needsReplace) continue;

    for (const row of existingRows) {
      await deleteExpense(row.id);
    }

    await saveExpense({
      date: desiredExpense.date,
      category: desiredExpense.category,
      description: desiredExpense.description,
      vehicle: desiredExpense.vehicle,
      amount: desiredExpense.amount,
      status: desiredExpense.status,
      source: "diaria-auto",
    });
  }
}
