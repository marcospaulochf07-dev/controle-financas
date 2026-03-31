import { describe, expect, it } from "vitest";
import {
  buildDriverDailyRows,
  buildDriverDailySummaries,
  buildMonthlyFinancialEntries,
  buildPaidFinancialEntries,
  buildPendingFinancialEntries,
  getMonthCostTotal,
} from "@/lib/driver-daily-expenses";
import { DriverDaily, Expense } from "@/lib/types";

const expenses: Expense[] = [
  {
    id: "expense-1",
    date: "2026-03-10",
    category: "seguro",
    description: "Seguro",
    vehicle: "Geral",
    amount: 400,
    status: "pendente",
    source: "manual",
  },
  {
    id: "legacy-daily",
    date: "2026-03-11",
    category: "diaria",
    description: "Legacy diária",
    vehicle: "Geral",
    amount: 999,
    status: "pendente",
    source: "whatsapp",
  },
];

const dailies: DriverDaily[] = [
  {
    id: "daily-1",
    date: "2026-03-11",
    driverName: "João",
    routes: 3,
    paidRoutes: 1,
    valuePerRoute: 45,
    vehicle: "Van 01",
    source: "manual",
    createdAt: "2026-03-11T08:00:00.000Z",
  },
  {
    id: "daily-2",
    date: "2026-03-15",
    driverName: "João",
    routes: 2,
    paidRoutes: 2,
    valuePerRoute: 45,
    vehicle: "Van 01",
    source: "manual",
    createdAt: "2026-03-15T08:00:00.000Z",
  },
];

describe("driver daily financial aggregation", () => {
  it("builds row-level paid and unpaid totals", () => {
    const rows = buildDriverDailyRows(dailies, 2026, 2);
    expect(rows[0].unpaidRoutes + rows[1].unpaidRoutes).toBe(2);
    expect(rows[0].paidAmount + rows[1].paidAmount).toBe(135);
  });

  it("summarizes monthly daily cost without losing paid/unpaid split", () => {
    const summaries = buildDriverDailySummaries(dailies, 2026, 2);
    expect(summaries).toHaveLength(1);
    expect(summaries[0]).toMatchObject({
      driverName: "João",
      totalRoutes: 5,
      paidRoutes: 3,
      unpaidRoutes: 2,
      totalAmount: 225,
      paidAmount: 135,
      unpaidAmount: 90,
      status: "pendente",
    });
  });

  it("ignores legacy daily expenses and derives totals from driver_dailies only", () => {
    expect(getMonthCostTotal(expenses, dailies, 2026, 2)).toBe(625);
    expect(buildMonthlyFinancialEntries(expenses, dailies, 2026, 2)).toHaveLength(2);
  });

  it("builds pending and paid financial entries from the split values", () => {
    const pending = buildPendingFinancialEntries(expenses, dailies, 2026, 2);
    const paid = buildPaidFinancialEntries(expenses, dailies, 2026, 2);

    expect(pending.find((entry) => entry.kind === "driver-daily")?.amount).toBe(90);
    expect(paid.find((entry) => entry.kind === "driver-daily")?.amount).toBe(135);
  });
});
