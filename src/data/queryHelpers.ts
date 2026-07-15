import { normalizeReportGroup } from "../domain/reportGroup";
import { PeriodFilter, ReportGroup, Transaction } from "../domain/types";
import { csvDateToKey } from "./csv";

export const SQL_DATE_KEY = "substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2)";

export type DbTransaction = {
  id: number;
  uid: string;
  external_id: string | null;
  note: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  date: string;
  event: string;
  exclude_report: number;
  report_group: ReportGroup | null;
  important: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export function periodCondition(period: PeriodFilter): { where: string; params: string[] } {
  if (period.mode === "month") {
    if (period.month === "all") return { where: "", params: [] };
    return {
      where: "substr(date, 7, 4) || '-' || substr(date, 4, 2) = ?",
      params: [period.month]
    };
  }

  const start = csvDateToKey(period.startDate);
  const end = csvDateToKey(period.endDate);
  return {
    where: `${SQL_DATE_KEY} BETWEEN ? AND ?`,
    params: start <= end ? [start, end] : [end, start]
  };
}

export function periodLabel(period: PeriodFilter) {
  if (period.mode === "month") return period.month;
  return `${period.startDate} - ${period.endDate}`;
}

export function fromDb(row: DbTransaction): Transaction {
  return {
    id: row.id,
    uid: row.uid,
    externalId: row.external_id,
    note: row.note,
    amount: row.amount,
    category: row.category,
    reportGroup: normalizeReportGroup(row.amount, row.category, row.report_group),
    account: row.account,
    currency: row.currency,
    date: row.date,
    event: row.event,
    excludeReport: row.exclude_report === 1,
    important: row.important === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at
  };
}
