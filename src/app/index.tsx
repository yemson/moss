import { Alert, FlatList, Pressable, Text, View } from "react-native";
import { useRouter, Stack } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { createRef, useCallback, useRef, useState } from "react";
import type { RefObject } from "react";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";
import { hapticImpactLight } from "@/lib/haptics";
import { PlusIcon, SettingsIcon } from "lucide-uniwind";
import { Button } from "heroui-native";
import {
  deleteSubscription,
  listSubscriptions,
  setSubscriptionPinned,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { SubscriptionCard } from "@/components/subscription-card";

export default function Screen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const swipeableRefs = useRef<Record<string, RefObject<SwipeableMethods | null>>>(
    {},
  );
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

  const getSwipeableRef = useCallback((subscriptionId: string) => {
    const existingRef = swipeableRefs.current[subscriptionId];
    if (existingRef) {
      return existingRef;
    }

    const nextRef = createRef<SwipeableMethods>();
    swipeableRefs.current[subscriptionId] = nextRef;
    return nextRef;
  }, []);

  const handleSwipeableWillOpen = useCallback((subscriptionId: string) => {
    const openedId = openedSwipeableIdRef.current;
    if (openedId && openedId !== subscriptionId) {
      swipeableRefs.current[openedId]?.current?.close();
    }

    openedSwipeableIdRef.current = subscriptionId;
  }, []);

  const handleSwipeableClose = useCallback((subscriptionId: string) => {
    if (openedSwipeableIdRef.current === subscriptionId) {
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
          error instanceof Error ? error.message : "Pin 상태를 변경하지 못했습니다.";
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
          error instanceof Error ? error.message : "구독을 삭제하지 못했습니다.";
        Alert.alert("오류", message);
      }
    },
    [loadSubscriptions],
  );

  const handleDeletePress = useCallback(
    (subscription: SubscriptionWithCategory) => {
      Alert.alert(
        "구독 삭제",
        `'${subscription.name}' 구독을 삭제할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: () => {
              void handleDeleteConfirmed(subscription.id);
            },
          },
        ],
      );
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
            onPress={() => router.navigate("/settings")}
            hitSlop={8}
            className="w-8 h-8 items-center justify-center"
          >
            <SettingsIcon className="text-black dark:text-white" />
          </Pressable>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <FlatList
        data={subscriptions}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <SubscriptionCard
            subscription={item}
            swipeableRef={getSwipeableRef(item.id)}
            onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
            onSwipeableClose={() => handleSwipeableClose(item.id)}
            onPress={() => router.push(`/subscriptions/${item.id}`)}
            onTogglePin={() => {
              void handleTogglePin(item);
            }}
            onEdit={() => router.push(`/subscriptions/${item.id}/edit`)}
            onDelete={() => handleDeletePress(item)}
          />
        )}
        ItemSeparatorComponent={() => <View className="h-3" />}
        style={{ flex: 1 }}
        className="flex-1 px-4"
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
        onPress={() => router.navigate("/create-sub-modal")}
        isIconOnly
        className="absolute right-5 bottom-10 w-16 h-16 rounded-full"
      >
        <PlusIcon size={28} className="text-white" />
      </Button>
    </>
  );
}
