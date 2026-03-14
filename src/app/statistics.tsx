import { SubscriptionStatisticsSummaryTile } from "@/components/subscriptions/subscription-statistics-summary-tile";
import { SubscriptionStatisticsTrendChart } from "@/components/subscriptions/subscription-statistics-trend-chart";
import { formatAmount } from "@/lib/subscription-format";
import { getStatisticsOverview } from "@/lib/subscription-statistics";
import {
  listSubscriptionPaymentLogs,
  listSubscriptions,
  syncSubscriptionPaymentLogs,
  type SubscriptionPaymentLog,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { useFocusEffect } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Card } from "heroui-native";
import { useCallback, useState, type ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card className="rounded-[28px] px-5 py-5 shadow-lg shadow-neutral-300/10 dark:shadow-none">
      <Card.Body className="gap-4 p-0">
        <View className="gap-1">
          <Card.Title className="text-lg font-semibold text-black dark:text-white">
            {title}
          </Card.Title>
          {description ? (
            <Card.Description className="text-sm text-foreground/50">
              {description}
            </Card.Description>
          ) : null}
        </View>
        {children}
      </Card.Body>
    </Card>
  );
}

function BreakdownRow({
  label,
  countLabel,
  totalLabel,
  ratio,
}: {
  label: string;
  countLabel?: string;
  totalLabel: string;
  ratio: number;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between gap-3">
        <View className="min-w-0 flex-1">
          <Text className="font-medium text-black dark:text-white">
            {label}
          </Text>
          {countLabel ? (
            <Text className="text-xs text-foreground/45">{countLabel}</Text>
          ) : null}
        </View>
        <Text
          className="text-sm font-semibold text-black dark:text-white"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {totalLabel}
        </Text>
      </View>
      <View className="h-2 rounded-full bg-surface-secondary">
        <View
          className="h-2 rounded-full bg-success"
          style={{ width: `${ratio <= 0 ? 0 : Math.max(8, ratio * 100)}%` }}
        />
      </View>
    </View>
  );
}

export default function StatisticsRoute() {
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionWithCategory[] | null
  >(null);
  const [paymentLogs, setPaymentLogs] = useState<
    SubscriptionPaymentLog[] | null
  >(null);

  const loadStatistics = useCallback(async () => {
    try {
      await syncSubscriptionPaymentLogs();
      const [nextSubscriptions, nextPaymentLogs] = await Promise.all([
        listSubscriptions(),
        listSubscriptionPaymentLogs({ sortDirection: "desc" }),
      ]);

      setSubscriptions(nextSubscriptions);
      setPaymentLogs(nextPaymentLogs);
    } catch (error) {
      console.error("Failed to load statistics:", error);
      setSubscriptions([]);
      setPaymentLogs([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadStatistics();
    }, [loadStatistics]),
  );

  const overview =
    subscriptions && paymentLogs
      ? getStatisticsOverview(subscriptions, paymentLogs)
      : null;
  const isEmptyState = subscriptions !== null && subscriptions.length === 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: "통계",
          headerBackButtonDisplayMode: "minimal",
          headerLargeTitleEnabled: true,
        }}
      />

      {isEmptyState ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center gap-2">
            <Text className="text-base font-medium text-black dark:text-white">
              아직 볼 수 있는 통계가 없어요.
            </Text>
            <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              구독을 추가하면 결제 흐름과 지출 패턴을 한눈에 볼 수 있어요.
            </Text>
          </View>
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1, paddingTop: 15 }}
          className="flex-1 px-4"
          contentContainerStyle={{ paddingBottom: 48, gap: 16 }}
        >
          {overview ? (
            <>
              <View className="flex-row gap-3">
                <SubscriptionStatisticsSummaryTile
                  label="이용 중인 구독"
                  value={`${overview.activeSubscriptionCount}개`}
                  tone="success"
                />
                <SubscriptionStatisticsSummaryTile
                  label="지금까지 결제"
                  value={formatAmount(overview.lifetimePaidTotal)}
                />
              </View>

              <View className="flex-row gap-3">
                <SubscriptionStatisticsSummaryTile
                  label="이번 달 남은 결제"
                  value={formatAmount(overview.remainingThisMonthTotal)}
                />
                <SubscriptionStatisticsSummaryTile
                  label="이번 달 전체 결제"
                  value={formatAmount(overview.fullThisMonthTotal)}
                />
              </View>

              <View className="flex-row gap-3">
                <SubscriptionStatisticsSummaryTile
                  label="앞으로 12개월 예정"
                  value={formatAmount(overview.nextTwelveMonthsScheduledTotal)}
                />
              </View>

              <SectionCard
                title="결제 흐름"
                description="최근 6개월 동안 얼마나 결제했는지 볼 수 있어요."
              >
                <SubscriptionStatisticsTrendChart
                  points={overview.recentSixMonthTrend}
                />
              </SectionCard>

              <SectionCard
                title="카테고리별 지출"
                description="어디에 가장 많이 쓰는지 한눈에 볼 수 있어요."
              >
                <View className="gap-4">
                  {overview.categoryBreakdown.length > 0 ? (
                    overview.categoryBreakdown.map((item) => (
                      <BreakdownRow
                        key={item.id}
                        label={item.label}
                        countLabel={`결제 ${item.count}번`}
                        totalLabel={formatAmount(item.total)}
                        ratio={item.share}
                      />
                    ))
                  ) : (
                    <Text className="text-sm text-foreground/50">
                      아직 보여드릴 결제 내역이 없어요.
                    </Text>
                  )}
                </View>
              </SectionCard>
            </>
          ) : null}
        </ScrollView>
      )}
    </>
  );
}
