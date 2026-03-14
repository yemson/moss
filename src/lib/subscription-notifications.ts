import type { AppSettings } from "@/lib/app-settings";
import {
  listSubscriptions,
  listUpcomingBillingDates,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import {
  IosAuthorizationStatus,
  PermissionStatus,
  SchedulableTriggerInputTypes,
} from "expo-notifications";
import * as Notifications from "expo-notifications";
import { Linking } from "react-native";

export const BILLING_REMINDER_WINDOW_DAYS = 60;

const BILLING_REMINDER_NOTIFICATION_PREFIX = "moss.billing-reminder.";
const TEST_BILLING_REMINDER_NOTIFICATION_PREFIX =
  "moss.test.billing-reminder.";
const BILLING_REMINDER_NOTIFICATION_TYPE = "billing-reminder";
const BILLING_REMINDER_HOUR = 10;
const BILLING_REMINDER_NOTIFICATION_TITLE = "내일 결제 예정";
const TEST_BILLING_REMINDER_NOTIFICATION_TITLE = "알림 테스트";

type BillingReminderNotificationKind = "production" | "test";

export interface BillingReminderGroupPreview {
  identifier: string;
  triggerDate: Date;
  subscriptions: SubscriptionWithCategory[];
  body: string;
}

export interface BillingReminderDebugSnapshot {
  permissionGranted: boolean;
  canSchedule: boolean;
  activeSubscriptions: SubscriptionWithCategory[];
  eligibleSubscriptions: SubscriptionWithCategory[];
  groups: BillingReminderGroupPreview[];
}

export interface ManagedBillingReminderNotification {
  identifier: string;
  kind: BillingReminderNotificationKind;
  title: string | null;
  body: string | null;
  triggerDate: Date | null;
}

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function isNotificationPermissionGranted(
  status: Notifications.NotificationPermissionsStatus,
) {
  return (
    status.status === PermissionStatus.GRANTED ||
    status.granted ||
    status.ios?.status === IosAuthorizationStatus.PROVISIONAL
  );
}

function getNotificationPrefix(kind: BillingReminderNotificationKind) {
  return kind === "test"
    ? TEST_BILLING_REMINDER_NOTIFICATION_PREFIX
    : BILLING_REMINDER_NOTIFICATION_PREFIX;
}

function getNotificationTitle(kind: BillingReminderNotificationKind) {
  return kind === "test"
    ? TEST_BILLING_REMINDER_NOTIFICATION_TITLE
    : BILLING_REMINDER_NOTIFICATION_TITLE;
}

function parseYmdToLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getReminderTriggerDate(billingDate: string) {
  const triggerDate = parseYmdToLocalDate(billingDate);
  triggerDate.setDate(triggerDate.getDate() - 1);
  triggerDate.setHours(BILLING_REMINDER_HOUR, 0, 0, 0);
  return triggerDate;
}

function buildReminderIdentifier(
  triggerDate: Date,
  kind: BillingReminderNotificationKind,
) {
  const prefix = getNotificationPrefix(kind);
  const year = triggerDate.getFullYear();
  const month = String(triggerDate.getMonth() + 1).padStart(2, "0");
  const day = String(triggerDate.getDate()).padStart(2, "0");
  return `${prefix}${year}-${month}-${day}`;
}

export function buildBillingReminderBody(names: string[]) {
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b, "ko"));
  const [firstName] = sortedNames;

  if (!firstName) {
    return "내일 결제될 예정인 구독이 있습니다.";
  }

  if (sortedNames.length === 1) {
    return `${firstName}가 내일 결제될 예정입니다.`;
  }

  return `${firstName} 외 ${sortedNames.length - 1}개의 구독이 내일 결제될 예정입니다.`;
}

function buildReminderBody(subscriptions: SubscriptionWithCategory[]) {
  return buildBillingReminderBody(subscriptions.map((subscription) => subscription.name));
}

function buildReminderGroups(
  subscriptions: SubscriptionWithCategory[],
  now: Date,
  kind: BillingReminderNotificationKind,
) {
  const rangeEndDate = new Date(now);
  rangeEndDate.setDate(rangeEndDate.getDate() + BILLING_REMINDER_WINDOW_DAYS);

  const groupedSubscriptions = new Map<
    string,
    { triggerDate: Date; subscriptions: SubscriptionWithCategory[] }
  >();

  for (const subscription of subscriptions) {
    const upcomingBillingDates = listUpcomingBillingDates(
      subscription.billingDate,
      subscription.billingCycle,
      rangeEndDate,
      now,
    );

    for (const billingDate of upcomingBillingDates) {
      const triggerDate = getReminderTriggerDate(billingDate);
      if (triggerDate.getTime() <= now.getTime()) {
        continue;
      }

      const identifier = buildReminderIdentifier(triggerDate, kind);
      const existingGroup = groupedSubscriptions.get(identifier);

      if (existingGroup) {
        existingGroup.subscriptions.push(subscription);
        continue;
      }

      groupedSubscriptions.set(identifier, {
        triggerDate,
        subscriptions: [subscription],
      });
    }
  }

  return [...groupedSubscriptions.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([identifier, group]) => ({
      identifier,
      triggerDate: group.triggerDate,
      subscriptions: group.subscriptions,
      body: buildReminderBody(group.subscriptions),
    }));
}

function parseNotificationTriggerDate(
  trigger: Notifications.NotificationTrigger | null,
) {
  if (!trigger || typeof trigger !== "object") {
    return null;
  }

  const candidate = trigger as {
    date?: Date | number | string;
    value?: Date | number | string;
  };
  const rawDate = candidate.date ?? candidate.value;

  if (!rawDate) {
    return null;
  }

  const nextDate =
    rawDate instanceof Date ? rawDate : new Date(rawDate);

  return Number.isNaN(nextDate.getTime()) ? null : nextDate;
}

