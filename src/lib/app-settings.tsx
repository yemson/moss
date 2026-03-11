import {
  DEFAULT_CURRENCY_DISPLAY_MODE,
  isCurrencyDisplayMode,
  type CurrencyDisplayMode,
} from "@/lib/currency-display";
import {
  DEFAULT_THEME_MODE,
  isThemeMode,
  type ThemeMode,
} from "@/lib/theme-mode";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from "react";
import { Uniwind } from "uniwind";

const APP_SETTINGS_STORAGE_KEY = "subak.settings";

export interface AppSettings {
  currencyDisplayMode: CurrencyDisplayMode;
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  notificationsPermissionPrompted: boolean;
}

interface AppSettingsContextValue {
  currencyDisplayMode: CurrencyDisplayMode;
  themeMode: ThemeMode;
  notificationsEnabled: boolean;
  notificationsPermissionPrompted: boolean;
  setCurrencyDisplayMode: (nextMode: CurrencyDisplayMode) => void;
  setThemeMode: (nextMode: ThemeMode) => void;
  setNotificationsEnabled: (nextEnabled: boolean) => void;
  setNotificationsPermissionPrompted: (nextPrompted: boolean) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export const DEFAULT_APP_SETTINGS: AppSettings = {
  currencyDisplayMode: DEFAULT_CURRENCY_DISPLAY_MODE,
  themeMode: DEFAULT_THEME_MODE,
  notificationsEnabled: false,
  notificationsPermissionPrompted: false,
};

function parseAppSettings(rawSettings: string | null): AppSettings {
  if (!rawSettings) {
    return DEFAULT_APP_SETTINGS;
  }

  try {
    const parsedSettings = JSON.parse(rawSettings) as {
      currencyDisplayMode?: unknown;
      themeMode?: unknown;
      notificationsEnabled?: unknown;
      notificationsPermissionPrompted?: unknown;
    };

    return {
      currencyDisplayMode:
        typeof parsedSettings.currencyDisplayMode === "string" &&
        isCurrencyDisplayMode(parsedSettings.currencyDisplayMode)
          ? parsedSettings.currencyDisplayMode
          : DEFAULT_CURRENCY_DISPLAY_MODE,
      themeMode:
        typeof parsedSettings.themeMode === "string" &&
        isThemeMode(parsedSettings.themeMode)
          ? parsedSettings.themeMode
          : DEFAULT_THEME_MODE,
      notificationsEnabled:
        typeof parsedSettings.notificationsEnabled === "boolean"
          ? parsedSettings.notificationsEnabled
          : DEFAULT_APP_SETTINGS.notificationsEnabled,
      notificationsPermissionPrompted:
        typeof parsedSettings.notificationsPermissionPrompted === "boolean"
          ? parsedSettings.notificationsPermissionPrompted
          : DEFAULT_APP_SETTINGS.notificationsPermissionPrompted,
    };
  } catch (error) {
    console.error("Failed to parse app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export async function persistAppSettings(nextSettings: AppSettings) {
  await AsyncStorage.setItem(
    APP_SETTINGS_STORAGE_KEY,
    JSON.stringify(nextSettings),
  );
}

export async function loadAppSettings() {
  try {
    const rawSettings = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
    return parseAppSettings(rawSettings);
  } catch (error) {
    console.error("Failed to load app settings:", error);
    return DEFAULT_APP_SETTINGS;
  }
}

export function AppSettingsProvider({
  children,
  initialSettings = DEFAULT_APP_SETTINGS,
}: {
  children: ReactNode;
  initialSettings?: AppSettings;
}) {
  const [settings, setSettings] = useState<AppSettings>(initialSettings);

  const persistSettings = useCallback((nextSettings: AppSettings) => {
    void persistAppSettings(nextSettings).catch((error) => {
      console.error("Failed to persist app settings:", error);
    });
  }, []);

  const setCurrencyDisplayMode = useCallback(
    (nextMode: CurrencyDisplayMode) => {
      setSettings((currentSettings) => {
        const nextSettings = {
          ...currentSettings,
          currencyDisplayMode: nextMode,
        };

        persistSettings(nextSettings);
        return nextSettings;
      });
    },
    [persistSettings],
  );

  const setThemeMode = useCallback(
    (nextMode: ThemeMode) => {
      Uniwind.setTheme(nextMode);

      setSettings((currentSettings) => {
        const nextSettings = {
          ...currentSettings,
          themeMode: nextMode,
        };

        persistSettings(nextSettings);
        return nextSettings;
      });
    },
    [persistSettings],
  );

  const setNotificationsEnabled = useCallback(
    (nextEnabled: boolean) => {
      setSettings((currentSettings) => {
        const nextSettings = {
          ...currentSettings,
          notificationsEnabled: nextEnabled,
        };

        persistSettings(nextSettings);
        return nextSettings;
      });
    },
    [persistSettings],
  );

  const setNotificationsPermissionPrompted = useCallback(
    (nextPrompted: boolean) => {
      setSettings((currentSettings) => {
        const nextSettings = {
          ...currentSettings,
          notificationsPermissionPrompted: nextPrompted,
        };

        persistSettings(nextSettings);
        return nextSettings;
      });
    },
    [persistSettings],
  );

  return (
    <AppSettingsContext.Provider
      value={{
        currencyDisplayMode: settings.currencyDisplayMode,
        themeMode: settings.themeMode,
        notificationsEnabled: settings.notificationsEnabled,
        notificationsPermissionPrompted: settings.notificationsPermissionPrompted,
        setCurrencyDisplayMode,
        setThemeMode,
        setNotificationsEnabled,
        setNotificationsPermissionPrompted,
      }}
    >
      {children}
    </AppSettingsContext.Provider>
  );
}

export function useAppSettings() {
  const context = useContext(AppSettingsContext);

  if (!context) {
    throw new Error("useAppSettings must be used within AppSettingsProvider.");
  }

  return context;
}
