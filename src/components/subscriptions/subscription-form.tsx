import { hapticSelection } from "@/lib/haptics";
import {
  SUBSCRIPTION_TEMPLATES,
  getSubscriptionTemplate,
} from "@/lib/subscription-templates";
import { SubscriptionServiceBadge } from "@/components/subscriptions/subscription-service-badge";
import {
  BILLING_CYCLE_OPTIONS,
  CURRENCY_OPTIONS,
  isBillingCycle,
  isCurrency,
  type SelectOption,
} from "@/lib/subscription-editor";
import type { BillingCycle, Currency } from "@/lib/subscription-store";
import DateTimePicker from "@react-native-community/datetimepicker";
import {
  BottomSheet,
  Button,
  Input,
  Select,
  Separator,
  TextArea,
  TextField,
} from "heroui-native";
import { Fragment, useRef } from "react";
import {
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

export interface SubscriptionFormValues {
  templateKey?: string | null;
  serviceName: string;
  amount: string;
  currency: Currency;
  billingDate: string;
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
  onCurrencyChange: (value: Currency) => void;
  onBillingCycleChange: (value: BillingCycle) => void;
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
  onCurrencyChange,
  onBillingCycleChange,
  onBillingDateSheetOpenChange,
  onBillingDateDraftChange,
  onBillingDateApply,
  onCategoryChange,
  onMemoChange,
}: SubscriptionFormProps) {
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();
  const billingDatePickerHeight = SPINNER_PICKER_HEIGHT;
  const billingDatePickerWidth = Math.min(
    screenWidth - 60,
    SPINNER_PICKER_WIDTH,
  );
  const selectedCurrency = CURRENCY_OPTIONS.find(
    (option) => option.value === values.currency,
  );
  const selectedBillingCycle = BILLING_CYCLE_OPTIONS.find(
    (option) => option.value === values.billingCycle,
  );
  const selectedCategory = categoryOptions.find(
    (option) => option.value === values.categoryId,
  );
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
        keyboardShouldPersistTaps="always"
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
                    width="full"
                    placement="bottom"
                    align="end"
                  >
                    <Select.ListLabel className="mb-2">
                      템플릿 선택
                    </Select.ListLabel>
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
                        <Select.Item value={template.key} label={template.name}>
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

          <View className="flex-row items-end gap-3">
            <View className="flex-2">
              <TextField isRequired>
                <Text className="ml-1 font-semibold dark:text-white">금액</Text>
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
                    {CURRENCY_OPTIONS.map((option, index) => (
                      <Fragment key={option.value}>
                        <Select.Item
                          value={option.value}
                          label={option.label}
                        />
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
                isOpen={values.isBillingDateSheetOpen}
                onOpenChange={onBillingDateSheetOpenChange}
              >
                <TextField isRequired>
                  <Text className="ml-1 font-semibold dark:text-white">
                    결제일
                  </Text>
                  <BottomSheet.Trigger asChild>
                    <Pressable onPressIn={dismissKeyboardAndHaptic}>
                      <View pointerEvents="none">
                        <Input
                          className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
                          value={values.billingDate}
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
                      <BottomSheet.Title>결제일 선택</BottomSheet.Title>
                      <BottomSheet.Description>
                        구독을 시작한 날짜를 선택하세요.
                      </BottomSheet.Description>
                    </View>

                    <View
                      className="items-center justify-center overflow-hidden"
                      style={{ minHeight: billingDatePickerHeight }}
                    >
                      <DateTimePicker
                        value={values.billingDateDraft}
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
                        onPress={() => onBillingDateSheetOpenChange(false)}
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
