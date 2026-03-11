import {
  AppSettingsProvider,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  type AppSettings,
} from "@/lib/app-settings";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import { Stack } from "expo-router";
import type { HeroUINativeConfig } from "heroui-native";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Uniwind, useUniwind } from "uniwind";
import "../global.css";

void SplashScreen.preventAutoHideAsync().catch(() => {});

const config: HeroUINativeConfig = {
  textProps: {
    minimumFontScale: 0.5,
    maxFontSizeMultiplier: 1.5,
  },
};

export default function TabLayout() {
  const [initialSettings, setInitialSettings] =
    useState<AppSettings>(DEFAULT_APP_SETTINGS);
  const [isSettingsReady, setIsSettingsReady] = useState(false);
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

  useEffect(() => {
    let isMounted = true;

    void (async () => {
      const nextSettings = await loadAppSettings();
      Uniwind.setTheme(nextSettings.themeMode);

      if (!isMounted) {
        return;
      }

      setInitialSettings(nextSettings);
      setIsSettingsReady(true);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isSettingsReady) {
      return;
    }

    void SplashScreen.hideAsync().catch(() => {});
  }, [isSettingsReady]);

  if (!isSettingsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor }}>
      <ThemeProvider value={navigationTheme}>
        <HeroUINativeProvider config={config}>
          <AppSettingsProvider initialSettings={initialSettings}>
            <Stack
              screenOptions={{
                headerTransparent: true,
                contentStyle: { backgroundColor },
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
