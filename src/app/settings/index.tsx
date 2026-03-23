import { useAppSettings } from "@/lib/app-settings";
import { track } from "@/lib/analytics";
import { ThemeModeTabs } from "@/components/settings/theme-mode-tabs";
import { hapticSelection } from "@/lib/haptics";
import {
  getNotificationPermissionGrantedAsync,
  openSystemNotificationSettings,
  syncSubscriptionNotifications,
} from "@/lib/subscription-notifications";
import { seedScreenshotSubscriptions } from "@/lib/subscription-store";
import { useFocusEffect } from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import { Button, ListGroup, Separator, Switch } from "heroui-native";
import { BellIcon, FlaskConicalIcon, HandIcon, SunIcon } from "lucide-uniwind";
import {
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { Alert, ScrollView, Text, View } from "react-native";

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: string | number; className?: string }>;
  suffix?: ReactNode;
  onPress?: () => void;
}

interface SettingSection {
  id: string;
  title: string;
  items: SettingItem[];
}

export default function SettingsRoute() {
  const router = useRouter();
  const {
    notificationsEnabled,
    setNotificationsEnabled,
    setHasCompletedOnboarding,
  } = useAppSettings();
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] =
    useState<boolean | null>(null);
  const [isSeedingScreenshotData, setIsSeedingScreenshotData] = useState(false);

  const loadNotificationPermission = useCallback(async () => {
    const nextGranted = await getNotificationPermissionGrantedAsync();
    setIsNotificationPermissionGranted(nextGranted);

    if (!nextGranted && notificationsEnabled) {
      setNotificationsEnabled(false);
      await syncSubscriptionNotifications(false);
    }
  }, [notificationsEnabled, setNotificationsEnabled]);

  useFocusEffect(
    useCallback(() => {
      void loadNotificationPermission();
    }, [loadNotificationPermission]),
  );

  const handleNotificationsEnabledChange = useCallback(
    async (nextEnabled: boolean) => {
      setNotificationsEnabled(nextEnabled);
      await syncSubscriptionNotifications(nextEnabled);
      track("notification_setting_changed", {
        notification_enabled: nextEnabled,
      });
    },
    [setNotificationsEnabled],
  );

  const handleSeedScreenshotData = useCallback(async () => {
    setIsSeedingScreenshotData(true);

    try {
      await seedScreenshotSubscriptions();
      await syncSubscriptionNotifications(notificationsEnabled);

      Alert.alert("완료", "스크린샷용 데이터를 채웠어요.", [
        {
          text: "홈으로 이동",
          onPress: () => {
            router.replace("/");
          },
        },
      ]);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "스크린샷용 데이터를 채우지 못했습니다.";

      Alert.alert("오류", message);
    } finally {
      setIsSeedingScreenshotData(false);
    }
  }, [notificationsEnabled, router]);

  const handleSeedScreenshotDataPress = useCallback(() => {
    Alert.alert(
      "스크린샷 데이터 채우기",
      "현재 구독과 통계를 지우고 샘플 데이터로 교체할까요?",
      [
        { text: "취소", style: "cancel" },
        {
          text: "교체하기",
          style: "destructive",
          onPress: () => {
            void handleSeedScreenshotData();
          },
        },
      ],
    );
  }, [handleSeedScreenshotData]);

  const sections = useMemo<SettingSection[]>(
    () => [
      {
        id: "notifications",
        title: "알림",
        items: [
          {
            id: "billing-reminders",
            title: "알림",
            description:
              isNotificationPermissionGranted === false
                ? "시스템 설정에서 알림을 허용해주세요."
                : "",
            icon: BellIcon,
            onPress:
              isNotificationPermissionGranted === false
                ? () => {
                    void openSystemNotificationSettings();
                  }
                : undefined,
            suffix:
              isNotificationPermissionGranted === false ? undefined : (
                <Switch
                  isSelected={notificationsEnabled}
                  isDisabled={isNotificationPermissionGranted == null}
                  onPressIn={hapticSelection}
                  onSelectedChange={(nextSelected) => {
                    void handleNotificationsEnabledChange(nextSelected);
                  }}
                >
                  <Switch.Thumb
                    animation={{
                      backgroundColor: {
                        value: ["#ffffff", "#ffffff"],
                      },
                    }}
                  />
                </Switch>
              ),
          },
        ],
      },
      {
        id: "appearance",
        title: "외관",
        items: [
          {
            id: "theme",
            title: "화면 모드",
            icon: SunIcon,
            suffix: <ThemeModeTabs />,
          },
        ],
      },
      {
        id: "subscriptions",
        title: "구독",
        items: [
          {
            id: "category-management",
            title: "카테고리 관리",
            description: "직접 만든 카테고리를 추가하고 정리합니다.",
            onPress: () => {
              router.push("/settings/categories");
            },
          },
        ],
      },
      {
        id: "about",
        title: "앱 안내",
        items: [
          {
            id: "onboarding",
            title: "온보딩 다시 보기",
            description: "앱 소개 화면을 처음부터 다시 확인합니다.",
            onPress: () => {
              track("onboarding_reopened");
              setHasCompletedOnboarding(false);
              router.replace("/onboarding");
            },
          },
        ],
      },
      ...(__DEV__
        ? [
            {
              id: "development",
              title: "개발",
              items: [
                {
                  id: "haptics-test",
                  title: "햅틱 테스트",
                  description: "햅틱 종류별 동작을 빠르게 확인합니다.",
                  icon: HandIcon,
                  onPress: () => {
                    router.push("/dev/haptics");
                  },
                },
                {
                  id: "notification-test",
                  title: "알림 테스트",
                  description: "단건/묶음 알림과 실제 예약 상태를 확인합니다.",
                  icon: FlaskConicalIcon,
                  onPress: () => {
                    router.push("/dev/notifications");
                  },
                },
                {
                  id: "screenshot-seed",
                  title: "스크린샷 데이터",
                  description: "현재 구독을 지우고 샘플 데이터를 채웁니다.",
                  icon: FlaskConicalIcon,
                  suffix: (
                    <Button
                      variant="secondary"
                      size="sm"
                      isDisabled={isSeedingScreenshotData}
                      onPressIn={hapticSelection}
                      onPress={handleSeedScreenshotDataPress}
                    >
                      <Button.Label>
                        {isSeedingScreenshotData ? "채우는 중" : "채우기"}
                      </Button.Label>
                    </Button>
                  ),
                },
              ],
            },
          ]
        : []),
    ],
    [
      handleSeedScreenshotDataPress,
      handleNotificationsEnabledChange,
      isNotificationPermissionGranted,
      isSeedingScreenshotData,
      notificationsEnabled,
      router,
      setHasCompletedOnboarding,
    ],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "설정",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {sections.map((section) => (
          <View key={section.id} className="mt-6 first:mt-0">
            <Text className="text-sm text-muted mb-2 ml-2">
              {section.title}
            </Text>
            <ListGroup className="shadow-lg shadow-neutral-300/10 dark:shadow-none px-1.5">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                const isRowPressable = item.onPress != null;
                const shouldRenderSuffix =
                  isRowPressable || item.suffix != null;

                return (
                  <View key={item.id}>
                    <ListGroup.Item
                      disabled={!isRowPressable}
                      onPress={item.onPress}
                      onPressIn={isRowPressable ? hapticSelection : undefined}
                    >
                      {Icon && (
                        <ListGroup.ItemPrefix>
                          <Icon
                            size={18}
                            className="opacity-80 text-black dark:text-white"
                          />
                        </ListGroup.ItemPrefix>
                      )}

                      <ListGroup.ItemContent>
                        <ListGroup.ItemTitle>{item.title}</ListGroup.ItemTitle>
                        {item.description && (
                          <ListGroup.ItemDescription>
                            {item.description}
                          </ListGroup.ItemDescription>
                        )}
                      </ListGroup.ItemContent>

                      {shouldRenderSuffix ? (
                        <ListGroup.ItemSuffix>
                          {item.suffix}
                        </ListGroup.ItemSuffix>
                      ) : null}
                    </ListGroup.Item>

                    {index < section.items.length - 1 && (
                      <Separator className="opacity-40" />
                    )}
                  </View>
                );
              })}
            </ListGroup>
          </View>
        ))}

        <View className="flex justify-center items-center mt-14">
          <Text className="opacity-50 text-black dark:text-white">
            버전 0.8.3
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
