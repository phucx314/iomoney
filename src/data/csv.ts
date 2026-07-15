import { isReportGroup, normalizeReportGroup } from "../domain/reportGroup";
import { CategoryMetadata, CsvTransaction, NativeCsvTransaction, Transaction } from "../domain/types";

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

const IOMONEY_SCHEMA_VERSION = "2";

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

const IOMONEY_HEADER = [
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
  invalidRows: Array<{ row: number; reason: string }>;
} {
  const rows = parseCsv(text);
  const invalidRows: Array<{ row: number; reason: string }> = [];
  if (rows.length === 0) return { rows: [], categoryMetadata: [], invalidRows: [{ row: 1, reason: "empty csv" }] };

  const header = rows[0].map((cell) => cell.trim());
  const validV2Header = IOMONEY_HEADER.every((name, index) => header[index] === name);
  const validV1Header = IOMONEY_V1_HEADER.every((name, index) => header[index] === name);
  if (!validV2Header && !validV1Header) {
    return {
      rows: [],
      categoryMetadata: [],
      invalidRows: [{ row: 1, reason: `expected IOMoney header: ${IOMONEY_HEADER.join(",")}` }]
    };
  }

  const parsed: NativeCsvTransaction[] = [];
  const categoryMetadata: CategoryMetadata[] = [];
  rows.slice(1).forEach((cells, index) => {
    const rowNo = index + 2;
    if (validV1Header) parseIOMoneyTransactionRow(cells, rowNo, 0, "1", parsed, invalidRows);
    else parseIOMoneyV2Row(cells, rowNo, parsed, categoryMetadata, invalidRows);
  });

  return { rows: parsed, categoryMetadata, invalidRows };
}

export function toIOMoneyCsv(transactions: Transaction[], categoryMetadata: CategoryMetadata[] = []): string {
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
      ""
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
      category.updatedAt ?? ""
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

function parseIOMoneyTransactionRow(
  cells: string[],
  rowNo: number,
  offset: number,
  schemaVersion: string,
  parsed: NativeCsvTransaction[],
  invalidRows: Array<{ row: number; reason: string }>
) {
  const expectedLength = offset === 0 ? IOMONEY_V1_HEADER.length : IOMONEY_HEADER.length;
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
