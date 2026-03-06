import type {
  BillingCycle,
  Currency,
} from "@/features/subscriptions/model/subscription-store";

export const billingCycleLabelMap: Record<BillingCycle, string> = {
  monthly: "월간",
  yearly: "연간",
};

export const formatAmount = (amount: number, currency: Currency): string => {
  const locale = currency === "KRW" ? "ko-KR" : "en-US";

  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatYmd = (value: string): string => {
  return value.replaceAll("-", ".");
};
