import { View } from "react-native";
import { Tabs } from "heroui-native";
import { useAppSettings } from "@/lib/app-settings";
import {
  CURRENCY_DISPLAY_TAB_LABELS,
  isCurrencyDisplayMode,
  type CurrencyDisplayMode,
} from "@/lib/currency-display";

const CURRENCY_DISPLAY_OPTIONS: CurrencyDisplayMode[] = ["symbol", "text"];

export function CurrencyDisplayTabs() {
  const { currencyDisplayMode, setCurrencyDisplayMode } = useAppSettings();

  return (
    <View className="w-full">
      <Tabs
        value={currencyDisplayMode}
        onValueChange={(nextValue) => {
          if (isCurrencyDisplayMode(nextValue)) {
            setCurrencyDisplayMode(nextValue);
          }
        }}
        variant="primary"
      >
        <Tabs.List>
          <Tabs.Indicator />
          {CURRENCY_DISPLAY_OPTIONS.map((value) => (
            <Tabs.Trigger key={value} value={value}>
              <Tabs.Label className="text-sm">
                {CURRENCY_DISPLAY_TAB_LABELS[value]}
              </Tabs.Label>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
    </View>
  );
}
