const DEFAULT_HOURS_PER_WEEK = 44;
const WEEKS_PER_MONTH = 4.33;

export type InferredSalary = {
  durationMinutes: number;
  hourlyRate: number;
  monthlySalary: number;
  currency: "BRL" | "USD" | "EUR";
  valid: boolean;
};

export function parseCurrencyAmount(val: string | number | undefined): number {
  if (typeof val === "number") return val;
  if (!val || typeof val !== "string") return 0;

  if (val.includes(",") && !val.includes(".")) {
    const num = parseFloat(val.replace(/[^\d,-]/g, "").replace(",", "."));
    return isNaN(num) ? 0 : num;
  }
  if (val.includes(",") && val.includes(".")) {
    const lastComma = val.lastIndexOf(",");
    const lastDot = val.lastIndexOf(".");
    if (lastComma > lastDot) {
      const num = parseFloat(val.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
      return isNaN(num) ? 0 : num;
    }
    const num = parseFloat(val.replace(/,/g, "").replace(/[^\d.-]/g, ""));
    return isNaN(num) ? 0 : num;
  }
  const num = parseFloat(val.replace(/[^\d.-]/g, ""));
  return isNaN(num) ? 0 : num;
}

export function detectCurrency(val: string | number | undefined): "BRL" | "USD" | "EUR" {
  const text = String(val || "");
  if (text.includes("€")) return "EUR";
  if (text.includes("$") && !text.includes("R$")) return "USD";
  return "BRL";
}

function parseTimeToMinutes(time?: string): number | null {
  if (!time) return null;
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function sessionDurationMinutes(timestarted?: string, timeended?: string): number {
  const start = parseTimeToMinutes(timestarted);
  const end = parseTimeToMinutes(timeended);
  if (start === null || end === null) return 0;
  let duration = end - start;
  if (duration < 0) duration += 24 * 60;
  return duration;
}

/**
 * Reverse the calculator: earned / duration = hourly rate,
 * then monthly = hourly * hoursPerWeek * 4.33.
 */
export function inferSalaryFromSession(
  totalearned: string | number | undefined,
  timestarted?: string,
  timeended?: string,
  hoursPerWeek: number = DEFAULT_HOURS_PER_WEEK
): InferredSalary {
  const currency = detectCurrency(totalearned);
  const earned = parseCurrencyAmount(totalearned);
  const durationMinutes = sessionDurationMinutes(timestarted, timeended);
  const hours = durationMinutes / 60;
  const weekly = hoursPerWeek > 0 ? hoursPerWeek : DEFAULT_HOURS_PER_WEEK;

  if (earned <= 0 || hours <= 0) {
    return {
      durationMinutes,
      hourlyRate: 0,
      monthlySalary: 0,
      currency,
      valid: false,
    };
  }

  const hourlyRate = earned / hours;
  const monthlySalary = hourlyRate * weekly * WEEKS_PER_MONTH;

  return {
    durationMinutes,
    hourlyRate,
    monthlySalary,
    currency,
    valid: true,
  };
}

export function formatMoneyAmount(amount: number, currency: "BRL" | "USD" | "EUR"): string {
  return new Intl.NumberFormat(currency === "BRL" ? "pt-BR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount);
}
