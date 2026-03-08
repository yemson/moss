import { HeroUINativeProvider } from "heroui-native";
import type { HeroUINativeConfig } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useUniwind } from "uniwind";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useMemo } from "react";
import { AppSettingsProvider } from "@/lib/app-settings";
import "../global.css";

const config: HeroUINativeConfig = {
  textProps: {
    minimumFontScale: 0.5,
    maxFontSizeMultiplier: 1.5,
  },
};

export default function TabLayout() {
  const { theme } = useUniwind();
  const isDarkMode = theme === "dark";
  const backgroundColor = isDarkMode ? "#010101" : "#F2F2F7";
  const navigationTheme = useMemo(
    () =>
      isDarkMode
        ? {
            ...DarkTheme,
            colors: {
              ...DarkTheme.colors,
              background: backgroundColor,
              card: backgroundColor,
            },
          }
        : {
            ...DefaultTheme,
            colors: {
              ...DefaultTheme.colors,
              background: backgroundColor,
              card: backgroundColor,
            },
          },
    [backgroundColor, isDarkMode],
  );

  return (
    <ThemeProvider value={navigationTheme}>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
        <HeroUINativeProvider config={config}>
          <AppSettingsProvider>
            <Stack
              screenOptions={{
                headerTransparent: true,
                contentStyle: { backgroundColor },
                headerStyle: { backgroundColor: "transparent" },
              }}
            >
              <Stack.Screen
                name="subscriptions/new"
                options={{
                  title: "구독 추가",
                  presentation: "modal",
                }}
              />
            </Stack>
          </AppSettingsProvider>
        </HeroUINativeProvider>
      </GestureHandlerRootView>
    </ThemeProvider>
  );
}
