import { ReportGroup } from "./types";

export const REPORT_GROUP_LABEL: Record<ReportGroup, string> = {
  income: "Earned income",
  gift: "Gift / support",
  refund: "Refund",
  transfer: "Transfer",
  expense: "Expense"
};

export const INCOME_REPORT_GROUPS: ReportGroup[] = ["income", "gift", "refund", "transfer"];
export const REPORT_GROUPS: ReportGroup[] = ["income", "gift", "refund", "transfer", "expense"];

export function isReportGroup(value: string): value is ReportGroup {
  return REPORT_GROUPS.includes(value as ReportGroup);
}

export function inferReportGroup(amount: number, category: string): ReportGroup {
  if (amount <= 0) return "expense";
  const normalized = category.toLowerCase();
  if (["gift", "donation", "support", "cho", "tang"].some((key) => normalized.includes(key))) return "gift";
  if (["refund", "deposit", "return", "hoan"].some((key) => normalized.includes(key))) return "refund";
  if (["transfer", "chuyen"].some((key) => normalized.includes(key))) return "transfer";
  return "income";
}

export function normalizeReportGroup(amount: number, category: string, reportGroup?: ReportGroup | null): ReportGroup {
  if (amount <= 0) return "expense";
  if (!reportGroup || reportGroup === "expense") return inferReportGroup(amount, category);
  return reportGroup;
}
