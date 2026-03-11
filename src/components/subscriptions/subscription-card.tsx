import { useAppSettings } from "@/lib/app-settings";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import { formatAmountParts } from "@/lib/subscription-format";
import type {
  BillingCycle,
  SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import { Card } from "heroui-native";
import { PencilIcon, Trash2Icon } from "lucide-uniwind";
import { useCallback, type ReactNode, type RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { scheduleOnRN } from "react-native-worklets";
import Reanimated, {
  Extrapolation,
  interpolate,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withSpring,
  type SharedValue,
} from "react-native-reanimated";

const ACTION_BUTTON_SIZE = 48;
const EDIT_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const DELETE_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const RIGHT_ACTION_GAP = 8;
const RIGHT_ACTION_WIDTH =
  EDIT_ACTION_WIDTH + DELETE_ACTION_WIDTH + RIGHT_ACTION_GAP;
const ACTION_EDGE_INSET = 8;
const ACTION_CONTAINER_WIDTH = RIGHT_ACTION_WIDTH + ACTION_EDGE_INSET;
const ACTION_HAPTIC_THRESHOLD = 0.7;
const ACTION_HAPTIC_RESET_THRESHOLD = 0.25;
const ACTION_SCALE_SPRING_CONFIG = {
  damping: 18,
  stiffness: 220,
  mass: 0.8,
} as const;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseYmdToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getRecurringBillingLabel(
  billingDate: string,
  billingCycle: BillingCycle,
) {
  const [, month, day] = billingDate.split("-");

  if (billingCycle === "monthly") {
    return `매월 ${Number(day)}일 결제`;
  }

  return `매년 ${month}.${day} 결제`;
}

function getDdayLabel(nextBillingDate: string) {
  const today = new Date();
  const currentDate = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
  );
  const billingDate = parseYmdToDate(nextBillingDate);
  const diffDays = Math.round(
    (billingDate.getTime() - currentDate.getTime()) / ONE_DAY_IN_MS,
  );

  if (diffDays <= 0) {
    return "오늘";
  }

  return `${diffDays}일 후`;
}

function triggerSwipeActionHaptic() {
  hapticSelection();
}

function useSwipeActionHaptic(scale: SharedValue<number>) {
  const isArmed = useSharedValue(true);

  useAnimatedReaction(
    () => scale.value,
    (currentScale) => {
      if (isArmed.value && currentScale >= ACTION_HAPTIC_THRESHOLD) {
        isArmed.value = false;
        scheduleOnRN(triggerSwipeActionHaptic);
      } else if (
        !isArmed.value &&
        currentScale <= ACTION_HAPTIC_RESET_THRESHOLD
      ) {
        isArmed.value = true;
      }
    },
    [scale],
  );
}

interface ActionButtonProps {
  width: number;
  className: string;
  icon: ReactNode;
  onPress: () => void;
}

function ActionButton({ width, className, icon, onPress }: ActionButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        width,
        height: ACTION_BUTTON_SIZE,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <View
        className={`w-12 h-12 items-center justify-center rounded-full ${className}`}
      >
        {icon}
      </View>
    </Pressable>
  );
}

interface RightActionsProps {
  drag: SharedValue<number>;
  onEdit: () => void;
  onDelete: () => void;
  swipeableMethods: SwipeableMethods;
}

function RightActions({
  drag,
  onEdit,
  onDelete,
  swipeableMethods,
}: RightActionsProps) {
  const editTargetScale = useDerivedValue(() =>
    interpolate(
      drag.value,
      [-RIGHT_ACTION_WIDTH, -(DELETE_ACTION_WIDTH + RIGHT_ACTION_GAP), 0],
      [1, 0, 0],
      Extrapolation.CLAMP,
    ),
  );
  const deleteTargetScale = useDerivedValue(() =>
    interpolate(
      drag.value,
      [-DELETE_ACTION_WIDTH, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  );

  const editScale = useDerivedValue(() =>
    withSpring(editTargetScale.value, ACTION_SCALE_SPRING_CONFIG),
  );
  const deleteScale = useDerivedValue(() =>
    withSpring(deleteTargetScale.value, ACTION_SCALE_SPRING_CONFIG),
  );

  useSwipeActionHaptic(editTargetScale);
  useSwipeActionHaptic(deleteTargetScale);

  const editAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: editTargetScale.value,
      transform: [
        {
          scale: editScale.value,
        },
      ],
    };
  }, [editScale, editTargetScale]);

  const deleteAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: deleteTargetScale.value,
      transform: [
        {
          scale: deleteScale.value,
        },
      ],
    };
  }, [deleteScale, deleteTargetScale]);

  return (
    <Reanimated.View
      style={{
        width: ACTION_CONTAINER_WIDTH,
        paddingRight: ACTION_EDGE_INSET,
      }}
      className="ml-2 flex-row items-center"
    >
      <Reanimated.View
        style={[editAnimatedStyle, { width: EDIT_ACTION_WIDTH }]}
      >
        <ActionButton
          width={EDIT_ACTION_WIDTH}
          className="bg-info"
          icon={<PencilIcon size={22} className="text-info-foreground" />}
          onPress={() => {
            setTimeout(() => {
              swipeableMethods.close();
            }, 100);
            hapticImpactLight();
            onEdit();
          }}
        />
      </Reanimated.View>

      <Reanimated.View
        style={[
          deleteAnimatedStyle,
          { width: DELETE_ACTION_WIDTH, marginLeft: RIGHT_ACTION_GAP },
        ]}
      >
        <ActionButton
          width={DELETE_ACTION_WIDTH}
          className="bg-danger"
          icon={<Trash2Icon size={22} className="text-danger-foreground" />}
          onPress={() => {
            swipeableMethods.close();
            hapticImpactLight();
            onDelete();
          }}
        />
      </Reanimated.View>
    </Reanimated.View>
  );
}

