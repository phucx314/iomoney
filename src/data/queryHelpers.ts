import {
  DEBT_PAYMENT_REPORT_GROUPS,
  DEBT_REPORT_GROUPS,
  isDebtReportGroup,
  isDebtPrincipalReportGroup,
  normalizeReportGroup,
  signedDebtTransactionAmount
} from "../domain/reportGroup";
import { PeriodFilter, ReportGroup, Transaction, TransactionFilter } from "../domain/types";
import { csvDateToKey } from "./csv";

export const SQL_DATE_KEY = "substr(date, 7, 4) || '-' || substr(date, 4, 2) || '-' || substr(date, 1, 2)";

export type DbTransaction = {
  id: number;
  uid: string;
  external_id: string | null;
  note: string;
  amount: number;
  category: string;
  debt_id: number | null;
  debt_uid?: string | null;
  debt_payment_id?: number | null;
  debt_payment_uid?: string | null;
  debt_payment_record_cash_flow?: number | null;
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

export function applyTransactionFilter(filter: TransactionFilter, where: string[], params: Array<string | number>) {
  if (filter.query.trim()) {
    where.push("(note LIKE ? OR category LIKE ? OR event LIKE ?)");
    const query = `%${filter.query.trim()}%`;
    params.push(query, query, query);
  }

  const periodWhere = periodCondition(filter.period);
  if (periodWhere.where) {
    where.push(periodWhere.where);
    params.push(...periodWhere.params);
  }

  if (filter.categories.length > 0) {
    where.push(`category IN (${filter.categories.map(() => "?").join(", ")})`);
    params.push(...filter.categories);
  }

  if (filter.scope === "operating") {
    where.push(
      `(
        (debt_id IS NULL AND report_group NOT IN (${DEBT_REPORT_GROUPS.map(() => "?").join(", ")}))
        OR (
          report_group IN (${DEBT_PAYMENT_REPORT_GROUPS.map(() => "?").join(", ")})
          AND EXISTS (
            SELECT 1
            FROM debt_payments payment
            WHERE payment.id = transactions.debt_payment_id
              AND payment.transaction_id = transactions.id
              AND payment.record_cash_flow = 1
              AND payment.deleted_at IS NULL
          )
        )
      )`
    );
    params.push(...DEBT_REPORT_GROUPS, ...DEBT_PAYMENT_REPORT_GROUPS);
  }
  if (filter.scope === "debt") {
    where.push(`(debt_id IS NOT NULL OR report_group IN (${DEBT_REPORT_GROUPS.map(() => "?").join(", ")}))`);
    params.push(...DEBT_REPORT_GROUPS);
  }

  if (filter.flow === "expense") {
    if (filter.scope === "debt") {
      where.push("report_group IN (?, ?)");
      params.push("loan_out", "debt_payment");
    } else {
      where.push("amount < 0");
    }
  }
  if (filter.flow === "income") {
    if (filter.scope === "debt") {
      where.push("report_group IN (?, ?)");
      params.push("borrowed", "loan_repayment");
    } else {
      where.push("amount > 0");
    }
  }
}

export function fromDb(row: DbTransaction): Transaction {
  const reportGroup = normalizeReportGroup(row.amount, row.category, row.report_group);
  const amount = isDebtReportGroup(reportGroup) ? signedDebtTransactionAmount(reportGroup, row.amount) : row.amount;
  const isRecordedDebtPayment =
    !isDebtPrincipalReportGroup(reportGroup) &&
    row.debt_payment_id != null &&
    row.debt_payment_record_cash_flow === 1;
  const debtPaymentId = isRecordedDebtPayment ? row.debt_payment_id ?? null : null;
  return {
    id: row.id,
    uid: row.uid,
    externalId: row.external_id,
    note: row.note,
    amount,
    category: row.category,
    reportGroup,
    debtId: row.debt_id,
    debtUid: row.debt_uid ?? null,
    debtPaymentId,
    debtPaymentUid: isRecordedDebtPayment ? row.debt_payment_uid ?? null : null,
    debtPaymentRecordCashFlow: isRecordedDebtPayment ? true : null,
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
