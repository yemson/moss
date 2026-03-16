import type { SubscriptionPaymentLog } from "@/lib/subscription-store";
import { formatAmount } from "@/lib/subscription-format";

function isSameMonth(value: string, date: Date) {
  const [year, month] = value.split("-").map(Number);
  return year === date.getFullYear() && month === date.getMonth() + 1;
}

function getPreviousMonth(baseDate: Date) {
  return new Date(baseDate.getFullYear(), baseDate.getMonth() - 1, 1);
}

function getMonthlyTotal(
  paymentLogs: SubscriptionPaymentLog[],
  baseDate: Date,
) {
  return paymentLogs.reduce((sum, log) => {
    if (!log.subscriptionIsActive || !isSameMonth(log.billingDate, baseDate)) {
      return sum;
    }

    return sum + log.amount;
  }, 0);
}

export function getHomeMonthlyChangeDescription(
  paymentLogs: SubscriptionPaymentLog[],
  baseDate: Date = new Date(),
) {
  const currentMonthTotal = getMonthlyTotal(paymentLogs, baseDate);
  const previousMonthTotal = getMonthlyTotal(
    paymentLogs,
    getPreviousMonth(baseDate),
  );

  if (currentMonthTotal === 0 && previousMonthTotal === 0) {
    return null;
  }

  const delta = currentMonthTotal - previousMonthTotal;

  if (delta === 0) {
    return "지난달과 비슷한 수준이에요.";
  }

  const amountLabel = formatAmount(Math.abs(delta));

  return delta > 0
    ? `지난달보다 ${amountLabel} 더 나가요.`
    : `지난달보다 ${amountLabel} 덜 나가요.`;
}
