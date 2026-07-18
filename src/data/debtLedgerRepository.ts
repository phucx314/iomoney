import { Transaction, TransactionFilter, TransactionSort } from "../domain/types";
import { csvDateToKey, monthKeyFromDate } from "./csv";
import { database } from "./database";

type DbDebtOnlyPayment = {
  id: number;
  uid: string;
  debt_id: number;
  debt_uid: string;
  direction: "lent" | "borrowed";
  amount: number;
  date: string;
  note: string;
  account: string;
  currency: string;
  created_at: string;
  updated_at: string;
};

export async function listDebtOnlyPaymentLedgerEntries(filter: TransactionFilter): Promise<Transaction[]> {
  if (filter.scope !== "debt") return [];
  const db = await database();
  const rows = await db.getAllAsync<DbDebtOnlyPayment>(
    `SELECT
       payment.id,
       payment.uid,
       payment.debt_id,
       debt.uid AS debt_uid,
       debt.direction,
       payment.amount,
       payment.date,
       payment.note,
       payment.account,
       debt.currency,
       payment.created_at,
       payment.updated_at
     FROM debt_payments payment
     JOIN debts debt ON debt.id = payment.debt_id
     WHERE payment.deleted_at IS NULL
       AND payment.record_cash_flow = 0
       AND debt.deleted_at IS NULL`
  );

  return sortLedgerEntries(
    rows.map(debtOnlyPaymentFromDb).filter((entry) => matchesFilter(entry, filter)),
    filter.sort
  );
}

export function sortLedgerEntries(entries: Transaction[], sort: TransactionSort) {
  return [...entries].sort((a, b) => {
    if (sort === "createdDesc") return b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
    if (sort === "updatedDesc") return b.updatedAt.localeCompare(a.updatedAt) || b.id - a.id;
    if (sort === "amountDesc") return Math.abs(b.amount) - Math.abs(a.amount) || b.createdAt.localeCompare(a.createdAt);
    if (sort === "amountAsc") return Math.abs(a.amount) - Math.abs(b.amount) || b.createdAt.localeCompare(a.createdAt);
    return csvDateToKey(b.date).localeCompare(csvDateToKey(a.date)) || b.createdAt.localeCompare(a.createdAt) || b.id - a.id;
  });
}

function debtOnlyPaymentFromDb(row: DbDebtOnlyPayment): Transaction {
  const isRepaymentReceived = row.direction === "lent";
  return {
    id: -row.id,
    uid: `debt-payment-${row.uid}`,
    externalId: null,
    note: row.note || (isRepaymentReceived ? "Debt repayment received" : "Debt payment"),
    amount: isRepaymentReceived ? Math.abs(row.amount) : -Math.abs(row.amount),
    category: isRepaymentReceived ? "Debt - repayment" : "Debt - payment",
    reportGroup: isRepaymentReceived ? "loan_repayment" : "debt_payment",
    debtId: row.debt_id,
    debtUid: row.debt_uid,
    debtPaymentId: row.id,
    debtPaymentUid: row.uid,
    debtPaymentRecordCashFlow: false,
    ledgerRecordType: "debt_payment",
    account: row.account,
    currency: row.currency,
    date: row.date,
    event: "",
    excludeReport: true,
    important: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: null
  };
}

function matchesFilter(entry: Transaction, filter: TransactionFilter) {
  const query = filter.query.trim().toLowerCase();
  if (query && !`${entry.note} ${entry.category}`.toLowerCase().includes(query)) return false;
  if (filter.categories.length > 0 && !filter.categories.includes(entry.category)) return false;
  if (filter.flow === "expense" && entry.amount >= 0) return false;
  if (filter.flow === "income" && entry.amount <= 0) return false;
  if (filter.period.mode === "month") {
    return filter.period.month === "all" || monthKeyFromDate(entry.date) === filter.period.month;
  }

  const date = csvDateToKey(entry.date);
  const first = csvDateToKey(filter.period.startDate);
  const second = csvDateToKey(filter.period.endDate);
  return date >= (first < second ? first : second) && date <= (first < second ? second : first);
}
