import { useAppSettings } from "@/lib/app-settings";
import { track } from "@/lib/analytics";
import { hapticSelection } from "@/lib/haptics";
import { isThemeMode, type ThemeMode } from "@/lib/theme-mode";
import { Tabs } from "heroui-native";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-uniwind";
import { View } from "react-native";
import { useUniwind } from "uniwind";

const THEME_TABS: {
  value: ThemeMode;
  Icon: typeof SunIcon;
}[] = [
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
  { value: "system", Icon: MonitorIcon },
];

export function ThemeModeTabs() {
  const { themeMode, setThemeMode } = useAppSettings();
  const { theme } = useUniwind();
  const isDarkMode = theme === "dark";
  const selectedIconColor = isDarkMode ? "#FFFFFF" : "#000000";
  const unselectedIconColor = isDarkMode ? "#9CA3AF" : "#6B7280";

  return (
    <View className="w-full">
      <Tabs
        value={themeMode}
        onValueChange={(nextValue) => {
          if (isThemeMode(nextValue) && nextValue !== themeMode) {
            track("theme_mode_changed", {
              theme_mode: nextValue,
            });
            setThemeMode(nextValue);
          }
        }}
        variant="primary"
      >
        <Tabs.List>
          <Tabs.Indicator />
          {THEME_TABS.map(({ value, Icon }) => (
            <Tabs.Trigger onPressIn={hapticSelection} key={value} value={value}>
              {({ isSelected }) => (
                <>
                  <Icon
                    size={14}
                    color={isSelected ? selectedIconColor : unselectedIconColor}
                  />
                </>
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
      </Tabs>
    </View>
  );
}
