import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useSyncExternalStore } from "react";
import {
  DEFAULT_CURRENCY_DISPLAY_MODE,
  isCurrencyDisplayMode,
  type CurrencyDisplayMode,
} from "@/shared/lib/currency-display";

export interface AppSettings {
  currencyDisplayMode: CurrencyDisplayMode;
}

const APP_SETTINGS_STORAGE_KEY = "subak.settings";

const DEFAULT_APP_SETTINGS: AppSettings = {
  currencyDisplayMode: DEFAULT_CURRENCY_DISPLAY_MODE,
};

const listeners = new Set<() => void>();

let currentSettings = DEFAULT_APP_SETTINGS;
let hasHydrated = false;
let hydrationPromise: Promise<void> | null = null;
let mutationVersion = 0;

const notifySettingsChanged = () => {
  listeners.forEach((listener) => {
    listener();
  });
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const getSettingsSnapshot = () => currentSettings;

const sanitizeSettings = (value: unknown): AppSettings => {
  if (typeof value !== "object" || value == null) {
    return DEFAULT_APP_SETTINGS;
  }

  const candidate = value as {
    currencyDisplayMode?: unknown;
  };
  const nextCurrencyDisplayMode = candidate.currencyDisplayMode;

  return {
    currencyDisplayMode:
      typeof nextCurrencyDisplayMode === "string" &&
      isCurrencyDisplayMode(nextCurrencyDisplayMode)
        ? nextCurrencyDisplayMode
      : DEFAULT_APP_SETTINGS.currencyDisplayMode,
  };
};

const persistSettings = async (nextSettings: AppSettings) => {
  await AsyncStorage.setItem(
    APP_SETTINGS_STORAGE_KEY,
    JSON.stringify(nextSettings),
  );
};

export const hydrateAppSettings = async (): Promise<void> => {
  if (hasHydrated) {
    return;
  }

  if (hydrationPromise) {
    return hydrationPromise;
  }

  const versionAtStart = mutationVersion;

  hydrationPromise = (async () => {
    try {
      const rawSettings = await AsyncStorage.getItem(APP_SETTINGS_STORAGE_KEY);

      if (!rawSettings || mutationVersion !== versionAtStart) {
        return;
      }

      currentSettings = sanitizeSettings(JSON.parse(rawSettings));
    } catch (error) {
      console.error("Failed to hydrate app settings:", error);
    } finally {
      hasHydrated = true;
      hydrationPromise = null;
      notifySettingsChanged();
    }
  })();

  return hydrationPromise;
};

const setSettingsSnapshot = (nextSettings: AppSettings) => {
  currentSettings = nextSettings;
  mutationVersion += 1;
  notifySettingsChanged();

  void persistSettings(nextSettings).catch((error) => {
    console.error("Failed to persist app settings:", error);
  });
};

export const setAppSetting = <Key extends keyof AppSettings>(
  key: Key,
  value: AppSettings[Key],
) => {
  if (currentSettings[key] === value) {
    return;
  }

  setSettingsSnapshot({
    ...currentSettings,
    [key]: value,
  });
};

export const setCurrencyDisplayMode = (nextMode: CurrencyDisplayMode) => {
  setAppSetting("currencyDisplayMode", nextMode);
};

export const useAppSettings = () => {
  useEffect(() => {
    void hydrateAppSettings();
  }, []);

  return useSyncExternalStore(
    subscribe,
    getSettingsSnapshot,
    getSettingsSnapshot,
  );
};

export const useCurrencyDisplayMode = () => {
  return useAppSettings().currencyDisplayMode;
};
