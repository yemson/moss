import { formatAmount } from "@/lib/subscription-format";
import {
  listUpcomingBillingDates,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { Card } from "heroui-native";
import { Text, View } from "react-native";

interface SubscriptionSummaryCardProps {
  subscriptions: SubscriptionWithCategory[];
  changeDescription?: string | null;
}

function getMonthTitle(date: Date) {
  return `${date.getMonth() + 1}월 총 결제 예정액`;
}

function isSameMonth(value: string, now: Date) {
  const [year, month] = value.split("-").map(Number);
  return year === now.getFullYear() && month === now.getMonth() + 1;
}

function getMonthRange(date: Date) {
  return {
    start: new Date(date.getFullYear(), date.getMonth(), 1),
    end: new Date(date.getFullYear(), date.getMonth() + 1, 0),
  };
}

function hasBillingInCurrentMonth(
  subscription: SubscriptionWithCategory,
  now: Date,
) {
  const { start, end } = getMonthRange(now);

  return listUpcomingBillingDates(
    subscription.billingDate,
    subscription.billingCycle,
    end,
    start,
  ).some((billingDate) => isSameMonth(billingDate, now));
}

function getUpcomingMonthlyTotal(
  subscriptions: SubscriptionWithCategory[],
  now: Date,
) {
  let total = 0;

  for (const subscription of subscriptions) {
    if (!isSameMonth(subscription.nextBillingDate, now)) {
      continue;
    }

    total += subscription.amount;
  }

  return total;
}

function getFullMonthlyTotal(
  subscriptions: SubscriptionWithCategory[],
  now: Date,
) {
  let total = 0;

  for (const subscription of subscriptions) {
    if (!hasBillingInCurrentMonth(subscription, now)) {
      continue;
    }

    total += subscription.amount;
  }

  return total;
}

export function SubscriptionSummaryCard({
  subscriptions,
  changeDescription,
}: SubscriptionSummaryCardProps) {
  const now = new Date();
  const monthlyTotal = getUpcomingMonthlyTotal(subscriptions, now);
  const fullMonthlyTotal = getFullMonthlyTotal(subscriptions, now);
  const title = getMonthTitle(now);
  const totalLabel = formatAmount(monthlyTotal);
  const fullMonthlyTotalLabel = formatAmount(fullMonthlyTotal);

  return (
    <Card className="mb-4 rounded-3xl px-6 py-6 shadow-lg shadow-neutral-300/10 dark:shadow-none">
      <View className="gap-5">
        <Card.Body className="p-0 gap-1">
          <Card.Title className="text-base font-medium text-success">
            {title}
          </Card.Title>
          <View className="mt-1 flex-row items-end self-start gap-2">
            <Text className="text-4xl font-bold text-black dark:text-white">
              {totalLabel}
            </Text>
            <Text className="pb-1 text-sm text-foreground/50">
              / {fullMonthlyTotalLabel}
            </Text>
          </View>
          {changeDescription ? (
            <Text className="mt-2 text-sm text-foreground/50">
              {changeDescription}
            </Text>
          ) : null}
        </Card.Body>
      </View>
    </Card>
  );
}
