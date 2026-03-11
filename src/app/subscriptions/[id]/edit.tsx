import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import {
  formatDateToYmd,
  parseAmountInput,
  resolveId,
  sanitizeAmountInput,
  ymdToDate,
  type SelectOption,
} from "@/lib/subscription-editor";
import {
  getSubscriptionById,
  isTrialActive,
  listCategories,
  updateSubscription,
  type BillingCycle,
  type Currency,
  type Category,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CheckIcon } from "lucide-uniwind";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Pressable, Text, View } from "react-native";

export default function EditSubscriptionRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = resolveId(params.id);
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [billingDate, setBillingDate] = useState("");
  const [trialEndDate, setTrialEndDate] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [memo, setMemo] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [isTrialEnabled, setIsTrialEnabled] = useState(false);
  const [billingDateValue, setBillingDateValue] = useState(new Date());
  const [billingDateDraft, setBillingDateDraft] = useState(new Date());
  const [trialEndDateValue, setTrialEndDateValue] = useState(new Date());
  const [trialEndDateDraft, setTrialEndDateDraft] = useState(new Date());
  const [isBillingDateSheetOpen, setIsBillingDateSheetOpen] = useState(false);
  const [isTrialEndDateSheetOpen, setIsTrialEndDateSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initializedSubscriptionIdRef = useRef<string | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadedSubscription, setLoadedSubscription] = useState<
    SubscriptionWithCategory | null | undefined
  >(undefined);

  useEffect(() => {
    void (async () => {
      try {
        setCategories(await listCategories());
      } catch (error) {
        console.error("Failed to load categories:", error);
        setCategories([]);
      }
    })();
  }, [subscriptionId]);

  useEffect(() => {
    if (!subscriptionId) {
      return;
    }

    void (async () => {
      try {
        setLoadedSubscription(await getSubscriptionById(subscriptionId));
      } catch (error) {
        console.error("Failed to load subscription detail:", error);
        setLoadedSubscription(null);
      }
    })();
  }, [subscriptionId]);

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      (categories ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories],
  );

  useEffect(() => {
    if (!loadedSubscription) {
      return;
    }

    if (initializedSubscriptionIdRef.current === loadedSubscription.id) {
      return;
    }

    const billingDateAsDate = ymdToDate(loadedSubscription.billingDate);
    const activeTrialEndDate = isTrialActive(loadedSubscription.trialEndDate)
      ? loadedSubscription.trialEndDate
      : null;
    const trialEndDateAsDate = activeTrialEndDate
      ? ymdToDate(activeTrialEndDate)
      : billingDateAsDate;

    setCategoryId(loadedSubscription.categoryId);
    setServiceName(loadedSubscription.name);
    setAmount(String(loadedSubscription.amount));
    setCurrency(loadedSubscription.currency);
    setBillingDate(loadedSubscription.billingDate);
    setTrialEndDate(activeTrialEndDate ?? "");
    setBillingCycle(loadedSubscription.billingCycle);
    setMemo(loadedSubscription.memo ?? "");
    setIsTrialEnabled(activeTrialEndDate != null);
    setBillingDateValue(billingDateAsDate);
    setBillingDateDraft(billingDateAsDate);
    setTrialEndDateValue(trialEndDateAsDate);
    setTrialEndDateDraft(trialEndDateAsDate);
    initializedSubscriptionIdRef.current = loadedSubscription.id;
  }, [loadedSubscription]);

  const handleBillingDateSheetOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      Keyboard.dismiss();
      setBillingDateDraft(billingDateValue);
    }

    setIsBillingDateSheetOpen(nextOpen);
  };

  const handleApplyBillingDate = () => {
    setBillingDateValue(billingDateDraft);
    setBillingDate(formatDateToYmd(billingDateDraft));
    setIsBillingDateSheetOpen(false);
  };

  const handleTrialEndDateSheetOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      Keyboard.dismiss();
      setTrialEndDateDraft(trialEndDateValue);
    }

    setIsTrialEndDateSheetOpen(nextOpen);
  };

  const handleApplyTrialEndDate = () => {
    setTrialEndDateValue(trialEndDateDraft);
    setTrialEndDate(formatDateToYmd(trialEndDateDraft));
    setIsTrialEndDateSheetOpen(false);
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

    const parsedAmount = parseAmountInput(amount, currency);
    if (parsedAmount == null) {
      Alert.alert("안내", "금액을 입력해주세요.");
      return;
    }

    const effectiveBillingDate = isTrialEnabled ? trialEndDate : billingDate;
    if (!effectiveBillingDate.trim()) {
      Alert.alert(
        "안내",
        isTrialEnabled
          ? "무료 체험 종료일을 입력해주세요."
          : "결제일을 입력해주세요.",
      );
      return;
    }

    if (!categoryId) {
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
        billingDate: effectiveBillingDate,
        trialEndDate: isTrialEnabled ? trialEndDate : null,
        categoryId,
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

  const saveDisabled =
    isSaving || !subscriptionId || !loadedSubscription || !categoryId;

  const handleAmountChange = (nextAmount: string) => {
    setAmount(sanitizeAmountInput(nextAmount, currency));
  };

  const handleCurrencyChange = (nextCurrency: Currency) => {
    setCurrency(nextCurrency);
    setAmount((currentAmount) => sanitizeAmountInput(currentAmount, nextCurrency));
  };

  const handleTrialEnabledChange = (nextEnabled: boolean) => {
    Keyboard.dismiss();
    setIsTrialEnabled(nextEnabled);

    if (!nextEnabled) {
      setIsTrialEndDateSheetOpen(false);
      setTrialEndDate("");
      return;
    }

    const nextValue = trialEndDate
      ? ymdToDate(trialEndDate)
      : billingDate
        ? ymdToDate(billingDate)
        : new Date();
    const nextDate = formatDateToYmd(nextValue);

    setTrialEndDateValue(nextValue);
    setTrialEndDateDraft(nextValue);
    setTrialEndDate(nextDate);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: "구독 수정",
          headerBackButtonDisplayMode: "minimal",
        }}
      >
        <Stack.Screen.BackButton displayMode="minimal" />
      </Stack.Screen>

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
              <CheckIcon className="text-success" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      {!subscriptionId && (
        <View className="flex-1 px-4">
          <View className="pt-28">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              유효하지 않은 구독입니다.
            </Text>
          </View>
        </View>
      )}

      {subscriptionId && loadedSubscription === null && (
        <View className="flex-1 px-4">
          <View className="pt-28">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              수정할 구독 정보를 찾을 수 없습니다.
            </Text>
          </View>
        </View>
      )}

      {subscriptionId && loadedSubscription !== null && (
        <SubscriptionForm
          mode="edit"
          values={{
            serviceName,
            amount,
            currency,
            billingDate,
            trialEndDate,
            billingCycle,
            memo,
            categoryId,
            isTrialEnabled,
            billingDateDraft,
            isBillingDateSheetOpen,
            trialEndDateDraft,
            isTrialEndDateSheetOpen,
          }}
          categoryOptions={categoryOptions}
          onServiceNameChange={setServiceName}
          onAmountChange={handleAmountChange}
          onCurrencyChange={handleCurrencyChange}
          onBillingCycleChange={setBillingCycle}
          onTrialEnabledChange={handleTrialEnabledChange}
          onBillingDateSheetOpenChange={handleBillingDateSheetOpenChange}
          onBillingDateDraftChange={setBillingDateDraft}
          onBillingDateApply={handleApplyBillingDate}
          onTrialEndDateSheetOpenChange={handleTrialEndDateSheetOpenChange}
          onTrialEndDateDraftChange={setTrialEndDateDraft}
          onTrialEndDateApply={handleApplyTrialEndDate}
          onCategoryChange={setCategoryId}
          onMemoChange={setMemo}
        />
      )}
    </>
  );
}
