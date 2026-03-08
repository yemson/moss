import * as Haptics from "expo-haptics";
import { Vibration } from "react-native";

const FALLBACK_VIBRATION_MS = 10;

export type HapticImpactStyle =
  | "light"
  | "medium"
  | "heavy"
  | "soft"
  | "rigid";
export type HapticNotificationType = "success" | "warning" | "error";

const impactStyleMap: Record<HapticImpactStyle, Haptics.ImpactFeedbackStyle> = {
  light: Haptics.ImpactFeedbackStyle.Light,
  medium: Haptics.ImpactFeedbackStyle.Medium,
  heavy: Haptics.ImpactFeedbackStyle.Heavy,
  soft: Haptics.ImpactFeedbackStyle.Soft,
  rigid: Haptics.ImpactFeedbackStyle.Rigid,
};

const notificationTypeMap: Record<
  HapticNotificationType,
  Haptics.NotificationFeedbackType
> = {
  success: Haptics.NotificationFeedbackType.Success,
  warning: Haptics.NotificationFeedbackType.Warning,
  error: Haptics.NotificationFeedbackType.Error,
};

function fallbackVibrate() {
  Vibration.vibrate(FALLBACK_VIBRATION_MS);
}

export function hapticSelection() {
  void Haptics.selectionAsync().catch(fallbackVibrate);
}

export function hapticImpact(style: HapticImpactStyle = "light") {
  void Haptics.impactAsync(impactStyleMap[style]).catch(fallbackVibrate);
}

export function hapticImpactLight() {
  hapticImpact("light");
}

export function hapticNotification(type: HapticNotificationType) {
  void Haptics.notificationAsync(notificationTypeMap[type]).catch(fallbackVibrate);
}
