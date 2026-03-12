import type { MonthlySpendPoint } from "@/lib/subscription-statistics";
import { formatAmount } from "@/lib/subscription-format";
import { useMemo } from "react";
import { Text, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";

interface SubscriptionStatisticsTrendChartProps {
  points: MonthlySpendPoint[];
}

const CHART_HEIGHT = 150;
const CHART_PADDING_X = 10;
const CHART_PADDING_Y = 12;

function buildPathData(points: { x: number; y: number }[]) {
  return points
    .map(
      (point, index) =>
        `${index === 0 ? "M" : "L"} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`,
    )
    .join(" ");
}

export function SubscriptionStatisticsTrendChart({
  points,
}: SubscriptionStatisticsTrendChartProps) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = Math.max(240, screenWidth - 88);
  const maxValue = Math.max(...points.map((point) => point.total), 0);
  const minValue = 0;
  const range = Math.max(maxValue - minValue, 1);

  const chartPoints = useMemo(() => {
    if (points.length === 0) {
      return [];
    }

    const drawableWidth = chartWidth - CHART_PADDING_X * 2;
    const drawableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

    return points.map((point, index) => {
      const x =
        points.length === 1
          ? chartWidth / 2
          : CHART_PADDING_X + (drawableWidth * index) / (points.length - 1);
      const y =
        CHART_PADDING_Y +
        drawableHeight -
        ((point.total - minValue) / range) * drawableHeight;

      return { x, y };
    });
  }, [chartWidth, minValue, points, range]);

  const pathData = chartPoints.length > 0 ? buildPathData(chartPoints) : "";
  const maxLabel = formatAmount(maxValue);

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
        <Svg width={chartWidth} height={CHART_HEIGHT}>
          {[0.25, 0.5, 0.75].map((ratio) => {
            const y =
              CHART_PADDING_Y + (CHART_HEIGHT - CHART_PADDING_Y * 2) * ratio;

            return (
              <Line
                key={ratio}
                x1={CHART_PADDING_X}
                y1={y}
                x2={chartWidth - CHART_PADDING_X}
                y2={y}
                stroke="rgba(115, 115, 115, 0.16)"
                strokeWidth={1}
              />
            );
          })}

          {chartPoints.length > 0 && (
            <Path
              d={pathData}
              fill="none"
              stroke="#16A34A"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {chartPoints.map((point, index) => (
            <Circle
              key={`${points[index]?.monthKey ?? index}-dot`}
              cx={point.x}
              cy={point.y}
              r={4}
              fill="#16A34A"
            />
          ))}
        </Svg>

        <View className="mt-2 flex-row justify-between">
          {points.map((point) => (
            <Text
              key={point.monthKey}
              className="text-[11px] text-foreground/45"
              style={{ width: `${100 / Math.max(points.length, 1)}%` }}
            >
              {point.label}
            </Text>
          ))}
        </View>
      </View>
    </View>
  );
}
