export type CurrencyDisplayMode = "symbol" | "text";

export const DEFAULT_CURRENCY_DISPLAY_MODE: CurrencyDisplayMode = "text";

export const CURRENCY_DISPLAY_TAB_LABELS: Record<CurrencyDisplayMode, string> = {
  symbol: "₩ / $",
  text: "원 / 달러",
};

export const isCurrencyDisplayMode = (
  value: string,
): value is CurrencyDisplayMode => {
  return value === "symbol" || value === "text";
};
