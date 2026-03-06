import { Stack } from "expo-router";
import { Button, Separator } from "heroui-native";
import { ScrollView, Text, View } from "react-native";
import {
  hapticImpact,
  hapticNotification,
  hapticSelection,
} from "@/shared/lib/haptics";

export default function HapticsTestScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Haptics Test" }} />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 px-4"
        contentContainerClassName="gap-4 py-5 pb-10"
      >
        <Text className="text-sm text-muted">
          버튼을 눌러서 햅틱 종류별 동작을 확인하세요.
        </Text>

        <View className="gap-3">
          <Text className="text-xs text-muted">Selection</Text>
          <Button variant="secondary" onPress={hapticSelection}>
            <Button.Label>Selection</Button.Label>
          </Button>
        </View>

        <Separator className="opacity-40" />

        <View className="gap-3">
          <Text className="text-xs text-muted">Impact</Text>
          <Button variant="secondary" onPress={() => hapticImpact("light")}>
            <Button.Label>Impact Light</Button.Label>
          </Button>
          <Button variant="secondary" onPress={() => hapticImpact("medium")}>
            <Button.Label>Impact Medium</Button.Label>
          </Button>
          <Button variant="secondary" onPress={() => hapticImpact("heavy")}>
            <Button.Label>Impact Heavy</Button.Label>
          </Button>
          <Button variant="secondary" onPress={() => hapticImpact("soft")}>
            <Button.Label>Impact Soft</Button.Label>
          </Button>
          <Button variant="secondary" onPress={() => hapticImpact("rigid")}>
            <Button.Label>Impact Rigid</Button.Label>
          </Button>
        </View>

        <Separator className="opacity-40" />

        <View className="gap-3">
          <Text className="text-xs text-muted">Notification</Text>
          <Button variant="primary" onPress={() => hapticNotification("success")}>
            <Button.Label>Notification Success</Button.Label>
          </Button>
          <Button variant="outline" onPress={() => hapticNotification("warning")}>
            <Button.Label>Notification Warning</Button.Label>
          </Button>
          <Button variant="danger" onPress={() => hapticNotification("error")}>
            <Button.Label>Notification Error</Button.Label>
          </Button>
        </View>
      </ScrollView>
    </>
  );
}
