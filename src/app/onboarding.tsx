import { useAppSettings } from "@/lib/app-settings";
import {
  OnboardingBillingPreview,
  OnboardingHomePreview,
  OnboardingStatisticsPreview,
} from "@/components/onboarding/onboarding-previews";
import { track } from "@/lib/analytics";
import { hapticSelection } from "@/lib/haptics";
import { Stack, useRouter } from "expo-router";
import { Button } from "heroui-native";
import { useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
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
      "구독마다 결제일과 주기를 기록하고, 하루 전 알림으로 다가오는 결제를 미리 확인할 수 있어요.",
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

export default function OnboardingRoute() {
  const router = useRouter();
  const { setHasCompletedOnboarding } = useAppSettings();
  const { theme } = useUniwind();
  const [currentStep, setCurrentStep] = useState(0);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const step = ONBOARDING_STEPS[currentStep];
  const backgroundColor = theme === "dark" ? "#000000" : "#F5F5F5";

  useEffect(() => {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }, [currentStep]);

  useEffect(() => {
    track("onboarding_started");
  }, []);

  useEffect(() => {
    track("onboarding_step_viewed", {
      step: currentStep + 1,
    });
  }, [currentStep]);

  const handleComplete = () => {
    setHasCompletedOnboarding(true);
  };

  const handleSkip = () => {
    track("onboarding_skipped", {
      step: currentStep + 1,
    });
    handleComplete();
    router.replace("/");
  };

  const handlePrimaryPress = () => {
    track("onboarding_primary_cta_tapped", {
      step: currentStep + 1,
    });

    if (!isLastStep) {
      setCurrentStep((current) => current + 1);
      return;
    }

    track("onboarding_completed");
    handleComplete();
    router.replace("/");

    setTimeout(() => {
      router.push("/subscriptions/new");
    }, 0);
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />

      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor,
          paddingHorizontal: 24,
          paddingTop: 16,
          paddingBottom: 32,
        }}
      >
        <View style={{ flex: 1 }}>
          <View className="flex-row items-center justify-between">
            <View className="flex-row gap-2">
              {ONBOARDING_STEPS.map((item, index) => (
                <View
                  key={item.eyebrow}
                  className={`h-1.5 rounded-full ${
                    index === currentStep ? "w-8 bg-success" : "w-3 bg-border"
                  }`}
                />
              ))}
            </View>

            {!isLastStep ? (
              <Pressable
                onPressIn={hapticSelection}
                onPress={handleSkip}
                hitSlop={10}
              >
                <Text className="text-sm font-medium text-foreground/50">
                  건너뛰기
                </Text>
              </Pressable>
            ) : (
              <View />
            )}
          </View>

          <ScrollView
            ref={scrollViewRef}
            style={{ flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              paddingTop: 40,
              paddingBottom: 24,
            }}
            showsVerticalScrollIndicator={false}
          >
            <View className="gap-7">
              <View className="gap-3">
                <Text className="text-sm font-medium text-success">
                  {step.eyebrow}
                </Text>
                <Text className="text-[34px] font-bold leading-tight text-black dark:text-white">
                  {step.title}
                </Text>
                <Text className="text-base leading-6 text-foreground/60">
                  {step.description}
                </Text>
              </View>

              <View>{step.preview}</View>
            </View>
          </ScrollView>

          <View className="gap-3 pt-4">
            <Button
              size="lg"
              className="rounded-3xl"
              onPressIn={hapticSelection}
              onPress={handlePrimaryPress}
            >
              <Button.Label className="text-white">
                {isLastStep ? "첫 구독 추가하기" : "다음"}
              </Button.Label>
            </Button>

            {isLastStep ? (
              <Pressable
                onPressIn={hapticSelection}
                onPress={handleSkip}
                className="items-center py-2"
              >
                <Text className="text-sm font-medium text-foreground/50">
                  나중에 둘러볼게요
                </Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      </SafeAreaView>
    </>
  );
}
