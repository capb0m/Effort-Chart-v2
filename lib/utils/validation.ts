import { parseISO, isAfter, differenceInHours } from "date-fns";

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateRecord(
  startTime: string,
  endTime: string
): ValidationResult {
  const start = parseISO(startTime);
  const end = parseISO(endTime);
  const now = new Date();

  if (isAfter(end, now)) {
    return { valid: false, error: "終了時間は現在より前にしてください" };
  }
  if (!isAfter(end, start)) {
    return { valid: false, error: "終了時間は開始時間より後にしてください" };
  }
  const hours = Math.abs(differenceInHours(end, start));
  if (hours > 10) {
    return { valid: false, error: "1記録の上限は10時間です" };
  }
  return { valid: true };
}
