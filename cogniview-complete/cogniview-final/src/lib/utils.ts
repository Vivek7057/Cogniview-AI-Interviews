import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatTimer(s: number) {
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function formatDuration(s: number | null) {
  if (!s) return "—";
  return `${Math.floor(s / 60)}m ${s % 60}s`;
}

export function scoreColor(score: number) {
  if (score >= 8) return "#00D4AA";
  if (score >= 6) return "#4F9EFF";
  if (score >= 4) return "#F59E0B";
  return "#F87171";
}

export function recStyle(rec: string) {
  const map: Record<string, { color: string; bg: string; border: string }> = {
    "Strong Hire": { color: "#00D4AA", bg: "rgba(0,212,170,0.1)", border: "rgba(0,212,170,0.25)" },
    "Hire":        { color: "#4F9EFF", bg: "rgba(79,158,255,0.1)", border: "rgba(79,158,255,0.25)" },
    "Maybe":       { color: "#F59E0B", bg: "rgba(245,158,11,0.1)", border: "rgba(245,158,11,0.25)" },
    "No Hire":     { color: "#F87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.25)" },
  };
  return map[rec] || map["Maybe"];
}
