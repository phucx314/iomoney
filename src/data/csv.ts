import { isReportGroup, normalizeReportGroup } from "../domain/reportGroup";
import { CategoryMetadata, Counterparty, CounterpartyType, CsvTransaction, Debt, DebtDirection, DebtStatus, NativeCsvTransaction, Transaction } from "../domain/types";

const HEADER = [
  "ID",
  "Note",
  "Amount",
  "Category",
  "Account",
  "Currency",
  "Date",
  "Event",
  "Exclude Report"
];

const IOMONEY_SCHEMA_VERSION = "3";

const IOMONEY_V1_HEADER = [
  "schema_version",
  "uid",
  "external_id",
  "note",
  "amount",
  "category",
  "report_group",
  "account",
  "currency",
  "date",
  "event",
  "exclude_report",
  "important",
  "created_at",
  "updated_at",
  "deleted_at"
];

const IOMONEY_V2_HEADER = [
  "schema_version",
  "record_type",
  "uid",
  "external_id",
  "note",
  "amount",
  "category",
  "report_group",
  "account",
  "currency",
  "date",
  "event",
  "exclude_report",
  "important",
  "created_at",
  "updated_at",
  "deleted_at",
  "category_name",
  "category_icon",
  "category_default_report_group",
  "category_created_at",
  "category_updated_at"
];

const IOMONEY_HEADER = [
  ...IOMONEY_V2_HEADER,
  "transaction_debt_uid",
  "counterparty_uid",
  "counterparty_name",
  "counterparty_type",
  "counterparty_phone",
  "counterparty_note",
  "counterparty_created_at",
  "counterparty_updated_at",
  "counterparty_deleted_at",
  "debt_uid",
  "debt_counterparty_uid",
  "debt_direction",
  "debt_principal_amount",
  "debt_currency",
  "debt_start_date",
  "debt_due_date",
  "debt_note",
  "debt_status",
  "debt_created_at",
  "debt_updated_at",
  "debt_deleted_at"
];

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  const input = text.replace(/^\uFEFF/, "");

  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"' && input[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell.replace(/\r$/, ""));
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += ch;
    }
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell.replace(/\r$/, ""));
    if (row.some((value) => value !== "")) rows.push(row);
  }

  return rows;
}

export function parseMoneyLoverCsv(text: string): {
  rows: CsvTransaction[];
  invalidRows: Array<{ row: number; reason: string }>;
} {
  const rows = parseCsv(text);
  const invalidRows: Array<{ row: number; reason: string }> = [];
  if (rows.length === 0) return { rows: [], invalidRows: [{ row: 1, reason: "empty csv" }] };

  const header = rows[0].map((cell) => cell.trim());
  const validHeader = HEADER.every((name, index) => header[index] === name);
  if (!validHeader) {
    return {
      rows: [],
      invalidRows: [{ row: 1, reason: `expected header: ${HEADER.join(",")}` }]
    };
  }

  const parsed: CsvTransaction[] = [];
  rows.slice(1).forEach((cells, index) => {
    const rowNo = index + 2;
    if (cells.length !== HEADER.length) {
      invalidRows.push({ row: rowNo, reason: `expected ${HEADER.length} columns, got ${cells.length}` });
      return;
    }

    const amount = Number(cells[2]);
    if (!Number.isInteger(amount)) {
      invalidRows.push({ row: rowNo, reason: "amount must be an integer" });
      return;
    }
    if (!isDdMmYyyy(cells[6])) {
      invalidRows.push({ row: rowNo, reason: "date must be dd/MM/yyyy" });
      return;
    }

    parsed.push({
      externalId: cells[0],
      note: cells[1],
      amount,
      category: cells[3] || "Other Expense",
      account: cells[4] || "Cash",
      currency: cells[5] || "VND",
      date: cells[6],
      event: cells[7] || "",
      excludeReport: /^true$/i.test(cells[8])
    });
  });

  return { rows: parsed, invalidRows };
}

