import type {
  BillingCycle,
  Currency,
} from "@/lib/subscription-store";

export type SelectOption = { value: string; label: string };

export const CURRENCY_OPTIONS: SelectOption[] = [
  { value: "KRW", label: "KRW" },
  { value: "USD", label: "USD" },
];

export const BILLING_CYCLE_OPTIONS: SelectOption[] = [
  { value: "monthly", label: "월간" },
  { value: "yearly", label: "연간" },
];

export const isCurrency = (value: string): value is Currency => {
  return value === "KRW" || value === "USD";
};

export const isBillingCycle = (value: string): value is BillingCycle => {
  return value === "monthly" || value === "yearly";
};

export const sanitizeAmountInput = (
  value: string,
  currency: Currency,
): string => {
  if (currency === "KRW") {
    return value.replace(/[^\d]/g, "");
  }

  const normalized = value.replace(/[^\d.]/g, "");
  const [integerPart = "", ...fractionParts] = normalized.split(".");
  const fractionPart = fractionParts.join("").slice(0, 2);

  if (normalized.startsWith(".")) {
    return fractionPart.length > 0 ? `0.${fractionPart}` : "0.";
  }

  if (normalized.includes(".")) {
    return `${integerPart}.${fractionPart}`;
  }

  return integerPart;
};

export const parseAmountInput = (
  value: string,
  currency: Currency,
): number | null => {
  const normalized = sanitizeAmountInput(value, currency);
  if (normalized.length === 0 || normalized === ".") {
    return null;
  }

  const parsed =
    currency === "KRW"
      ? Number.parseInt(normalized, 10)
      : Number.parseFloat(normalized);

  return Number.isNaN(parsed) ? null : parsed;
};

export const formatDateToYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const ymdToDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
};

export const resolveId = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
};
