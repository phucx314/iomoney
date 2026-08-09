import { DebtSummary } from "../../../domain/types";

export type DebtSort = "updatedDesc" | "createdDesc" | "principalDesc" | "remainingDesc" | "dueAsc";

export type DebtCounterpartyGroup = {
  key: string;
  counterpartyName: string;
  counterpartyType: DebtSummary["counterpartyType"];
  debts: DebtSummary[];
  receivable: number;
  payable: number;
  net: number;
  principal: number;
  remaining: number;
  activeCount: number;
  completedCount: number;
  createdAt: string;
  updatedAt: string;
  dueDate: string;
};

export function compareDebts(a: DebtSummary, b: DebtSummary, sort: DebtSort) {
  if (sort === "createdDesc") return b.createdAt.localeCompare(a.createdAt);
  if (sort === "principalDesc") return b.principalAmount - a.principalAmount;
  if (sort === "remainingDesc") return b.remainingAmount - a.remainingAmount;
  if (sort === "dueAsc") return dateSortValue(a.dueDate) - dateSortValue(b.dueDate);
  return b.updatedAt.localeCompare(a.updatedAt);
}

export function groupDebtsByCounterparty(debts: DebtSummary[], sort: DebtSort): DebtCounterpartyGroup[] {
  const groups = new Map<string, DebtCounterpartyGroup>();
  for (const debt of debts) {
    const key = String(debt.counterpartyId);
    const existing = groups.get(key);
    if (!existing) {
      groups.set(key, {
        key,
        counterpartyName: debt.counterpartyName,
        counterpartyType: debt.counterpartyType,
        debts: [debt],
        receivable: debt.direction === "lent" ? debt.remainingAmount : 0,
        payable: debt.direction === "borrowed" ? debt.remainingAmount : 0,
        net: debt.direction === "lent" ? debt.remainingAmount : -debt.remainingAmount,
        principal: debt.principalAmount,
        remaining: debt.remainingAmount,
        activeCount: debt.status === "settled" ? 0 : 1,
        completedCount: debt.status === "settled" ? 1 : 0,
        createdAt: debt.createdAt,
        updatedAt: debt.updatedAt,
        dueDate: debt.dueDate
      });
      continue;
    }
    existing.debts.push(debt);
    existing.receivable += debt.direction === "lent" ? debt.remainingAmount : 0;
    existing.payable += debt.direction === "borrowed" ? debt.remainingAmount : 0;
    existing.net += debt.direction === "lent" ? debt.remainingAmount : -debt.remainingAmount;
    existing.principal += debt.principalAmount;
    existing.remaining += debt.remainingAmount;
    existing.activeCount += debt.status === "settled" ? 0 : 1;
    existing.completedCount += debt.status === "settled" ? 1 : 0;
    existing.createdAt = maxIso(existing.createdAt, debt.createdAt);
    existing.updatedAt = maxIso(existing.updatedAt, debt.updatedAt);
    existing.dueDate = earliestDueDate(existing.dueDate, debt.dueDate);
  }

  return Array.from(groups.values())
    .map((group) => ({ ...group, debts: [...group.debts].sort((a, b) => compareDebts(a, b, sort)) }))
    .sort((a, b) => compareDebtGroups(a, b, sort));
}

function compareDebtGroups(a: DebtCounterpartyGroup, b: DebtCounterpartyGroup, sort: DebtSort) {
  if (sort === "createdDesc") return b.createdAt.localeCompare(a.createdAt);
  if (sort === "principalDesc") return b.principal - a.principal;
  if (sort === "remainingDesc") return b.remaining - a.remaining;
  if (sort === "dueAsc") return dateSortValue(a.dueDate) - dateSortValue(b.dueDate);
  return b.updatedAt.localeCompare(a.updatedAt);
}

function maxIso(left: string, right: string) {
  return right.localeCompare(left) > 0 ? right : left;
}

function earliestDueDate(left: string, right: string) {
  if (!left) return right;
  if (!right) return left;
  return dateSortValue(right) < dateSortValue(left) ? right : left;
}

function dateSortValue(date: string) {
  if (!date) return Number.MAX_SAFE_INTEGER;
  const [day, month, year] = date.split("/").map(Number);
  if (!day || !month || !year) return Number.MAX_SAFE_INTEGER;
  return year * 10000 + month * 100 + day;
}