export function toMoneyLoverCsv(transactions: Transaction[]): string {
  const rows = [
    HEADER,
    ...transactions.map((tx, index) => [
      tx.externalId || String(index + 1),
      tx.note,
      String(tx.amount),
      tx.category,
      tx.account,
      tx.currency,
      tx.date,
      tx.event,
      tx.excludeReport ? "True" : "False"
    ])
  ];
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}\r\n`;
}

export function parseIOMoneyCsv(text: string): {
  rows: NativeCsvTransaction[];
  categoryMetadata: CategoryMetadata[];
  counterparties: Array<Omit<Counterparty, "id">>;
  debts: Array<Omit<Debt, "id" | "counterpartyId"> & { counterpartyUid: string }>;
  invalidRows: Array<{ row: number; reason: string }>;
} {
  const rows = parseCsv(text);
  const invalidRows: Array<{ row: number; reason: string }> = [];
  if (rows.length === 0) return { rows: [], categoryMetadata: [], counterparties: [], debts: [], invalidRows: [{ row: 1, reason: "empty csv" }] };

  const header = rows[0].map((cell) => cell.trim());
  const validV3Header = IOMONEY_HEADER.every((name, index) => header[index] === name);
  const validV2Header = IOMONEY_V2_HEADER.every((name, index) => header[index] === name);
  const validV1Header = IOMONEY_V1_HEADER.every((name, index) => header[index] === name);
  if (!validV3Header && !validV2Header && !validV1Header) {
    return {
      rows: [],
      categoryMetadata: [],
      counterparties: [],
      debts: [],
      invalidRows: [{ row: 1, reason: `expected IOMoney header: ${IOMONEY_HEADER.join(",")}` }]
    };
  }

  const parsed: NativeCsvTransaction[] = [];
  const categoryMetadata: CategoryMetadata[] = [];
  const counterparties: Array<Omit<Counterparty, "id">> = [];
  const debts: Array<Omit<Debt, "id" | "counterpartyId"> & { counterpartyUid: string }> = [];
  rows.slice(1).forEach((cells, index) => {
    const rowNo = index + 2;
    if (validV1Header) parseIOMoneyTransactionRow(cells, rowNo, 0, "1", parsed, invalidRows);
    else if (validV2Header) parseIOMoneyV2Row(cells, rowNo, parsed, categoryMetadata, invalidRows);
    else parseIOMoneyV3Row(cells, rowNo, parsed, categoryMetadata, counterparties, debts, invalidRows);
  });

  return { rows: parsed, categoryMetadata, counterparties, debts, invalidRows };
}

export function toIOMoneyCsv(
  transactions: Transaction[],
  categoryMetadata: CategoryMetadata[] = [],
  counterparties: Counterparty[] = [],
  debts: Debt[] = []
): string {
  const rows = [
    IOMONEY_HEADER,
    ...transactions.map((tx) => [
      IOMONEY_SCHEMA_VERSION,
      "transaction",
      tx.uid,
      tx.externalId ?? "",
      tx.note,
      String(tx.amount),
      tx.category,
      tx.reportGroup,
      tx.account,
      tx.currency,
      tx.date,
      tx.event,
      tx.excludeReport ? "True" : "False",
      tx.important ? "True" : "False",
      tx.createdAt,
      tx.updatedAt,
      tx.deletedAt ?? "",
      "",
      "",
      "",
      "",
      "",
      tx.debtUid ?? "",
      ...emptyCells(20)
    ]),
    ...categoryMetadata.map((category) => [
      IOMONEY_SCHEMA_VERSION,
      "category",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      "",
      category.name,
      category.icon,
      category.defaultReportGroup,
      category.createdAt ?? "",
      category.updatedAt ?? "",
      ...emptyCells(21)
    ]),
    ...counterparties.map((counterparty) => [
      IOMONEY_SCHEMA_VERSION,
      "counterparty",
      ...emptyCells(21),
      counterparty.uid,
      counterparty.name,
      counterparty.type,
      counterparty.phone,
      counterparty.note,
      counterparty.createdAt,
      counterparty.updatedAt,
      counterparty.deletedAt ?? "",
      ...emptyCells(12)
    ]),
    ...debts.map((debt) => [
      IOMONEY_SCHEMA_VERSION,
      "debt",
      ...emptyCells(29),
      debt.uid,
      debt.counterpartyUid ?? "",
      debt.direction,
      String(debt.principalAmount),
      debt.currency,
      debt.startDate,
      debt.dueDate,
      debt.note,
      debt.status,
      debt.createdAt,
      debt.updatedAt,
      debt.deletedAt ?? ""
    ])
  ];
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}\r\n`;
}

