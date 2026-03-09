import { AppSettingsProvider } from "@/lib/app-settings";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { Stack } from "expo-router";
import type { HeroUINativeConfig } from "heroui-native";
import { HeroUINativeProvider } from "heroui-native";
import { useMemo } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useUniwind } from "uniwind";
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
  const backgroundColor = isDarkMode ? "#000000" : "#F5F5F5";
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
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <ThemeProvider value={navigationTheme}>
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
                  presentation: "modal",
                }}
              />
            </Stack>
          </AppSettingsProvider>
        </HeroUINativeProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
