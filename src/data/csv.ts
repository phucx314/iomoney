import { isReportGroup, normalizeReportGroup } from "../domain/reportGroup";
import { CsvTransaction, NativeCsvTransaction, Transaction } from "../domain/types";

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

const IOMONEY_SCHEMA_VERSION = "1";

const IOMONEY_HEADER = [
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
  invalidRows: Array<{ row: number; reason: string }>;
} {
  const rows = parseCsv(text);
  const invalidRows: Array<{ row: number; reason: string }> = [];
  if (rows.length === 0) return { rows: [], invalidRows: [{ row: 1, reason: "empty csv" }] };

  const header = rows[0].map((cell) => cell.trim());
  const validHeader = IOMONEY_HEADER.every((name, index) => header[index] === name);
  if (!validHeader) {
    return {
      rows: [],
      invalidRows: [{ row: 1, reason: `expected IOMoney header: ${IOMONEY_HEADER.join(",")}` }]
    };
  }

  const parsed: NativeCsvTransaction[] = [];
  rows.slice(1).forEach((cells, index) => {
    const rowNo = index + 2;
    if (cells.length !== IOMONEY_HEADER.length) {
      invalidRows.push({ row: rowNo, reason: `expected ${IOMONEY_HEADER.length} columns, got ${cells.length}` });
      return;
    }
    if (cells[0] !== IOMONEY_SCHEMA_VERSION) {
      invalidRows.push({ row: rowNo, reason: `unsupported schema version ${cells[0]}` });
      return;
    }
    if (!cells[1]) {
      invalidRows.push({ row: rowNo, reason: "uid is required" });
      return;
    }
    const amount = Number(cells[4]);
    if (!Number.isInteger(amount)) {
      invalidRows.push({ row: rowNo, reason: "amount must be an integer" });
      return;
    }
    if (!isDdMmYyyy(cells[9])) {
      invalidRows.push({ row: rowNo, reason: "date must be dd/MM/yyyy" });
      return;
    }
    if (!isReportGroup(cells[6])) {
      invalidRows.push({ row: rowNo, reason: "invalid report_group" });
      return;
    }

    parsed.push({
      uid: cells[1],
      externalId: cells[2] || null,
      note: cells[3],
      amount,
      category: cells[5] || "Other",
      reportGroup: normalizeReportGroup(amount, cells[5] || "Other", cells[6]),
      account: cells[7] || "Cash",
      currency: cells[8] || "VND",
      date: cells[9],
      event: cells[10] || "",
      excludeReport: /^true$/i.test(cells[11]),
      important: /^true$/i.test(cells[12]),
      createdAt: cells[13] || new Date().toISOString(),
      updatedAt: cells[14] || new Date().toISOString(),
      deletedAt: cells[15] || null
    });
  });

  return { rows: parsed, invalidRows };
}

export function toIOMoneyCsv(transactions: Transaction[]): string {
  const rows = [
    IOMONEY_HEADER,
    ...transactions.map((tx) => [
      IOMONEY_SCHEMA_VERSION,
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
      tx.deletedAt ?? ""
    ])
  ];
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\r\n")}\r\n`;
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
