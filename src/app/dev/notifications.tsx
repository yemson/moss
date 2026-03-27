import { useAppSettings } from "@/lib/app-settings";
import { hapticSelection } from "@/lib/haptics";
import {
  BILLING_REMINDER_WINDOW_DAYS,
  cancelProductionBillingReminderNotifications,
  cancelTestBillingReminderNotifications,
  getBillingReminderDebugSnapshot,
  listManagedBillingReminderNotifications,
  scheduleTestBillingReminder,
  syncSubscriptionNotifications,
  type BillingReminderDebugSnapshot,
  type ManagedBillingReminderNotification,
} from "@/lib/subscription-notifications";
import { useFocusEffect } from "@react-navigation/native";
import { Stack } from "expo-router";
import { Button, Separator } from "heroui-native";
import { useCallback, useMemo, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

function formatDateTime(date: Date | null) {
  if (!date) {
    return "시간 정보 없음";
  }

  return date.toLocaleString("ko-KR", {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function NotificationList({
  title,
  notifications,
  emptyText,
}: {
  title: string;
  notifications: ManagedBillingReminderNotification[];
  emptyText: string;
}) {
  return (
    <View className="gap-2">
      <Text className="text-xs text-muted">{title}</Text>
      {notifications.length === 0 ? (
        <Text className="text-sm text-muted">{emptyText}</Text>
      ) : (
        notifications.map((notification) => (
          <View
            key={notification.identifier}
            className="rounded-2xl bg-surface px-4 py-3 gap-1"
          >
            <Text className="text-xs text-muted">
              {formatDateTime(notification.triggerDate)}
            </Text>
            <Text className="font-semibold dark:text-white">
              {notification.title ?? "제목 없음"}
            </Text>
            <Text className="text-sm dark:text-white">
              {notification.body ?? "본문 없음"}
            </Text>
          </View>
        ))
      )}
    </View>
  );
}

export default function DevNotificationsRoute() {
  const { notificationsEnabled } = useAppSettings();
  const [snapshot, setSnapshot] = useState<BillingReminderDebugSnapshot | null>(
    null,
  );
  const [productionNotifications, setProductionNotifications] = useState<
    ManagedBillingReminderNotification[]
  >([]);
  const [testNotifications, setTestNotifications] = useState<
    ManagedBillingReminderNotification[]
  >([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isRunningAction, setIsRunningAction] = useState(false);

  const loadDebugState = useCallback(async () => {
    try {
      setIsRefreshing(true);

      const [nextSnapshot, nextProduction, nextTest] = await Promise.all([
        getBillingReminderDebugSnapshot(notificationsEnabled),
        listManagedBillingReminderNotifications("production"),
        listManagedBillingReminderNotifications("test"),
      ]);

      setSnapshot(nextSnapshot);
      setProductionNotifications(nextProduction);
      setTestNotifications(nextTest);
    } catch (error) {
      console.error("Failed to load notification debug state:", error);
      Alert.alert("오류", "알림 테스트 정보를 불러오지 못했습니다.");
    } finally {
      setIsRefreshing(false);
    }
  }, [notificationsEnabled]);

  useFocusEffect(
    useCallback(() => {
      void loadDebugState();
    }, [loadDebugState]),
  );

  const runAction = useCallback(
    async (action: () => Promise<void>, successMessage: string) => {
      if (isRunningAction) {
        return;
      }

      try {
        setIsRunningAction(true);
        await action();
        await loadDebugState();
        Alert.alert("완료", successMessage);
      } catch (error) {
        console.error("Failed to run notification debug action:", error);
        Alert.alert("오류", "알림 테스트 작업을 완료하지 못했습니다.");
      } finally {
        setIsRunningAction(false);
      }
    },
    [isRunningAction, loadDebugState],
  );

  const nextGroups = useMemo(() => snapshot?.groups.slice(0, 5) ?? [], [snapshot]);

  return (
    <>
      <Stack.Screen options={{ title: "알림 테스트" }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 px-4"
        contentContainerClassName="gap-4 py-5 pb-10"
      >
        <Text className="text-sm text-muted">
          단건/묶음 알림을 바로 보내고, 실제 예약 상태도 함께 확인합니다.
        </Text>

        <View className="gap-2 rounded-2xl bg-surface px-4 py-4">
          <Text className="font-semibold dark:text-white">현재 상태</Text>
          <Text className="text-sm dark:text-white">
            전역 알림: {notificationsEnabled ? "ON" : "OFF"}
          </Text>
          <Text className="text-sm dark:text-white">
            권한: {snapshot?.permissionGranted ? "허용" : "거부 또는 미확인"}
          </Text>
          <Text className="text-sm dark:text-white">
            활성 구독: {snapshot?.activeSubscriptions.length ?? 0}개
          </Text>
          <Text className="text-sm dark:text-white">
            알림 설정 구독: {snapshot?.eligibleSubscriptions.length ?? 0}개
          </Text>
          <Text className="text-sm dark:text-white">
            예약 가능 상태: {snapshot?.canSchedule ? "가능" : "불가"}
          </Text>
          <Text className="text-sm dark:text-white">
            {BILLING_REMINDER_WINDOW_DAYS}일 내 집계 그룹:{" "}
            {snapshot?.groups.length ?? 0}개
          </Text>
          <Text className="text-xs text-muted">
            {isRefreshing ? "새로고침 중..." : "포커스 시 자동으로 새로고침됩니다."}
          </Text>
        </View>

        <Separator className="opacity-40" />

        <View className="gap-3">
          <Text className="text-xs text-muted">빠른 테스트</Text>
          <Text className="text-sm text-muted">
            버튼을 누르면 1초 뒤 실제 로컬 알림이 표시됩니다.
          </Text>
          <Button
            variant="primary"
            isDisabled={isRunningAction}
            onPressIn={hapticSelection}
            onPress={() => {
              void runAction(
                async () => {
                  await scheduleTestBillingReminder(["Netflix"]);
                },
                "단건 테스트 알림을 예약했습니다.",
              );
            }}
          >
            <Button.Label>1건 보내기</Button.Label>
          </Button>
          <Button
            variant="secondary"
            isDisabled={isRunningAction}
            onPressIn={hapticSelection}
            onPress={() => {
              void runAction(
                async () => {
                  await scheduleTestBillingReminder([
                    "Netflix",
                    "YouTube Premium",
                    "iCloud+",
                  ]);
                },
                "묶음 테스트 알림을 예약했습니다.",
              );
            }}
          >
            <Button.Label>3건 묶음 보내기</Button.Label>
          </Button>
          <Button
            variant="outline"
            isDisabled={isRunningAction}
            onPressIn={hapticSelection}
            onPress={() => {
              void runAction(
                () => cancelTestBillingReminderNotifications(),
                "테스트 알림을 모두 취소했습니다.",
              );
            }}
          >
            <Button.Label>테스트 알림 모두 취소</Button.Label>
          </Button>
        </View>

        <Separator className="opacity-40" />

        <View className="gap-3">
          <Text className="text-xs text-muted">실제 구독 기준 미리보기</Text>
          {nextGroups.length === 0 ? (
            <Text className="text-sm text-muted">
              현재 조건에 맞는 실제 예약 그룹이 없습니다.
            </Text>
          ) : (
            nextGroups.map((group) => (
              <View
                key={group.identifier}
                className="rounded-2xl bg-surface px-4 py-3 gap-1"
              >
                <Text className="text-xs text-muted">
                  {formatDateTime(group.triggerDate)}
                </Text>
                <Text className="font-semibold dark:text-white">
                  {group.body}
                </Text>
                <Text className="text-xs text-muted">
                  {group.subscriptions
                    .map((subscription) => subscription.name)
                    .join(", ")}
                </Text>
              </View>
            ))
          )}
          <Button
            variant="secondary"
            isDisabled={isRunningAction}
            onPressIn={hapticSelection}
            onPress={() => {
              void runAction(
                () => syncSubscriptionNotifications(notificationsEnabled),
                "실제 알림 예약을 다시 계산했습니다.",
              );
            }}
          >
            <Button.Label>실제 알림 다시 예약</Button.Label>
          </Button>
          <Button
            variant="outline"
            isDisabled={isRunningAction}
            onPressIn={hapticSelection}
            onPress={() => {
              void runAction(
                () => cancelProductionBillingReminderNotifications(),
                "실제 알림 예약을 모두 취소했습니다.",
              );
            }}
          >
            <Button.Label>실제 알림 모두 취소</Button.Label>
          </Button>
          <Button
            variant="secondary"
            isDisabled={isRunningAction || isRefreshing}
            onPressIn={hapticSelection}
            onPress={() => {
              void loadDebugState();
            }}
          >
            <Button.Label>상태 새로고침</Button.Label>
          </Button>
        </View>

        <Separator className="opacity-40" />

        <NotificationList
          title="실제 예약 목록"
          notifications={productionNotifications}
          emptyText="현재 예약된 실제 알림이 없습니다."
        />

        <Separator className="opacity-40" />

        <NotificationList
          title="테스트 예약 목록"
          notifications={testNotifications}
          emptyText="현재 예약된 테스트 알림이 없습니다."
        />
      </ScrollView>
    </>
  );
}
