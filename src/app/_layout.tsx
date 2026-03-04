import { HeroUINativeProvider } from "heroui-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { useUniwind } from "uniwind";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useMemo } from "react";
import "../global.css";

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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <HeroUINativeProvider>
        <ThemeProvider value={navigationTheme}>
          <Stack
            screenOptions={{
              headerTransparent: true,
              contentStyle: { backgroundColor },
            }}
          />
        </ThemeProvider>
      </HeroUINativeProvider>
    </GestureHandlerRootView>
  );
}
