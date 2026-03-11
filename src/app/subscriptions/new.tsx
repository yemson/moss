import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import { getSubscriptionTemplate } from "@/lib/subscription-templates";
import {
  formatDateToYmd,
  parseAmountInput,
  sanitizeAmountInput,
  ymdToDate,
  type SelectOption,
} from "@/lib/subscription-editor";
import {
  createSubscription,
  listCategories,
  type Category,
  type BillingCycle,
  type Currency,
} from "@/lib/subscription-store";
import { Stack, useRouter } from "expo-router";
import { CheckIcon, XIcon } from "lucide-uniwind";
import { useEffect, useMemo, useState } from "react";
import { Alert, Keyboard, Pressable, View } from "react-native";

export default function NewSubscriptionRoute() {
  const router = useRouter();
  const [serviceName, setServiceName] = useState("");
  const [templateKey, setTemplateKey] = useState<string | null>(null);
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
  const [categories, setCategories] = useState<Category[] | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setCategories(await listCategories());
      } catch (error) {
        console.error("Failed to load categories:", error);
        setCategories([]);
      }
    })();
  }, []);

  const categoryOptions = useMemo<SelectOption[]>(
    () =>
      (categories ?? []).map((category) => ({
        value: category.id,
        label: category.name,
      })),
    [categories],
  );

  useEffect(() => {
    setCategoryId(
      (currentCategoryId) => currentCategoryId ?? categoryOptions[0]?.value ?? null,
    );
  }, [categoryOptions]);

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

      await createSubscription({
        name: serviceName.trim(),
        templateKey,
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
          : "구독을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.";
      Alert.alert("오류", message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisabled = isSaving || !categoryId;

  const handleTemplateChange = (nextTemplateKey: string | null) => {
    setTemplateKey(nextTemplateKey);

    if (!nextTemplateKey) {
      return;
    }

    const template = getSubscriptionTemplate(nextTemplateKey);
    if (!template) {
      return;
    }

    setServiceName(template.name);
    setCategoryId(template.categoryId);
  };

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
    <View className="flex-1">
      <Stack.Screen options={{ title: "새로운 구독" }} />

      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View>
          <View style={{ width: 36, height: 36 }}>
            <Pressable
              onPressIn={hapticImpactLight}
              onPress={() => router.back()}
              hitSlop={8}
              className="flex-1 items-center justify-center"
            >
              <XIcon className="text-black dark:text-white" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

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

      <SubscriptionForm
        mode="create"
        values={{
          templateKey,
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
        onTemplateChange={handleTemplateChange}
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
    </View>
  );
}
