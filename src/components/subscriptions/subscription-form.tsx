import { hapticSelection } from "@/lib/haptics";
import {
  BILLING_CYCLE_OPTIONS,
  CURRENCY_OPTIONS,
  isBillingCycle,
  isCurrency,
  type SelectOption,
} from "@/lib/subscription-editor";
import type { BillingCycle, Currency } from "@/lib/subscription-store";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useHeaderHeight } from "@react-navigation/elements";
import {
  Button,
  Dialog,
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
  serviceName: string;
  amount: string;
  currency: Currency;
  billingDate: string;
  billingCycle: BillingCycle;
  memo: string;
  categoryId: string | null;
  billingDateDraft: Date;
  isBillingDateDialogOpen: boolean;
}

interface SubscriptionFormProps {
  mode: "create" | "edit";
  values: SubscriptionFormValues;
  categoryOptions: SelectOption[];
  isLoading: boolean;
  isInvalidRoute?: boolean;
  onServiceNameChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onCurrencyChange: (value: Currency) => void;
  onBillingCycleChange: (value: BillingCycle) => void;
  onBillingDateDialogOpenChange: (nextOpen: boolean) => void;
  onBillingDateDraftChange: (date: Date) => void;
  onBillingDateApply: () => void;
  onCategoryChange: (categoryId: string) => void;
  onMemoChange: (value: string) => void;
}

export function SubscriptionForm({
  mode,
  values,
  categoryOptions,
  isLoading,
  isInvalidRoute = false,
  onServiceNameChange,
  onAmountChange,
  onCurrencyChange,
  onBillingCycleChange,
  onBillingDateDialogOpenChange,
  onBillingDateDraftChange,
  onBillingDateApply,
  onCategoryChange,
  onMemoChange,
}: SubscriptionFormProps) {
  const headerHeight = useHeaderHeight();
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
        ref={scrollViewRef}
        style={{ flex: 1, paddingTop: headerHeight + 15 }}
        className="flex-1 px-4"
        keyboardShouldPersistTaps="always"
        keyboardDismissMode="none"
        contentContainerClassName="gap-4 pb-20"
      >
        {isLoading && (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            구독 정보를 불러오는 중...
          </Text>
        )}

        {isInvalidRoute && (
          <Text className="text-sm text-neutral-500 dark:text-neutral-400">
            수정할 구독 정보를 찾을 수 없습니다.
          </Text>
        )}

        {!isLoading && !isInvalidRoute && (
          <>
            <TextField isRequired>
              <Text className="ml-1 font-semibold dark:text-white">
                서비스 이름
              </Text>
              <Input
                className="ios:shadow-none"
                value={values.serviceName}
                onChangeText={onServiceNameChange}
                onFocus={(event) =>
                  scrollToFocusedField(event.nativeEvent.target)
                }
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
                  className="ios:shadow-none"
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
                    <Select.ListLabel className="mb-1">
                      카테고리
                    </Select.ListLabel>
                    {categoryOptions.map((option, index) => (
                      <Fragment key={option.value}>
                        <Select.Item
                          value={option.value}
                          label={option.label}
                        />
                        {index < categoryOptions.length - 1 && <Separator />}
                      </Fragment>
                    ))}
                  </Select.Content>
                </Select.Portal>
              </Select>
            </View>

            <View className="flex-row items-end gap-3">
              <View className="flex-2">
                <TextField isRequired>
                  <Text className="ml-1 font-semibold dark:text-white">
                    금액
                  </Text>
                  <Input
                    className="ios:shadow-none"
                    value={values.amount}
                    onChangeText={onAmountChange}
                    onFocus={(event) =>
                      scrollToFocusedField(event.nativeEvent.target)
                    }
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
                    className="min-w-25 ios:shadow-none"
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
                          {index < CURRENCY_OPTIONS.length - 1 && <Separator />}
                        </Fragment>
                      ))}
                    </Select.Content>
                  </Select.Portal>
                </Select>
              </View>
            </View>

            <View className="flex-row items-end gap-3">
              <View className="flex-2">
                <Dialog
                  isOpen={values.isBillingDateDialogOpen}
                  onOpenChange={onBillingDateDialogOpenChange}
                >
                  <TextField isRequired>
                    <Text className="ml-1 font-semibold dark:text-white">
                      결제일
                    </Text>
                    <Dialog.Trigger asChild>
                      <Pressable onPressIn={dismissKeyboardAndHaptic}>
                        <View pointerEvents="none">
                          <Input
                            className="ios:shadow-none"
                            value={values.billingDate}
                            placeholder="YYYY-MM-DD"
                            editable={false}
                            showSoftInputOnFocus={false}
                          />
                        </View>
                      </Pressable>
                    </Dialog.Trigger>
                  </TextField>

                  <Dialog.Portal className="p-2">
                    <Dialog.Overlay className="bg-black/20 dark:bg-black/40" />
                    <Dialog.Content
                      className="p-4"
                      style={{
                        width: Math.min(screenWidth - 28, 420),
                        alignSelf: "center",
                      }}
                    >
                      <View className="mb-3 gap-1">
                        <Dialog.Title>결제일 선택</Dialog.Title>
                        <Dialog.Description>
                          구독을 시작한 날짜를 선택하세요.
                        </Dialog.Description>
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
                          onPress={() => onBillingDateDialogOpenChange(false)}
                        >
                          <Button.Label>취소</Button.Label>
                        </Button>
                        <Button
                          size="lg"
                          className="flex-1"
                          onPressIn={hapticSelection}
                          onPress={onBillingDateApply}
                        >
                          <Button.Label>완료</Button.Label>
                        </Button>
                      </View>
                    </Dialog.Content>
                  </Dialog.Portal>
                </Dialog>
              </View>

              <View className="flex-1 gap-2">
                <Text className="ml-1 font-semibold dark:text-white">
                  결제 주기
                </Text>
                <Select
                  value={selectedBillingCycle}
                  onValueChange={(nextValue) => {
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
                    className="min-w-25 ios:shadow-none"
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
                            <Separator />
                          )}
                        </Fragment>
                      ))}
                    </Select.Content>
                  </Select.Portal>
                </Select>
              </View>
            </View>

            <Separator className="my-2 opacity-50 mx-1" />

            <TextField>
              <Text className="ml-1 font-semibold dark:text-white">메모</Text>
              <TextArea
                className="ios:shadow-none min-h-28"
                value={values.memo}
                onChangeText={onMemoChange}
                onFocus={(event) =>
                  scrollToFocusedField(event.nativeEvent.target)
                }
                placeholder="필요한 내용을 메모로 남겨두세요"
              />
            </TextField>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
