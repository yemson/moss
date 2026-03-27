import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import { hapticSelection } from "@/lib/haptics";
import {
  BILLING_CYCLE_OPTIONS,
  isBillingCycle,
  type SelectOption,
} from "@/lib/subscription-editor";
import type { BillingCycle } from "@/lib/subscription-store";
import {
  SUBSCRIPTION_TEMPLATES,
  getSubscriptionTemplate,
} from "@/lib/subscription-templates";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Image as ExpoImage } from "expo-image";
import {
  BottomSheet,
  Button,
  Input,
  Select,
  Separator,
  Switch,
  TextArea,
  TextField,
} from "heroui-native";
import { Fragment, useEffect, useRef } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { SubscriptionNotificationLeadDaySelector } from "./subscription-notification-lead-day-selector";

const SPINNER_PICKER_HEIGHT = 216;
const SPINNER_PICKER_WIDTH = 320;

export interface SubscriptionFormValues {
  templateKey?: string | null;
  serviceName: string;
  amount: string;
  billingDate: string;
  isReminderEnabled: boolean;
  notificationLeadDays: number[];
  notificationsEnabled: boolean;
  billingCycle: BillingCycle;
  memo: string;
  categoryId: string | null;
  billingDateDraft: Date;
  isBillingDateSheetOpen: boolean;
}

interface SubscriptionFormProps {
  mode: "create" | "edit";
  values: SubscriptionFormValues;
  categoryOptions: SelectOption[];
  onTemplateChange?: (templateKey: string | null) => void;
  onServiceNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onBillingCycleChange: (value: BillingCycle) => void;
  onReminderEnabledChange: (nextEnabled: boolean) => void;
  onNotificationLeadDaysChange: (nextLeadDays: number[]) => void;
  onBillingDateSheetOpenChange: (nextOpen: boolean) => void;
  onBillingDateDraftChange: (date: Date) => void;
  onBillingDateApply: () => void;
  onCategoryChange: (categoryId: string) => void;
  onMemoChange: (value: string) => void;
}

