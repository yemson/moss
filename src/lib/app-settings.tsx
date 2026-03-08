import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_CURRENCY_DISPLAY_MODE,
  isCurrencyDisplayMode,
  type CurrencyDisplayMode,
} from "@/lib/currency-display";

const APP_SETTINGS_STORAGE_KEY = "subak.settings";

interface AppSettingsContextValue {
  currencyDisplayMode: CurrencyDisplayMode;
  setCurrencyDisplayMode: (nextMode: CurrencyDisplayMode) => void;
}

const AppSettingsContext = createContext<AppSettingsContextValue | null>(null);

export function AppSettingsProvider({ children }: { children: ReactNode }) {
  const [currencyDisplayMode, setCurrencyDisplayModeState] =
    useState<CurrencyDisplayMode>(DEFAULT_CURRENCY_DISPLAY_MODE);

  useEffect(() => {
    let isMounted = true;

    const loadSettings = async () => {
      try {
        const rawSettings = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);
        if (!rawSettings || !isMounted) {
          return;
        }

        const parsedSettings = JSON.parse(rawSettings) as {
          currencyDisplayMode?: unknown;
        };

        if (
          typeof parsedSettings.currencyDisplayMode === "string" &&
          isCurrencyDisplayMode(parsedSettings.currencyDisplayMode)
        ) {
          setCurrencyDisplayModeState(parsedSettings.currencyDisplayMode);
        }
      } catch (error) {
        console.error("Failed to load app settings:", error);
      }
    };

    void loadSettings();

    return () => {
      isMounted = false;
    };
  }, []);

  const setCurrencyDisplayMode = (nextMode: CurrencyDisplayMode) => {
    setCurrencyDisplayModeState(nextMode);

    void AsyncStorage.setItem(
      APP_SETTINGS_STORAGE_KEY,
      JSON.stringify({ currencyDisplayMode: nextMode }),
    ).catch((error) => {
      console.error("Failed to persist app settings:", error);
    });
  };

  return (
    <AppSettingsContext.Provider
      value={{ currencyDisplayMode, setCurrencyDisplayMode }}
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