interface SubscriptionCardProps {
  subscription: SubscriptionWithCategory;
  swipeableRef?: RefObject<SwipeableMethods | null>;
  onPress?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeableWillOpen?: () => void;
  onSwipeableClose?: () => void;
}

export function SubscriptionCard({
  subscription,
  swipeableRef,
  onPress,
  onEdit,
  onDelete,
  onSwipeableWillOpen,
  onSwipeableClose,
}: SubscriptionCardProps) {
  const { currencyDisplayMode } = useAppSettings();
  const recurringBillingLabel = getRecurringBillingLabel(
    subscription.billingDate,
    subscription.billingCycle,
  );
  const ddayLabel = getDdayLabel(subscription.nextBillingDate);
  const isDueToday = ddayLabel === "오늘";

  const amountParts = formatAmountParts(
    subscription.amount,
    subscription.currency,
    currencyDisplayMode,
  );

  const handlePress = useCallback(() => {
    hapticImpactLight();
    onPress?.();
  }, [onPress]);

  const renderRightActions = useCallback(
    (
      _progress: SharedValue<number>,
      drag: SharedValue<number>,
      swipeableMethods: SwipeableMethods,
    ) => {
      return (
        <RightActions
          drag={drag}
          onEdit={onEdit}
          onDelete={onDelete}
          swipeableMethods={swipeableMethods}
        />
      );
    },
    [onDelete, onEdit],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      friction={2.2}
      rightThreshold={20}
      dragOffsetFromRightEdge={10}
      overshootRight={false}
      containerStyle={{ borderRadius: 24, overflow: "visible" }}
      childrenContainerStyle={{ borderRadius: 24, overflow: "visible" }}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={onSwipeableWillOpen}
      onSwipeableClose={onSwipeableClose}
    >
      <Pressable onPress={handlePress}>
        <Card
          variant="default"
          className="p-4 px-4.5 shadow-lg shadow-neutral-300/10 dark:shadow-none"
        >
          <Card.Body className="gap-1.5 p-0">
            <View className="flex-row items-start gap-3">
              <SubscriptionServiceBadge
                name={subscription.name}
                templateKey={subscription.templateKey}
                size="card"
              />

              <View className="min-w-0 flex-1 gap-1.5">
                <View className="flex-row items-start justify-between gap-3">
                  <Card.Title
                    className="flex-1 text-lg font-semibold text-black dark:text-white"
                    numberOfLines={1}
                  >
                    {subscription.name}
                  </Card.Title>
                  <View className="flex-row items-baseline gap-0.5">
                    {amountParts.currencyLabelPosition === "prefix" && (
                      <Text className="text-base font-semibold text-black dark:text-white">
                        {amountParts.currencyLabel}
                      </Text>
                    )}
                    <Text className="text-lg font-semibold text-black dark:text-white">
                      {amountParts.value}
                    </Text>
                    {amountParts.currencyLabelPosition === "suffix" && (
                      <Text className="text-base font-semibold text-black dark:text-white">
                        {amountParts.currencyLabel}
                      </Text>
                    )}
                  </View>
                </View>

                <View className="flex-row items-center justify-between gap-3">
                  <Card.Description
                    className="min-w-0 flex-1 text-xs text-foreground/50"
                    numberOfLines={1}
                  >
                    {recurringBillingLabel}
                  </Card.Description>
                  <View className="flex-row shrink-0 items-center gap-1.5">
                    <View
                      className={
                        isDueToday
                          ? "rounded-full bg-success-soft px-2 py-0.5"
                          : "rounded-full bg-surface-secondary px-2 py-0.5 dark:bg-surface-secondary"
                      }
                    >
                      <Text
                        className={
                          isDueToday
                            ? "text-[11px] font-semibold text-success"
                            : "text-[11px] font-semibold text-foreground/50"
                        }
                      >
                        {ddayLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Card.Body>
        </Card>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
