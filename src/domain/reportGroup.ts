import { ReportGroup } from "./types";

export const REPORT_GROUP_LABEL: Record<ReportGroup, string> = {
  income: "Earned income",
  gift: "Gift / support",
  refund: "Refund",
  transfer: "Transfer",
  expense: "Expense",
  loan_out: "Lent out",
  loan_repayment: "Loan repayment",
  borrowed: "Borrowed",
  debt_payment: "Debt payment"
};

export const INCOME_REPORT_GROUPS: ReportGroup[] = ["income", "gift", "refund", "transfer"];
export const DEBT_PRINCIPAL_REPORT_GROUPS: ReportGroup[] = ["loan_out", "borrowed"];
export const DEBT_PAYMENT_REPORT_GROUPS: ReportGroup[] = ["loan_repayment", "debt_payment"];
export const DEBT_REPORT_GROUPS: ReportGroup[] = [...DEBT_PRINCIPAL_REPORT_GROUPS, ...DEBT_PAYMENT_REPORT_GROUPS];
export const REPORT_GROUPS: ReportGroup[] = ["income", "gift", "refund", "transfer", "expense", ...DEBT_REPORT_GROUPS];

export function isReportGroup(value: string): value is ReportGroup {
  return REPORT_GROUPS.includes(value as ReportGroup);
}

export function isDebtReportGroup(reportGroup?: ReportGroup | null): reportGroup is ReportGroup {
  return Boolean(reportGroup && DEBT_REPORT_GROUPS.includes(reportGroup));
}

export function isDebtPrincipalReportGroup(reportGroup?: ReportGroup | null): reportGroup is ReportGroup {
  return Boolean(reportGroup && DEBT_PRINCIPAL_REPORT_GROUPS.includes(reportGroup));
}

export function isDebtPaymentReportGroup(reportGroup?: ReportGroup | null): reportGroup is ReportGroup {
  return Boolean(reportGroup && DEBT_PAYMENT_REPORT_GROUPS.includes(reportGroup));
}

export function canonicalDebtReportGroupForCategory(category: string): ReportGroup | null {
  const normalized = category.trim().toLowerCase();
  if (normalized === "debt - borrowed") return "borrowed";
  if (normalized === "debt - lent") return "loan_out";
  if (normalized === "debt - repayment") return "loan_repayment";
  if (normalized === "debt - payment") return "debt_payment";
  return null;
}

export function signedDebtTransactionAmount(reportGroup: ReportGroup, amount: number) {
  const absAmount = Math.abs(amount);
  return reportGroup === "loan_out" || reportGroup === "debt_payment" ? -absAmount : absAmount;
}

export function inferReportGroup(amount: number, category: string): ReportGroup {
  if (amount < 0) return "expense";
  const normalized = category.toLowerCase();
  if (["gift", "donation", "support", "cho", "tang"].some((key) => normalized.includes(key))) return "gift";
  if (["refund", "deposit", "return", "hoan"].some((key) => normalized.includes(key))) return "refund";
  if (["transfer", "chuyen"].some((key) => normalized.includes(key))) return "transfer";
  return "income";
}

export function normalizeReportGroup(amount: number, category: string, reportGroup?: ReportGroup | null): ReportGroup {
  const canonicalDebtGroup = canonicalDebtReportGroupForCategory(category);
  if (canonicalDebtGroup && isDebtReportGroup(reportGroup)) return canonicalDebtGroup;
  if (isDebtReportGroup(reportGroup)) return reportGroup;
  if (amount < 0) return "expense";
  if (amount === 0 && reportGroup) return reportGroup;
  if (!reportGroup || reportGroup === "expense") return inferReportGroup(amount, category);
  return reportGroup;
}
