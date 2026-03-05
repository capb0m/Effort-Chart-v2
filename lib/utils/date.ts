import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInHours, parseISO, isAfter, isBefore } from "date-fns";
import { ja } from "date-fns/locale";

export const TIMEZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;

export function formatDate(date: Date | string, fmt = "yyyy年M月d日（E）"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt, { locale: ja });
}

export function formatTime(date: Date | string, fmt = "HH:mm"): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, fmt);
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function formatHoursShort(hours: number): string {
  return `${hours.toFixed(1)}h`;
}

export function durationInHours(startTime: string, endTime: string): number {
  return differenceInHours(parseISO(endTime), parseISO(startTime), { roundingMethod: "floor" });
}

export function durationInHoursExact(startTime: string, endTime: string): number {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}

export function todayRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: startOfDay(now).toISOString(),
    end: endOfDay(now).toISOString(),
  };
}

export function weekRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: startOfWeek(now, { weekStartsOn: 1 }).toISOString(),
    end: endOfWeek(now, { weekStartsOn: 1 }).toISOString(),
  };
}

export function monthRange(): { start: string; end: string } {
  const now = new Date();
  return {
    start: startOfMonth(now).toISOString(),
    end: endOfMonth(now).toISOString(),
  };
}

export function isFuture(dateStr: string): boolean {
  return isAfter(parseISO(dateStr), new Date());
}

export function isValidRange(startTime: string, endTime: string): boolean {
  return isBefore(parseISO(startTime), parseISO(endTime));
}

export function localDateString(date: Date = new Date()): string {
  return format(date, "yyyy-MM-dd");
}

export function hoursToSeconds(hours: number): number {
  return Math.floor(hours * 3600);
}
