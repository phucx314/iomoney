import { inferReportGroup, isReportGroup, normalizeReportGroup } from "../domain/reportGroup";
import { ReportGroup, SmartParseResult, SmartParserSettings } from "../domain/types";
import { todayCsvDate } from "../data/db";

type SmartParseContext = {
  categories: string[];
  accounts: string[];
};

export const DEFAULT_SMART_PARSER_SETTINGS: SmartParserSettings = {
  provider: "local",
  endpoint: "",
  apiKey: "",
  model: ""
};

export async function parseSmartNote(text: string, settings: SmartParserSettings, context: SmartParseContext): Promise<SmartParseResult[]> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Smart note is empty.");
  if (settings.provider === "online") {
    try {
      return await parseWithOnlineProvider(trimmed, settings, context);
    } catch (error) {
      const fallback = parseWithLocalRules(trimmed, context);
      return [{
        ...fallback,
        warnings: [...fallback.warnings, `Online parser failed; used local parser. ${error instanceof Error ? error.message : ""}`.trim()]
      }];
    }
  }
  return [parseWithLocalRules(trimmed, context)];
}

function parseWithLocalRules(text: string, context: SmartParseContext): SmartParseResult {
  const normalized = normalizeText(text);
  const amount = extractSignedAmount(normalized);
  const category = inferCategory(normalized, context.categories, amount);
  const reportGroup = inferSmartReportGroup(normalized, amount, category);
  const account = inferAccount(normalized, context.accounts);
  const date = inferDate(normalized);
  const warnings: string[] = [];
  if (amount === 0) warnings.push("No amount found, created a zero-amount note.");
  if (!context.categories.some((item) => item.toLowerCase() === category.toLowerCase())) warnings.push("Category was inferred locally.");
  return {
    note: text,
    amount,
    category,
    reportGroup,
    account,
    currency: "VND",
    date,
    event: "",
    excludeReport: false,
    important: /\b(important|urgent|quan trong|gấp|gap)\b/.test(normalized),
    confidence: Math.max(0.35, 0.86 - warnings.length * 0.18),
    source: "local",
    warnings
  };
}

