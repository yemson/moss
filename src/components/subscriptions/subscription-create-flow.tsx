import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import { hapticSelection } from "@/lib/haptics";
import {
  BILLING_CYCLE_OPTIONS,
  CURRENCY_OPTIONS,
  isBillingCycle,
  isCurrency,
  parseAmountInput,
  type SelectOption,
} from "@/lib/subscription-editor";
import { SUBSCRIPTION_TEMPLATES } from "@/lib/subscription-templates";
import type { BillingCycle, Currency } from "@/lib/subscription-store";
import { useHeaderHeight } from "@react-navigation/elements";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import {
  BottomSheet,
  Button,
  Input,
  ScrollShadow,
  Select,
  Separator,
  Switch,
  TextArea,
  TextField,
} from "heroui-native";
import { CheckIcon } from "lucide-uniwind";
import { Fragment, useEffect, useMemo, useRef } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";

const SPINNER_PICKER_HEIGHT = 216;
const SPINNER_PICKER_WIDTH = 320;
const CUSTOM_TEMPLATE_VALUE = "__custom";
const STEP_COUNT = 5;
const FLOATING_CTA_BOTTOM_PADDING = 156;

const STEP_CONTENT = [
  {
    eyebrow: "1 / 5",
    title: "서비스 선택",
    description: "자주 쓰는 템플릿을 고르거나 직접 입력으로 시작하세요.",
  },
  {
    eyebrow: "2 / 5",
    title: "기본 정보",
    description: "서비스 이름과 카테고리를 정해주세요.",
  },
  {
    eyebrow: "3 / 5",
    title: "결제 정보",
    description: "금액과 날짜, 무료 체험 여부를 입력하세요.",
  },
  {
    eyebrow: "4 / 5",
    title: "알림",
    description: "결제 하루 전 알림을 받을지 선택하세요.",
  },
  {
    eyebrow: "5 / 5",
    title: "메모",
    description: "필요하면 메모를 남기고 바로 추가하세요.",
  },
] as const;

export interface SubscriptionCreateFlowValues {
  templateSelection: string | null;
  templateKey?: string | null;
  serviceName: string;
  amount: string;
  currency: Currency;
  billingDate: string;
  trialEndDate: string;
  notifyDayBefore: boolean;
  notificationsEnabled: boolean;
  billingCycle: BillingCycle;
  memo: string;
  categoryId: string | null;
  isTrialEnabled: boolean;
  billingDateDraft: Date;
  isBillingDateSheetOpen: boolean;
  trialEndDateDraft: Date;
  isTrialEndDateSheetOpen: boolean;
}

interface SubscriptionCreateFlowProps {
  currentStep: number;
  isSaving: boolean;
  values: SubscriptionCreateFlowValues;
  categoryOptions: SelectOption[];
  onStepChange: (nextStep: number) => void;
  onTemplateSelectionChange: (templateSelection: string) => void;
  onServiceNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: Currency) => void;
  onBillingCycleChange: (value: BillingCycle) => void;
  onTrialEnabledChange: (nextEnabled: boolean) => void;
  onNotifyDayBeforeChange: (nextEnabled: boolean) => void;
  onBillingDateSheetOpenChange: (nextOpen: boolean) => void;
  onBillingDateDraftChange: (date: Date) => void;
  onBillingDateApply: () => void;
  onTrialEndDateSheetOpenChange: (nextOpen: boolean) => void;
  onTrialEndDateDraftChange: (date: Date) => void;
  onTrialEndDateApply: () => void;
  onCategoryChange: (categoryId: string) => void;
  onMemoChange: (value: string) => void;
  onSubmit: () => void;
}

function getStepState(step: number, values: SubscriptionCreateFlowValues) {
  if (step === 0) {
    return {
      canProceed: values.templateSelection != null,
    };
  }

  if (step === 1) {
    if (!values.serviceName.trim()) {
      return {
        canProceed: false,
      };
    }

    if (!values.categoryId) {
      return {
        canProceed: false,
      };
    }

    return { canProceed: true };
  }

  if (step === 2) {
    if (parseAmountInput(values.amount, values.currency) == null) {
      return {
        canProceed: false,
      };
    }

    if (values.isTrialEnabled && !values.trialEndDate.trim()) {
      return {
        canProceed: false,
      };
    }

    if (!values.isTrialEnabled && !values.billingDate.trim()) {
      return {
        canProceed: false,
      };
    }

    return { canProceed: true };
  }

  return { canProceed: true };
}

