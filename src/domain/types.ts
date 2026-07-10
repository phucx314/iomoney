export type Transaction = {
  id: number;
  externalId: string | null;
  note: string;
  amount: number;
  category: string;
  account: string;
  currency: string;
  date: string;
  event: string;
  excludeReport: boolean;
  important: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TransactionInput = Omit<Transaction, "id" | "createdAt" | "updatedAt">;

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

export type MonthlySummary = {
  month: string;
  income: number;
  expense: number;
  net: number;
  count: number;
};

export type CategorySummary = {
  category: string;
  amount: number;
  count: number;
};

export type ImportResult = {
  inserted: number;
  skippedDuplicates: number;
  invalidRows: Array<{ row: number; reason: string }>;
};

export type AppNotification = {
  id: string;
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

export type Tab = "dashboard" | "transactions" | "sync" | "notifications";
