export function parseMoneyInput(value: string) {
  const clean = value.replace(/[^\d,.-]/g, "");
  if (!clean || clean === "-" || clean === "." || clean === ",") return 0;
  const sign = clean.trim().startsWith("-") ? -1 : 1;
  const unsigned = clean.replace(/-/g, "");

  const decimalIndex = resolveDecimalIndex(unsigned);
  const integerPart = decimalIndex >= 0 ? unsigned.slice(0, decimalIndex).replace(/[.,]/g, "") : unsigned.replace(/[.,]/g, "");
  const fractionPart = decimalIndex >= 0 ? unsigned.slice(decimalIndex + 1).replace(/[.,]/g, "") : "";
  const parsed = Number(`${integerPart || "0"}${decimalIndex >= 0 ? `.${fractionPart}` : ""}`);
  return Number.isFinite(parsed) ? sign * parsed : 0;
}

export function formatMoneyInput(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(value);
}

export function isValidMoneyAmount(value: number) {
  return Number.isFinite(value);
}

function resolveDecimalIndex(unsigned: string) {
  const lastDot = unsigned.lastIndexOf(".");
  const lastComma = unsigned.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) return Math.max(lastDot, lastComma);
  if (lastDot >= 0) return lastDot;
  if (lastComma < 0) return -1;

  const commaCount = unsigned.split(",").length - 1;
  const fractionLength = unsigned.length - lastComma - 1;
  return commaCount === 1 && fractionLength > 0 && fractionLength <= 2 ? lastComma : -1;
}