export function SubscriptionCreateFlow({
  currentStep,
  isSaving,
  values,
  categoryOptions,
  onStepChange,
  onTemplateSelectionChange,
  onServiceNameChange,
  onAmountChange,
  onCurrencyChange,
  onBillingCycleChange,
  onTrialEnabledChange,
  onNotifyDayBeforeChange,
  onBillingDateSheetOpenChange,
  onBillingDateDraftChange,
  onBillingDateApply,
  onTrialEndDateSheetOpenChange,
  onTrialEndDateDraftChange,
  onTrialEndDateApply,
  onCategoryChange,
  onMemoChange,
  onSubmit,
}: SubscriptionCreateFlowProps) {
  const { width: screenWidth } = useWindowDimensions();
  const headerHeight = useHeaderHeight();
  const translateX = useRef(new Animated.Value(0)).current;
  const billingDatePickerWidth = Math.min(
    screenWidth - 60,
    SPINNER_PICKER_WIDTH,
  );
  const selectedCategory = categoryOptions.find(
    (option) => option.value === values.categoryId,
  );
  const selectedCurrency = CURRENCY_OPTIONS.find(
    (option) => option.value === values.currency,
  );
  const selectedBillingCycle = BILLING_CYCLE_OPTIONS.find(
    (option) => option.value === values.billingCycle,
  );
  const dateFieldLabel = values.isTrialEnabled ? "무료 체험 종료일" : "결제일";
  const dateFieldValue = values.isTrialEnabled
    ? values.trialEndDate
    : values.billingDate;
  const dateSheetTitle = values.isTrialEnabled
    ? "무료 체험 종료일 선택"
    : "결제일 선택";
  const dateSheetDescription = values.isTrialEnabled
    ? "종료일이 첫 유료 결제일이 됩니다."
    : "구독을 시작한 날짜를 선택하세요.";
  const isDateSheetOpen = values.isTrialEnabled
    ? values.isTrialEndDateSheetOpen
    : values.isBillingDateSheetOpen;
  const dateDraft = values.isTrialEnabled
    ? values.trialEndDateDraft
    : values.billingDateDraft;
  const currentStepState = useMemo(
    () => getStepState(currentStep, values),
    [currentStep, values],
  );
  const isLastStep = currentStep === STEP_COUNT - 1;
  const ctaLabel = isLastStep ? "추가" : "다음";
  const ctaDisabled = isSaving || !currentStepState.canProceed;

  useEffect(() => {
    Animated.spring(translateX, {
      toValue: -currentStep * screenWidth,
      useNativeDriver: true,
      damping: 50,
      stiffness: 220,
      mass: 0.9,
    }).start();
  }, [currentStep, screenWidth, translateX]);

  const renderStepHeader = (step: number) => (
    <View className="mb-6 gap-1">
      <Text className="text-sm font-medium text-success">
        {STEP_CONTENT[step].eyebrow}
      </Text>
      <Text className="text-[28px] font-bold text-black dark:text-white">
        {STEP_CONTENT[step].title}
      </Text>
      <Text className="text-sm text-foreground/55">
        {STEP_CONTENT[step].description}
      </Text>
    </View>
  );

  const renderTemplateStep = () => (
    <View
      key="templates"
      style={{
        width: screenWidth,
        flex: 1,
        paddingTop: headerHeight + 15,
        paddingBottom: FLOATING_CTA_BOTTOM_PADDING,
      }}
      className="flex-1 px-4"
    >
      {renderStepHeader(0)}

      <View className="min-h-0 flex-1">
        <ScrollShadow
          size={28}
          LinearGradientComponent={LinearGradient}
          className="min-h-0 flex-1"
        >
          <ScrollView
            className="flex-1"
            contentInsetAdjustmentBehavior="automatic"
            keyboardDismissMode="none"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              gap: 12,
              paddingBottom: 24,
            }}
          >
            <Pressable
              onPressIn={hapticSelection}
              onPress={() => {
                onTemplateSelectionChange(CUSTOM_TEMPLATE_VALUE);
              }}
              className={`rounded-3xl border px-4 py-4 ${
                values.templateSelection === CUSTOM_TEMPLATE_VALUE
                  ? "border-success bg-success-soft"
                  : "border-border bg-surface"
              }`}
            >
              <View className="flex-row items-center gap-3">
                <View className="h-12 w-12 items-center justify-center rounded-2xl bg-surface-secondary">
                  <Text className="text-lg font-semibold text-surface-foreground">
                    +
                  </Text>
                </View>
                <View className="flex-1 gap-0.5">
                  <Text className="font-semibold text-black dark:text-white">
                    직접 입력
                  </Text>
                  <Text className="text-sm text-foreground/50">
                    템플릿 없이 직접 서비스 정보를 입력합니다.
                  </Text>
                </View>
                {values.templateSelection === CUSTOM_TEMPLATE_VALUE && (
                  <CheckIcon className="text-success" />
                )}
              </View>
            </Pressable>

            {SUBSCRIPTION_TEMPLATES.map((template) => {
              const isSelected = values.templateSelection === template.key;

              return (
                <Pressable
                  key={template.key}
                  onPressIn={hapticSelection}
                  onPress={() => {
                    onTemplateSelectionChange(template.key);
                  }}
                  className={`rounded-3xl border px-4 py-4 ${
                    isSelected
                      ? "border-success bg-success-soft"
                      : "border-border bg-surface"
                  }`}
                >
                  <View className="flex-row items-center gap-3">
                    <SubscriptionServiceBadge
                      name={template.name}
                      templateKey={template.key}
                      size="sm"
                    />
                    <View className="flex-1 gap-0.5">
                      <Text className="font-semibold text-black dark:text-white">
                        {template.name}
                      </Text>
                      <Text className="text-sm text-foreground/50">
                        {template.categoryLabel}
                      </Text>
                    </View>
                    {isSelected && <CheckIcon className="text-success" />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </ScrollShadow>
      </View>
    </View>
  );

  const renderServiceInfoStep = () => (
    <ScrollView
      key="service"
      contentInsetAdjustmentBehavior="automatic"
      style={{ width: screenWidth, flex: 1, paddingTop: 15 }}
      className="flex-1 px-4"
      keyboardDismissMode="none"
      contentContainerStyle={{
        paddingBottom: FLOATING_CTA_BOTTOM_PADDING,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {renderStepHeader(1)}

      <TextField isRequired>
        <Text className="ml-1 font-semibold dark:text-white">서비스 이름</Text>
        <Input
          className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
          value={values.serviceName}
          onChangeText={onServiceNameChange}
          onFocus={hapticSelection}
          placeholder="예: Netflix"
          autoCapitalize="none"
        />
      </TextField>

      <View className="flex-col">
        <Text className="ml-1 mb-1.5 font-semibold dark:text-white">
          카테고리
        </Text>
        <Select
          value={selectedCategory}
          onValueChange={(nextValue) => {
            hapticSelection();

            if (nextValue) {
              onCategoryChange(nextValue.value);
            }
          }}
          onOpenChange={(isOpen) => {
            if (isOpen) {
              Keyboard.dismiss();
            }
          }}
          isDisabled={categoryOptions.length === 0}
          presentation="popover"
        >
          <Select.Trigger className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none">
            <Select.Value placeholder="선택" />
            <Select.TriggerIndicator />
          </Select.Trigger>
          <Select.Portal>
            <Select.Overlay className="bg-black/20 dark:bg-black/40" />
            <Select.Content
              presentation="popover"
              width="full"
              placement="bottom"
              align="end"
            >
              <Select.ListLabel className="mb-1">카테고리</Select.ListLabel>
              {categoryOptions.map((option, index) => (
                <Fragment key={option.value}>
                  <Select.Item value={option.value} label={option.label} />
                  {index < categoryOptions.length - 1 && (
                    <Separator className="opacity-40" />
                  )}
                </Fragment>
              ))}
            </Select.Content>
          </Select.Portal>
        </Select>
      </View>
    </ScrollView>
  );

  const renderBillingStep = () => (
    <ScrollView
      key="billing"
      contentInsetAdjustmentBehavior="automatic"
      style={{ width: screenWidth, flex: 1, paddingTop: 15 }}
      className="flex-1 px-4"
      keyboardDismissMode="none"
      contentContainerStyle={{
        paddingBottom: FLOATING_CTA_BOTTOM_PADDING,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {renderStepHeader(2)}

      <View className="flex-row items-end gap-3">
        <View className="flex-2">
          <TextField isRequired>
            <Text className="ml-1 font-semibold dark:text-white">금액</Text>
            <Input
              className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
              value={values.amount}
              onChangeText={onAmountChange}
              onFocus={hapticSelection}
              placeholder="예: 17000"
              keyboardType={
                values.currency === "USD" ? "decimal-pad" : "number-pad"
              }
            />
          </TextField>
        </View>
        <View className="flex-1 gap-2">
          <Text className="ml-1 font-semibold dark:text-white">통화</Text>
          <Select
            value={selectedCurrency}
            onValueChange={(nextValue) => {
              hapticSelection();

              if (nextValue && isCurrency(nextValue.value)) {
                onCurrencyChange(nextValue.value);
              }
            }}
            onOpenChange={(isOpen) => {
              if (isOpen) {
                Keyboard.dismiss();
              }
            }}
            presentation="popover"
          >
            <Select.Trigger className="min-w-25 ios:shadow-lg shadow-neutral-300/10 dark:shadow-none">
              <Select.Value placeholder="선택" />
              <Select.TriggerIndicator />
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay className="bg-black/20 dark:bg-black/40" />
              <Select.Content
                presentation="popover"
                width="trigger"
                placement="bottom"
                align="end"
              >
                {CURRENCY_OPTIONS.map((option, index) => (
                  <Fragment key={option.value}>
                    <Select.Item value={option.value} label={option.label} />
                    {index < CURRENCY_OPTIONS.length - 1 && (
                      <Separator className="opacity-40" />
                    )}
                  </Fragment>
                ))}
              </Select.Content>
            </Select.Portal>
          </Select>
        </View>
      </View>

      <View className="flex-row items-end gap-3">
        <View className="flex-2">
          <BottomSheet
            isOpen={isDateSheetOpen}
            onOpenChange={(nextOpen) => {
              if (values.isTrialEnabled) {
                onTrialEndDateSheetOpenChange(nextOpen);
                return;
              }

              onBillingDateSheetOpenChange(nextOpen);
            }}
          >
            <TextField isRequired>
              <Text className="ml-1 font-semibold dark:text-white">
                {dateFieldLabel}
              </Text>
              <BottomSheet.Trigger asChild>
                <Pressable
                  onPressIn={() => {
                    Keyboard.dismiss();
                    hapticSelection();
                  }}
                >
                  <View pointerEvents="none">
                    <Input
                      className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
                      value={dateFieldValue}
                      placeholder="YYYY-MM-DD"
                      editable={false}
                      showSoftInputOnFocus={false}
                    />
                  </View>
                </Pressable>
              </BottomSheet.Trigger>
            </TextField>

            <BottomSheet.Portal>
              <BottomSheet.Overlay className="bg-black/20 dark:bg-black/40" />
              <BottomSheet.Content contentContainerClassName="gap-4">
                <View className="gap-1">
                  <BottomSheet.Title>{dateSheetTitle}</BottomSheet.Title>
                  <BottomSheet.Description>
                    {dateSheetDescription}
                  </BottomSheet.Description>
                </View>

                <View
                  className="items-center justify-center overflow-hidden"
                  style={{ minHeight: SPINNER_PICKER_HEIGHT }}
                >
                  <DateTimePicker
                    value={dateDraft}
                    mode="date"
                    display="spinner"
                    locale="ko-KR"
                    onChange={(_event, selectedDate) => {
                      if (!selectedDate) {
                        return;
                      }

                      if (values.isTrialEnabled) {
                        onTrialEndDateDraftChange(selectedDate);
                        return;
                      }

                      onBillingDateDraftChange(selectedDate);
                    }}
                    style={{
                      height: SPINNER_PICKER_HEIGHT,
                      width: billingDatePickerWidth,
                    }}
                  />
                </View>

                <View className="mt-4 flex-row gap-2">
                  <Button
                    variant="secondary"
                    className="flex-1"
                    size="lg"
                    onPress={() => {
                      if (values.isTrialEnabled) {
                        onTrialEndDateSheetOpenChange(false);
                        return;
                      }

                      onBillingDateSheetOpenChange(false);
                    }}
                  >
                    <Button.Label>취소</Button.Label>
                  </Button>
                  <Button
                    size="lg"
                    className="flex-1"
                    onPressIn={hapticSelection}
                    onPress={() => {
                      if (values.isTrialEnabled) {
                        onTrialEndDateApply();
                        return;
                      }

                      onBillingDateApply();
                    }}
                  >
                    <Button.Label className="text-white">완료</Button.Label>
                  </Button>
                </View>
              </BottomSheet.Content>
            </BottomSheet.Portal>
          </BottomSheet>
        </View>

        <View className="flex-1 gap-2">
          <Text className="ml-1 font-semibold dark:text-white">결제 주기</Text>
          <Select
            value={selectedBillingCycle}
            onValueChange={(nextValue) => {
              hapticSelection();

              if (nextValue && isBillingCycle(nextValue.value)) {
                onBillingCycleChange(nextValue.value);
              }
            }}
            onOpenChange={(isOpen) => {
              if (isOpen) {
                Keyboard.dismiss();
              }
            }}
            presentation="popover"
          >
            <Select.Trigger className="min-w-25 ios:shadow-lg shadow-neutral-300/10 dark:shadow-none">
              <Select.Value placeholder="선택" />
              <Select.TriggerIndicator />
            </Select.Trigger>
            <Select.Portal>
              <Select.Overlay className="bg-black/20 dark:bg-black/40" />
              <Select.Content
                presentation="popover"
                width="trigger"
                placement="bottom"
                align="end"
              >
                {BILLING_CYCLE_OPTIONS.map((option, index) => (
                  <Fragment key={option.value}>
                    <Select.Item value={option.value} label={option.label} />
                    {index < BILLING_CYCLE_OPTIONS.length - 1 && (
                      <Separator className="opacity-40" />
                    )}
                  </Fragment>
                ))}
              </Select.Content>
            </Select.Portal>
          </Select>
        </View>
      </View>

      <View className="gap-2 rounded-3xl bg-surface px-4 py-4 ios:shadow-lg shadow-neutral-300/10 dark:shadow-none">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-black dark:text-white">
              무료 체험
            </Text>
            <Text className="text-sm text-foreground/50">
              종료일이 첫 유료 결제일이 됩니다.
            </Text>
          </View>
          <Switch
            isSelected={values.isTrialEnabled}
            onPressIn={hapticSelection}
            onSelectedChange={onTrialEnabledChange}
          >
            <Switch.Thumb
              animation={{
                backgroundColor: {
                  value: ["#ffffff", "#ffffff"],
                },
              }}
            />
          </Switch>
        </View>
      </View>
    </ScrollView>
  );

  const renderNotificationStep = () => (
    <ScrollView
      key="notification"
      contentInsetAdjustmentBehavior="automatic"
      style={{ width: screenWidth, flex: 1, paddingTop: 15 }}
      className="flex-1 px-4"
      keyboardDismissMode="none"
      contentContainerStyle={{
        paddingBottom: FLOATING_CTA_BOTTOM_PADDING,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {renderStepHeader(3)}

      <View className="gap-2 rounded-3xl bg-surface px-4 py-4 ios:shadow-lg shadow-neutral-300/10 dark:shadow-none">
        <View className="flex-row items-center justify-between gap-4">
          <View className="flex-1 gap-1">
            <Text className="font-semibold text-black dark:text-white">
              하루 전 알림
            </Text>
            <Text className="text-sm text-foreground/50">
              {values.notificationsEnabled
                ? "오전 10시에 내일 결제 예정인 구독을 알려드려요."
                : "앱 전체 알림이 꺼져 있어 현재는 발송되지 않습니다."}
            </Text>
          </View>
          <Switch
            isSelected={values.notifyDayBefore}
            onPressIn={hapticSelection}
            onSelectedChange={onNotifyDayBeforeChange}
          >
            <Switch.Thumb
              animation={{
                backgroundColor: {
                  value: ["#ffffff", "#ffffff"],
                },
              }}
            />
          </Switch>
        </View>
      </View>
    </ScrollView>
  );

  const renderMemoStep = () => (
    <ScrollView
      key="memo"
      contentInsetAdjustmentBehavior="automatic"
      style={{ width: screenWidth, flex: 1, paddingTop: 15 }}
      className="flex-1 px-4"
      keyboardDismissMode="none"
      contentContainerStyle={{
        paddingBottom: FLOATING_CTA_BOTTOM_PADDING,
        gap: 16,
      }}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {renderStepHeader(4)}

      <TextField>
        <Text className="ml-1 font-semibold dark:text-white">메모</Text>
        <TextArea
          className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none min-h-40"
          value={values.memo}
          onChangeText={onMemoChange}
          onFocus={hapticSelection}
          placeholder="필요한 내용을 메모로 남겨두세요"
        />
      </TextField>
    </ScrollView>
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
    >
      <View className="flex-1">
        <View className="flex-1 overflow-hidden">
          <Animated.View
            style={{
              flex: 1,
              flexDirection: "row",
              width: screenWidth * STEP_COUNT,
              transform: [{ translateX }],
            }}
          >
            {renderTemplateStep()}
            {renderServiceInfoStep()}
            {renderBillingStep()}
            {renderNotificationStep()}
            {renderMemoStep()}
          </Animated.View>
        </View>

        <View className="absolute inset-x-0 bottom-0 px-4 pb-8 pt-3">
          <Button
            size="lg"
            className="ios:shadow-xl rounded-3xl shadow-black/10 dark:shadow-black/30 disabled:opacity-100 disabled:bg-neutral-500"
            isDisabled={ctaDisabled}
            onPressIn={hapticSelection}
            onPress={() => {
              if (isLastStep) {
                onSubmit();
                return;
              }

              onStepChange(currentStep + 1);
            }}
          >
            <Button.Label className="text-white">{ctaLabel}</Button.Label>
          </Button>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
