export const APP_TIMEZONE = "America/Sao_Paulo";

export interface DateParts {
  year: number;
  month: number;
  day: number;
}

function getFormatter(timeZone = APP_TIMEZONE) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
}

export function getDatePartsInTimeZone(date = new Date(), timeZone = APP_TIMEZONE): DateParts {
  const parts = getFormatter(timeZone).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  return { year, month, day };
}

export function getTodayInTimeZone(timeZone = APP_TIMEZONE) {
  return formatDateParts(getDatePartsInTimeZone(new Date(), timeZone));
}

export function formatDateParts({ year, month, day }: DateParts) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function formatMonthKey(year: number, monthIndex: number) {
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}`;
}

export function parseDateString(dateString: string): DateParts {
  const [year, month, day] = dateString.split("-").map(Number);
  return { year, month, day };
}

export function getMonthKeyFromDate(dateString: string) {
  return dateString.slice(0, 7);
}

export function isDateInMonth(dateString: string, year: number, monthIndex: number) {
  return getMonthKeyFromDate(dateString) === formatMonthKey(year, monthIndex);
}

export function compareDateStringsAsc(left: string, right: string) {
  return left.localeCompare(right);
}

export function compareDateStringsDesc(left: string, right: string) {
  return right.localeCompare(left);
}

export function formatDateForDisplay(dateString: string) {
  const { year, month, day } = parseDateString(dateString);
  return new Intl.DateTimeFormat("pt-BR").format(new Date(year, month - 1, day, 12, 0, 0));
}

export function getDaysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0, 12, 0, 0).getDate();
}

export function clampDayToMonth(year: number, monthIndex: number, day: number) {
  return Math.min(Math.max(day, 1), getDaysInMonth(year, monthIndex));
}

export function createDateString(year: number, monthIndex: number, day: number) {
  return formatDateParts({
    year,
    month: monthIndex + 1,
    day: clampDayToMonth(year, monthIndex, day),
  });
}

export function getMonthBounds(year: number, monthIndex: number) {
  const start = createDateString(year, monthIndex, 1);

  if (monthIndex === 11) {
    return {
      start,
      endExclusive: createDateString(year + 1, 0, 1),
    };
  }

  return {
    start,
    endExclusive: createDateString(year, monthIndex + 1, 1),
  };
}

export function getCurrentMonthKey(timeZone = APP_TIMEZONE) {
  const { year, month } = getDatePartsInTimeZone(new Date(), timeZone);
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function getCurrentYearMonth(timeZone = APP_TIMEZONE) {
  const { year, month } = getDatePartsInTimeZone(new Date(), timeZone);
  return { year, monthIndex: month - 1 };
}