function parseIOMoneyV2Row(
  cells: string[],
  rowNo: number,
  parsed: NativeCsvTransaction[],
  categoryMetadata: CategoryMetadata[],
  invalidRows: Array<{ row: number; reason: string }>
) {
  if (cells.length !== IOMONEY_V2_HEADER.length) {
    invalidRows.push({ row: rowNo, reason: `expected ${IOMONEY_V2_HEADER.length} columns, got ${cells.length}` });
    return;
  }
  if (cells[0] !== "2") {
    invalidRows.push({ row: rowNo, reason: `unsupported schema version ${cells[0]}` });
    return;
  }
  if (cells[1] === "transaction") {
    parseIOMoneyTransactionRow(cells, rowNo, 1, "2", parsed, invalidRows);
    return;
  }
  if (cells[1] === "category") {
    if (!cells[17].trim()) {
      invalidRows.push({ row: rowNo, reason: "category_name is required" });
      return;
    }
    if (!isReportGroup(cells[19])) {
      invalidRows.push({ row: rowNo, reason: "invalid category_default_report_group" });
      return;
    }
    categoryMetadata.push({
      name: cells[17].trim(),
      icon: cells[18] || "pricetag",
      defaultReportGroup: cells[19],
      createdAt: cells[20] || undefined,
      updatedAt: cells[21] || undefined
    });
    return;
  }
  invalidRows.push({ row: rowNo, reason: `unsupported record_type ${cells[1]}` });
}

function parseIOMoneyV3Row(
  cells: string[],
  rowNo: number,
  parsed: NativeCsvTransaction[],
  categoryMetadata: CategoryMetadata[],
  counterparties: Array<Omit<Counterparty, "id">>,
  debts: Array<Omit<Debt, "id" | "counterpartyId"> & { counterpartyUid: string }>,
  invalidRows: Array<{ row: number; reason: string }>
) {
  if (cells.length !== IOMONEY_HEADER.length) {
    invalidRows.push({ row: rowNo, reason: `expected ${IOMONEY_HEADER.length} columns, got ${cells.length}` });
    return;
  }
  if (cells[0] !== IOMONEY_SCHEMA_VERSION) {
    invalidRows.push({ row: rowNo, reason: `unsupported schema version ${cells[0]}` });
    return;
  }
  if (cells[1] === "transaction") {
    parseIOMoneyTransactionRow(cells, rowNo, 1, IOMONEY_SCHEMA_VERSION, parsed, invalidRows);
    return;
  }
  if (cells[1] === "category") {
    parseIOMoneyCategoryRow(cells, rowNo, categoryMetadata, invalidRows);
    return;
  }
  if (cells[1] === "counterparty") {
    parseIOMoneyCounterpartyRow(cells, rowNo, counterparties, invalidRows);
    return;
  }
  if (cells[1] === "debt") {
    parseIOMoneyDebtRow(cells, rowNo, debts, invalidRows);
    return;
  }
  invalidRows.push({ row: rowNo, reason: `unsupported record_type ${cells[1]}` });
}

function parseIOMoneyTransactionRow(
  cells: string[],
  rowNo: number,
  offset: number,
  schemaVersion: string,
  parsed: NativeCsvTransaction[],
  invalidRows: Array<{ row: number; reason: string }>
) {
  const expectedLength = offset === 0 ? IOMONEY_V1_HEADER.length : schemaVersion === "2" ? IOMONEY_V2_HEADER.length : IOMONEY_HEADER.length;
  if (cells.length !== expectedLength) {
    invalidRows.push({ row: rowNo, reason: `expected ${expectedLength} columns, got ${cells.length}` });
    return;
  }
  if (cells[0] !== schemaVersion) {
    invalidRows.push({ row: rowNo, reason: `unsupported schema version ${cells[0]}` });
    return;
  }
  if (!cells[1 + offset]) {
    invalidRows.push({ row: rowNo, reason: "uid is required" });
    return;
  }
  const amount = Number(cells[4 + offset]);
  if (!Number.isInteger(amount)) {
    invalidRows.push({ row: rowNo, reason: "amount must be an integer" });
    return;
  }
  if (!isDdMmYyyy(cells[9 + offset])) {
    invalidRows.push({ row: rowNo, reason: "date must be dd/MM/yyyy" });
    return;
  }
  const reportGroup = cells[6 + offset];
  if (!isReportGroup(reportGroup)) {
    invalidRows.push({ row: rowNo, reason: "invalid report_group" });
    return;
  }

  parsed.push({
    uid: cells[1 + offset],
    externalId: cells[2 + offset] || null,
    note: cells[3 + offset],
    amount,
    category: cells[5 + offset] || "Other",
    reportGroup: normalizeReportGroup(amount, cells[5 + offset] || "Other", reportGroup),
    debtUid: schemaVersion === "3" ? cells[22] || null : null,
    account: cells[7 + offset] || "Cash",
    currency: cells[8 + offset] || "VND",
    date: cells[9 + offset],
    event: cells[10 + offset] || "",
    excludeReport: /^true$/i.test(cells[11 + offset]),
    important: /^true$/i.test(cells[12 + offset]),
    createdAt: cells[13 + offset] || new Date().toISOString(),
    updatedAt: cells[14 + offset] || new Date().toISOString(),
    deletedAt: cells[15 + offset] || null
  });
}

