import { Pressable, Text, View } from "react-native";
import type { RefObject } from "react";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import type {
  BillingCycle,
  Currency,
  SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { Card, PressableFeedback } from "heroui-native";
import { hapticSelection } from "@/lib/haptics";

interface SubscriptionCardProps {
  subscription: SubscriptionWithCategory;
  swipeableRef?: RefObject<SwipeableMethods | null>;
  onPress?: () => void;
  onTogglePin?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onSwipeableWillOpen?: () => void;
  onSwipeableClose?: () => void;
}

const billingCycleLabelMap: Record<BillingCycle, string> = {
  monthly: "월간",
  yearly: "연간",
};

const formatAmount = (amount: number, currency: Currency): string => {
  const locale = currency === "KRW" ? "ko-KR" : "en-US";
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatYmd = (value: string): string => value.replaceAll("-", ".");

interface ActionButtonProps {
  label: string;
  className: string;
  onPress: () => void;
}

function SwipeActionButton({ label, className, onPress }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className={`${className} w-[88px] h-full items-center justify-center`}
    >
      <Text className="text-white text-sm font-semibold">{label}</Text>
    </Pressable>
  );
}

export function SubscriptionCard({
  subscription,
  swipeableRef,
  onPress,
  onTogglePin,
  onEdit,
  onDelete,
  onSwipeableWillOpen,
  onSwipeableClose,
}: SubscriptionCardProps) {
  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={1.8}
      leftThreshold={48}
      rightThreshold={96}
      overshootLeft={false}
      overshootRight={false}
      onSwipeableWillOpen={onSwipeableWillOpen}
      onSwipeableClose={onSwipeableClose}
      renderLeftActions={(_progress, _translation, swipeableMethods) => (
        <View className="h-full overflow-hidden rounded-3xl">
          <SwipeActionButton
            label={subscription.isPinned ? "Unpin" : "Pin"}
            className="bg-emerald-500"
            onPress={() => {
              swipeableMethods.close();
              hapticSelection();
              onTogglePin?.();
            }}
          />
        </View>
      )}
      renderRightActions={(_progress, _translation, swipeableMethods) => (
        <View className="h-full overflow-hidden rounded-3xl flex-row">
          <SwipeActionButton
            label="수정"
            className="bg-sky-500"
            onPress={() => {
              swipeableMethods.close();
              hapticSelection();
              onEdit?.();
            }}
          />
          <SwipeActionButton
            label="삭제"
            className="bg-rose-500"
            onPress={() => {
              swipeableMethods.close();
              hapticSelection();
              onDelete?.();
            }}
          />
        </View>
      )}
    >
      <PressableFeedback
        onPress={onPress}
        className="rounded-3xl overflow-hidden"
        isDisabled={!onPress}
      >
        <PressableFeedback.Highlight />
        <Card variant="default" className="gap-3 p-4 shadow-none">
          <Card.Body className="gap-3">
            <View className="flex-row items-start justify-between gap-3">
              <Card.Title className="flex-1 text-lg font-semibold text-black dark:text-white">
                {subscription.name}
              </Card.Title>
              <Card.Title className="text-base font-semibold text-black dark:text-white">
                {formatAmount(subscription.amount, subscription.currency)}
              </Card.Title>
            </View>

            <View className="flex-row items-center justify-between gap-3">
              <Card.Description className="text-sm text-neutral-500 dark:text-neutral-400">
                {subscription.categoryName} ·{" "}
                {billingCycleLabelMap[subscription.billingCycle]}
              </Card.Description>
              <Card.Description className="text-sm text-neutral-500 dark:text-neutral-400">
                결제일 {formatYmd(subscription.billingDate)}
              </Card.Description>
            </View>
          </Card.Body>

          <View className="h-px bg-black/5 dark:bg-white/10" />

          <Card.Footer className="pt-0 flex-row items-center justify-between">
            <Card.Description className="text-sm text-black/70 dark:text-white/70">
              다음 청구일 {formatYmd(subscription.nextBillingDate)}
            </Card.Description>
            {subscription.isPinned ? (
              <Text className="text-xs font-semibold text-emerald-500">PINNED</Text>
            ) : null}
          </Card.Footer>
        </Card>
      </PressableFeedback>
    </ReanimatedSwipeable>
  );
}
