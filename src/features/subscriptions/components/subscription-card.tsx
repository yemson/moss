import { useCallback, type ReactNode, type RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import { Pencil, Pin, PinOff, Trash2 } from "lucide-react-native";
import type { SharedValue } from "react-native-reanimated";
import Animated, {
  Extrapolation,
  interpolate,
  useDerivedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import type { SubscriptionWithCategory } from "@/features/subscriptions/model/subscription-store";
import {
  billingCycleLabelMap,
  formatAmount,
  formatYmd,
} from "@/features/subscriptions/utils/format";
import { Card, PressableFeedback } from "heroui-native";
import { hapticImpactLight } from "@/shared/lib/haptics";

const PIN_ACTION_WIDTH = 68;
const EDIT_ACTION_WIDTH = 64;
const DELETE_ACTION_WIDTH = 64;
const TOTAL_RIGHT_ACTION_WIDTH = EDIT_ACTION_WIDTH + DELETE_ACTION_WIDTH;

type ActionDirection = "left" | "right";

interface SwipeActionButtonProps {
  icon: ReactNode;
  width: number;
  revealDistance: number;
  direction: ActionDirection;
  translation: SharedValue<number>;
  onPress: () => void;
}

function SwipeActionButton({
  icon,
  width,
  revealDistance,
  direction,
  translation,
  onPress,
}: SwipeActionButtonProps) {
  const translationProgress = useDerivedValue(() => {
    const distance =
      direction === "right" ? -translation.value : translation.value;

    return interpolate(
      distance,
      [0, revealDistance],
      [0, 1],
      Extrapolation.CLAMP,
    );
  }, [direction, revealDistance, translation]);

  const animatedStyle = useAnimatedStyle(() => {
    const normalized = interpolate(
      translationProgress.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    );
    const easedProgress =
      direction === "right"
        ? interpolate(
            normalized,
            [0, 0.4, 1],
            [0, 0.72, 1],
            Extrapolation.CLAMP,
          )
        : normalized;

    return {
      transform: [
        {
          translateX: interpolate(
            easedProgress,
            [0, 1],
            [direction === "left" ? -8 : 8, 0],
            Extrapolation.CLAMP,
          ),
        },
        {
          scale: interpolate(
            easedProgress,
            [0, 1],
            [0.96, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, [direction, translationProgress]);

  return (
    <Pressable
      onPress={onPress}
      style={{ width }}
      className="h-full items-center justify-center"
    >
      <Animated.View style={animatedStyle}>{icon}</Animated.View>
    </Pressable>
  );
}

interface RightSwipeActionsProps {
  translation: SharedValue<number>;
  children: ReactNode;
}

function RightSwipeActions({ translation, children }: RightSwipeActionsProps) {
  const rowStyle = useAnimatedStyle(() => {
    const distance = -translation.value;

    return {
      width: TOTAL_RIGHT_ACTION_WIDTH,
      opacity: interpolate(
        distance,
        [0, 10, 22],
        [0, 0.82, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            distance,
            [0, TOTAL_RIGHT_ACTION_WIDTH],
            [TOTAL_RIGHT_ACTION_WIDTH * 0.45, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  }, [translation]);

  return (
    <Animated.View
      style={rowStyle}
      className="h-full flex-row items-center justify-end"
    >
      {children}
    </Animated.View>
  );
}

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
  const hasSwipeActions = Boolean(onTogglePin || onEdit || onDelete);

  const handlePress = () => {
    hapticImpactLight();
    onPress?.();
  };

  const runActionWithClose = useCallback(
    (swipeableMethods: SwipeableMethods, action?: () => void) => {
      swipeableMethods.close();
      hapticImpactLight();

      if (!action) {
        return;
      }

      setTimeout(() => {
        action();
      }, 90);
    },
    [],
  );

  const renderLeftActions = useCallback(
    (
      _progress: SharedValue<number>,
      translation: SharedValue<number>,
      swipeableMethods: SwipeableMethods,
    ) => {
      if (!onTogglePin) {
        return null;
      }

      return (
        <View className="h-full flex-row items-center">
          <SwipeActionButton
            icon={
              subscription.isPinned ? (
                <PinOff size={22} color="#10b981" />
              ) : (
                <Pin size={22} color="#10b981" />
              )
            }
            width={PIN_ACTION_WIDTH}
            revealDistance={PIN_ACTION_WIDTH}
            direction="left"
            translation={translation}
            onPress={() => runActionWithClose(swipeableMethods, onTogglePin)}
          />
        </View>
      );
    },
    [onTogglePin, runActionWithClose, subscription.isPinned],
  );

  const renderRightActions = useCallback(
    (
      _progress: SharedValue<number>,
      translation: SharedValue<number>,
      swipeableMethods: SwipeableMethods,
    ) => {
      if (!onEdit && !onDelete) {
        return null;
      }

      return (
        <RightSwipeActions translation={translation}>
          {onEdit ? (
            <SwipeActionButton
              icon={<Pencil size={22} color="#334155" />}
              width={EDIT_ACTION_WIDTH}
              revealDistance={EDIT_ACTION_WIDTH}
              direction="right"
              translation={translation}
              onPress={() => runActionWithClose(swipeableMethods, onEdit)}
            />
          ) : null}

          {onDelete ? (
            <SwipeActionButton
              icon={<Trash2 size={22} color="#ef4444" />}
              width={DELETE_ACTION_WIDTH}
              revealDistance={DELETE_ACTION_WIDTH}
              direction="right"
              translation={translation}
              onPress={() => runActionWithClose(swipeableMethods, onDelete)}
            />
          ) : null}
        </RightSwipeActions>
      );
    },
    [onDelete, onEdit, runActionWithClose],
  );

  return (
    <ReanimatedSwipeable
      ref={swipeableRef}
      enabled={hasSwipeActions}
      friction={2.2}
      leftThreshold={15}
      rightThreshold={15}
      dragOffsetFromLeftEdge={10}
      dragOffsetFromRightEdge={10}
      overshootLeft={false}
      overshootRight={false}
      overshootFriction={8}
      animationOptions={{ damping: 26, stiffness: 105, mass: 0.42 }}
      containerStyle={{ borderRadius: 24, overflow: "visible" }}
      childrenContainerStyle={{ borderRadius: 24, overflow: "visible" }}
      renderLeftActions={onTogglePin ? renderLeftActions : undefined}
      renderRightActions={onEdit || onDelete ? renderRightActions : undefined}
      onSwipeableWillOpen={() => onSwipeableWillOpen?.()}
      onSwipeableClose={() => onSwipeableClose?.()}
    >
      <PressableFeedback
        onPress={handlePress}
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
              <Text className="text-xs font-semibold text-emerald-500">
                고정됨
              </Text>
            ) : null}
          </Card.Footer>
        </Card>
      </PressableFeedback>
    </ReanimatedSwipeable>
  );
}
