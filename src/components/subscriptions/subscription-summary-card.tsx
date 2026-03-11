import { useAppSettings } from "@/lib/app-settings";
import { formatAmount } from "@/lib/subscription-format";
import {
  isTrialActive,
  type SubscriptionWithCategory,
  type UsdKrwExchangeRate,
} from "@/lib/subscription-store";
import { Card } from "heroui-native";
import { Text, View } from "react-native";

interface SubscriptionSummaryCardProps {
  subscriptions: SubscriptionWithCategory[];
  exchangeRate: UsdKrwExchangeRate | null;
}

function getMonthTitle(date: Date) {
  return `${date.getMonth() + 1}월 총 결제 예정액`;
}

function isSameMonth(value: string, now: Date) {
  const [year, month] = value.split("-").map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function getMonthlyTotal(
  subscriptions: SubscriptionWithCategory[],
  now: Date,
  exchangeRate: UsdKrwExchangeRate | null,
) {
  let total = 0;

  for (const subscription of subscriptions) {
    if (isTrialActive(subscription.trialEndDate, now)) {
      continue;
    }

    if (!isSameMonth(subscription.nextBillingDate, now)) {
      continue;
    }

    if (subscription.currency === "KRW") {
      total += subscription.amount;
      continue;
    }

    if (subscription.currency === "USD" && exchangeRate) {
      total += Math.round(subscription.amount * exchangeRate.usdToKrwRate);
    }
  }

  return total;
}

function hasCurrentMonthUsdSubscriptions(
  subscriptions: SubscriptionWithCategory[],
  now: Date,
) {
  return subscriptions.some(
    (subscription) =>
      !isTrialActive(subscription.trialEndDate, now) &&
      subscription.currency === "USD" &&
      isSameMonth(subscription.nextBillingDate, now),
  );
}

function formatExchangeRateReferenceLabel(timeLastUpdateUtc: string) {
  const date = new Date(timeLastUpdateUtc);
  const label = new Intl.DateTimeFormat("ko-KR", {
    month: "long",
    day: "numeric",
  }).format(date);

  return `${label} 환율 기준`;
}

export function SubscriptionSummaryCard({
  subscriptions,
  exchangeRate,
}: SubscriptionSummaryCardProps) {
  const now = new Date();
  const { currencyDisplayMode } = useAppSettings();
  const monthlyTotal = getMonthlyTotal(subscriptions, now, exchangeRate);
  const shouldShowExchangeRateReference =
    !!exchangeRate && hasCurrentMonthUsdSubscriptions(subscriptions, now);
  const title = getMonthTitle(now);
  const totalLabel = formatAmount(monthlyTotal, "KRW", currencyDisplayMode);

  return (
    <Card className="mb-4 rounded-3xl px-6 py-6 shadow-lg shadow-neutral-300/10 dark:shadow-none">
      <View className="gap-5">
        <Card.Body className="p-0 gap-1">
          <Card.Title className="text-base font-medium text-success">
            {title}
          </Card.Title>
          <Text className="text-4xl font-bold text-black dark:text-white">
            {totalLabel}
          </Text>
          <View className="flex-row justify-between mt-1">
            <Text className="text-sm text-foreground/50">무료 체험 제외</Text>
            {shouldShowExchangeRateReference && (
              <Text className="text-sm text-foreground/50">
                {formatExchangeRateReferenceLabel(
                  exchangeRate.timeLastUpdateUtc,
                )}
              </Text>
            )}
          </View>
        </Card.Body>
      </View>
    </Card>
  );
}
