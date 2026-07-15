import { Ionicons } from "@expo/vector-icons";
import { TransactionFilter } from "./types";

export type AppIcon = keyof typeof Ionicons.glyphMap;

let categoryIconOverrides: Record<string, AppIcon> = {};

export const CATEGORY_ICON_CHOICES: AppIcon[] = [
  "restaurant",
  "cafe",
  "car",
  "home",
  "flash",
  "cart",
  "medical",
  "school",
  "cash",
  "gift",
  "refresh-circle",
  "game-controller",
  "airplane",
  "card",
  "briefcase",
  "pricetag"
];

export const FLOW_LABEL: Record<TransactionFilter["flow"], string> = {
  all: "All",
  expense: "Expense",
  income: "Income"
};

const CATEGORY_ICON_RULES: Array<{ keys: string[]; icon: AppIcon }> = [
  { keys: ["food", "beverage", "restaurant", "eat", "meal", "coffee", "cafe"], icon: "restaurant" },
  { keys: ["transport", "taxi", "grab", "bus", "parking", "fuel", "gas"], icon: "car" },
  { keys: ["home", "rent", "house", "apartment", "room"], icon: "home" },
  { keys: ["bill", "utility", "electric", "water", "internet", "phone"], icon: "flash" },
  { keys: ["shopping", "clothes", "shirt", "mall"], icon: "cart" },
  { keys: ["health", "medical", "doctor", "medicine"], icon: "medical" },
  { keys: ["education", "school", "book", "course"], icon: "school" },
  { keys: ["salary", "income", "allowance", "payroll", "bonus", "phu cap", "luong"], icon: "cash" },
  { keys: ["refund", "deposit", "return"], icon: "refresh-circle" },
  { keys: ["entertainment", "game", "movie", "music"], icon: "game-controller" },
  { keys: ["travel", "flight", "hotel"], icon: "airplane" },
  { keys: ["gift", "donation", "support", "cho", "tang"], icon: "gift" },
  { keys: ["fee", "bank", "card", "wallet"], icon: "card" },
  { keys: ["work", "business", "office"], icon: "briefcase" }
];

export function categoryIcon(category: string): AppIcon {
  const overridden = categoryIconOverrides[category.trim().toLowerCase()];
  if (overridden) return overridden;
  const normalized = category.toLowerCase();
  return CATEGORY_ICON_RULES.find((rule) => rule.keys.some((key) => normalized.includes(key)))?.icon ?? "pricetag";
}

export function normalizeAppIcon(icon: string): AppIcon {
  return Object.prototype.hasOwnProperty.call(Ionicons.glyphMap, icon) ? (icon as AppIcon) : "pricetag";
}

export function setCategoryIconOverrides(overrides: Record<string, string>) {
  categoryIconOverrides = Object.fromEntries(Object.entries(overrides).map(([name, icon]) => [name.trim().toLowerCase(), normalizeAppIcon(icon)]));
}
