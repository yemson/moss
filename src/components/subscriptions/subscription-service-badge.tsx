import { getSubscriptionTemplate } from "@/lib/subscription-templates";
import { clsx } from "clsx";
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
        logo: 22,
      } as const;
    case "hero":
      return {
        container: "h-20 w-20 rounded-3xl",
        text: "text-4xl",
        logo: 48,
      } as const;
    default:
      return {
        container: "h-13 w-13 rounded-2xl",
        text: "text-lg",
        logo: 28,
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

  if (template) {
    const Logo = template.Logo;

    return (
      <View
        className={clsx(
          "items-center justify-center overflow-hidden",
          styles.container,
          template.badgeClassName,
        )}
      >
        <Logo size={styles.logo} />
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
      <Text
        className={clsx(
          "font-bold text-surface-foreground",
          styles.text,
        )}
      >
        {getSubscriptionInitial(name)}
      </Text>
    </View>
  );
}
