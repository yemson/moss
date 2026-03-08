import { Alert, Pressable, Text, View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { useCallback, useRef, useState } from "react";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { PlusIcon, SettingsIcon } from "lucide-uniwind";
import { Button } from "heroui-native";
import Animated, { LinearTransition } from "react-native-reanimated";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { hapticImpactLight } from "@/lib/haptics";
import {
  deleteSubscription,
  listSubscriptions,
  setSubscriptionPinned,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";

const PIN_REORDER_TRANSITION = LinearTransition.springify()
  .damping(60)
  .stiffness(400);

export default function HomeRoute() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionWithCategory[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const swipeableMapRef = useRef<
    Record<string, { current: SwipeableMethods | null }>
  >({});
  const openedSwipeableIdRef = useRef<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await listSubscriptions({ isActive: true });
      setSubscriptions(data);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadSubscriptions();
    }, [loadSubscriptions]),
  );

  const getSwipeableRef = useCallback((id: string) => {
    if (!swipeableMapRef.current[id]) {
      swipeableMapRef.current[id] = { current: null };
    }

    return swipeableMapRef.current[id];
  }, []);

  const closeOpenedSwipeable = useCallback(() => {
    const openedId = openedSwipeableIdRef.current;
    if (!openedId) {
      return;
    }

    swipeableMapRef.current[openedId]?.current?.close();
    openedSwipeableIdRef.current = null;
  }, []);

  const consumeOpenedSwipeable = useCallback(() => {
    if (!openedSwipeableIdRef.current) {
      return false;
    }

    closeOpenedSwipeable();
    return true;
  }, [closeOpenedSwipeable]);

  const handleSwipeableWillOpen = useCallback((id: string) => {
    const openedId = openedSwipeableIdRef.current;
    if (openedId && openedId !== id) {
      swipeableMapRef.current[openedId]?.current?.close();
    }
    openedSwipeableIdRef.current = id;
  }, []);

  const handleSwipeableClose = useCallback((id: string) => {
    if (openedSwipeableIdRef.current === id) {
      openedSwipeableIdRef.current = null;
    }
  }, []);

  const handleTogglePin = useCallback(
    async (subscription: SubscriptionWithCategory) => {
      try {
        await setSubscriptionPinned(subscription.id, !subscription.isPinned);
        await loadSubscriptions();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Pin 상태를 변경하지 못했습니다.";
        Alert.alert("오류", message);
      }
    },
    [loadSubscriptions],
  );

  const handleDeleteConfirmed = useCallback(
    async (subscriptionId: string) => {
      try {
        await deleteSubscription(subscriptionId);
        await loadSubscriptions();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "구독을 삭제하지 못했습니다.";
        Alert.alert("오류", message);
      }
    },
    [loadSubscriptions],
  );

  const handleDeletePress = useCallback(
    (subscription: SubscriptionWithCategory) => {
      Alert.alert("구독 삭제", `'${subscription.name}' 구독을 삭제할까요?`, [
        { text: "취소", style: "cancel" },
        {
          text: "삭제",
          style: "destructive",
          onPress: () => {
            void handleDeleteConfirmed(subscription.id);
          },
        },
      ]);
    },
    [handleDeleteConfirmed],
  );

  const renderEmptyState = () => (
    <View className="rounded-3xl border border-black/10 dark:border-white/10 px-4 py-5">
      <Text className="text-base font-medium text-black dark:text-white">
        등록된 구독이 없습니다.
      </Text>
      <Text className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">
        우측 하단 + 버튼으로 첫 구독을 추가해보세요.
      </Text>
    </View>
  );

  const renderLoadingState = () => (
    <View className="px-1 py-3">
      <Text className="text-sm text-neutral-500 dark:text-neutral-400">
        구독 목록 불러오는 중...
      </Text>
    </View>
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "",
        }}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <Pressable
            onPressIn={hapticImpactLight}
            onPress={() => {
              if (consumeOpenedSwipeable()) {
                return;
              }

              router.navigate("/settings");
            }}
            hitSlop={8}
            className="w-8 h-8 items-center justify-center"
          >
            <SettingsIcon className="text-black dark:text-white" />
          </Pressable>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <Animated.FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        itemLayoutAnimation={PIN_REORDER_TRANSITION}
        skipEnteringExitingAnimations
        renderItem={({ item }) => (
          <SubscriptionCard
            swipeableRef={getSwipeableRef(item.id)}
            onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
            onSwipeableClose={() => handleSwipeableClose(item.id)}
            onPress={() => {
              if (consumeOpenedSwipeable()) {
                return;
              }

              router.navigate(`/subscriptions/${item.id}`);
            }}
            onTogglePin={() => {
              void handleTogglePin(item);
            }}
            onEdit={() => router.navigate(`/subscriptions/${item.id}/edit`)}
            onDelete={() => handleDeletePress(item)}
            subscription={item}
          />
        )}
        onScrollBeginDrag={closeOpenedSwipeable}
        ItemSeparatorComponent={() => <View className="h-3" />}
        style={{ flex: 1, width: "100%", paddingHorizontal: 16 }}
        contentContainerStyle={{
          paddingTop: headerHeight + 15,
          paddingBottom: 120,
          flexGrow: 1,
        }}
        ListHeaderComponent={
          <Text className="mb-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
            구독 목록
          </Text>
        }
        ListEmptyComponent={isLoading ? renderLoadingState : renderEmptyState}
      />

      <Button
        onPressIn={hapticImpactLight}
        onPress={() => {
          if (consumeOpenedSwipeable()) {
            return;
          }

          router.navigate("/subscriptions/new");
        }}
        isIconOnly
        className="absolute right-5 bottom-10 w-16 h-16 rounded-full"
      >
        <PlusIcon size={28} className="text-white" />
      </Button>
    </>
  );
}
