import type { ScheduleDateRangeMode } from "./schedule-types";
import { SCHEDULE_TIMEZONE } from "./schedule-types";

type Ymd = { year: number; month: number; day: number };

function getZonedYmd(date: Date = new Date(), timeZone = SCHEDULE_TIMEZONE): Ymd {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value])
  );
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
  };
}

function getZonedWeekday(date: Date = new Date(), timeZone = SCHEDULE_TIMEZONE): number {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  const weekdayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return weekdayMap[weekday] ?? 0;
}

function ymdToIso({ year, month, day }: Ymd): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDaysToYmd(ymd: Ymd, offset: number): Ymd {
  const date = new Date(Date.UTC(ymd.year, ymd.month - 1, ymd.day + offset));
  return {
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  };
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function quarterStartMonth(month: number): number {
  return Math.floor((month - 1) / 3) * 3 + 1;
}

export function getTodayRange(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const iso = ymdToIso(today);
  return { dateFrom: iso, dateTo: iso };
}

export function getYesterdayRange(): { dateFrom: string; dateTo: string } {
  const yesterday = addDaysToYmd(getZonedYmd(), -1);
  const iso = ymdToIso(yesterday);
  return { dateFrom: iso, dateTo: iso };
}

export function getThisWeekRange(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const weekday = getZonedWeekday();
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;
  const monday = addDaysToYmd(today, -diffToMonday);
  return { dateFrom: ymdToIso(monday), dateTo: ymdToIso(today) };
}

export function getPreviousCalendarWeek(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const weekday = getZonedWeekday();
  const diffToMonday = weekday === 0 ? 6 : weekday - 1;
  const thisMonday = addDaysToYmd(today, -diffToMonday);
  const lastMonday = addDaysToYmd(thisMonday, -7);
  const lastSunday = addDaysToYmd(thisMonday, -1);
  return { dateFrom: ymdToIso(lastMonday), dateTo: ymdToIso(lastSunday) };
}

export function getThisMonthRange(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const first = { year: today.year, month: today.month, day: 1 };
  return { dateFrom: ymdToIso(first), dateTo: ymdToIso(today) };
}

export function getLastMonthRange(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const firstOfThisMonth: Ymd = { year: today.year, month: today.month, day: 1 };
  const lastDayOfLastMonth = addDaysToYmd(firstOfThisMonth, -1);
  const firstOfLastMonth: Ymd = {
    year: lastDayOfLastMonth.year,
    month: lastDayOfLastMonth.month,
    day: 1,
  };
  return { dateFrom: ymdToIso(firstOfLastMonth), dateTo: ymdToIso(lastDayOfLastMonth) };
}

export function getRolling30DaysRange(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const from = addDaysToYmd(today, -30);
  return { dateFrom: ymdToIso(from), dateTo: ymdToIso(today) };
}

export function getThisQuarterRange(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const startMonth = quarterStartMonth(today.month);
  const first: Ymd = { year: today.year, month: startMonth, day: 1 };
  return { dateFrom: ymdToIso(first), dateTo: ymdToIso(today) };
}

export function getLastQuarterRange(): { dateFrom: string; dateTo: string } {
  const today = getZonedYmd();
  const currentQuarterStart = quarterStartMonth(today.month);
  let endMonth = currentQuarterStart - 1;
  let year = today.year;
  if (endMonth < 1) {
    endMonth = 12;
    year -= 1;
  }
  const startMonth = quarterStartMonth(endMonth);
  const first: Ymd = { year, month: startMonth, day: 1 };
  const last: Ymd = { year, month: endMonth, day: daysInMonth(year, endMonth) };
  return { dateFrom: ymdToIso(first), dateTo: ymdToIso(last) };
}

export function resolveScheduleDateRange(
  mode: ScheduleDateRangeMode
): { dateFrom: string; dateTo: string } | undefined {
  switch (mode) {
    case "none":
      return undefined;
    case "today":
      return getTodayRange();
    case "yesterday":
      return getYesterdayRange();
    case "this_week":
      return getThisWeekRange();
    case "previous_week":
      return getPreviousCalendarWeek();
    case "this_month":
      return getThisMonthRange();
    case "last_month":
      return getLastMonthRange();
    case "rolling_30d":
      return getRolling30DaysRange();
    case "this_quarter":
      return getThisQuarterRange();
    case "last_quarter":
      return getLastQuarterRange();
    default:
      return getRolling30DaysRange();
  }
}

export function formatPreviousWeekLabel(): string {
  const { dateFrom, dateTo } = getPreviousCalendarWeek();
  const from = new Date(`${dateFrom}T00:00:00`);
  const to = new Date(`${dateTo}T00:00:00`);
  return `${from.toLocaleDateString()} – ${to.toLocaleDateString()}`;
}

export function daysBetween(from: string | Date, to: Date = new Date()): number {
  const start = typeof from === "string" ? new Date(from) : from;
  const diff = to.getTime() - start.getTime();
  return Math.max(0, Math.floor(diff / 86400000));
}

export function firstNameFromFullName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}
