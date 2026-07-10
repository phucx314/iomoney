import { CsvTransaction, Transaction } from "./types";

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
