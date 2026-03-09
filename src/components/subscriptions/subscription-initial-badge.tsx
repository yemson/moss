import { clsx } from "clsx";
import { Text, View } from "react-native";

interface SubscriptionInitialBadgeProps {
  name: string;
  size?: "card" | "hero";
}

function getSubscriptionInitial(name: string) {
  const trimmedName = name.trim();
  const firstCharacter = Array.from(trimmedName)[0] ?? "?";

  return /^[a-z]$/i.test(firstCharacter)
    ? firstCharacter.toUpperCase()
    : firstCharacter;
}

export function SubscriptionInitialBadge({
  name,
  size = "card",
}: SubscriptionInitialBadgeProps) {
  const isHero = size === "hero";

  return (
    <View
      className={clsx(
        "items-center justify-center bg-surface-secondary",
        isHero ? "h-20 w-20 rounded-3xl" : "h-13 w-13 rounded-2xl",
      )}
    >
      <Text
        className={clsx(
          "font-bold text-surface-foreground",
          isHero ? "text-4xl" : "text-lg",
        )}
      >
        {getSubscriptionInitial(name)}
      </Text>
    </View>
  );
}
