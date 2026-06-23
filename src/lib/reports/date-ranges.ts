export function getPreviousCalendarWeek(): { dateFrom: string; dateTo: string } {
  const today = new Date();
  const day = today.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const thisMonday = new Date(today);
  thisMonday.setDate(today.getDate() - diffToMonday);
  thisMonday.setHours(0, 0, 0, 0);

  const lastMonday = new Date(thisMonday);
  lastMonday.setDate(thisMonday.getDate() - 7);

  const lastSunday = new Date(thisMonday);
  lastSunday.setDate(thisMonday.getDate() - 1);

  return {
    dateFrom: lastMonday.toISOString().split("T")[0],
    dateTo: lastSunday.toISOString().split("T")[0],
  };
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
