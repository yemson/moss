import { Alert, Keyboard } from "react-native";
import { useEffect, useState } from "react";
import type {
  BillingCycle,
  Currency,
} from "@/features/subscriptions/model/subscription-store";
import {
  createSubscription,
  getSubscriptionById,
  listCategories,
  updateSubscription,
} from "@/features/subscriptions/model/subscription-store";
import { hapticSelection } from "@/shared/lib/haptics";
import {
  BILLING_CYCLE_OPTIONS,
  CURRENCY_OPTIONS,
  formatDateToYmd,
  isBillingCycle,
  isCurrency,
  parseAmountInput,
  type SelectOption,
  ymdToDate,
} from "@/features/subscriptions/utils/editor";

export interface UseSubscriptionEditorParams {
  mode: "create" | "edit";
  subscriptionId?: string | null;
  onSaved: () => void;
}

export function useSubscriptionEditor({
  mode,
  subscriptionId,
  onSaved,
}: UseSubscriptionEditorParams) {
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [selectedCurrency, setSelectedCurrency] = useState<SelectOption>(
    CURRENCY_OPTIONS[0],
  );
  const [billingDate, setBillingDate] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<SelectOption>(
    BILLING_CYCLE_OPTIONS[0],
  );
  const [memo, setMemo] = useState("");
  const [billingDateValue, setBillingDateValue] = useState(new Date());
  const [billingDateDraft, setBillingDateDraft] = useState(new Date());
  const [isBillingDateDialogOpen, setIsBillingDateDialogOpen] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<SelectOption>();
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isInvalidRoute, setIsInvalidRoute] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        if (mode === "edit" && !subscriptionId) {
          if (!isMounted) {
            return;
          }

          setIsInvalidRoute(true);
          setIsInitialLoading(false);
          return;
        }

        if (mode === "edit" && subscriptionId) {
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
            CURRENCY_OPTIONS.find(
              (option) => option.value === subscription.currency,
            ) ?? CURRENCY_OPTIONS[0];
          setSelectedCurrency(currencyOption);
          if (isCurrency(currencyOption.value)) {
            setCurrency(currencyOption.value);
          }

          const cycleOption =
            BILLING_CYCLE_OPTIONS.find(
              (option) => option.value === subscription.billingCycle,
            ) ?? BILLING_CYCLE_OPTIONS[0];
          setSelectedBillingCycle(cycleOption);
          if (isBillingCycle(cycleOption.value)) {
            setBillingCycle(cycleOption.value);
          }

          setBillingDate(subscription.billingDate);
          const date = ymdToDate(subscription.billingDate);
          setBillingDateValue(date);
          setBillingDateDraft(date);
          setMemo(subscription.memo ?? "");

          setIsInvalidRoute(false);
          setIsInitialLoading(false);
          return;
        }

        const categories = await listCategories();
        if (!isMounted) {
          return;
        }

        const options = categories.map((category) => ({
          value: category.id,
          label: category.name,
        }));

        setCategoryOptions(options);
        setSelectedCategory((prev) => prev ?? options[0]);
        setIsInitialLoading(false);
      } catch (error) {
        console.error("Failed to load subscription editor data:", error);
        if (!isMounted) {
          return;
        }

        if (mode === "edit") {
          setIsInvalidRoute(true);
        } else {
          Alert.alert("오류", "카테고리 목록을 불러오지 못했습니다.");
        }

        setIsInitialLoading(false);
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [mode, subscriptionId]);

  const handleBillingDateDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      Keyboard.dismiss();
      setBillingDateDraft(billingDateValue);
    }

    setIsBillingDateDialogOpen(nextOpen);
  };

  const handleBillingDateChange = (_event: unknown, selectedDate?: Date) => {
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

  const handleCategoryChange = (nextValue: SelectOption | undefined) => {
    setSelectedCategory(nextValue);
  };

  const handleCurrencyChange = (nextValue: SelectOption | undefined) => {
    if (!nextValue) {
      return;
    }

    setSelectedCurrency(nextValue);
    if (isCurrency(nextValue.value)) {
      setCurrency(nextValue.value);
    }
  };

  const handleBillingCycleChange = (nextValue: SelectOption | undefined) => {
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

    if (mode === "edit" && !subscriptionId) {
      Alert.alert("오류", "유효하지 않은 구독입니다.");
      return;
    }

    if (!serviceName.trim()) {
      Alert.alert("안내", "서비스 이름을 입력해주세요.");
      return;
    }

    const parsedAmount = parseAmountInput(amount);
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

      if (mode === "create") {
        await createSubscription({
          name: serviceName.trim(),
          amount: parsedAmount,
          currency,
          billingCycle,
          billingDate,
          categoryId: selectedCategory.value,
          memo: memo.trim() || null,
        });
      } else {
        await updateSubscription(subscriptionId as string, {
          name: serviceName.trim(),
          amount: parsedAmount,
          currency,
          billingCycle,
          billingDate,
          categoryId: selectedCategory.value,
          memo: memo.trim() || null,
        });
      }

      hapticSelection();
      onSaved();
    } catch (error) {
      const fallbackMessage =
        mode === "create"
          ? "구독을 저장하지 못했습니다. 잠시 후 다시 시도해주세요."
          : "구독을 수정하지 못했습니다. 잠시 후 다시 시도해주세요.";
      const message = error instanceof Error ? error.message : fallbackMessage;
      Alert.alert("오류", message);
    } finally {
      setIsSaving(false);
    }
  };

  return {
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
  };
}
