import { useAppSettings } from "@/lib/app-settings";
import { SubscriptionStatisticsSummaryTile } from "@/components/subscriptions/subscription-statistics-summary-tile";
import { SubscriptionStatisticsTrendChart } from "@/components/subscriptions/subscription-statistics-trend-chart";
import { hapticImpactLight } from "@/lib/haptics";
import { syncSubscriptionNotifications } from "@/lib/subscription-notifications";
import { getSubscriptionStatisticsDetail } from "@/lib/subscription-statistics";
import { resolveId } from "@/lib/subscription-editor";
import {
  formatAmount,
  formatAmountParts,
  formatYmd,
} from "@/lib/subscription-format";
import {
  deleteSubscription,
  getSubscriptionById,
  listSubscriptionPaymentLogs,
  syncSubscriptionPaymentLogs,
  type BillingCycle,
  type SubscriptionPaymentLog,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Card, Separator } from "heroui-native";
import { PencilIcon, Trash2Icon } from "lucide-uniwind";
import { useCallback, useState, type ReactNode } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";

function getBillingSummaryLabel(billingCycle: BillingCycle) {
  return billingCycle === "monthly" ? "월간 결제" : "연간 결제";
}

function getBillingCycleValue(
  billingDate: string,
  billingCycle: BillingCycle,
): string {
  const [, month, day] = billingDate.split("-");

  if (billingCycle === "monthly") {
    return `매월 ${Number(day)}일`;
  }

  return `매년 ${month}.${day}`;
}

interface DetailInfoRowProps {
  icon?: ReactNode;
  label: string;
  value: string;
}

