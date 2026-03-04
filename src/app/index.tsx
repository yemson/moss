import {
  ScrollView,
  Pressable,
  Alert,
  Text,
  View,
  Vibration,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useHeaderHeight } from "@react-navigation/elements";
import { SettingsIcon } from "lucide-uniwind";
import * as Haptics from "expo-haptics";

export default function Screen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();

  const handleSettingsPressIn = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {
      Vibration.vibrate(10);
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: "" }} />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <View style={{ width: 38, height: 38 }}>
            <Pressable
              onPressIn={handleSettingsPressIn}
              onPress={() => router.navigate("/settings")}
              hitSlop={8}
              className="flex-1 items-center justify-center"
            >
              <SettingsIcon className="text-black dark:text-white" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <Stack.Toolbar>
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button icon="plus" onPress={() => Alert.alert("Add")} />
      </Stack.Toolbar>

      <ScrollView
        style={{ flex: 1, marginTop: headerHeight }}
        className="flex-1 px-4"
      >
        <Text>Hello World!</Text>
      </ScrollView>
    </>
  );
}
