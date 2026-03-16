import type { MonthlySpendPoint } from "@/lib/subscription-statistics";
import { formatAmount } from "@/lib/subscription-format";
import { Circle, Line as SkiaLine } from "@shopify/react-native-skia";
import { useMemo } from "react";
import { Text, useColorScheme, View } from "react-native";
import { CartesianChart, Line } from "victory-native";

interface SubscriptionStatisticsTrendChartProps {
  points: MonthlySpendPoint[];
}

type ChartDatum = {
  label: string;
  total: number;
};

const CHART_HEIGHT = 150;
const GRID_LINE_RATIOS = [0.25, 0.5, 0.75] as const;
const CHART_DATA_FALLBACK: ChartDatum = {
  label: "__fallback__",
  total: 0,
};

export function SubscriptionStatisticsTrendChart({
  points,
}: SubscriptionStatisticsTrendChartProps) {
  const colorScheme = useColorScheme();
  const chartData = useMemo(
    () =>
      points.length > 0
        ? points.map<ChartDatum>((point) => ({
            label: point.label,
            total: point.total,
          }))
        : [CHART_DATA_FALLBACK],
    [points],
  );
  const maxValue = Math.max(...points.map((point) => point.total), 0);
  const maxLabel = formatAmount(maxValue);
  const gridLineColor =
    colorScheme === "dark"
      ? "rgba(163, 163, 163, 0.16)"
      : "rgba(115, 115, 115, 0.08)";

  return (
    <View className="gap-3">
      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-foreground/45">최근 6개월</Text>
        <Text
          className="text-xs font-medium text-foreground/55"
          style={{ fontVariant: ["tabular-nums"] }}
        >
          최고 {maxLabel}
        </Text>
      </View>

      <View className="rounded-3xl bg-surface-secondary/70 px-3 py-3">
        <View style={{ height: CHART_HEIGHT }}>
          <CartesianChart<ChartDatum, "label", "total">
            data={chartData}
            xKey="label"
            yKeys={["total"]}
            padding={{ top: 12, right: 10, bottom: 12, left: 10 }}
            domainPadding={{ left: 12, right: 12 }}
            xAxis={{ lineWidth: 0 }}
            yAxis={[{ yKeys: ["total"], lineWidth: 0 }]}
            frame={{ lineWidth: 0 }}
          >
            {({ chartBounds, points: chartPoints }) => (
              <>
                {GRID_LINE_RATIOS.map((ratio) => {
                  const y =
                    chartBounds.top +
                    (chartBounds.bottom - chartBounds.top) * ratio;

                  return (
                    <SkiaLine
                      key={ratio}
                      p1={{ x: chartBounds.left, y }}
                      p2={{ x: chartBounds.right, y }}
                      color={gridLineColor}
                      strokeWidth={1}
                    />
                  );
                })}

                <Line
                  points={chartPoints.total}
                  color="#16A34A"
                  strokeWidth={3}
                  curveType="monotoneX"
                  animate={{ type: "timing", duration: 250 }}
                />

                {chartPoints.total.map((point, index) => {
                  if (typeof point.y !== "number") {
                    return null;
                  }

                  return (
                    <Circle
                      key={`${String(point.xValue)}-${index}`}
                      cx={point.x}
                      cy={point.y}
                      r={4}
                      color="#16A34A"
                    />
                  );
                })}
              </>
            )}
          </CartesianChart>
        </View>

        <View className="mt-2 flex-row justify-between px-2 w-full">
          {points.map((point) => (
            <View key={point.monthKey}>
              <Text className="text-[11px] text-foreground/45">
                {point.label}
              </Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}
