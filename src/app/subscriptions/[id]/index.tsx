import { Pressable, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useState } from "react";
import { Card, Separator } from "heroui-native";
import { PencilIcon } from "lucide-uniwind";
import { useAppSettings } from "@/lib/app-settings";
import { hapticImpactLight } from "@/lib/haptics";
import { resolveId } from "@/lib/subscription-editor";
import {
  getSubscriptionById,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import {
  billingCycleLabelMap,
  formatAmount,
  formatYmd,
} from "@/lib/subscription-format";

interface DetailRowProps {
  label: string;
  value: string;
}

function DetailRow({ label, value }: DetailRowProps) {
  return (
    <View className="gap-1.5">
      <Text className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
        {label}
      </Text>
      <Text className="text-base text-black dark:text-white">{value}</Text>
    </View>
  );
}

export default function SubscriptionDetailRoute() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const { currencyDisplayMode } = useAppSettings();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = resolveId(params.id);
  const [subscription, setSubscription] =
    useState<SubscriptionWithCategory | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadSubscription = useCallback(async () => {
    if (!subscriptionId) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const detail = await getSubscriptionById(subscriptionId);
      setSubscription(detail);
    } catch (error) {
      console.error("Failed to load subscription detail:", error);
      setSubscription(null);
    } finally {
      setIsLoading(false);
    }
  }, [subscriptionId]);

  useFocusEffect(
    useCallback(() => {
      void loadSubscription();
    }, [loadSubscription]),
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "구독 상세",
        }}
      />

      {subscriptionId ? (
        <Stack.Toolbar placement="right">
          <Stack.Toolbar.View>
            <View className="w-8 h-8">
              <Pressable
                onPressIn={hapticImpactLight}
                onPress={() =>
                  router.push(`/subscriptions/${subscriptionId}/edit`)
                }
                hitSlop={8}
                className="flex-1 items-center justify-center"
              >
                <PencilIcon className="text-black dark:text-white" />
              </Pressable>
            </View>
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      ) : null}

      <ScrollView
        style={{ flex: 1, paddingTop: headerHeight + 15 }}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 48 }}
      >
        {isLoading ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            구독 정보를 불러오는 중...
          </Text>
        ) : null}

        {!isLoading && !subscriptionId ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            유효하지 않은 구독입니다.
          </Text>
        ) : null}

        {!isLoading && subscriptionId && !subscription ? (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            구독 정보를 찾을 수 없습니다.
          </Text>
        ) : null}

        {!isLoading && subscription ? (
          <Card variant="default" className="p-4 gap-4 shadow-none">
            <Card.Header className="gap-1">
              <Card.Title className="text-xl font-semibold text-black dark:text-white">
                {subscription.name}
              </Card.Title>
              <Card.Description className="text-sm text-neutral-500 dark:text-neutral-400">
                {formatAmount(
                  subscription.amount,
                  subscription.currency,
                  currencyDisplayMode,
                )}
              </Card.Description>
            </Card.Header>

            <Separator className="opacity-40" />

            <Card.Body className="gap-4">
              <DetailRow label="카테고리" value={subscription.categoryName} />
              <DetailRow
                label="결제 주기"
                value={billingCycleLabelMap[subscription.billingCycle]}
              />
              <DetailRow
                label="결제일"
                value={formatYmd(subscription.billingDate)}
              />
              <DetailRow
                label="다음 청구일"
                value={formatYmd(subscription.nextBillingDate)}
              />
              <DetailRow
                label="Pin 상태"
                value={subscription.isPinned ? "고정됨" : "고정 안 함"}
              />
              <DetailRow
                label="메모"
                value={subscription.memo?.trim() ? subscription.memo : "없음"}
              />
            </Card.Body>
          </Card>
        ) : null}
      </ScrollView>
    </>
  );
}
