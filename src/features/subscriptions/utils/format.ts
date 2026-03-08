import type {
  BillingCycle,
  Currency,
} from "@/features/subscriptions/model/subscription-store";
import type { CurrencyDisplayMode } from "@/shared/lib/currency-display";

export const billingCycleLabelMap: Record<BillingCycle, string> = {
  monthly: "월간",
  yearly: "연간",
};

type CurrencyLabelPosition = "prefix" | "suffix";

interface FormattedAmountParts {
  value: string;
  currencyLabel: string;
  currencyLabelPosition: CurrencyLabelPosition;
}

const formatAmountValue = (amount: number, currency: Currency): string => {
  return new Intl.NumberFormat(currency === "KRW" ? "ko-KR" : "en-US", {
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatAmountParts = (
  amount: number,
  currency: Currency,
  displayMode: CurrencyDisplayMode = "text",
): FormattedAmountParts => {
  const value = formatAmountValue(amount, currency);

  if (displayMode === "symbol") {
    return {
      value,
      currencyLabel: currency === "KRW" ? "₩" : "$",
      currencyLabelPosition: "prefix",
    };
  }

  return {
    value,
    currencyLabel: currency === "KRW" ? "원" : "달러",
    currencyLabelPosition: "suffix",
  };
};

export const formatAmount = (
  amount: number,
  currency: Currency,
  displayMode: CurrencyDisplayMode = "text",
): string => {
  const { value, currencyLabel, currencyLabelPosition } = formatAmountParts(
    amount,
    currency,
    displayMode,
  );

  return currencyLabelPosition === "prefix"
    ? `${currencyLabel}${value}`
    : `${value}${currencyLabel}`;
};

export const formatYmd = (value: string): string => {
  return value.replaceAll("-", ".");
};