async function cancelManagedNotifications(kind: BillingReminderNotificationKind) {
  const managedNotifications = await listManagedBillingReminderNotifications(
    kind,
  );

  await Promise.all(
    managedNotifications.map((notification) =>
      Notifications.cancelScheduledNotificationAsync(notification.identifier),
    ),
  );
}

async function scheduleReminderGroup(
  group: BillingReminderGroupPreview,
  kind: BillingReminderNotificationKind,
) {
  await Notifications.scheduleNotificationAsync({
    identifier: group.identifier,
    content: {
      title: getNotificationTitle(kind),
      body: group.body,
      data: {
        type: BILLING_REMINDER_NOTIFICATION_TYPE,
        href: "/",
      },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: group.triggerDate,
    },
  });
}

export async function getNotificationPermissionGrantedAsync() {
  const permissions = await Notifications.getPermissionsAsync();
  return isNotificationPermissionGranted(permissions);
}

export async function initializeNotificationsOnAppStart(
  settings: AppSettings,
): Promise<AppSettings> {
  const existingPermissions = await Notifications.getPermissionsAsync();
  const isGranted = isNotificationPermissionGranted(existingPermissions);

  if (settings.notificationsPermissionPrompted) {
    return isGranted
      ? settings
      : {
          ...settings,
          notificationsEnabled: false,
        };
  }

  let nextIsGranted = isGranted;

  if (!nextIsGranted) {
    const requestedPermissions = await Notifications.requestPermissionsAsync();
    nextIsGranted = isNotificationPermissionGranted(requestedPermissions);
  }

  return {
    ...settings,
    notificationsEnabled: nextIsGranted,
    notificationsPermissionPrompted: true,
  };
}

export async function openSystemNotificationSettings() {
  await Linking.openSettings();
}

export async function getBillingReminderDebugSnapshot(
  notificationsEnabled: boolean,
  now: Date = new Date(),
): Promise<BillingReminderDebugSnapshot> {
  const permissionGranted = await getNotificationPermissionGrantedAsync();
  const activeSubscriptions = await listSubscriptions({ isActive: true });
  const eligibleSubscriptions = activeSubscriptions.filter(
    (subscription) => subscription.notifyDayBefore,
  );
  const groups = buildReminderGroups(
    eligibleSubscriptions,
    now,
    "production",
  );

  return {
    permissionGranted,
    canSchedule: permissionGranted && notificationsEnabled,
    activeSubscriptions,
    eligibleSubscriptions,
    groups,
  };
}

export async function listManagedBillingReminderNotifications(
  kind?: BillingReminderNotificationKind,
): Promise<ManagedBillingReminderNotification[]> {
  const notifications =
    await Notifications.getAllScheduledNotificationsAsync();

  return notifications
    .filter((notification) => {
      if (!kind) {
        return (
          notification.identifier.startsWith(
            BILLING_REMINDER_NOTIFICATION_PREFIX,
          ) ||
          notification.identifier.startsWith(
            TEST_BILLING_REMINDER_NOTIFICATION_PREFIX,
          )
        );
      }

      return notification.identifier.startsWith(getNotificationPrefix(kind));
    })
    .map((notification) => ({
      identifier: notification.identifier,
      kind: (
        notification.identifier.startsWith(
          TEST_BILLING_REMINDER_NOTIFICATION_PREFIX,
        )
          ? "test"
          : "production"
      ) as BillingReminderNotificationKind,
      title: notification.content.title ?? null,
      body: notification.content.body ?? null,
      triggerDate: parseNotificationTriggerDate(notification.trigger),
    }))
    .sort((a, b) => {
      const aTime = a.triggerDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const bTime = b.triggerDate?.getTime() ?? Number.MAX_SAFE_INTEGER;

      if (aTime !== bTime) {
        return aTime - bTime;
      }

      return a.identifier.localeCompare(b.identifier);
    });
}

export async function cancelProductionBillingReminderNotifications() {
  await cancelManagedNotifications("production");
}

export async function cancelTestBillingReminderNotifications() {
  await cancelManagedNotifications("test");
}

export async function scheduleTestBillingReminder(
  names: string[],
  delaySeconds = 1,
) {
  const triggerDate = new Date(Date.now() + delaySeconds * 1000);
  const identifier = `${TEST_BILLING_REMINDER_NOTIFICATION_PREFIX}${Date.now()}`;

  await Notifications.scheduleNotificationAsync({
    identifier,
    content: {
      title: TEST_BILLING_REMINDER_NOTIFICATION_TITLE,
      body: buildBillingReminderBody(names),
      data: {
        type: BILLING_REMINDER_NOTIFICATION_TYPE,
        href: "/",
      },
    },
    trigger: {
      type: SchedulableTriggerInputTypes.DATE,
      date: triggerDate,
    },
  });

  return identifier;
}

export async function syncSubscriptionNotifications(
  notificationsEnabled: boolean,
) {
  await cancelManagedNotifications("production");

  if (
    !notificationsEnabled ||
    !(await getNotificationPermissionGrantedAsync())
  ) {
    return;
  }

  const subscriptions = await listSubscriptions({ isActive: true });
  const eligibleSubscriptions = subscriptions.filter(
    (subscription) => subscription.notifyDayBefore,
  );
  const groups = buildReminderGroups(
    eligibleSubscriptions,
    new Date(),
    "production",
  );

  for (const group of groups) {
    await scheduleReminderGroup(group, "production");
  }
}

export function isBillingReminderNotification(
  notificationData: Record<string, unknown> | undefined,
) {
  return notificationData?.type === BILLING_REMINDER_NOTIFICATION_TYPE;
}
