import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import { SubscriptionStatisticsSummaryTile } from "@/components/subscriptions/subscription-statistics-summary-tile";
import { SubscriptionStatisticsTrendChart } from "@/components/subscriptions/subscription-statistics-trend-chart";
import { formatAmount, formatYmd } from "@/lib/subscription-format";
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
import { Card, Separator } from "heroui-native";
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

function DistributionRow({
  label,
  count,
  total,
}: {
  label: string;
  count: number;
  total: number;
}) {
  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Text className="font-medium text-black dark:text-white">{label}</Text>
        <Text
          className="text-sm text-foreground/55"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          {count}개
        </Text>
      </View>
      <View className="h-2 rounded-full bg-surface-secondary">
        <View
          className="h-2 rounded-full bg-info"
          style={{ width: `${total === 0 ? 0 : (count / total) * 100}%` }}
        />
      </View>
    </View>
  );
}

function UpcomingPaymentRow({
  payment,
  amountLabel,
}: {
  payment: SubscriptionPaymentLog;
  amountLabel: string;
}) {
  return (
    <View className="flex-row items-center gap-3">
      <SubscriptionServiceBadge
        name={payment.subscriptionName}
        templateKey={payment.subscriptionTemplateKey}
        size="sm"
      />
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-medium text-black dark:text-white">
          {payment.subscriptionName}
        </Text>
        <Text className="text-xs text-foreground/45">
          {payment.categoryNameSnapshot} · {formatYmd(payment.billingDate)}
        </Text>
      </View>
      <Text
        className="text-sm font-semibold text-black dark:text-white"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {amountLabel}
      </Text>
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
              아직 통계에 표시할 구독이 없습니다.
            </Text>
            <Text className="text-center text-sm text-neutral-500 dark:text-neutral-400">
              구독을 추가하면 최근 결제 추이와 카테고리별 소비를 여기서 볼 수
              있습니다.
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
                  label="활성 구독"
                  value={`${overview.activeSubscriptionCount}개`}
                  tone="success"
                />
                <SubscriptionStatisticsSummaryTile
                  label="이번 달 남은 결제액"
                  value={formatAmount(overview.remainingThisMonthTotal)}
                />
              </View>

              <View className="flex-row gap-3">
                <SubscriptionStatisticsSummaryTile
                  label="이번 달 전체 결제액"
                  value={formatAmount(overview.fullThisMonthTotal)}
                />
                <SubscriptionStatisticsSummaryTile
                  label="누적 결제액"
                  value={formatAmount(overview.lifetimePaidTotal)}
                />
              </View>

              <SectionCard title="결제 추이" description="최근 6개월 결제액">
                <SubscriptionStatisticsTrendChart
                  points={overview.recentSixMonthTrend}
                />
              </SectionCard>

              <SectionCard
                title="카테고리별 소비"
                description="최근 6개월 기준"
              >
                <View className="gap-4">
                  {overview.categoryBreakdown.length > 0 ? (
                    overview.categoryBreakdown.map((item) => (
                      <BreakdownRow
                        key={item.id}
                        label={item.label}
                        countLabel={`${item.count}회 결제`}
                        totalLabel={formatAmount(item.total)}
                        ratio={item.share}
                      />
                    ))
                  ) : (
                    <Text className="text-sm text-foreground/50">
                      아직 집계할 결제 이력이 없습니다.
                    </Text>
                  )}
                </View>
              </SectionCard>

              <SectionCard title="구독 분포">
                <View className="gap-3">
                  <Text className="text-sm font-medium text-foreground/55">
                    결제 주기
                  </Text>
                  {overview.billingCycleDistribution.length > 0 ? (
                    overview.billingCycleDistribution.map((item) => (
                      <DistributionRow
                        key={item.label}
                        label={item.label}
                        count={item.count}
                        total={overview.activeSubscriptionCount}
                      />
                    ))
                  ) : (
                    <Text className="text-sm text-foreground/50">
                      활성 구독이 없습니다.
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
