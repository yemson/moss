import {
  OnboardingBillingPreview,
  OnboardingHomePreview,
  OnboardingStatisticsPreview,
} from "@/components/onboarding/onboarding-previews";
import { track } from "@/lib/analytics";
import { useAppSettings } from "@/lib/app-settings";
import { hapticSelection } from "@/lib/haptics";
import { Stack, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  ScrollView,
  Text,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useUniwind } from "uniwind";

const ONBOARDING_STEPS = [
  {
    eyebrow: "1 / 3",
    title: "흩어진 구독을 한곳에서",
    description:
      "이번 달 남은 결제와 전체 결제 규모를 바로 보고, 자주 쓰는 구독을 빠르게 정리할 수 있어요.",
    preview: <OnboardingHomePreview />,
  },
  {
    eyebrow: "2 / 3",
    title: "다음 결제를 놓치지 않게",
    description:
      "구독마다 결제일과 주기를 기록하고, 알림으로 다가오는 결제를 미리 확인할 수 있어요.",
    preview: <OnboardingBillingPreview />,
  },
  {
    eyebrow: "3 / 3",
    title: "지출 흐름을 한눈에",
    description:
      "구독마다 얼마나 결제했는지, 최근 6개월 동안 어디에 가장 많이 썼는지를 빠르게 확인할 수 있어요.",
    preview: <OnboardingStatisticsPreview />,
  },
] as const;

const ONBOARDING_PAGE_GAP = 12;
const ONBOARDING_HORIZONTAL_PADDING = 24;
const ONBOARDING_TOP_ACTION_WIDTH = 88;
const ONBOARDING_TOP_ACTION_HEIGHT = 24;
const ONBOARDING_SECONDARY_CTA_SLOT_HEIGHT = 36;
const ONBOARDING_SCREEN_TOP_PADDING = 12;
const ONBOARDING_CONTENT_TOP_PADDING = 16;

