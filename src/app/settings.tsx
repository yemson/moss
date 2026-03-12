import { useAppSettings } from "@/lib/app-settings";
import { ThemeModeTabs } from "@/components/settings/theme-mode-tabs";
import { hapticSelection } from "@/lib/haptics";
import {
  getNotificationPermissionGrantedAsync,
  openSystemNotificationSettings,
  syncSubscriptionNotifications,
} from "@/lib/subscription-notifications";
import { useFocusEffect } from "@react-navigation/native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useRouter } from "expo-router";
import { Button, ListGroup, Separator, Switch } from "heroui-native";
import {
  BellIcon,
  FlaskConicalIcon,
  HandIcon,
  SunIcon,
} from "lucide-uniwind";
import {
  useCallback,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import { ScrollView, Text, View } from "react-native";

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: string | number; className?: string }>;
  suffix?: ReactNode;
}

interface SettingSection {
  id: string;
  title: string;
  items: SettingItem[];
}

export default function SettingsRoute() {
  const router = useRouter();
  const headerHeight = useHeaderHeight();
  const { notificationsEnabled, setNotificationsEnabled } = useAppSettings();
  const [isNotificationPermissionGranted, setIsNotificationPermissionGranted] =
    useState<boolean | null>(null);

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
    },
    [setNotificationsEnabled],
  );

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
            suffix:
              isNotificationPermissionGranted === false ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onPressIn={hapticSelection}
                  onPress={() => {
                    void openSystemNotificationSettings();
                  }}
                >
                  <Button.Label>설정 열기</Button.Label>
                </Button>
              ) : (
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
                  suffix: (
                    <Button
                      variant="secondary"
                      size="sm"
                      onPressIn={hapticSelection}
                      onPress={() => {
                        router.push("/dev/haptics");
                      }}
                    >
                      <Button.Label>열기</Button.Label>
                    </Button>
                  ),
                },
                {
                  id: "notification-test",
                  title: "알림 테스트",
                  description: "단건/묶음 알림과 실제 예약 상태를 확인합니다.",
                  icon: FlaskConicalIcon,
                  suffix: (
                    <Button
                      variant="secondary"
                      size="sm"
                      onPressIn={hapticSelection}
                      onPress={() => {
                        router.push("/dev/notifications");
                      }}
                    >
                      <Button.Label>열기</Button.Label>
                    </Button>
                  ),
                },
              ],
            },
          ]
        : []),
    ],
    [
      handleNotificationsEnabledChange,
      isNotificationPermissionGranted,
      notificationsEnabled,
      router,
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
        style={{ paddingTop: headerHeight + 15 }}
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
                return (
                  <View key={item.id}>
                    <ListGroup.Item>
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

                      <ListGroup.ItemSuffix>
                        {item.suffix ?? null}
                      </ListGroup.ItemSuffix>
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
