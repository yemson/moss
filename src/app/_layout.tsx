import {
  AppSettingsProvider,
  DEFAULT_APP_SETTINGS,
  loadAppSettings,
  persistAppSettings,
  type AppSettings,
} from "@/lib/app-settings";
import { prepareInitialHomeData } from "@/lib/home-bootstrap";
import {
  initializeNotificationsOnAppStart,
  isBillingReminderNotification,
  syncSubscriptionNotifications,
} from "@/lib/subscription-notifications";
import {
  initializeSubscriptionStore,
} from "@/lib/subscription-store";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import * as SplashScreen from "expo-splash-screen";
import * as Notifications from "expo-notifications";
import { Stack, useRouter } from "expo-router";
import type { HeroUINativeConfig } from "heroui-native";
import { HeroUINativeProvider } from "heroui-native";
import { useEffect, useMemo, useState } from "react";
import { Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Uniwind, useUniwind } from "uniwind";
import "../global.css";

void SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({
  fade: true,
  duration: 500,
});

const MINIMUM_SPLASH_SCREEN_DURATION_MS = 1500;

const config: HeroUINativeConfig = {
  textProps: {
    minimumFontScale: 0.5,
    maxFontSizeMultiplier: 1.5,
  },
};

export default function TabLayout() {
  const router = useRouter();
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
      const startedAt = Date.now();
      await initializeSubscriptionStore();
      try {
        await prepareInitialHomeData();
      } catch (error) {
        console.error("Failed to prepare initial home data:", error);
      }

      const loadedSettings = await loadAppSettings();
      const nextSettings =
        await initializeNotificationsOnAppStart(loadedSettings);
      await persistAppSettings(nextSettings);
      await syncSubscriptionNotifications(nextSettings.notificationsEnabled);
      Uniwind.setTheme(nextSettings.themeMode);
      const elapsedTime = Date.now() - startedAt;
      const remainingTime = Math.max(
        0,
        MINIMUM_SPLASH_SCREEN_DURATION_MS - elapsedTime,
      );

      if (remainingTime > 0) {
        await new Promise((resolve) => {
          setTimeout(resolve, remainingTime);
        });
      }

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
    if (Platform.OS !== "ios") {
      return;
    }

    void import("react-native-google-mobile-ads")
      .then(({ default: mobileAds }) => mobileAds().initialize())
      .catch((error) => {
        console.error("Failed to initialize mobile ads:", error);
      });
  }, []);

  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(
      (response) => {
        const notificationData = response.notification.request.content.data as
          | Record<string, unknown>
          | undefined;

        if (!isBillingReminderNotification(notificationData)) {
          return;
        }

        router.replace("/");
      },
    );

    return () => {
      subscription.remove();
    };
  }, [router]);

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
