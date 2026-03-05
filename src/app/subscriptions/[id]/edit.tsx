import {
  Alert,
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
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import type { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { CheckIcon } from "lucide-uniwind";
import {
  Button,
  Dialog,
  Input,
  Select,
  Separator,
  TextArea,
  TextField,
} from "heroui-native";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import {
  getSubscriptionById,
  listCategories,
  updateSubscription,
  type BillingCycle,
  type Currency,
} from "@/lib/subscription-store";

type CategorySelectOption = { value: string; label: string };
type CurrencySelectOption = { value: string; label: string };
type BillingCycleSelectOption = { value: string; label: string };

const CURRENCY_OPTIONS: CurrencySelectOption[] = [
  { value: "KRW", label: "KRW" },
  { value: "USD", label: "USD" },
];

const BILLING_CYCLE_OPTIONS: BillingCycleSelectOption[] = [
  { value: "monthly", label: "월간" },
  { value: "yearly", label: "연간" },
];

const resolveId = (value: string | string[] | undefined): string | null => {
  if (!value) {
    return null;
  }

  return Array.isArray(value) ? value[0] ?? null : value;
};

const formatDateToYmd = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseAmount = (value: string): number | null => {
  const normalized = value.replace(/[^\d]/g, "");
  if (normalized.length === 0) {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
};

const ymdToDate = (value: string): Date => {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }

  return new Date(year, month - 1, day);
};

const isCurrency = (value: string): value is Currency => {
  return value === "KRW" || value === "USD";
};

const isBillingCycle = (value: string): value is BillingCycle => {
  return value === "monthly" || value === "yearly";
};

export default function EditSubscriptionScreen() {
  const headerHeight = useHeaderHeight();
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = useMemo(() => resolveId(params.id), [params.id]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { width: screenWidth } = useWindowDimensions();

  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [selectedCurrency, setSelectedCurrency] = useState<CurrencySelectOption>(
    CURRENCY_OPTIONS[0],
  );
  const [billingDate, setBillingDate] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedBillingCycle, setSelectedBillingCycle] =
    useState<BillingCycleSelectOption>(BILLING_CYCLE_OPTIONS[0]);
  const [memo, setMemo] = useState("");
  const [billingDateValue, setBillingDateValue] = useState(new Date());
  const [billingDateDraft, setBillingDateDraft] = useState(new Date());
  const [isBillingDateDialogOpen, setIsBillingDateDialogOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<CategorySelectOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<CategorySelectOption>();

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInvalidRoute, setIsInvalidRoute] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      if (!subscriptionId) {
        setIsInvalidRoute(true);
        setIsInitialLoading(false);
        return;
      }

      try {
        const [categories, subscription] = await Promise.all([
          listCategories(),
          getSubscriptionById(subscriptionId),
        ]);

        if (!isMounted) {
          return;
        }

        if (!subscription) {
          setIsInvalidRoute(true);
          setIsInitialLoading(false);
          return;
        }

        const options = categories.map((category) => ({
          value: category.id,
          label: category.name,
        }));

        setCategoryOptions(options);
        setSelectedCategory(
          options.find((option) => option.value === subscription.categoryId) ??
            options[0],
        );

        setServiceName(subscription.name);
        setAmount(String(subscription.amount));

        const currencyOption =
          CURRENCY_OPTIONS.find((option) => option.value === subscription.currency) ??
          CURRENCY_OPTIONS[0];
        if (isCurrency(currencyOption.value)) {
          setCurrency(currencyOption.value);
        }
        setSelectedCurrency(currencyOption);

        const cycleOption =
          BILLING_CYCLE_OPTIONS.find(
            (option) => option.value === subscription.billingCycle,
          ) ?? BILLING_CYCLE_OPTIONS[0];
        if (isBillingCycle(cycleOption.value)) {
          setBillingCycle(cycleOption.value);
        }
        setSelectedBillingCycle(cycleOption);

        setBillingDate(subscription.billingDate);
        const date = ymdToDate(subscription.billingDate);
        setBillingDateValue(date);
        setBillingDateDraft(date);

        setMemo(subscription.memo ?? "");
      } catch (error) {
        console.error("Failed to load subscription edit data:", error);
        if (isMounted) {
          setIsInvalidRoute(true);
        }
      } finally {
        if (isMounted) {
          setIsInitialLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [subscriptionId]);

  const scrollToFocusedField = (target: number | null | undefined) => {
    if (!target) {
      return;
    }

    setTimeout(() => {
      (scrollViewRef.current as unknown as {
        scrollResponderScrollNativeHandleToKeyboard?: (
          nodeHandle: number,
          additionalOffset?: number,
          preventNegativeScrollOffset?: boolean,
        ) => void;
      })?.scrollResponderScrollNativeHandleToKeyboard?.(target, 72, true);
    }, 60);
  };

  const dismissKeyboardAndHaptic = () => {
    Keyboard.dismiss();
    hapticSelection();
  };

  const handleBillingDateDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      Keyboard.dismiss();
      setBillingDateDraft(billingDateValue);
    }

    setIsBillingDateDialogOpen(nextOpen);
  };

  const handleBillingDateChange = (
    _event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (!selectedDate) {
      return;
    }

    setBillingDateDraft(selectedDate);
  };

  const handleApplyBillingDate = () => {
    setBillingDateValue(billingDateDraft);
    setBillingDate(formatDateToYmd(billingDateDraft));
    setIsBillingDateDialogOpen(false);
  };

  const handleCategoryChange = (nextValue: CategorySelectOption | undefined) => {
    setSelectedCategory(nextValue);
  };

  const handleCurrencyChange = (nextValue: CurrencySelectOption | undefined) => {
    if (!nextValue) {
      return;
    }

    setSelectedCurrency(nextValue);
    if (isCurrency(nextValue.value)) {
      setCurrency(nextValue.value);
    }
  };

  const handleBillingCycleChange = (
    nextValue: BillingCycleSelectOption | undefined,
  ) => {
    if (!nextValue) {
      return;
    }

    setSelectedBillingCycle(nextValue);
    if (isBillingCycle(nextValue.value)) {
      setBillingCycle(nextValue.value);
    }
  };

  const handleSavePress = async () => {
    if (isSaving) {
      return;
    }

    if (!subscriptionId) {
      Alert.alert("오류", "유효하지 않은 구독입니다.");
      return;
    }

    if (!serviceName.trim()) {
      Alert.alert("안내", "서비스 이름을 입력해주세요.");
      return;
    }

    const parsedAmount = parseAmount(amount);
    if (parsedAmount == null) {
      Alert.alert("안내", "금액을 입력해주세요.");
      return;
    }

    if (!billingDate.trim()) {
      Alert.alert("안내", "결제일을 입력해주세요.");
      return;
    }

    if (!selectedCategory) {
      Alert.alert("안내", "카테고리를 선택해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      Keyboard.dismiss();

      await updateSubscription(subscriptionId, {
        name: serviceName.trim(),
        amount: parsedAmount,
        currency,
        billingCycle,
        billingDate,
        categoryId: selectedCategory.value,
        memo: memo.trim() || null,
      });

      hapticSelection();
      router.back();
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "구독을 수정하지 못했습니다. 잠시 후 다시 시도해주세요.";
      Alert.alert("오류", message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "구독 수정",
        }}
      />

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <View style={{ width: 36, height: 36 }}>
            <Pressable
              disabled={isSaving || isInitialLoading || isInvalidRoute}
              onPressIn={hapticImpactLight}
              onPress={handleSavePress}
              hitSlop={8}
              className={`flex-1 items-center justify-center ${
                isSaving || isInitialLoading || isInvalidRoute ? "opacity-50" : ""
              }`}
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
          contentContainerClassName="gap-4 pb-12"
        >
          {isInitialLoading ? (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              구독 정보를 불러오는 중...
            </Text>
          ) : null}

          {isInvalidRoute ? (
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              수정할 구독 정보를 찾을 수 없습니다.
            </Text>
          ) : null}

          {!isInitialLoading && !isInvalidRoute ? (
            <>
              <TextField isRequired>
                <Text className="ml-1 font-semibold dark:text-white">서비스 이름</Text>
                <Input
                  className="ios:shadow-none focus:border-green-500"
                  selectionColor="#22C55E"
                  cursorColor="#22C55E"
                  value={serviceName}
                  onChangeText={setServiceName}
                  onFocus={(event) => scrollToFocusedField(event.nativeEvent.target)}
                  placeholder="예: Netflix"
                  autoCapitalize="none"
                />
              </TextField>

              <View className="flex-col">
                <Text className="ml-1 mb-1.5 font-semibold dark:text-white">카테고리</Text>
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
                  <Select.Trigger className="shadow-none" onPressIn={dismissKeyboardAndHaptic}>
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
                          {index < categoryOptions.length - 1 ? <Separator /> : null}
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
                  <Text className="ml-1 font-semibold dark:text-white">통화</Text>
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
                            <Select.Item value={option.value} label={option.label} />
                            {index < CURRENCY_OPTIONS.length - 1 ? <Separator /> : null}
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
                      <Text className="ml-1 font-semibold dark:text-white">결제일</Text>
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
                            구독 결제일을 선택하세요.
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
                            onPress={() => setIsBillingDateDialogOpen(false)}
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
                  <Text className="ml-1 font-semibold dark:text-white">결제 주기</Text>
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
                            <Select.Item value={option.value} label={option.label} />
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
                  onFocus={(event) => scrollToFocusedField(event.nativeEvent.target)}
                  placeholder="필요하면 메모를 남겨두세요"
                />
              </TextField>
            </>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
