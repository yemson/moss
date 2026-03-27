import { hapticSelection } from "@/lib/haptics";
import {
  NOTIFICATION_LEAD_DAY_OPTIONS,
  normalizeNotificationLeadDays,
} from "@/lib/subscription-reminders";
import { Select, Separator } from "heroui-native";
import { Fragment, useMemo } from "react";
import { Text, View } from "react-native";

interface SubscriptionNotificationLeadDaySelectorProps {
  selectedLeadDays: number[];
  onSelectionChange: (nextLeadDays: number[]) => void;
}

export function SubscriptionNotificationLeadDaySelector({
  selectedLeadDays,
  onSelectionChange,
}: SubscriptionNotificationLeadDaySelectorProps) {
  const selectedOptions = useMemo(
    () =>
      NOTIFICATION_LEAD_DAY_OPTIONS.filter((option) =>
        selectedLeadDays.includes(option.value),
      ).map((option) => ({
        value: String(option.value),
        label: option.label,
      })),
    [selectedLeadDays],
  );

  return (
    <Select
      selectionMode="multiple"
      value={selectedOptions}
      onValueChange={(nextValue) => {
        if (!Array.isArray(nextValue)) {
          return;
        }

        hapticSelection();
        onSelectionChange(
          normalizeNotificationLeadDays(
            nextValue
              .filter(
                (
                  option,
                ): option is { value: string; label: string } => option != null,
              )
              .map((option) => Number(option.value)),
          ),
        );
      }}
    >
      <Select.Trigger className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none">
        <View className="min-w-0 flex-1 flex-row flex-wrap gap-2 py-1">
          {selectedOptions.length === 0 ? (
            <Text className="text-field-placeholder">알림 날짜 선택</Text>
          ) : (
            selectedOptions.map((option) => (
              <View
                key={option.value}
                className="rounded-full bg-surface-secondary px-2.5 py-1"
              >
                <Text className="text-sm font-medium text-black dark:text-white">
                  {option.label}
                </Text>
              </View>
            ))
          )}
        </View>
        <Select.TriggerIndicator />
      </Select.Trigger>
      <Select.Portal>
        <Select.Overlay className="bg-black/20 dark:bg-black/40" />
        <Select.Content
          presentation="popover"
          width="trigger"
          placement="bottom"
          align="end"
        >
          {NOTIFICATION_LEAD_DAY_OPTIONS.map((option, index) => (
            <Fragment key={option.value}>
              <Select.Item value={String(option.value)} label={option.label}>
                <View className="flex-1">
                  <Select.ItemLabel />
                </View>
                <Select.ItemIndicator />
              </Select.Item>
              {index < NOTIFICATION_LEAD_DAY_OPTIONS.length - 1 ? (
                <Separator className="opacity-40" />
              ) : null}
            </Fragment>
          ))}
        </Select.Content>
      </Select.Portal>
    </Select>
  );
}
