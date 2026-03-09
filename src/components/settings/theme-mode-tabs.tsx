import { Tabs } from "heroui-native";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-uniwind";
import { View } from "react-native";
import { Uniwind, useUniwind } from "uniwind";

type ThemeMode = "light" | "dark" | "system";

const THEME_TABS: {
  value: ThemeMode;
  Icon: typeof SunIcon;
}[] = [
  { value: "light", Icon: SunIcon },
  { value: "dark", Icon: MoonIcon },
  { value: "system", Icon: MonitorIcon },
];

const isThemeMode = (value: string): value is ThemeMode => {
  return value === "light" || value === "dark" || value === "system";
};

export function ThemeModeTabs() {
  const { theme, hasAdaptiveThemes } = useUniwind();
  const activeTheme: ThemeMode = hasAdaptiveThemes
    ? "system"
    : theme === "dark"
      ? "dark"
      : "light";
  const isDarkMode = theme === "dark";
  const selectedIconColor = isDarkMode ? "#FFFFFF" : "#000000";
  const unselectedIconColor = isDarkMode ? "#9CA3AF" : "#6B7280";

  return (
    <View className="w-full">
      <Tabs
        value={activeTheme}
        onValueChange={(nextValue) => {
          if (isThemeMode(nextValue)) {
            Uniwind.setTheme(nextValue);
          }
        }}
        variant="primary"
      >
        <Tabs.List>
          <Tabs.Indicator />
          {THEME_TABS.map(({ value, Icon }) => (
            <Tabs.Trigger key={value} value={value}>
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