export default function OnboardingRoute() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useAppSettings();
  const { theme } = useUniwind();
  const [settledStep, setSettledStep] = useState(0);
  const [visibleStep, setVisibleStep] = useState(0);
  const [pagerWidth, setPagerWidth] = useState(0);
  const pagerRef = useRef<FlatList<(typeof ONBOARDING_STEPS)[number]> | null>(
    null,
  );
  const scrollViewRefs = useRef<Array<ScrollView | null>>([]);
  const isLastVisibleStep = visibleStep === ONBOARDING_STEPS.length - 1;
  const backgroundColor = theme === "dark" ? "#000000" : "#F5F5F5";
  const pageWidth = pagerWidth;
  const pageStride = pageWidth + ONBOARDING_PAGE_GAP;

  useEffect(() => {
    requestAnimationFrame(() => {
      scrollViewRefs.current[settledStep]?.scrollTo({ y: 0, animated: false });
    });
  }, [settledStep]);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  useEffect(() => {
    track("onboarding_step_viewed", {
      step: settledStep + 1,
    });
  }, [settledStep]);

  const handleComplete = () => {
    setHasCompletedOnboarding(true);
  };

  const finishOnboarding = (options?: { openNewSubscription?: boolean }) => {
    handleComplete();
    router.dismissTo("/");

    if (!options?.openNewSubscription) {
      return;
    }

    requestAnimationFrame(() => {
      router.push("/subscriptions/new");
    });
  };

  const handleSkip = (stepIndex = visibleStep) => {
    track("onboarding_skipped", {
      step: stepIndex + 1,
    });
    finishOnboarding();
  };

  const updateVisibleStep = (offsetX: number) => {
    if (pageStride <= 0) {
      return;
    }

    const nextStep = Math.round(offsetX / pageStride);
    const clampedStep = Math.min(
      ONBOARDING_STEPS.length - 1,
      Math.max(0, nextStep),
    );

    setVisibleStep((previousStep) =>
      previousStep === clampedStep ? previousStep : clampedStep,
    );
  };

  const scrollToStep = (stepIndex: number, animated: boolean) => {
    if (pageStride <= 0) {
      return;
    }

    pagerRef.current?.scrollToOffset({
      offset: pageStride * stepIndex,
      animated,
    });
  };

  const handlePrimaryPress = (stepIndex: number) => {
    track("onboarding_primary_cta_tapped", {
      step: stepIndex + 1,
    });

    if (stepIndex < ONBOARDING_STEPS.length - 1) {
      const nextStep = stepIndex + 1;
      setVisibleStep(nextStep);
      setSettledStep(nextStep);
      scrollToStep(nextStep, true);
      return;
    }

    track("onboarding_completed");
    finishOnboarding({ openNewSubscription: true });
  };

  const handlePagerLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    if (nextWidth <= 0 || nextWidth === pagerWidth) {
      return;
    }

    setPagerWidth(nextWidth);
    requestAnimationFrame(() => {
      pagerRef.current?.scrollToOffset({
        offset: (nextWidth + ONBOARDING_PAGE_GAP) * settledStep,
        animated: false,
      });
    });
  };

  const handlePagerScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    updateVisibleStep(event.nativeEvent.contentOffset.x);
  };

  const handlePagerMomentumEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    if (pageStride <= 0) {
      return;
    }

    const nextStep = Math.round(event.nativeEvent.contentOffset.x / pageStride);
    const clampedStep = Math.min(
      ONBOARDING_STEPS.length - 1,
      Math.max(0, nextStep),
    );

    setVisibleStep((previousStep) =>
      previousStep === clampedStep ? previousStep : clampedStep,
    );
    setSettledStep((previousStep) =>
      previousStep === clampedStep ? previousStep : clampedStep,
    );
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor,
          paddingTop: ONBOARDING_SCREEN_TOP_PADDING,
        }}
      >
        <View style={{ flex: 1 }}>
          <View
            className="flex-row items-center justify-between"
            style={{ paddingHorizontal: ONBOARDING_HORIZONTAL_PADDING }}
          >
            <View className="flex-row gap-2">
              {ONBOARDING_STEPS.map((item, index) => (
                <View
                  key={item.eyebrow}
                  className={`h-1.5 rounded-full ${
                    index === visibleStep ? "w-8 bg-success" : "w-3 bg-border"
                  }`}
                />
              ))}
            </View>

            <View
              style={{
                width: ONBOARDING_TOP_ACTION_WIDTH,
                minHeight: ONBOARDING_TOP_ACTION_HEIGHT,
                justifyContent: "center",
                alignItems: "flex-end",
              }}
            >
              {!isLastVisibleStep ? (
                <Pressable
                  onPressIn={hapticSelection}
                  onPress={() => {
                    handleSkip();
                  }}
                  hitSlop={10}
                >
                  <Text className="text-sm font-medium text-foreground/50">
                    건너뛰기
                  </Text>
                </Pressable>
              ) : null}
            </View>
          </View>

          <View style={{ flex: 1 }} onLayout={handlePagerLayout}>
            {pagerWidth > 0 ? (
              <FlatList
                ref={pagerRef}
                data={ONBOARDING_STEPS}
                style={{ flex: 1 }}
                horizontal
                directionalLockEnabled
                bounces={false}
                decelerationRate="fast"
                disableIntervalMomentum
                snapToAlignment="start"
                snapToInterval={pageStride}
                scrollEventThrottle={16}
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item) => item.eyebrow}
                onScroll={handlePagerScroll}
                onMomentumScrollEnd={handlePagerMomentumEnd}
                ItemSeparatorComponent={() => (
                  <View style={{ width: ONBOARDING_PAGE_GAP }} />
                )}
                renderItem={({ item, index }) => (
                  <View style={{ width: pageWidth, flex: 1 }}>
                    <ScrollView
                      ref={(node) => {
                        scrollViewRefs.current[index] = node;
                      }}
                      style={{ flex: 1 }}
                      contentContainerStyle={{
                        flexGrow: 1,
                        paddingTop: ONBOARDING_CONTENT_TOP_PADDING,
                        paddingBottom: 24,
                        paddingHorizontal: ONBOARDING_HORIZONTAL_PADDING,
                      }}
                      directionalLockEnabled
                      showsVerticalScrollIndicator={false}
                    >
                      <View className="gap-7">
                        <View className="gap-3">
                          <Text className="text-sm font-medium text-success">
                            {item.eyebrow}
                          </Text>
                          <Text className="text-[34px] font-bold leading-tight text-black dark:text-white">
                            {item.title}
                          </Text>
                          <Text className="text-base leading-6 text-foreground/60">
                            {item.description}
                          </Text>
                        </View>

                        <View>{item.preview}</View>
                      </View>
                    </ScrollView>

                    <View
                      className="gap-3 pt-4"
                      style={{ paddingHorizontal: ONBOARDING_HORIZONTAL_PADDING }}
                    >
                      <Button
                        size="lg"
                        className="rounded-3xl"
                        onPressIn={hapticSelection}
                        onPress={() => {
                          handlePrimaryPress(index);
                        }}
                      >
                        <Button.Label className="text-white">
                          {index === ONBOARDING_STEPS.length - 1
                            ? "첫 구독 추가하기"
                            : "다음"}
                        </Button.Label>
                      </Button>

                      <View
                        style={{
                          minHeight: ONBOARDING_SECONDARY_CTA_SLOT_HEIGHT,
                          justifyContent: "center",
                        }}
                      >
                        {index === ONBOARDING_STEPS.length - 1 ? (
                          <Pressable
                            onPressIn={hapticSelection}
                            onPress={() => {
                              handleSkip(index);
                            }}
                            className="items-center py-2"
                          >
                            <Text className="text-sm font-medium text-foreground/50">
                              나중에 둘러볼게요
                            </Text>
                          </Pressable>
                        ) : null}
                      </View>
                    </View>
                  </View>
                )}
              />
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