function parseIOMoneyCategoryRow(
  cells: string[],
  rowNo: number,
  categoryMetadata: CategoryMetadata[],
  invalidRows: Array<{ row: number; reason: string }>
) {
  if (!cells[17].trim()) {
    invalidRows.push({ row: rowNo, reason: "category_name is required" });
    return;
  }
  if (!isReportGroup(cells[19])) {
    invalidRows.push({ row: rowNo, reason: "invalid category_default_report_group" });
    return;
  }
  categoryMetadata.push({
    name: cells[17].trim(),
    icon: cells[18] || "pricetag",
    defaultReportGroup: cells[19],
    createdAt: cells[20] || undefined,
    updatedAt: cells[21] || undefined
  });
}

function parseIOMoneyCounterpartyRow(
  cells: string[],
  rowNo: number,
  counterparties: Array<Omit<Counterparty, "id">>,
  invalidRows: Array<{ row: number; reason: string }>
) {
  if (!cells[23]) {
    invalidRows.push({ row: rowNo, reason: "counterparty_uid is required" });
    return;
  }
  if (!cells[24].trim()) {
    invalidRows.push({ row: rowNo, reason: "counterparty_name is required" });
    return;
  }
  if (!isCounterpartyType(cells[25])) {
    invalidRows.push({ row: rowNo, reason: "invalid counterparty_type" });
    return;
  }
  counterparties.push({
    uid: cells[23],
    name: cells[24].trim(),
    type: cells[25],
    phone: cells[26] || "",
    note: cells[27] || "",
    createdAt: cells[28] || new Date().toISOString(),
    updatedAt: cells[29] || new Date().toISOString(),
    deletedAt: cells[30] || null
  });
}

function parseIOMoneyDebtRow(
  cells: string[],
  rowNo: number,
  debts: Array<Omit<Debt, "id" | "counterpartyId"> & { counterpartyUid: string }>,
  invalidRows: Array<{ row: number; reason: string }>
) {
  if (!cells[31]) {
    invalidRows.push({ row: rowNo, reason: "debt_uid is required" });
    return;
  }
  if (!cells[32]) {
    invalidRows.push({ row: rowNo, reason: "debt_counterparty_uid is required" });
    return;
  }
  if (!isDebtDirection(cells[33])) {
    invalidRows.push({ row: rowNo, reason: "invalid debt_direction" });
    return;
  }
  const principalAmount = Number(cells[34]);
  if (!Number.isInteger(principalAmount) || principalAmount <= 0) {
    invalidRows.push({ row: rowNo, reason: "debt_principal_amount must be a positive integer" });
    return;
  }
  if (!isDdMmYyyy(cells[36])) {
    invalidRows.push({ row: rowNo, reason: "debt_start_date must be dd/MM/yyyy" });
    return;
  }
  if (cells[37] && !isDdMmYyyy(cells[37])) {
    invalidRows.push({ row: rowNo, reason: "debt_due_date must be dd/MM/yyyy" });
    return;
  }
  if (!isDebtStatus(cells[39])) {
    invalidRows.push({ row: rowNo, reason: "invalid debt_status" });
    return;
  }
  debts.push({
    uid: cells[31],
    counterpartyUid: cells[32],
    direction: cells[33],
    principalAmount,
    currency: cells[35] || "VND",
    startDate: cells[36],
    dueDate: cells[37] || "",
    note: cells[38] || "",
    status: cells[39],
    createdAt: cells[40] || new Date().toISOString(),
    updatedAt: cells[41] || new Date().toISOString(),
    deletedAt: cells[42] || null
  });
}

function isCounterpartyType(value: string): value is CounterpartyType {
  return value === "person" || value === "organization";
}

function isDebtDirection(value: string): value is DebtDirection {
  return value === "lent" || value === "borrowed";
}

function isDebtStatus(value: string): value is DebtStatus {
  return value === "open" || value === "partial" || value === "settled";
}

function emptyCells(count: number) {
  return Array.from({ length: count }, () => "");
}

export function isDdMmYyyy(value: string): boolean {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function csvDateToKey(value: string): string {
  const [day, month, year] = value.split("/");
  return `${year}-${month}-${day}`;
}

export function monthKeyFromDate(value: string): string {
  const [, month, year] = value.split("/");
  return `${year}-${month}`;
}

export function csvEscape(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
