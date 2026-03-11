import { useAppSettings } from "@/lib/app-settings";
import { hapticImpactLight } from "@/lib/haptics";
import { resolveId } from "@/lib/subscription-editor";
import {
  formatAmount,
  formatAmountParts,
  formatYmd,
} from "@/lib/subscription-format";
import {
  deleteSubscription,
  getSubscriptionById,
  getUsdKrwRate,
  isTrialActive,
  type BillingCycle,
  type SubscriptionWithCategory,
  type UsdKrwExchangeRate,
} from "@/lib/subscription-store";
import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Card, Separator } from "heroui-native";
import {
  CalendarIcon,
  PencilIcon,
  RefreshCwIcon,
  Trash2Icon,
} from "lucide-uniwind";
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
  icon: ReactNode;
  label: string;
  value: string;
}

function DetailInfoRow({ icon, label, value }: DetailInfoRowProps) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-0.5">
      <View className="flex-row items-center gap-2.5">
        <View className="opacity-50">{icon}</View>
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

export default function SubscriptionDetailRoute() {
  const router = useRouter();
  const { currencyDisplayMode } = useAppSettings();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = resolveId(params.id);
  const [subscription, setSubscription] = useState<
    SubscriptionWithCategory | null | undefined
  >(undefined);
  const [exchangeRate, setExchangeRate] = useState<UsdKrwExchangeRate | null>(
    null,
  );

  useFocusEffect(
    useCallback(() => {
      if (!subscriptionId) {
        return;
      }

      void (async () => {
        try {
          const [nextSubscription, nextExchangeRate] = await Promise.all([
            getSubscriptionById(subscriptionId),
            getUsdKrwRate(),
          ]);
          setSubscription(nextSubscription);
          setExchangeRate(nextExchangeRate);
        } catch (error) {
          console.error("Failed to load subscription detail:", error);
          setSubscription(null);
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
  }, [router, subscription]);

  const amountParts = subscription
    ? formatAmountParts(
        subscription.amount,
        subscription.currency,
        currencyDisplayMode,
      )
    : null;
  const convertedAmountLabel =
    subscription?.currency === "USD" && exchangeRate
      ? formatAmount(
          Math.round(subscription.amount * exchangeRate.usdToKrwRate),
          "KRW",
          currencyDisplayMode,
        )
      : null;
  const isInTrial = subscription ? isTrialActive(subscription.trialEndDate) : false;

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
                  {isInTrial && (
                    <View className="mt-2 rounded-full bg-surface-secondary px-3 py-1">
                      <Text className="text-[12px] font-semibold text-foreground/65">
                        무료 체험 중
                      </Text>
                    </View>
                  )}
                </View>

                <View className="items-center gap-1 mb-4">
                  <View className="flex-row items-baseline gap-0.5">
                    {amountParts.currencyLabelPosition === "prefix" && (
                      <Text
                        className="text-2xl font-bold text-black dark:text-white"
                        style={{ fontVariant: ["tabular-nums"] }}
                      >
                        {amountParts.currencyLabel}
                      </Text>
                    )}
                    <Text
                      className="text-4xl font-bold text-black dark:text-white"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {amountParts.value}
                    </Text>
                    {amountParts.currencyLabelPosition === "suffix" && (
                      <Text className="text-2xl font-bold text-black dark:text-white">
                        {amountParts.currencyLabel}
                      </Text>
                    )}
                  </View>
                  {convertedAmountLabel && (
                    <Text
                      className="text-sm font-medium text-foreground/50"
                      style={{ fontVariant: ["tabular-nums"] }}
                    >
                      {convertedAmountLabel}
                    </Text>
                  )}

                  <Text className="text-base text-foreground/45">
                    {getBillingSummaryLabel(subscription.billingCycle)}
                  </Text>
                </View>
              </Card.Body>

              <Separator className="opacity-30" />

              <Card.Footer className="flex-col gap-4 px-2 py-8">
                <DetailInfoRow
                  icon={<CalendarIcon className="text-foreground" />}
                  label={isInTrial ? "무료 체험 종료일" : "다음 청구일"}
                  value={formatYmd(subscription.nextBillingDate)}
                />
                <DetailInfoRow
                  icon={<RefreshCwIcon className="text-foreground" />}
                  label="결제 주기"
                  value={getBillingCycleValue(
                    subscription.billingDate,
                    subscription.billingCycle,
                  )}
                />
              </Card.Footer>
            </Card>
          )}
        </ScrollView>
      </View>
    </>
  );
}