async function parseWithOnlineProvider(text: string, settings: SmartParserSettings, context: SmartParseContext): Promise<SmartParseResult[]> {
  if (!settings.endpoint.trim()) throw new Error("Online endpoint is missing.");
  if (!settings.model.trim()) throw new Error("Online model is missing.");
  const response = await fetch(settings.endpoint.trim(), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(settings.apiKey.trim() ? { Authorization: `Bearer ${settings.apiKey.trim()}` } : {})
    },
    body: JSON.stringify({
      model: settings.model.trim(),
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You convert natural-language personal finance notes into strict JSON. Return only JSON. If the note contains multiple records, return {\"transactions\":[...]}; otherwise return one transaction object. Every transaction must include a short note field such as \"ăn phở\", not the full raw input. Amount is integer VND: 50k means 50000, 5tr means 5000000, 300M means 300000000. Expenses must be negative, income must be positive. Numeric values must not use thousands separators: use 2087000, never 2,087,000. Date must be dd/MM/yyyy. Account must be one of the provided accounts. Use one existing category when possible."
        },
        {
          role: "user",
          content: JSON.stringify({
            note: text,
            today: todayCsvDate(),
            categories: context.categories,
            accounts: context.accounts,
            schema: {
              note: "string",
              amount: "integer",
              category: "string",
              reportGroup: "income|gift|refund|transfer|expense|loan_out|loan_repayment|borrowed|debt_payment",
              account: "string",
              currency: "VND",
              date: "dd/MM/yyyy",
              event: "string",
              excludeReport: "boolean",
              important: "boolean",
              confidence: "0..1",
              warnings: "string[]"
            }
          })
        }
      ]
    })
  });
  const responseText = await response.text();
  logSmartParserDebug("online response", {
    status: response.status,
    ok: response.ok,
    body: responseText
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${truncateDebugText(responseText)}`);
  let payload: Record<string, any>;
  try {
    payload = JSON.parse(responseText);
  } catch (error) {
    throw new Error(`Online provider returned invalid JSON: ${error instanceof Error ? error.message : "parse failed"}`);
  }
  const content = payload?.choices?.[0]?.message?.content;
  logSmartParserDebug("online message content", content);
  const parsed = parseOnlineMessageContent(content);
  const parsedRows = Array.isArray(parsed.transactions) ? parsed.transactions : [parsed];
  if (parsedRows.length === 0) throw new Error("Online response has no transactions.");
  return dedupeSmartParseResults(parsedRows.map((row, index) => normalizeOnlineTransaction(row, text, context, index)));
}

function normalizeOnlineTransaction(row: unknown, text: string, context: SmartParseContext, index: number): SmartParseResult {
  if (!row || typeof row !== "object" || Array.isArray(row)) throw new Error(`Online transaction #${index + 1} is invalid.`);
  const parsed = row as Record<string, unknown>;
  const parsedAmount = Number(parsed.amount);
  if (!Number.isInteger(parsedAmount)) throw new Error(`Online transaction #${index + 1} amount is not an integer.`);
  const fallbackNote = String(parsed.event || "").trim();
  const note = String(parsed.note || fallbackNote || text).trim();
  const textAmount = inferAmountForParsedItem(text, note);
  const category = normalizeKnownValue(String(parsed.category || inferCategory(normalizeText(text), context.categories, parsedAmount)), context.categories);
  const reportGroup = isReportGroup(String(parsed.reportGroup)) ? String(parsed.reportGroup) as ReportGroup : normalizeReportGroup(parsedAmount, category);
  const amount = normalizeSignedAmount(textAmount ?? parsedAmount, reportGroup);
  const parsedAccount = String(parsed.account || "").trim();
  const account = knownAccount(parsedAccount, context.accounts) ?? inferAccount(normalizeText(text), context.accounts);
  const warnings = Array.isArray(parsed.warnings) ? parsed.warnings.map(String) : [];
  if (textAmount !== null && textAmount !== Math.abs(parsedAmount)) warnings.push("Amount was normalized from the raw note.");
  if (parsedAccount && !knownAccount(parsedAccount, context.accounts)) warnings.push("Account was normalized to an existing account.");
  return {
    note,
    amount,
    category,
    reportGroup,
    account,
    currency: "VND",
    date: isDdMmYyyy(String(parsed.date)) ? String(parsed.date) : todayCsvDate(),
    event: String(parsed.event || ""),
    excludeReport: Boolean(parsed.excludeReport),
    important: Boolean(parsed.important),
    confidence: clamp(Number(parsed.confidence) || 0.75, 0, 1),
    source: "online",
    warnings
  };
}

function extractSignedAmount(normalized: string) {
  const amount = extractAmount(normalized);
  if (amount === 0) return 0;
  return isIncomeText(normalized) ? amount : -amount;
}

function extractAmount(normalized: string) {
  const unitMatch = normalized.match(/(\d+(?:[.,]\d+)?)\s*(k|nghin|ngan|tr|trieu|m|million|b|ty|ti|tỷ|t)\b/);
  if (unitMatch) {
    const value = Number(unitMatch[1].replace(",", "."));
    const unit = unitMatch[2];
    if (["k", "nghin", "ngan"].includes(unit)) return Math.round(value * 1_000);
    if (["tr", "trieu", "m", "million"].includes(unit)) return Math.round(value * 1_000_000);
    if (["b", "ty", "ti", "tỷ"].includes(unit)) return Math.round(value * 1_000_000_000);
    if (unit === "t") return Math.round(value * 1_000_000_000_000);
  }
  const rawMatch = normalized.match(/\b\d{1,3}(?:[.,]\d{3})+\b|\b\d{4,}\b/);
  if (!rawMatch) return 0;
  return Number(rawMatch[0].replace(/[.,]/g, ""));
}

function inferCategory(normalized: string, categories: string[], amount: number) {
  const exact = categories.find((category) => normalized.includes(category.toLowerCase()));
  if (exact) return exact;
  const rules: Array<{ keys: string[]; category: string }> = [
    { keys: ["pho", "bun", "com", "an ", "cafe", "coffee", "tra", "banh", "food", "meal"], category: "Food & Beverage" },
    { keys: ["grab", "taxi", "bus", "xe", "xang", "transport"], category: "Transportation" },
    { keys: ["luong", "salary", "phu cap", "allowance", "bonus", "thuong"], category: "Salary & Allowance" },
    { keys: ["hoan", "refund", "deposit", "coc"], category: "Refund" },
    { keys: ["cho", "tang", "gift", "support"], category: "Gifts/Support" },
    { keys: ["nha", "rent", "apartment", "room"], category: "Rent" },
    { keys: ["dien", "nuoc", "internet", "bill"], category: "Utilities" },
    { keys: ["kham", "thuoc", "benh", "medical", "doctor"], category: "Medical Check-up" },
    { keys: ["mua", "shopping", "quan ao", "shirt"], category: "Shopping" },
    { keys: ["game", "movie", "cinema", "entertainment"], category: "Entertainment" }
  ];
  const matched = rules.find((rule) => rule.keys.some((key) => normalized.includes(key)));
  if (matched) {
    const existing = categories.find((category) => category.toLowerCase() === matched.category.toLowerCase());
    return existing ?? matched.category;
  }
  return amount >= 0 ? categories.find((category) => /salary|income|allowance/i.test(category)) ?? "Salary & Allowance" : "Other Expense";
}

function inferSmartReportGroup(normalized: string, amount: number, category: string) {
  if (amount < 0) return "expense";
  if (/\b(cho|tang|gift|support|ho tro)\b/.test(normalized)) return "gift";
  if (/\b(hoan|refund|coc|deposit)\b/.test(normalized)) return "refund";
  if (/\b(chuyen|transfer)\b/.test(normalized)) return "transfer";
  return inferReportGroup(amount, category);
}

function inferAmountForParsedItem(text: string, label: string): number | null {
  const normalizedText = normalizeText(text);
  const normalizedLabel = normalizeText(label);
  const labelIndex = normalizedLabel ? normalizedText.indexOf(normalizedLabel) : -1;
  if (labelIndex >= 0) {
    const nextSeparator = normalizedText.slice(labelIndex).search(/[,;\n]/);
    const segment = normalizedText.slice(labelIndex, nextSeparator >= 0 ? labelIndex + nextSeparator : labelIndex + 80);
    const amount = extractAmount(segment);
    if (amount > 0) return amount;
  }

  const mainToken = normalizedLabel.split(/\s+/).find((token) => token.length >= 3);
  if (mainToken) {
    const tokenIndex = normalizedText.indexOf(mainToken);
    if (tokenIndex >= 0) {
      const nextSeparator = normalizedText.slice(tokenIndex).search(/[,;\n]/);
      const segment = normalizedText.slice(tokenIndex, nextSeparator >= 0 ? tokenIndex + nextSeparator : tokenIndex + 80);
      const amount = extractAmount(segment);
      if (amount > 0) return amount;
    }
  }

  return null;
}

function normalizeSignedAmount(amount: number, reportGroup: ReportGroup) {
  const absolute = Math.abs(amount);
  if (["expense", "loan_out", "debt_payment"].includes(reportGroup)) return -absolute;
  return absolute;
}

function normalizeKnownValue(value: string, knownValues: string[]) {
  const known = knownValues.find((item) => item.toLowerCase() === value.toLowerCase());
  return known ?? value;
}

function knownAccount(value: string, accounts: string[]) {
  return accounts.find((account) => account.toLowerCase() === value.toLowerCase()) ?? null;
}

function dedupeSmartParseResults(results: SmartParseResult[]) {
  const seen = new Set<string>();
  return results.filter((result) => {
    const key = [
      normalizeText(result.note),
      result.amount,
      normalizeText(result.category),
      normalizeText(result.account),
      result.date
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function inferAccount(normalized: string, accounts: string[]) {
  const exact = accounts.find((account) => normalized.includes(account.toLowerCase()));
  if (exact) return exact;
  if (/\b(momo|zalopay|wallet)\b/.test(normalized)) return accounts.find((account) => /momo|wallet/i.test(account)) ?? "Momo";
  if (/\b(bank|vcb|mb|tech|bidv|card|the)\b/.test(normalized)) return accounts.find((account) => /bank|card|vcb|mb|tech|bidv/i.test(account)) ?? "Bank";
  return accounts[0] || "Cash";
}

function inferDate(normalized: string) {
  const explicit = normalized.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/);
  if (explicit) {
    const today = new Date();
    const year = explicit[3] ? Number(explicit[3].length === 2 ? `20${explicit[3]}` : explicit[3]) : today.getFullYear();
    return csvDate(new Date(year, Number(explicit[2]) - 1, Number(explicit[1])));
  }
  if (/\b(hom qua|yesterday)\b/.test(normalized)) return offsetCsvDate(-1);
  if (/\b(hom nay|today)\b/.test(normalized)) return todayCsvDate();
  if (/\b(mai|tomorrow)\b/.test(normalized)) return offsetCsvDate(1);
  return todayCsvDate();
}

function offsetCsvDate(offsetDays: number) {
  const date = new Date();
  date.setDate(date.getDate() + offsetDays);
  return csvDate(date);
}

function csvDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
}

function isIncomeText(normalized: string) {
  return /\b(thu|nhan|luong|salary|allowance|phu cap|bonus|thuong|hoan|refund|duoc cho|gift|support)\b/.test(normalized);
}

function parseOnlineMessageContent(content: unknown): Record<string, unknown> {
  if (content && typeof content === "object" && !Array.isArray(content)) return content as Record<string, unknown>;
  if (typeof content !== "string") throw new Error("Online response has no message content.");
  const json = repairCommonJsonMistakes(extractJsonObject(content));
  try {
    return JSON.parse(json);
  } catch (error) {
    throw new Error(`Invalid JSON from online parser: ${error instanceof Error ? error.message : "parse failed"}`);
  }
}

function extractJsonObject(content: string) {
  const clean = content
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = clean.indexOf("{");
  if (start < 0) throw new Error("Online response is not JSON.");

  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let index = start; index < clean.length; index += 1) {
    const character = clean[index];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (character === "\\") {
      escaped = true;
      continue;
    }
    if (character === "\"") {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (character === "{") depth += 1;
    if (character === "}") {
      depth -= 1;
      if (depth === 0) return clean.slice(start, index + 1);
    }
  }

  throw new Error("Online response JSON object is incomplete.");
}

function repairCommonJsonMistakes(json: string) {
  return json
    .replace(/("amount"\s*:\s*)(-?\d{1,3}(?:,\d{3})+)(?=\s*[,}])/g, (_match, prefix: string, value: string) => {
      return `${prefix}${value.replace(/,/g, "")}`;
    })
    .replace(/,\s*([}\]])/g, "$1");
}

function truncateDebugText(value: string) {
  return value.length > 240 ? `${value.slice(0, 240)}...` : value;
}

function logSmartParserDebug(label: string, value: unknown) {
  if (__DEV__) console.log(`[SmartParser] ${label}`, value);
}

function isDdMmYyyy(value: string) {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
