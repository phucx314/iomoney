import { monthKeyFromDate } from "../data/csv";

export function formatVnd(value: number) {
  const abs = Math.abs(value);
  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0
  }).format(abs);
  if (value < 0) return `-${formatted} VND`;
  return `${formatted} VND`;
}

export function formatSignedVnd(value: number) {
  if (value > 0) return `+${formatVnd(value)}`;
  return formatVnd(value);
}

export function compactVnd(value: number) {
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${sign}${trim(abs / 1_000_000)}tr`;
  if (abs >= 1_000) return `${sign}${trim(abs / 1_000)}k`;
  return `${sign}${abs}`;
}

export function monthLabel(month: string) {
  if (month === "all") return "All time";
  const [year, mm] = month.split("-");
  return `Tháng ${Number(mm)}/${year}`;
}

export function dateToMonthLabel(date: string) {
  return monthLabel(monthKeyFromDate(date));
}

export function categoryColor(category: string) {
  const palette = [
    "#2563EB",
    "#059669",
    "#DC2626",
    "#7C3AED",
    "#EA580C",
    "#0891B2",
    "#BE123C",
    "#4D7C0F",
    "#9333EA",
    "#0F766E"
  ];
  let hash = 0;
  for (let i = 0; i < category.length; i += 1) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}

function trim(value: number) {
  return value.toFixed(value >= 10 ? 0 : 1).replace(/\.0$/, "");
}
