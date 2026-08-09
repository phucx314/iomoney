export function parseMoneyInput(value: string) {
  const clean = value.replace(/[^\d,.-]/g, "");
  if (!clean || clean === "-" || clean === "." || clean === ",") return 0;
  const sign = clean.trim().startsWith("-") ? -1 : 1;
  const unsigned = clean.replace(/-/g, "");
  const lastDot = unsigned.lastIndexOf(".");
  const lastComma = unsigned.lastIndexOf(",");
  const decimalIndex = Math.max(lastDot, lastComma);
  const fractionLength = decimalIndex >= 0 ? unsigned.length - decimalIndex - 1 : 0;
  const usesDecimal = decimalIndex >= 0 && fractionLength > 0 && fractionLength <= 2;
  const integerPart = usesDecimal ? unsigned.slice(0, decimalIndex).replace(/[.,]/g, "") : unsigned.replace(/[.,]/g, "");
  const fractionPart = usesDecimal ? unsigned.slice(decimalIndex + 1).replace(/[.,]/g, "") : "";
  const parsed = Number(`${integerPart || "0"}${usesDecimal ? `.${fractionPart}` : ""}`);
  return Number.isFinite(parsed) ? sign * parsed : 0;
}

export function formatMoneyInput(value: number) {
  if (!value) return "";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value);
}

export function isValidMoneyAmount(value: number) {
  return Number.isFinite(value);
}
