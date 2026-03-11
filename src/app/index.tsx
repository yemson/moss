import { useAppSettings } from "@/lib/app-settings";
import { consumeInitialHomeData } from "@/lib/home-bootstrap";
import { SubscriptionCard } from "@/components/subscriptions/subscription-card";
import { SubscriptionCategoryFilter } from "@/components/subscriptions/subscription-category-filter";
import { SubscriptionSortSelect } from "@/components/subscriptions/subscription-sort-select";
import { SubscriptionSummaryCard } from "@/components/subscriptions/subscription-summary-card";
import { hapticImpactLight } from "@/lib/haptics";
import { syncSubscriptionNotifications } from "@/lib/subscription-notifications";
import {
  deleteSubscription,
  getUsdKrwRate,
  listSubscriptions,
  type SubscriptionWithCategory,
  type UsdKrwExchangeRate,
} from "@/lib/subscription-store";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { PlusIcon, SettingsIcon } from "lucide-uniwind";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Alert, FlatList, Pressable, Text, View } from "react-native";
import type { SwipeableMethods } from "react-native-gesture-handler/ReanimatedSwipeable";

const ALL_CATEGORY_KEY = "all";
const SORT_OPTIONS = [
  { value: "billing-date", label: "결제일 가까운 순" },
  { value: "amount-desc", label: "큰 금액 순" },
] as const;

type SortKey = (typeof SORT_OPTIONS)[number]["value"];
type SortOption = (typeof SORT_OPTIONS)[number];

function compareByBillingDate(
  a: SubscriptionWithCategory,
  b: SubscriptionWithCategory,
) {
  const billingDateDiff = a.nextBillingDate.localeCompare(b.nextBillingDate);
  if (billingDateDiff !== 0) {
    return billingDateDiff;
  }

  return b.createdAt.localeCompare(a.createdAt);
}

function compareByAmountDesc(
  a: SubscriptionWithCategory,
  b: SubscriptionWithCategory,
  exchangeRate: UsdKrwExchangeRate | null,
) {
  const getComparableAmount = (subscription: SubscriptionWithCategory) => {
    if (subscription.currency === "KRW") {
      return subscription.amount;
    }

    if (!exchangeRate) {
      return null;
    }

    return Math.round(subscription.amount * exchangeRate.usdToKrwRate);
  };

  const comparableAmountA = getComparableAmount(a);
  const comparableAmountB = getComparableAmount(b);

  if (comparableAmountA == null && comparableAmountB != null) {
    return 1;
  }

  if (comparableAmountA != null && comparableAmountB == null) {
    return -1;
  }

  if (comparableAmountA != null && comparableAmountB != null) {
    const amountDiff = comparableAmountB - comparableAmountA;
    if (amountDiff !== 0) {
      return amountDiff;
    }
  }

  if (comparableAmountA == null && comparableAmountB == null) {
    const currencyDiff = a.currency.localeCompare(b.currency);
    if (currencyDiff !== 0) {
      return currencyDiff;
    }
  }

  const billingDateDiff = a.nextBillingDate.localeCompare(b.nextBillingDate);
  if (billingDateDiff !== 0) {
    return billingDateDiff;
  }

  return b.createdAt.localeCompare(a.createdAt);
}

function sortSubscriptions(
  subscriptions: SubscriptionWithCategory[],
  sortKey: SortKey,
  exchangeRate: UsdKrwExchangeRate | null,
) {
  const nextSubscriptions = [...subscriptions];

  nextSubscriptions.sort(
    sortKey === "amount-desc"
      ? (a, b) => compareByAmountDesc(a, b, exchangeRate)
      : compareByBillingDate,
  );

  return nextSubscriptions;
}

