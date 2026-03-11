export type ThemeMode = "light" | "dark" | "system";

export const DEFAULT_THEME_MODE: ThemeMode = "system";

export const isThemeMode = (value: string): value is ThemeMode => {
  return value === "light" || value === "dark" || value === "system";
};
