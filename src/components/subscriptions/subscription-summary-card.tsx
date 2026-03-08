import { Text, View } from "react-native";
import { Card } from "heroui-native";
import { useAppSettings } from "@/lib/app-settings";
import type { SubscriptionWithCategory } from "@/lib/subscription-store";
import { formatAmount } from "@/lib/subscription-format";

interface SubscriptionSummaryCardProps {
  subscriptions: SubscriptionWithCategory[];
}

function getMonthTitle(date: Date) {
  return `${date.getMonth() + 1}월 총 결제 예정액`;
}

function isSameMonth(value: string, now: Date) {
  const [year, month] = value.split("-").map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function getMonthlyTotal(subscriptions: SubscriptionWithCategory[], now: Date) {
  let total = 0;

  for (const subscription of subscriptions) {
    if (
      subscription.currency === "KRW" &&
      isSameMonth(subscription.nextBillingDate, now)
    ) {
      total += subscription.amount;
    }
  }

  return total;
}

export function SubscriptionSummaryCard({
  subscriptions,
}: SubscriptionSummaryCardProps) {
  const now = new Date();
  const { currencyDisplayMode } = useAppSettings();
  const monthlyTotal = getMonthlyTotal(subscriptions, now);
  const title = getMonthTitle(now);
  const totalLabel = formatAmount(monthlyTotal, "KRW", currencyDisplayMode);

  return (
    <Card className="mb-4 rounded-3xl px-6 py-6 shadow/20 shadow-neutral-300 dark:shadow-none">
      <View className="gap-5">
        <Card.Body className="p-0 gap-1">
          <Card.Title className="text-base font-medium text-emerald-500">
            {title}
          </Card.Title>
          <Text className="text-4xl font-bold text-black dark:text-white">
            {totalLabel}
          </Text>
        </Card.Body>
      </View>
    </Card>
  );
}
