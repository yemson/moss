import { useCallback, type ReactNode, type RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import { Pin, PinOff, Trash2 } from "lucide-react-native";
import Reanimated, {
  Extrapolation,
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
} from "react-native-reanimated";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Card, Separator } from "heroui-native";
import { useAppSettings } from "@/lib/app-settings";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import type {
  BillingCycle,
  SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { formatAmountParts } from "@/lib/subscription-format";
import { PencilIcon } from "lucide-uniwind";
import { clsx } from "clsx";

const ACTION_BUTTON_SIZE = 48;
const PIN_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const EDIT_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const DELETE_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const RIGHT_ACTION_GAP = 8;
const RIGHT_ACTION_WIDTH =
  EDIT_ACTION_WIDTH + DELETE_ACTION_WIDTH + RIGHT_ACTION_GAP;
const ACTION_HAPTIC_THRESHOLD = 0.7;
const ACTION_HAPTIC_RESET_THRESHOLD = 0.25;
const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

function parseYmdToDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getSubscriptionInitial(name: string) {
  const trimmedName = name.trim();
  const firstCharacter = Array.from(trimmedName)[0] ?? "?";

  return /^[a-z]$/i.test(firstCharacter)
    ? firstCharacter.toUpperCase()
    : firstCharacter;
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
        runOnJS(triggerSwipeActionHaptic)();
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

interface LeftActionsProps {
  drag: SharedValue<number>;
  isPinned: boolean;
  onTogglePin: () => void;
  swipeableMethods: SwipeableMethods;
}

function LeftActions({
  drag,
  isPinned,
  onTogglePin,
  swipeableMethods,
}: LeftActionsProps) {
  const pinScale = useDerivedValue(() =>
    interpolate(drag.value, [0, PIN_ACTION_WIDTH], [0, 1], Extrapolation.CLAMP),
  );

  useSwipeActionHaptic(pinScale);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: pinScale.value,
        },
      ],
    };
  }, [pinScale]);

  return (
    <Reanimated.View
      style={[animatedStyle, { width: PIN_ACTION_WIDTH }]}
      className="flex justify-center items-center mr-2"
    >
      <ActionButton
        width={PIN_ACTION_WIDTH}
        className="bg-emerald-500 w-12 h-12 rounded-full shadow/50 shadow-neutral-300"
        icon={
          isPinned ? (
            <PinOff size={22} color="#ffffff" />
          ) : (
            <Pin size={22} color="#ffffff" />
          )
        }
        onPress={() => {
          hapticImpactLight();
          swipeableMethods.close();
          onTogglePin();
        }}
      />
    </Reanimated.View>
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
  const editScale = useDerivedValue(() =>
    interpolate(
      drag.value,
      [-RIGHT_ACTION_WIDTH, -(DELETE_ACTION_WIDTH + RIGHT_ACTION_GAP), 0],
      [1, 0, 0],
      Extrapolation.CLAMP,
    ),
  );
  const deleteScale = useDerivedValue(() =>
    interpolate(
      drag.value,
      [-DELETE_ACTION_WIDTH, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
  );

  useSwipeActionHaptic(editScale);
  useSwipeActionHaptic(deleteScale);

  const editAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        drag.value,
        [-RIGHT_ACTION_WIDTH, -(DELETE_ACTION_WIDTH + RIGHT_ACTION_GAP), 0],
        [1, 0, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: editScale.value,
        },
      ],
    };
  }, [drag, editScale]);

  const deleteAnimatedStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(
        drag.value,
        [-DELETE_ACTION_WIDTH, 0],
        [1, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          scale: deleteScale.value,
        },
      ],
    };
  }, [deleteScale, drag]);

  return (
    <Reanimated.View
      style={{ width: RIGHT_ACTION_WIDTH }}
      className="flex-row items-center justify-center ml-2"
    >
      <Reanimated.View
        style={[editAnimatedStyle, { width: EDIT_ACTION_WIDTH }]}
      >
        <ActionButton
          width={EDIT_ACTION_WIDTH}
          className="bg-neutral-200 dark:bg-neutral-800 shadow/50 shadow-neutral-300"
          icon={
            <PencilIcon
              size={22}
              className="text-neutral-600 dark:text-neutral-300"
            />
          }
          onPress={() => {
            swipeableMethods.close();
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
          className="bg-red-500 shadow/50 shadow-neutral-300"
          icon={<Trash2 size={22} color="#ffffff" />}
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
  onTogglePin: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSwipeableWillOpen?: () => void;
  onSwipeableClose?: () => void;
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
  const { currencyDisplayMode } = useAppSettings();
  const subscriptionInitial = getSubscriptionInitial(subscription.name);
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

  const renderLeftActions = useCallback(
    (
      _progress: SharedValue<number>,
      drag: SharedValue<number>,
      swipeableMethods: SwipeableMethods,
    ) => {
      return (
        <LeftActions
          drag={drag}
          isPinned={subscription.isPinned}
          onTogglePin={onTogglePin}
          swipeableMethods={swipeableMethods}
        />
      );
    },
    [onTogglePin, subscription.isPinned],
  );

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
      friction={4}
      rightThreshold={20}
      leftThreshold={20}
      dragOffsetFromLeftEdge={10}
      dragOffsetFromRightEdge={10}
      overshootLeft={false}
      overshootRight={false}
      enableTrackpadTwoFingerGesture
      containerStyle={{ borderRadius: 24, overflow: "visible" }}
      childrenContainerStyle={{ borderRadius: 24, overflow: "visible" }}
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={() => onSwipeableWillOpen?.()}
      onSwipeableClose={() => onSwipeableClose?.()}
    >
      <Pressable onPress={handlePress}>
        <Card
          variant="default"
          className="gap-3 p-4 shadow/20 shadow-neutral-300 dark:shadow-none"
        >
          <Card.Body className="gap-1.5">
            <View className="flex-row items-start gap-3">
              <View className="h-13 w-13 items-center justify-center rounded-2xl bg-surface-secondary dark:bg-surface-secondary">
                <Text className="text-lg font-bold text-surface-foreground">
                  {subscriptionInitial}
                </Text>
              </View>

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
                    className="text-sm text-neutral-500 dark:text-neutral-400"
                    numberOfLines={1}
                  >
                    {subscription.categoryName}
                  </Card.Description>
                  <Card.Description
                    className="text-sm text-neutral-500 dark:text-neutral-400"
                    numberOfLines={1}
                  >
                    {recurringBillingLabel}
                  </Card.Description>
                </View>
              </View>
            </View>
          </Card.Body>

          <Separator className="opacity-50" />

          <Card.Footer
            className={clsx(
              "pt-0 flex-row items-center",
              subscription.isPinned ? "justify-between" : "justify-end",
            )}
          >
            {subscription.isPinned && (
              <Text className="text-xs font-semibold text-emerald-500">
                고정됨
              </Text>
            )}
            <View
              className={clsx(
                "rounded-full px-2.5 py-1",
                isDueToday
                  ? "bg-emerald-100 dark:bg-emerald-950/70"
                  : "bg-neutral-100 dark:bg-neutral-800",
              )}
            >
              <Text
                className={clsx(
                  "text-xs font-semibold",
                  isDueToday
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-neutral-500 dark:text-neutral-300",
                )}
              >
                {ddayLabel}
              </Text>
            </View>
          </Card.Footer>
        </Card>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
