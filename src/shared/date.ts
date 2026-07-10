import { isDdMmYyyy } from "../data/csv";
import { RecurrenceFrequency } from "../domain/types";

export function csvDateToPickerDate(value: string) {
  if (!isDdMmYyyy(value)) return new Date();
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

export function pickerDateToCsvDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

export function addCycleToCsvDate(value: string, frequency: RecurrenceFrequency, cycleIndex: number) {
  const date = csvDateToPickerDate(value);
  const next = new Date(date);
  if (frequency === "weekly") next.setDate(date.getDate() + cycleIndex * 7);
  if (frequency === "monthly") next.setMonth(date.getMonth() + cycleIndex);
  if (frequency === "yearly") next.setFullYear(date.getFullYear() + cycleIndex);
  return pickerDateToCsvDate(next);
}
