import { Text, View } from "react-native";

interface SubscriptionStatisticsSummaryTileProps {
  label: string;
  value: string;
  tone?: "default" | "success";
}

export function SubscriptionStatisticsSummaryTile({
  label,
  value,
  tone = "default",
}: SubscriptionStatisticsSummaryTileProps) {
  return (
    <View className="min-w-0 flex-1 rounded-3xl bg-surface px-4 py-4 shadow-lg shadow-neutral-300/10 dark:shadow-none">
      <Text className="text-sm text-foreground/50">{label}</Text>
      <Text
        className={`mt-2 text-xl font-bold ${
          tone === "success" ? "text-success" : "text-black dark:text-white"
        }`}
        numberOfLines={1}
      >
        {value}
      </Text>
    </View>
  );
}
