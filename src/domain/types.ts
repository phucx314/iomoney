export type Transaction = {
  id: number;
  uid: string;
  externalId: string | null;
  note: string;
  amount: number;
  category: string;
  reportGroup: ReportGroup;
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

export type ReportGroup = "income" | "gift" | "refund" | "transfer" | "expense";

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

export type Tab = "dashboard" | "transactions" | "sync" | "settings" | "notifications" | "categories";
