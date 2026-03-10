import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { SubscriptionSummaryCard } from "@/components/subscriptions/subscription-summary-card";
import { hapticImpactLight } from "@/lib/haptics";
import {
  deleteSubscription,
  listSubscriptions,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { PlusIcon, SettingsIcon } from "lucide-uniwind";
import React, { useCallback, useRef, useState } from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

export default function HomeRoute() {
  const router = useRouter();
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionWithCategory[] | null
  >(null);
  const swipeableMapRef = useRef<
    Record<string, { current: SwipeableMethods | null }>
  >({});
  const openedSwipeableIdRef = useRef<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      const data = await listSubscriptions({ isActive: true });
      setSubscriptions(data);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      setSubscriptions((currentSubscriptions) => currentSubscriptions ?? []);
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

  const isEmptyState = subscriptions !== null && subscriptions.length === 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: isEmptyState ? "" : "내 구독",
          headerLargeTitleEnabled: !isEmptyState,
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
            hitSlop={10}
            className="w-8 h-8 items-center justify-center"
          >
            <SettingsIcon className="text-black dark:text-white" />
          </Pressable>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      {isEmptyState ? (
        <View className="flex-1 items-center justify-center px-8">
          <View className="items-center gap-2">
            <Text className="text-base font-medium text-black dark:text-white">
              등록된 구독이 없습니다.
            </Text>
            <Text className="text-sm text-center text-neutral-500 dark:text-neutral-400">
              우측 하단 + 버튼으로 첫 구독을 추가해보세요.
            </Text>
          </View>
        </View>
      ) : (
        <FlatList
          showsVerticalScrollIndicator={false}
          contentInsetAdjustmentBehavior="automatic"
          data={subscriptions ?? []}
          keyExtractor={(item) => item.id}
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
              onEdit={() => router.navigate(`/subscriptions/${item.id}/edit`)}
              onDelete={() => handleDeletePress(item)}
              subscription={item}
            />
          )}
          onScrollBeginDrag={closeOpenedSwipeable}
          ItemSeparatorComponent={() => <View className="h-3" />}
          style={{ flex: 1, width: "100%", paddingHorizontal: 16 }}
          className="flex-1 w-full px-4"
          contentContainerStyle={{
            paddingTop: 15,
            paddingBottom: 100,
          }}
          ListHeaderComponent={
            <>
              <SubscriptionSummaryCard subscriptions={subscriptions ?? []} />

              <Text className="mb-3 mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                구독 목록
              </Text>
            </>
          }
        />
      )}

      <Button
        onPressIn={hapticImpactLight}
        onPress={() => {
          if (consumeOpenedSwipeable()) {
            return;
          }

          router.navigate("/subscriptions/new");
        }}
        isIconOnly
        className="absolute right-5 bottom-10 w-16 h-16 rounded-full shadow-2xl"
      >
        <PlusIcon size={28} className="text-white" />
      </Button>
    </>
  );
}
