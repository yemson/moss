import { hapticSelection } from "@/lib/haptics";
import { Button, Select } from "heroui-native";
import { ArrowUpDownIcon } from "lucide-uniwind";
import { View } from "react-native";

interface SubscriptionSortSelectProps {
  value: { value: string; label: string };
  options: readonly { value: string; label: string }[];
  onValueChange: (option: { value: string; label: string }) => void;
}

export function SubscriptionSortSelect({
  value,
  options,
  onValueChange,
}: SubscriptionSortSelectProps) {
  return (
    <Select
      value={value}
      onValueChange={(nextValue) => {
        if (Array.isArray(nextValue) || nextValue == null) {
          return;
        }

        if (nextValue.value === value.value) {
          return;
        }

        hapticSelection();
        onValueChange(nextValue);
      }}
    >
      <Select.Trigger variant="unstyled" asChild>
        <Button
          isIconOnly
          size="sm"
          variant="primary"
          className="rounded-full shrink-0"
          onPressIn={hapticSelection}
        >
          <ArrowUpDownIcon size={16} className="text-white" />
        </Button>
      </Select.Trigger>
      <Select.Portal>
        <Select.Overlay />
        <Select.Content
          presentation="popover"
          placement="bottom"
          align="end"
          width={176}
        >
          {options.map((option) => (
            <Select.Item key={option.value} value={option.value} label={option.label}>
              <View className="flex-1">
                <Select.ItemLabel />
              </View>
              <Select.ItemIndicator />
            </Select.Item>
          ))}
        </Select.Content>
      </Select.Portal>
    </Select>
  );
}
