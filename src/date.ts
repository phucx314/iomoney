import { isDdMmYyyy } from "./csv";

export function csvDateToPickerDate(value: string) {
  if (!isDdMmYyyy(value)) return new Date();
  const [day, month, year] = value.split("/").map(Number);
  return new Date(year, month - 1, day);
}

export function pickerDateToCsvDate(date: Date) {
  return `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}
