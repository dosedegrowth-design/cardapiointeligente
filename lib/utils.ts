import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string) {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(d);
}

export function formatWeekRange(inicio: Date | string, fim: Date | string) {
  const i = typeof inicio === "string" ? new Date(inicio) : inicio;
  const f = typeof fim === "string" ? new Date(fim) : fim;
  const di = i.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const df = f.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  return `${di} a ${df}`;
}

/**
 * Dada uma data qualquer, retorna a segunda-feira da semana (00:00 local).
 */
export function getMondayOfWeek(date: Date = new Date()): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=dom, 1=seg, ..., 6=sáb
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function getFridayOfWeek(monday: Date): Date {
  const d = new Date(monday);
  d.setDate(d.getDate() + 4);
  return d;
}

export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}
