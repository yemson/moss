import { View } from "react-native";
import { Tabs } from "heroui-native";
import {
  setCurrencyDisplayMode,
  useCurrencyDisplayMode,
} from "@/features/settings/model/settings-store";
import {
  CURRENCY_DISPLAY_TAB_LABELS,
  isCurrencyDisplayMode,
  type CurrencyDisplayMode,
} from "@/shared/lib/currency-display";

const CURRENCY_DISPLAY_OPTIONS: CurrencyDisplayMode[] = ["symbol", "text"];

export function CurrencyDisplayTabs() {
  const displayMode = useCurrencyDisplayMode();

  return (
    <View style={{ minWidth: 156 }}>
      <Tabs
        value={displayMode}
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
              <Tabs.Label>{CURRENCY_DISPLAY_TAB_LABELS[value]}</Tabs.Label>
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
    </View>
  );
}
