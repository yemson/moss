import { useCallback, type ReactNode, type RefObject } from "react";
import { Pressable, Text, View } from "react-native";
import { Pin, PinOff, Trash2 } from "lucide-react-native";
import Reanimated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from "react-native-reanimated";
import ReanimatedSwipeable, {
  type SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import { Card } from "heroui-native";
import { useAppSettings } from "@/lib/app-settings";
import { hapticImpactLight } from "@/lib/haptics";
import type { SubscriptionWithCategory } from "@/lib/subscription-store";
import {
  billingCycleLabelMap,
  formatAmountParts,
  formatYmd,
} from "@/lib/subscription-format";
import { PencilIcon } from "lucide-uniwind";

const ACTION_BUTTON_SIZE = 48;
const PIN_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const EDIT_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const DELETE_ACTION_WIDTH = ACTION_BUTTON_SIZE;
const RIGHT_ACTION_GAP = 8;
const RIGHT_ACTION_WIDTH =
  EDIT_ACTION_WIDTH + DELETE_ACTION_WIDTH + RIGHT_ACTION_GAP;

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
  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [
        {
          scale: interpolate(
            drag.value,
            [0, PIN_ACTION_WIDTH],
            [0, 1],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  return (
    <Reanimated.View
      style={[animatedStyle, { width: PIN_ACTION_WIDTH }]}
      className="flex justify-center items-center mr-2"
    >
      <ActionButton
        width={PIN_ACTION_WIDTH}
        className="bg-emerald-500 w-12 h-12 rounded-full"
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
          scale: interpolate(
            drag.value,
            [-RIGHT_ACTION_WIDTH, -(DELETE_ACTION_WIDTH + RIGHT_ACTION_GAP), 0],
            [1, 0, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

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
          scale: interpolate(
            drag.value,
            [-DELETE_ACTION_WIDTH, 0],
            [1, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

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
          className="bg-neutral-200 dark:bg-neutral-800"
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
          className="bg-red-500"
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
  const amountParts = formatAmountParts(
    subscription.amount,
    subscription.currency,
    currencyDisplayMode,
  );
  const currencyLabelClassName =
    amountParts.currencyLabelPosition === "suffix"
      ? "text-base font-semibold text-black/70 dark:text-white/70 ml-0.5"
      : "text-base font-semibold text-black dark:text-white mr-0.5";

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
        <Card variant="default" className="gap-3 p-4 shadow-none">
          <Card.Body className="gap-1.5">
            <View className="flex-row items-start justify-between gap-3">
              <Card.Title className="flex-1 text-lg font-semibold text-black dark:text-white">
                {subscription.name}
              </Card.Title>
              <View
                className="flex-row items-baseline"
                style={{
                  columnGap:
                    amountParts.currencyLabelPosition === "suffix" ? 2 : 0,
                }}
              >
                {amountParts.currencyLabelPosition === "prefix" ? (
                  <Text className={currencyLabelClassName}>
                    {amountParts.currencyLabel}
                  </Text>
                ) : null}
                <Text className="text-base font-semibold text-black dark:text-white">
                  {amountParts.value}
                </Text>
                {amountParts.currencyLabelPosition === "suffix" ? (
                  <Text className={currencyLabelClassName}>
                    {amountParts.currencyLabel}
                  </Text>
                ) : null}
              </View>
            </View>

            <View className="flex-row items-center justify-between gap-3">
              <Card.Description className="text-sm text-neutral-500 dark:text-neutral-400">
                {subscription.categoryName}
              </Card.Description>
              <Card.Description className="text-sm text-neutral-500 dark:text-neutral-400">
                {billingCycleLabelMap[subscription.billingCycle]}
              </Card.Description>
            </View>
          </Card.Body>

          <View className="h-px bg-black/5 dark:bg-white/5" />

          <Card.Footer
            className="pt-0 flex-row items-center"
            style={{
              justifyContent: subscription.isPinned
                ? "space-between"
                : "flex-end",
            }}
          >
            {subscription.isPinned ? (
              <Text className="text-xs font-semibold text-emerald-500">
                고정됨
              </Text>
            ) : null}
            <Card.Description className="text-sm text-black/70 dark:text-white/70">
              다음 청구일 {formatYmd(subscription.nextBillingDate)}
            </Card.Description>
          </Card.Footer>
        </Card>
      </Pressable>
    </ReanimatedSwipeable>
  );
}
