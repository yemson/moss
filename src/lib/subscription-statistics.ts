import type {
  SubscriptionPaymentLog,
  SubscriptionWithCategory,
} from "@/lib/subscription-store";

export interface MonthlySpendPoint {
  monthKey: string;
  label: string;
  total: number;
}

export interface StatisticsBreakdownItem {
  id: string;
  label: string;
  total: number;
  count: number;
  share: number;
}

export interface StatisticsOverview {
  activeSubscriptionCount: number;
  remainingThisMonthTotal: number;
  fullThisMonthTotal: number;
  lifetimePaidTotal: number;
  nextTwelveMonthsScheduledTotal: number;
  recentSixMonthTrend: MonthlySpendPoint[];
  categoryBreakdown: StatisticsBreakdownItem[];
}

export interface SubscriptionStatisticsDetail {
  lifetimePaidTotal: number;
  paidCount: number;
  currentYearPaidTotal: number;
  nextTwelveMonthsScheduledTotal: number;
  recentSixMonthTrend: MonthlySpendPoint[];
  recentPaidLogs: SubscriptionPaymentLog[];
}

function toLocalDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getMonthKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getMonthLabel(date: Date): string {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}.${month}`;
}

function getMonthBuckets(baseDate: Date = new Date(), count = 6) {
  return Array.from({ length: count }, (_, index) => {
    const monthDate = new Date(
      baseDate.getFullYear(),
      baseDate.getMonth() - (count - index - 1),
      1,
    );

    return {
      key: getMonthKey(monthDate),
      label: getMonthLabel(monthDate),
    };
  });
}

function isSameMonth(value: string, date: Date): boolean {
  const [year, month] = value.split("-").map(Number);
  return year === date.getFullYear() && month === date.getMonth() + 1;
}

function isSameYear(value: string, date: Date): boolean {
  const [year] = value.split("-").map(Number);
  return year === date.getFullYear();
}

function sumLogAmounts(logs: SubscriptionPaymentLog[]) {
  let total = 0;

  for (const log of logs) {
    total += log.amount;
  }

  return total;
}

function buildMonthlyTrend(
  logs: SubscriptionPaymentLog[],
  baseDate: Date = new Date(),
): MonthlySpendPoint[] {
  const buckets = getMonthBuckets(baseDate);
  const totals = new Map(buckets.map((bucket) => [bucket.key, 0]));

  for (const log of logs) {
    const monthKey = log.billingDate.slice(0, 7);
    if (!totals.has(monthKey)) {
      continue;
    }

    totals.set(monthKey, (totals.get(monthKey) ?? 0) + log.amount);
  }

  return buckets.map((bucket) => ({
    monthKey: bucket.key,
    label: bucket.label,
    total: totals.get(bucket.key) ?? 0,
  }));
}

function buildCategoryBreakdown(
  logs: SubscriptionPaymentLog[],
): StatisticsBreakdownItem[] {
  const grouped = new Map<
    string,
    { label: string; total: number; count: number }
  >();

  for (const log of logs) {
    const current = grouped.get(log.categoryIdSnapshot);
    if (current) {
      current.total += log.amount;
      current.count += 1;
      continue;
    }

    grouped.set(log.categoryIdSnapshot, {
      label: log.categoryNameSnapshot,
      total: log.amount,
      count: 1,
    });
  }

  const total = Array.from(grouped.values()).reduce(
    (sum, item) => sum + item.total,
    0,
  );

  return Array.from(grouped.entries())
    .map(([id, item]) => ({
      id,
      label: item.label,
      total: item.total,
      count: item.count,
      share: total > 0 ? item.total / total : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function getFutureTwelveMonthsEnd(baseDate: Date = new Date()): string {
  return toLocalDateString(
    new Date(baseDate.getFullYear(), baseDate.getMonth() + 13, 0),
  );
}

export function getStatisticsOverview(
  subscriptions: SubscriptionWithCategory[],
  paymentLogs: SubscriptionPaymentLog[],
  baseDate: Date = new Date(),
): StatisticsOverview {
  const activeSubscriptions = subscriptions.filter(
    (subscription) => subscription.isActive,
  );
  const todayDateKey = toLocalDateString(baseDate);
  const currentMonthLogs = paymentLogs.filter(
    (log) => log.subscriptionIsActive && isSameMonth(log.billingDate, baseDate),
  );
  const paidLogs = paymentLogs.filter((log) => log.status === "paid");
  const scheduledLogs = paymentLogs.filter(
    (log) => log.status === "scheduled" && log.subscriptionIsActive,
  );
  const recentSixMonthPaidLogs = paidLogs.filter((log) =>
    getMonthBuckets(baseDate).some((bucket) => bucket.key === log.billingDate.slice(0, 7)),
  );

  return {
    activeSubscriptionCount: activeSubscriptions.length,
    remainingThisMonthTotal: sumLogAmounts(
      currentMonthLogs.filter(
        (log) => log.status === "scheduled" && log.billingDate >= todayDateKey,
      ),
    ),
    fullThisMonthTotal: sumLogAmounts(currentMonthLogs),
    lifetimePaidTotal: sumLogAmounts(paidLogs),
    nextTwelveMonthsScheduledTotal: sumLogAmounts(
      scheduledLogs.filter(
        (log) =>
          log.billingDate >= todayDateKey &&
          log.billingDate <= getFutureTwelveMonthsEnd(baseDate),
      ),
    ),
    recentSixMonthTrend: buildMonthlyTrend(paidLogs, baseDate),
    categoryBreakdown: buildCategoryBreakdown(recentSixMonthPaidLogs),
  };
}

export function getSubscriptionStatisticsDetail(
  _subscription: SubscriptionWithCategory,
  paymentLogs: SubscriptionPaymentLog[],
  baseDate: Date = new Date(),
): SubscriptionStatisticsDetail {
  const todayDateKey = toLocalDateString(baseDate);
  const paidLogs = paymentLogs.filter((log) => log.status === "paid");
  const scheduledLogs = paymentLogs.filter((log) => log.status === "scheduled");

  return {
    lifetimePaidTotal: sumLogAmounts(paidLogs),
    paidCount: paidLogs.length,
    currentYearPaidTotal: sumLogAmounts(
      paidLogs.filter((log) => isSameYear(log.billingDate, baseDate)),
    ),
    nextTwelveMonthsScheduledTotal: sumLogAmounts(
      scheduledLogs.filter(
        (log) =>
          log.billingDate >= todayDateKey &&
          log.billingDate <= getFutureTwelveMonthsEnd(baseDate),
      ),
    ),
    recentSixMonthTrend: buildMonthlyTrend(paidLogs, baseDate),
    recentPaidLogs: paidLogs
      .slice()
      .sort((a, b) => b.billingDate.localeCompare(a.billingDate))
      .slice(0, 5),
  };
}
