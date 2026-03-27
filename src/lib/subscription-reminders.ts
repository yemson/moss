export const NOTIFICATION_LEAD_DAYS = [1, 2, 3, 5, 7, 14] as const;

export type NotificationLeadDay = (typeof NOTIFICATION_LEAD_DAYS)[number];

export const NOTIFICATION_LEAD_DAY_OPTIONS = NOTIFICATION_LEAD_DAYS.map(
  (day) => ({
    value: day,
    label: `${day}일 전`,
  }),
);

export function normalizeNotificationLeadDays(
  value: number[] | null | undefined,
): number[] {
  if (value == null) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("notificationLeadDays must be an array.");
  }

  const allowedDays = new Set<number>(NOTIFICATION_LEAD_DAYS);
  const normalizedDays = [...new Set(value)].sort((a, b) => a - b);

  for (const day of normalizedDays) {
    if (!Number.isInteger(day) || !allowedDays.has(day)) {
      throw new Error("notificationLeadDays contains an unsupported reminder day.");
    }
  }

  return normalizedDays;
}

export function parseNotificationLeadDays(
  value: string | null | undefined,
): number[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    return normalizeNotificationLeadDays(
      Array.isArray(parsed) ? parsed.filter((day): day is number => typeof day === "number") : [],
    );
  } catch {
    return [];
  }
}
