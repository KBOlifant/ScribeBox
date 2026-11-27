import type { ItemStatus } from "./types";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function parse(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  return { y, m, d };
}

/** Day of the week without Date, so server and client render the same text (Sakamoto's method). */
function dayOfWeek(y: number, m: number, d: number): number {
  const t = [0, 3, 2, 5, 0, 3, 5, 1, 4, 6, 2, 4];
  const yy = m < 3 ? y - 1 : y;
  return (yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) + t[m - 1] + d) % 7;
}

/** "Fri 20 Nov": lists and action items. */
export function formatShortDate(iso: string): string {
  const { y, m, d } = parse(iso);
  return DAYS[dayOfWeek(y, m, d)] + " " + d + " " + MONTHS[m - 1].slice(0, 3);
}

/** "20 November 2026": detail pages. */
export function formatLongDate(iso: string): string {
  const { y, m, d } = parse(iso);
  return d + " " + MONTHS[m - 1] + " " + y;
}

/** "Fri, 20 November 2026": meeting rows. */
export function formatRowDate(iso: string): string {
  const { y, m, d } = parse(iso);
  return DAYS[dayOfWeek(y, m, d)] + ", " + d + " " + MONTHS[m - 1] + " " + y;
}

export function dateParts(iso: string): { day: number; month: string } {
  const { m, d } = parse(iso);
  return { day: d, month: MONTHS[m - 1].slice(0, 3) };
}

/** ISO dates compare correctly as strings. Done items are never overdue. */
export function isOverdue(due: string | null, status: ItemStatus, today: string): boolean {
  return Boolean(due) && status !== "done" && (due as string) < today;
}

export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const { y, m, d } = parse(value);
  // There's no year 0 (the database rejects it)
  if (y < 1) return false;
  const daysInMonth = [31, y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return m >= 1 && m <= 12 && d >= 1 && d <= daysInMonth[m - 1];
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

export function plural(count: number, one: string, many = one + "s"): string {
  return count + " " + (count === 1 ? one : many);
}
