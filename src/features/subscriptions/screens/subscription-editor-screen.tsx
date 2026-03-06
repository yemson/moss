import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack, useRouter } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { CheckIcon, XIcon } from "lucide-uniwind";
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
import { hapticImpactLight, hapticSelection } from "@/shared/lib/haptics";
import { useSubscriptionEditor } from "@/features/subscriptions/hooks/use-subscription-editor";
import {
  BILLING_CYCLE_OPTIONS,
  CURRENCY_OPTIONS,
} from "@/features/subscriptions/utils/editor";

export interface SubscriptionEditorScreenProps {
  mode: "create" | "edit";
  subscriptionId?: string | null;
}

export default function SubscriptionEditorScreen({
  mode,
  subscriptionId,
}: SubscriptionEditorScreenProps) {
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();

  const {
    state: {
      serviceName,
      amount,
      billingDate,
      memo,
      selectedCurrency,
      selectedBillingCycle,
      selectedCategory,
      categoryOptions,
      isBillingDateDialogOpen,
      billingDateDraft,
      isInitialLoading,
      isSaving,
      isInvalidRoute,
    },
    setServiceName,
    setAmount,
    setMemo,
    handlers: {
      handleSavePress,
      handleCategoryChange,
      handleCurrencyChange,
      handleBillingCycleChange,
      handleBillingDateDialogOpenChange,
      handleBillingDateChange,
      handleApplyBillingDate,
    },
  } = useSubscriptionEditor({
    mode,
    subscriptionId,
    onSaved: () => {
      router.back();
    },
  });

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

  const title = mode === "create" ? "구독 추가" : "구독 수정";
  const saveDisabled =
    isSaving || isInitialLoading || (mode === "edit" && isInvalidRoute);

  return (
    <>
      <Stack.Screen
        options={{
          title,
        }}
      >
        <Stack.Screen.BackButton displayMode="minimal" />
      </Stack.Screen>

      {mode === "create" && (
        <Stack.Toolbar placement="left">
          <Stack.Toolbar.View>
            <View style={{ width: 36, height: 36 }}>
              <Pressable
                onPressIn={hapticImpactLight}
                onPress={() => router.back()}
                hitSlop={8}
                className="flex-1 items-center justify-center"
              >
                <XIcon className="text-red-500" />
              </Pressable>
            </View>
          </Stack.Toolbar.View>
        </Stack.Toolbar>
      )}

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <View style={{ width: 36, height: 36 }}>
            <Pressable
              disabled={saveDisabled}
              onPressIn={hapticImpactLight}
              onPress={() => {
                void handleSavePress();
              }}
              hitSlop={8}
              className={`flex-1 items-center justify-center ${saveDisabled ? "opacity-50" : ""}`}
            >
              <CheckIcon className="text-green-500" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 8 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={{ flex: 1, paddingTop: headerHeight + 15 }}
          className="flex-1 px-4"
          keyboardShouldPersistTaps="always"
          keyboardDismissMode="none"
          contentContainerClassName="gap-4 pb-20"
        >
          {isInitialLoading ? (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              구독 정보를 불러오는 중...
            </Text>
          ) : null}

          {mode === "edit" && isInvalidRoute ? (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              수정할 구독 정보를 찾을 수 없습니다.
            </Text>
          ) : null}

          {!isInitialLoading && !(mode === "edit" && isInvalidRoute) ? (
            <>
              <TextField isRequired>
                <Text className="ml-1 font-semibold dark:text-white">
                  서비스 이름
                </Text>
                <Input
                  className="ios:shadow-none focus:border-green-500"
                  selectionColor="#22C55E"
                  cursorColor="#22C55E"
                  value={serviceName}
                  onChangeText={setServiceName}
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
                  onValueChange={handleCategoryChange}
                  onOpenChange={(isOpen) => {
                    if (isOpen) {
                      Keyboard.dismiss();
                    }
                  }}
                  isDisabled={categoryOptions.length === 0}
                  presentation="popover"
                >
                  <Select.Trigger
                    className="shadow-none"
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
                          {index < categoryOptions.length - 1 ? (
                            <Separator />
                          ) : null}
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
                      className="ios:shadow-none focus:border-green-500"
                      selectionColor="#22C55E"
                      cursorColor="#22C55E"
                      value={amount}
                      onChangeText={setAmount}
                      onFocus={(event) =>
                        scrollToFocusedField(event.nativeEvent.target)
                      }
                      placeholder="예: 17000"
                      keyboardType="number-pad"
                    />
                  </TextField>
                </View>
                <View className="flex-1 gap-2">
                  <Text className="ml-1 font-semibold dark:text-white">
                    통화
                  </Text>
                  <Select
                    value={selectedCurrency}
                    onValueChange={handleCurrencyChange}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        Keyboard.dismiss();
                      }
                    }}
                    presentation="popover"
                  >
                    <Select.Trigger
                      className="min-w-25 shadow-none"
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
                            {index < CURRENCY_OPTIONS.length - 1 ? (
                              <Separator />
                            ) : null}
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
                    isOpen={isBillingDateDialogOpen}
                    onOpenChange={handleBillingDateDialogOpenChange}
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
                              value={billingDate}
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
                            {mode === "create"
                              ? "구독을 시작한 날짜를 선택하세요."
                              : "구독 결제일을 선택하세요."}
                          </Dialog.Description>
                        </View>

                        <View className="items-center">
                          <DateTimePicker
                            value={billingDateDraft}
                            mode="date"
                            display="spinner"
                            locale="ko-KR"
                            onChange={handleBillingDateChange}
                          />
                        </View>

                        <View className="mt-4 flex-row gap-2">
                          <Button
                            variant="secondary"
                            className="flex-1"
                            size="lg"
                            onPress={() =>
                              handleBillingDateDialogOpenChange(false)
                            }
                          >
                            <Button.Label>취소</Button.Label>
                          </Button>
                          <Button
                            size="lg"
                            className="flex-1"
                            onPressIn={hapticSelection}
                            onPress={handleApplyBillingDate}
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
                    onValueChange={handleBillingCycleChange}
                    onOpenChange={(isOpen) => {
                      if (isOpen) {
                        Keyboard.dismiss();
                      }
                    }}
                    presentation="popover"
                  >
                    <Select.Trigger
                      className="min-w-25 shadow-none"
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
                            {index < BILLING_CYCLE_OPTIONS.length - 1 ? (
                              <Separator />
                            ) : null}
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
                  className="ios:shadow-none focus:border-green-500 min-h-28"
                  selectionColor="#22C55E"
                  cursorColor="#22C55E"
                  value={memo}
                  onChangeText={setMemo}
                  onFocus={(event) =>
                    scrollToFocusedField(event.nativeEvent.target)
                  }
                  placeholder={
                    mode === "create"
                      ? "필요한 내용을 메모로 남겨두세요"
                      : "필요하면 메모를 남겨두세요"
                  }
                />
              </TextField>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
