export type Transaction = {
  id: number;
  uid: string;
  externalId: string | null;
  note: string;
  amount: number;
  category: string;
  reportGroup: ReportGroup;
  debtId: number | null;
  debtUid?: string | null;
  account: string;
  currency: string;
  date: string;
  event: string;
  excludeReport: boolean;
  important: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type TransactionInput = Omit<Transaction, "id" | "uid" | "createdAt" | "updatedAt" | "deletedAt"> & {
  uid?: string;
  deletedAt?: string | null;
};

export type ReportGroup = "income" | "gift" | "refund" | "transfer" | "expense" | "loan_out" | "loan_repayment" | "borrowed" | "debt_payment";

export type RecurrenceFrequency = "weekly" | "monthly" | "yearly";

export type RecurrenceDraft = {
  enabled: boolean;
  frequency: RecurrenceFrequency;
  count: number;
};

export type CsvTransaction = {
  externalId: string;
  note: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  date: string;
  event: string;
  excludeReport: boolean;
};

export type NativeCsvTransaction = {
  uid: string;
  externalId: string | null;
  note: string;
  amount: number;
  category: string;
  reportGroup: ReportGroup;
  debtUid?: string | null;
  account: string;
  currency: string;
  date: string;
  event: string;
  excludeReport: boolean;
  important: boolean;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type MonthlySummary = {
  month: string;
  income: number;
  gift: number;
  refund: number;
  transfer: number;
  totalInflow: number;
  expense: number;
  net: number;
  count: number;
};

export type CategorySummary = {
  category: string;
  amount: number;
  count: number;
  flow: "income" | "expense";
};

export type CategoryMetadata = {
  name: string;
  icon: string;
  defaultReportGroup: ReportGroup;
  createdAt?: string;
  updatedAt?: string;
};

export type CounterpartyType = "person" | "organization";

export type Counterparty = {
  id: number;
  uid: string;
  name: string;
  type: CounterpartyType;
  phone: string;
  note: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DebtDirection = "lent" | "borrowed";
export type DebtStatus = "open" | "partial" | "settled";

export type Debt = {
  id: number;
  uid: string;
  counterpartyId: number;
  counterpartyUid?: string;
  direction: DebtDirection;
  principalAmount: number;
  currency: string;
  startDate: string;
  dueDate: string;
  note: string;
  status: DebtStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type DebtSummary = Debt & {
  counterpartyName: string;
  counterpartyType: CounterpartyType;
  paidAmount: number;
  remainingAmount: number;
};

export type DebtPaymentHistory = {
  id: number;
  debtId: number;
  amount: number;
  date: string;
  note: string;
  account: string;
  reportGroup: ReportGroup;
  createdAt: string;
  updatedAt: string;
};

export type CleanupRecordType = "transaction" | "debt" | "counterparty";

export type CleanupItem = {
  key: string;
  type: CleanupRecordType;
  id: number;
  title: string;
  subtitle: string;
  deletedAt: string;
};

export type UndoItem = {
  id: number;
  action: "create" | "update" | "delete";
  targetType: "transaction" | "debt" | "transaction_batch";
  targetId: number | null;
  label: string;
  createdAt: string;
  undoneAt: string | null;
};

export type DebtDraft = {
  counterpartyId: number | null;
  newCounterpartyName: string;
  newCounterpartyType: CounterpartyType;
  direction: DebtDirection;
  amount: number;
  currency: string;
  date: string;
  dueDate: string;
  note: string;
  account: string;
};

export type DebtPaymentDraft = {
  debtId: number;
  amount: number;
  date: string;
  note: string;
  account: string;
};

export type LedgerFilterSummary = {
  earned: number;
  spent: number;
  count: number;
};

export type ImportResult = {
  inserted: number;
  skippedDuplicates: number;
  invalidRows: Array<{ row: number; reason: string }>;
};

export type AppNotificationType = "success" | "warning" | "danger" | "sync" | "system";

export type AppNotification = {
  id: string;
  type: AppNotificationType;
  message: string;
  createdAt: string;
};

export type TransactionFilter = {
  query: string;
  period: PeriodFilter;
  categories: string[];
  flow: "all" | "expense" | "income";
  scope: "all" | "operating" | "debt";
};

export type PeriodFilter =
  | {
      mode: "month";
      month: string;
    }
  | {
      mode: "range";
      startDate: string;
      endDate: string;
    };

export type Tab = "dashboard" | "transactions" | "debts" | "sync" | "settings" | "notifications" | "categories" | "cleanup" | "undo";
