import type {
  BillingCycle,
} from "@/lib/subscription-store";

export const billingCycleLabelMap: Record<BillingCycle, string> = {
  monthly: "월간",
  yearly: "연간",
};

interface FormattedAmountParts {
  value: string;
}

const formatAmountValue = (amount: number): string => {
  return new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatAmountParts = (amount: number): FormattedAmountParts => {
  return {
    value: formatAmountValue(amount),
  };
};

export const formatAmount = (amount: number): string => {
  const { value } = formatAmountParts(amount);
  return `${value}원`;
};

export const formatYmd = (value: string): string => {
  return value.replaceAll("-", ".");
};
