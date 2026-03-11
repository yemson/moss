import { getSubscriptionTemplate } from "@/lib/subscription-templates";
import { clsx } from "clsx";
import { Image } from "expo-image";
import { Text, View } from "react-native";

interface SubscriptionServiceBadgeProps {
  name: string;
  templateKey?: string | null;
  size?: "sm" | "card" | "hero";
}

function getSubscriptionInitial(name: string) {
  const trimmedName = name.trim();
  const firstCharacter = Array.from(trimmedName)[0] ?? "?";

  return /^[a-z]$/i.test(firstCharacter)
    ? firstCharacter.toUpperCase()
    : firstCharacter;
}

function getSizeStyles(size: "sm" | "card" | "hero") {
  switch (size) {
    case "sm":
      return {
        container: "h-10 w-10 rounded-xl",
        text: "text-base",
      } as const;
    case "hero":
      return {
        container: "h-20 w-20 rounded-3xl",
        text: "text-4xl",
      } as const;
    default:
      return {
        container: "h-13 w-13 rounded-2xl",
        text: "text-lg",
      } as const;
  }
}

export function SubscriptionServiceBadge({
  name,
  templateKey,
  size = "card",
}: SubscriptionServiceBadgeProps) {
  const template = getSubscriptionTemplate(templateKey);
  const styles = getSizeStyles(size);

  if (template?.logo) {
    return (
      <View
        className={clsx(
          "items-center justify-center overflow-hidden",
          styles.container,
          "bg-white",
        )}
      >
        <Image
          source={template.logo}
          style={{ width: "100%", height: "100%" }}
          contentFit={template.logoContentFit ?? "cover"}
          cachePolicy="memory-disk"
          transition={0}
        />
      </View>
    );
  }

  return (
    <View
      className={clsx(
        "items-center justify-center bg-surface-secondary",
        styles.container,
      )}
    >
      <Text className={clsx("font-bold text-surface-foreground", styles.text)}>
        {getSubscriptionInitial(name)}
      </Text>
    </View>
  );
}