function DetailInfoRow({ icon, label, value }: DetailInfoRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-0.5">
      <View className="flex-row items-center gap-2.5">
        {icon && <View className="opacity-50">{icon}</View>}
        <Text className="text-sm text-foreground/55">{label}</Text>
      </View>
      <Text
        className="text-base font-semibold text-black dark:text-white"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

function DetailSectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <Card
      variant="default"
      className="rounded-[30px] p-5 shadow-lg shadow-neutral-300/10 dark:shadow-none"
    >
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

function PaymentLogRow({
  paymentLog,
  amountLabel,
  statusLabel,
}: {
  paymentLog: SubscriptionPaymentLog;
  amountLabel: string;
  statusLabel: string;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <View className="min-w-0 flex-1 gap-0.5">
        <Text className="font-medium text-black dark:text-white">
          {formatYmd(paymentLog.billingDate)}
        </Text>
        <Text className="text-xs text-foreground/45">{statusLabel}</Text>
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

export default function SubscriptionDetailRoute() {
  const router = useRouter();
  const { notificationsEnabled } = useAppSettings();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = resolveId(params.id);
  const [subscription, setSubscription] = useState<
    SubscriptionWithCategory | null | undefined
  >(undefined);
  const [paymentLogs, setPaymentLogs] = useState<SubscriptionPaymentLog[]>([]);

  useFocusEffect(
    useCallback(() => {
      if (!subscriptionId) {
        return;
      }

      void (async () => {
        try {
          await syncSubscriptionPaymentLogs();
          const [nextSubscription, nextPaymentLogs] = await Promise.all([
            getSubscriptionById(subscriptionId),
            listSubscriptionPaymentLogs({
              subscriptionId,
              sortDirection: "desc",
            }),
          ]);
          setSubscription(nextSubscription);
          setPaymentLogs(nextPaymentLogs);
        } catch (error) {
          console.error("Failed to load subscription detail:", error);
          setSubscription(null);
          setPaymentLogs([]);
        }
      })();
    }, [subscriptionId]),
  );

  const handleDeletePress = useCallback(() => {
    if (!subscription) {
      return;
    }

    Alert.alert("구독 삭제", `'${subscription.name}' 구독을 삭제할까요?`, [
      { text: "취소", style: "cancel" },
      {
        text: "삭제",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteSubscription(subscription.id);
            await syncSubscriptionNotifications(notificationsEnabled);
            router.replace("/");
          } catch (error) {
            const message =
              error instanceof Error
                ? error.message
                : "구독을 삭제하지 못했습니다.";
            Alert.alert("오류", message);
          }
        },
      },
    ]);
  }, [notificationsEnabled, router, subscription]);

  const amountParts = subscription
    ? formatAmountParts(subscription.amount)
    : null;
  const statistics = subscription
    ? getSubscriptionStatisticsDetail(subscription, paymentLogs)
    : null;

  return (
    <>
      <Stack.Screen
        options={{
          title: "구독 상세",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <View style={{ width: 36, height: 36 }}>
            <Pressable
              onPressIn={hapticImpactLight}
              onPress={() => {
                router.navigate(`/subscriptions/${subscription?.id}/edit`);
              }}
              hitSlop={8}
              className="flex-1 items-center justify-center"
            >
              <PencilIcon className="text-black dark:text-white" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
        <Stack.Toolbar.View>
          <View style={{ width: 36, height: 36 }}>
            <Pressable
              onPressIn={hapticImpactLight}
              onPress={handleDeletePress}
              hitSlop={8}
              className="flex-1 items-center justify-center"
            >
              <Trash2Icon className="text-danger" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <View className="flex-1">
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          style={{ flex: 1, paddingTop: 15 }}
          className="flex-1 px-4"
          contentContainerStyle={{
            paddingBottom: 48,
          }}
        >
          {!subscriptionId && (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              유효하지 않은 구독입니다.
            </Text>
          )}

          {subscriptionId && subscription === null && (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              구독 정보를 찾을 수 없습니다.
            </Text>
          )}

          {subscription && amountParts && (
            <View className="gap-4">
              <Card
                variant="default"
                className="overflow-hidden rounded-[30px] p-5 shadow-lg shadow-neutral-300/10 dark:shadow-none"
              >
                <Card.Body className="items-center gap-4 px-1 py-2">
                  <SubscriptionServiceBadge
                    name={subscription.name}
                    templateKey={subscription.templateKey}
                    size="hero"
                  />

                  <View className="items-center gap-1">
                    <Card.Title className="text-2xl font-semibold text-black dark:text-white">
                      {subscription.name}
                    </Card.Title>
                    <Card.Description className="text-base text-foreground/45">
                      {subscription.categoryName}
                    </Card.Description>
                  </View>

                  <View className="items-center gap-1 mb-4">
                    <View className="flex-row items-baseline gap-0.5">
                      <Text
                        className="text-4xl font-bold text-black dark:text-white"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {amountParts.value}
                      </Text>
                      <Text className="text-2xl font-bold text-black dark:text-white">
                        원
                      </Text>
                    </View>

                    <Text className="text-base text-foreground/45">
                      {getBillingSummaryLabel(subscription.billingCycle)}
                    </Text>
                  </View>
                </Card.Body>

                <Separator className="opacity-30" />

                <Card.Footer className="flex-col gap-4 px-2 py-4 pt-6">
                  <DetailInfoRow
                    label="다음 청구일"
                    value={formatYmd(subscription.nextBillingDate)}
                  />
                  <DetailInfoRow
                    label="결제 주기"
                    value={getBillingCycleValue(
                      subscription.billingDate,
                      subscription.billingCycle,
                    )}
                  />
                </Card.Footer>
              </Card>

              {statistics && (
                <>
                  <View className="flex-row gap-3">
                    <SubscriptionStatisticsSummaryTile
                      label="지금까지 결제"
                      value={formatAmount(statistics.lifetimePaidTotal)}
                      tone="success"
                    />
                    <SubscriptionStatisticsSummaryTile
                      label="결제 횟수"
                      value={`${statistics.paidCount}번`}
                    />
                  </View>

                  <View className="flex-row gap-3">
                    <SubscriptionStatisticsSummaryTile
                      label="올해 결제"
                      value={formatAmount(statistics.currentYearPaidTotal)}
                    />
                    <SubscriptionStatisticsSummaryTile
                      label="앞으로 12개월 예정"
                      value={formatAmount(
                        statistics.nextTwelveMonthsScheduledTotal,
                      )}
                    />
                  </View>

                  <DetailSectionCard
                    title="결제 흐름"
                    description="최근 6개월 동안 이 구독에 얼마나 썼는지 볼 수 있어요."
                  >
                    <SubscriptionStatisticsTrendChart
                      points={statistics.recentSixMonthTrend}
                    />
                  </DetailSectionCard>

                  <DetailSectionCard
                    title="최근 결제 내역"
                    description="최근에 결제된 기록을 최신 순으로 보여드려요."
                  >
                    <View className="gap-4">
                      {statistics.recentPaidLogs.length > 0 ? (
                        statistics.recentPaidLogs.map((paymentLog, index) => (
                          <View
                            key={`${paymentLog.id}-${paymentLog.billingDate}`}
                          >
                            {index > 0 ? (
                              <Separator className="mb-4 opacity-20" />
                            ) : null}
                            <PaymentLogRow
                              paymentLog={paymentLog}
                              statusLabel="결제됨"
                              amountLabel={formatAmount(paymentLog.amount)}
                            />
                          </View>
                        ))
                      ) : (
                        <Text className="text-sm text-foreground/50">
                          아직 결제된 내역이 없어요.
                        </Text>
                      )}
                    </View>
                  </DetailSectionCard>
                </>
              )}
            </View>
          )}
        </ScrollView>
      </View>
    </>
  );
}
