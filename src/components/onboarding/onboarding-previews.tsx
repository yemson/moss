import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import { SubscriptionStatisticsSummaryTile } from "@/components/subscriptions/subscription-statistics-summary-tile";
import { SubscriptionStatisticsTrendChart } from "@/components/subscriptions/subscription-statistics-trend-chart";
import type { MonthlySpendPoint } from "@/lib/subscription-statistics";
import { Card, Separator } from "heroui-native";
import { Text, View } from "react-native";

const SAMPLE_TREND_POINTS: MonthlySpendPoint[] = [
  { monthKey: "2025-10", label: "10월", total: 41200 },
  { monthKey: "2025-11", label: "11월", total: 46400 },
  { monthKey: "2025-12", label: "12월", total: 51900 },
  { monthKey: "2026-01", label: "1월", total: 49800 },
  { monthKey: "2026-02", label: "2월", total: 57300 },
  { monthKey: "2026-03", label: "3월", total: 63400 },
];

function StaticSwitch() {
  return (
    <View className="h-8 w-13 rounded-full bg-success px-1 py-1">
      <View className="ml-auto h-6 w-6 rounded-full bg-white" />
    </View>
  );
}

function PreviewInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="flex-row items-center justify-between gap-3 py-0.5">
      <Text className="text-sm text-foreground/55">{label}</Text>
      <Text
        className="text-base font-semibold text-black dark:text-white"
        style={{ fontVariant: ["tabular-nums"] }}
      >
        {value}
      </Text>
    </View>
  );
}

function HomePreviewItem({
  name,
  templateKey,
  amount,
  recurringLabel,
  ddayLabel,
}: {
  name: string;
  templateKey?: string | null;
  amount: string;
  recurringLabel: string;
  ddayLabel: string;
}) {
  return (
    <Card
      variant="default"
      className="p-4 px-4.5 shadow-lg shadow-neutral-300/10 dark:shadow-none"
    >
      <Card.Body className="gap-1.5 p-0">
        <View className="flex-row items-start gap-3">
          <SubscriptionServiceBadge
            name={name}
            templateKey={templateKey}
            size="card"
          />

          <View className="min-w-0 flex-1 gap-1.5">
            <View className="flex-row items-start justify-between gap-3">
              <Card.Title
                className="flex-1 text-lg font-semibold text-black dark:text-white"
                numberOfLines={1}
              >
                {name}
              </Card.Title>
              <Text className="text-lg font-semibold text-black dark:text-white">
                {amount}
              </Text>
            </View>

            <View className="flex-row items-center justify-between gap-2">
              <Card.Description
                className="min-w-0 flex-1 text-sm text-foreground/50"
                numberOfLines={1}
              >
                {recurringLabel}
              </Card.Description>
              <View className="rounded-full bg-surface-secondary px-2 py-0.5">
                <Text className="text-[12px] font-semibold text-foreground/50">
                  {ddayLabel}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card.Body>
    </Card>
  );
}

export function OnboardingHomePreview() {
  return (
    <View className="gap-3">
      <Card className="rounded-3xl px-6 py-6 shadow-lg shadow-neutral-300/10 dark:shadow-none">
        <Card.Body className="gap-1 p-0">
          <Card.Title className="text-base font-medium text-success">
            3월 총 결제 예정액
          </Card.Title>
          <View className="mt-1 flex-row items-end self-start gap-2">
            <Text className="text-4xl font-bold text-black dark:text-white">
              63,400원
            </Text>
            <Text className="pb-1 text-sm text-foreground/50">/ 89,300원</Text>
          </View>
          <Text className="mt-2 text-sm text-foreground/50">
            지난달보다 8,900원 덜 나가요.
          </Text>
        </Card.Body>
      </Card>

      <HomePreviewItem
        name="Netflix"
        templateKey="netflix"
        amount="17,000원"
        recurringLabel="매월 21일 결제"
        ddayLabel="5일 후"
      />
      <HomePreviewItem
        name="iCloud+"
        templateKey="icloud-plus"
        amount="4,400원"
        recurringLabel="매월 16일 결제"
        ddayLabel="오늘"
      />
    </View>
  );
}

export function OnboardingBillingPreview() {
  return (
    <Card className="rounded-[30px] p-5 shadow-lg shadow-neutral-300/10 dark:shadow-none">
      <Card.Body className="gap-4 p-0">
        <View className="flex-row items-center gap-3">
          <SubscriptionServiceBadge
            name="YouTube Premium"
            templateKey="youtube-premium"
            size="sm"
          />
          <View className="min-w-0 flex-1 gap-0.5">
            <Text className="text-lg font-semibold text-black dark:text-white">
              YouTube Premium
            </Text>
            <Text className="text-sm text-foreground/50">
              결제일과 알림을 함께 관리해요.
            </Text>
          </View>
        </View>

        <Separator className="opacity-30" />

        <View className="gap-3">
          <PreviewInfoRow label="결제일" value="매월 17일" />
          <PreviewInfoRow label="결제 주기" value="월간 결제" />
          <View className="flex-row items-center justify-between gap-3 py-0.5">
            <Text className="text-sm text-foreground/55">알림 받기</Text>
            <StaticSwitch />
          </View>
        </View>
      </Card.Body>
    </Card>
  );
}

export function OnboardingStatisticsPreview() {
  return (
    <View className="gap-3">
      <View className="flex-row gap-3">
        <SubscriptionStatisticsSummaryTile
          label="지금까지 결제"
          value="412,700원"
          tone="success"
        />
        <SubscriptionStatisticsSummaryTile
          label="앞으로 12개월 예정"
          value="289,400원"
        />
      </View>

      <Card className="rounded-[28px] px-5 py-5 shadow-lg shadow-neutral-300/10 dark:shadow-none">
        <Card.Body className="gap-4 p-0">
          <View className="gap-1">
            <Card.Title className="text-lg font-semibold text-black dark:text-white">
              결제 흐름
            </Card.Title>
            <Card.Description className="text-sm text-foreground/50">
              최근 6개월 동안 얼마나 결제했는지 볼 수 있어요.
            </Card.Description>
          </View>

          <SubscriptionStatisticsTrendChart points={SAMPLE_TREND_POINTS} />
        </Card.Body>
      </Card>
    </View>
  );
}