export default function HomeRoute() {
  const router = useRouter();
  const { notificationsEnabled } = useAppSettings();
  const [initialHomeData] = useState(() => consumeInitialHomeData());
  const [subscriptions, setSubscriptions] = useState<
    SubscriptionWithCategory[] | null
  >(() => initialHomeData?.subscriptions ?? null);
  const [exchangeRate, setExchangeRate] = useState<UsdKrwExchangeRate | null>(
    () => initialHomeData?.exchangeRate ?? null,
  );
  const [selectedCategoryKey, setSelectedCategoryKey] =
    useState<string>(ALL_CATEGORY_KEY);
  const [sortOption, setSortOption] = useState<SortOption>(SORT_OPTIONS[0]);
  const swipeableMapRef = useRef<
    Record<string, { current: SwipeableMethods | null }>
  >({});
  const openedSwipeableIdRef = useRef<string | null>(null);

  const loadSubscriptions = useCallback(async () => {
    try {
      const nextSubscriptions = await listSubscriptions({ isActive: true });
      setSubscriptions(nextSubscriptions);
    } catch (error) {
      console.error("Failed to load subscriptions:", error);
      setSubscriptions((currentSubscriptions) => currentSubscriptions ?? []);
    }

    try {
      const nextExchangeRate = await getUsdKrwRate();
      setExchangeRate(nextExchangeRate);
    } catch (error) {
      console.error("Failed to load exchange rate:", error);
      setExchangeRate((currentExchangeRate) => currentExchangeRate ?? null);
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
        await syncSubscriptionNotifications(notificationsEnabled);
        await loadSubscriptions();
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "구독을 삭제하지 못했습니다.";
        Alert.alert("오류", message);
      }
    },
    [loadSubscriptions, notificationsEnabled],
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
  const categoryFilters = useMemo(() => {
    const filters =
      subscriptions?.reduce<{ id: string; name: string }[]>((acc, item) => {
        if (!acc.some((category) => category.id === item.categoryId)) {
          acc.push({ id: item.categoryId, name: item.categoryName });
        }

        return acc;
      }, []) ?? [];

    filters.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    return filters;
  }, [subscriptions]);
  const filteredSubscriptions = useMemo(() => {
    if (selectedCategoryKey === ALL_CATEGORY_KEY) {
      return subscriptions ?? [];
    }

    return (subscriptions ?? []).filter(
      (subscription) => subscription.categoryId === selectedCategoryKey,
    );
  }, [selectedCategoryKey, subscriptions]);
  const visibleSubscriptions = useMemo(
    () => sortSubscriptions(filteredSubscriptions, sortOption.value, exchangeRate),
    [exchangeRate, filteredSubscriptions, sortOption.value],
  );

  useEffect(() => {
    const hasSelectedCategory =
      selectedCategoryKey === ALL_CATEGORY_KEY ||
      categoryFilters.some((category) => category.id === selectedCategoryKey);

    if (!hasSelectedCategory) {
      setSelectedCategoryKey(ALL_CATEGORY_KEY);
    }
  }, [categoryFilters, selectedCategoryKey]);

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
              router.navigate("/settings");

              setTimeout(() => {
                consumeOpenedSwipeable();
              }, 300);
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
          data={visibleSubscriptions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <SubscriptionCard
              exchangeRate={exchangeRate}
              swipeableRef={getSwipeableRef(item.id)}
              onSwipeableWillOpen={() => handleSwipeableWillOpen(item.id)}
              onSwipeableClose={() => handleSwipeableClose(item.id)}
              onPress={() => {
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
              <SubscriptionSummaryCard
                subscriptions={subscriptions ?? []}
                exchangeRate={exchangeRate}
              />

              <Text className="mb-3 mt-3 text-sm font-medium text-neutral-500 dark:text-neutral-400">
                구독 목록
              </Text>

              <View className="mb-3 flex-row items-center gap-2">
                <SubscriptionCategoryFilter
                  categories={categoryFilters}
                  selectedCategoryKey={selectedCategoryKey}
                  onSelectionChange={setSelectedCategoryKey}
                />
                <SubscriptionSortSelect
                  value={sortOption}
                  options={SORT_OPTIONS}
                  onValueChange={(nextSortOption) => {
                    setSortOption(nextSortOption as SortOption);
                    consumeOpenedSwipeable();
                  }}
                />
              </View>
            </>
          }
        />
      )}

      <Button
        onPressIn={hapticImpactLight}
        onPress={() => {
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