export function SubscriptionForm({
  mode,
  values,
  categoryOptions,
  onTemplateChange,
  onServiceNameChange,
  onAmountChange,
  onBillingCycleChange,
  onReminderEnabledChange,
  onNotificationLeadDaysChange,
  onBillingDateSheetOpenChange,
  onBillingDateDraftChange,
  onBillingDateApply,
  onCategoryChange,
  onMemoChange,
}: SubscriptionFormProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const billingDatePickerHeight = SPINNER_PICKER_HEIGHT;
  const billingDatePickerWidth = Math.min(
    screenWidth - 60,
    SPINNER_PICKER_WIDTH,
  );
  const templateSelectMaxHeight = Math.min(screenHeight * 0.55, 420);
  const categorySelectMaxHeight = Math.min(screenHeight * 0.55, 420);
  const selectedBillingCycle = BILLING_CYCLE_OPTIONS.find(
    (option) => option.value === values.billingCycle,
  );
  const selectedCategory = categoryOptions.find(
    (option) => option.value === values.categoryId,
  );
  const dateFieldLabel = "결제일";
  const dateFieldValue = values.billingDate;
  const dateSheetTitle = "결제일 선택";
  const dateSheetDescription = "구독을 시작한 날짜를 선택하세요.";
  const isDateSheetOpen = values.isBillingDateSheetOpen;
  const dateDraft = values.billingDateDraft;
  const selectedTemplate =
    values.templateKey != null
      ? {
          value: values.templateKey,
          label:
            getSubscriptionTemplate(values.templateKey)?.name ?? "템플릿 선택",
        }
      : { value: "__custom", label: "직접 입력" };

  const scrollToFocusedField = (target: number | null | undefined) => {
    if (!target) {
      return;
    }

    setTimeout(() => {
      (
        scrollViewRef.current as unknown as {
          scrollResponderScrollNativeHandleToKeyboard?: (
            nodeHandle: number,
            additionalOffset?: number,
            preventNegativeScrollOffset?: boolean,
          ) => void;
        }
      )?.scrollResponderScrollNativeHandleToKeyboard?.(target, 72, true);
    }, 60);
  };

  const dismissKeyboardAndHaptic = () => {
    Keyboard.dismiss();
    hapticSelection();
  };

  useEffect(() => {
    if (mode !== "create" || !onTemplateChange) {
      return;
    }

    const logoSources = SUBSCRIPTION_TEMPLATES.flatMap((template) =>
      typeof template.logo === "number" ? [template.logo] : [],
    );

    if (logoSources.length === 0) {
      return;
    }

    void Promise.all(
      logoSources.map((logoSource) => ExpoImage.loadAsync(logoSource)),
    );
  }, [mode, onTemplateChange]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior="padding"
      keyboardVerticalOffset={8}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        ref={scrollViewRef}
        style={{ flex: 1, paddingTop: 15 }}
        className="flex-1 px-4"
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="none"
        contentContainerClassName="gap-4 pb-20"
      >
        <>
          {mode === "create" && onTemplateChange && (
            <View className="flex-col">
              <Text className="ml-1 mb-1.5 font-semibold dark:text-white">
                템플릿
              </Text>
              <Select
                value={selectedTemplate}
                onValueChange={(nextValue) => {
                  hapticSelection();

                  if (!nextValue) {
                    return;
                  }

                  onTemplateChange(
                    nextValue.value === "__custom" ? null : nextValue.value,
                  );
                }}
                onOpenChange={(isOpen) => {
                  if (isOpen) {
                    Keyboard.dismiss();
                  }
                }}
                presentation="popover"
              >
                <Select.Trigger
                  className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
                  onPressIn={dismissKeyboardAndHaptic}
                >
                  <Select.Value placeholder="템플릿 선택" />
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
                    <Select.ListLabel className="mb-2">
                      템플릿 선택
                    </Select.ListLabel>
                    <ScrollView
                      style={{ maxHeight: templateSelectMaxHeight }}
                      showsVerticalScrollIndicator
                    >
                      <Select.Item value="__custom" label="직접 입력">
                        <View className="flex-row items-center gap-3 flex-1">
                          <View className="h-10 w-10 items-center justify-center rounded-xl bg-surface-secondary">
                            <Text className="font-semibold text-surface-foreground">
                              +
                            </Text>
                          </View>
                          <View className="flex-1">
                            <Select.ItemLabel />
                            <Select.ItemDescription>
                              템플릿 없이 직접 입력
                            </Select.ItemDescription>
                          </View>
                        </View>
                        <Select.ItemIndicator />
                      </Select.Item>
                      <Separator className="my-1 opacity-40" />
                      {SUBSCRIPTION_TEMPLATES.map((template, index) => (
                        <Fragment key={template.key}>
                          <Select.Item
                            value={template.key}
                            label={template.name}
                          >
                            <View className="flex-row items-center gap-3 flex-1">
                              <SubscriptionServiceBadge
                                name={template.name}
                                templateKey={template.key}
                                size="sm"
                              />
                              <View className="flex-1">
                                <Select.ItemLabel />
                                <Select.ItemDescription>
                                  {template.categoryLabel}
                                </Select.ItemDescription>
                              </View>
                            </View>
                            <Select.ItemIndicator />
                          </Select.Item>
                          {index < SUBSCRIPTION_TEMPLATES.length - 1 && (
                            <Separator className="my-1 opacity-40" />
                          )}
                        </Fragment>
                      ))}
                    </ScrollView>
                  </Select.Content>
                </Select.Portal>
              </Select>
            </View>
          )}

          <TextField isRequired>
            <Text className="ml-1 font-semibold dark:text-white">
              서비스 이름
            </Text>
            <Input
              className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
              value={values.serviceName}
              onChangeText={onServiceNameChange}
              onFocus={(event) => {
                hapticSelection();
              }}
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
              <Select.Trigger
                className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
                onPressIn={dismissKeyboardAndHaptic}
              >
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
                  <ScrollView
                    style={{ maxHeight: categorySelectMaxHeight }}
                    showsVerticalScrollIndicator
                  >
                    {categoryOptions.map((option, index) => (
                      <Fragment key={option.value}>
                        <Select.Item value={option.value} label={option.label} />
                        {index < categoryOptions.length - 1 && (
                          <Separator className="opacity-40" />
                        )}
                      </Fragment>
                    ))}
                  </ScrollView>
                </Select.Content>
              </Select.Portal>
            </Select>
          </View>

          <TextField isRequired>
            <Text className="ml-1 font-semibold dark:text-white">결제액</Text>
            <Input
              className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
              value={values.amount}
              onChangeText={onAmountChange}
              onFocus={(event) => {
                hapticSelection();
                scrollToFocusedField(event.nativeEvent.target);
              }}
              placeholder="예: 17000"
              keyboardType="number-pad"
            />
          </TextField>

          <View className="flex-row items-end gap-3">
            <View className="flex-2">
              <BottomSheet
                isOpen={isDateSheetOpen}
                onOpenChange={onBillingDateSheetOpenChange}
              >
                <TextField isRequired>
                  <Text className="ml-1 font-semibold dark:text-white">
                    {dateFieldLabel}
                  </Text>
                  <BottomSheet.Trigger asChild>
                    <Pressable onPressIn={dismissKeyboardAndHaptic}>
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
                  <BottomSheet.Content
                    className=""
                    contentContainerClassName="gap-4"
                  >
                    <View className="gap-1">
                      <BottomSheet.Title>{dateSheetTitle}</BottomSheet.Title>
                      <BottomSheet.Description>
                        {dateSheetDescription}
                      </BottomSheet.Description>
                    </View>

                    <View
                      className="items-center justify-center overflow-hidden"
                      style={{ minHeight: billingDatePickerHeight }}
                    >
                      <DateTimePicker
                        value={dateDraft}
                        mode="date"
                        display="spinner"
                        locale="ko-KR"
                        onChange={(_event, selectedDate) => {
                          if (selectedDate) {
                            onBillingDateDraftChange(selectedDate);
                          }
                        }}
                        style={{
                          height: billingDatePickerHeight,
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
                          onBillingDateSheetOpenChange(false);
                        }}
                      >
                        <Button.Label>취소</Button.Label>
                      </Button>
                      <Button
                        size="lg"
                        className="flex-1"
                        onPressIn={hapticSelection}
                        onPress={onBillingDateApply}
                      >
                        <Button.Label className="text-white">완료</Button.Label>
                      </Button>
                    </View>
                  </BottomSheet.Content>
                </BottomSheet.Portal>
              </BottomSheet>
            </View>

            <View className="flex-1 gap-2">
              <Text className="ml-1 font-semibold dark:text-white">
                결제 주기
              </Text>
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
                <Select.Trigger
                  className="min-w-25 ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
                  onPressIn={dismissKeyboardAndHaptic}
                >
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
                        <Select.Item
                          value={option.value}
                          label={option.label}
                        />
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

          <View className="flex-row items-end gap-3">
            <View className="flex-2">
              <View className="gap-2 rounded-2xl bg-surface px-4 py-4 ios:shadow-lg shadow-neutral-300/10 dark:shadow-none">
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-1 gap-1">
                    <Text className="font-semibold text-black dark:text-white">
                      알림 받기
                    </Text>
                    <Text className="text-sm text-foreground/50">
                      {values.notificationsEnabled
                        ? "결제 전에 받을 날짜를 여러 개 고를 수 있어요."
                        : "앱 전체 알림이 꺼져 있어 현재는 발송되지 않습니다."}
                    </Text>
                  </View>
                  <Switch
                    isSelected={values.isReminderEnabled}
                    onPressIn={dismissKeyboardAndHaptic}
                    onSelectedChange={(nextSelected) => {
                      onReminderEnabledChange(nextSelected);
                    }}
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
            </View>
          </View>

          {values.isReminderEnabled && (
            <SubscriptionNotificationLeadDaySelector
              selectedLeadDays={values.notificationLeadDays}
              onSelectionChange={onNotificationLeadDaysChange}
            />
          )}

          <Separator className="my-2 opacity-40 mx-1" />

          <TextField>
            <Text className="ml-1 font-semibold dark:text-white">메모</Text>
            <TextArea
              className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none min-h-28"
              value={values.memo}
              onChangeText={onMemoChange}
              onFocus={(event) => {
                hapticSelection();
                scrollToFocusedField(event.nativeEvent.target);
              }}
              placeholder="필요한 내용을 메모로 남겨두세요"
            />
          </TextField>
        </>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
