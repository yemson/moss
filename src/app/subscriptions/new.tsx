import { SubscriptionCreateFlow } from "@/components/subscriptions/subscription-create-flow";
import { useAppSettings } from "@/lib/app-settings";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import { syncSubscriptionNotifications } from "@/lib/subscription-notifications";
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
import { ChevronLeftIcon, XIcon } from "lucide-uniwind";
import { useEffect, useMemo, useState } from "react";
import { Alert, Keyboard, Pressable, View } from "react-native";

const CUSTOM_TEMPLATE_VALUE = "__custom";

export default function NewSubscriptionRoute() {
  const router = useRouter();
  const { notificationsEnabled } = useAppSettings();
  const [serviceName, setServiceName] = useState("");
  const [currentStep, setCurrentStep] = useState(0);
  const [hasAdvancedPastTemplateStep, setHasAdvancedPastTemplateStep] =
    useState(false);
  const [templateSelection, setTemplateSelection] = useState<string | null>(
    null,
  );
  const [templateKey, setTemplateKey] = useState<string | null>(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [billingDate, setBillingDate] = useState(() =>
    formatDateToYmd(new Date()),
  );
  const [trialEndDate, setTrialEndDate] = useState("");
  const [notifyDayBefore, setNotifyDayBefore] = useState(false);
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
      (currentCategoryId) =>
        currentCategoryId ?? categoryOptions[0]?.value ?? null,
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

    const parsedAmount = parseAmountInput(amount, currency);
    const effectiveBillingDate = isTrialEnabled ? trialEndDate : billingDate;
    if (
      !templateSelection ||
      !serviceName.trim() ||
      parsedAmount == null ||
      !effectiveBillingDate.trim() ||
      !categoryId
    ) {
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
        notifyDayBefore,
        categoryId,
        memo: memo.trim() || null,
      });
      await syncSubscriptionNotifications(notificationsEnabled);

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

  const handleTemplateSelectionChange = (nextTemplateSelection: string) => {
    setTemplateSelection(nextTemplateSelection);

    const nextTemplateKey =
      nextTemplateSelection === CUSTOM_TEMPLATE_VALUE
        ? null
        : nextTemplateSelection;
    setTemplateKey(nextTemplateKey);

    if (!nextTemplateKey) {
      setServiceName("");
      setCategoryId(categoryOptions[0]?.value ?? null);
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
    setAmount((currentAmount) =>
      sanitizeAmountInput(currentAmount, nextCurrency),
    );
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

  const handleStepChange = (nextStep: number) => {
    if (nextStep > 0) {
      setHasAdvancedPastTemplateStep(true);
    }

    setCurrentStep(nextStep);
  };

  const handleClosePress = () => {
    if (isSaving) {
      return;
    }

    if (!hasAdvancedPastTemplateStep) {
      router.back();
      return;
    }

    Alert.alert("작성 중인 내용을 취소할까요?", "입력한 내용이 저장되지 않습니다.", [
      {
        text: "계속 작성",
        style: "cancel",
      },
      {
        text: "취소하기",
        style: "destructive",
        onPress: () => {
          Keyboard.dismiss();
          router.back();
        },
      },
    ]);
  };

  return (
    <View className="flex-1">
      <Stack.Screen
        options={{
          title: "새로운 구독",
          gestureEnabled: !hasAdvancedPastTemplateStep,
        }}
      />

      <Stack.Toolbar placement="left">
        {currentStep > 0 ? (
          <Stack.Toolbar.View>
            <View style={{ width: 36, height: 36 }}>
              <Pressable
                onPressIn={hapticImpactLight}
                onPress={() => {
                  setCurrentStep((current) => Math.max(0, current - 1));
                }}
                hitSlop={8}
                className="flex-1 items-center justify-center"
              >
                <ChevronLeftIcon className="text-black dark:text-white" />
              </Pressable>
            </View>
          </Stack.Toolbar.View>
        ) : undefined}
      </Stack.Toolbar>

      <Stack.Toolbar placement="right">
        <Stack.Toolbar.View>
          <View style={{ width: 36, height: 36 }}>
            <Pressable
              onPressIn={hapticImpactLight}
              onPress={handleClosePress}
              hitSlop={8}
              className={`flex-1 items-center justify-center ${isSaving ? "opacity-50" : ""}`}
            >
              <XIcon className="text-black dark:text-white" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      <SubscriptionCreateFlow
        currentStep={currentStep}
        isSaving={isSaving}
        values={{
          templateSelection,
          templateKey,
          serviceName,
          amount,
          currency,
          billingDate,
          trialEndDate,
          notifyDayBefore,
          notificationsEnabled,
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
        onStepChange={handleStepChange}
        onTemplateSelectionChange={handleTemplateSelectionChange}
        onServiceNameChange={setServiceName}
        onAmountChange={handleAmountChange}
        onCurrencyChange={handleCurrencyChange}
        onBillingCycleChange={setBillingCycle}
        onTrialEnabledChange={handleTrialEnabledChange}
        onNotifyDayBeforeChange={setNotifyDayBefore}
        onBillingDateSheetOpenChange={handleBillingDateSheetOpenChange}
        onBillingDateDraftChange={setBillingDateDraft}
        onBillingDateApply={handleApplyBillingDate}
        onTrialEndDateSheetOpenChange={handleTrialEndDateSheetOpenChange}
        onTrialEndDateDraftChange={setTrialEndDateDraft}
        onTrialEndDateApply={handleApplyTrialEndDate}
        onCategoryChange={setCategoryId}
        onMemoChange={setMemo}
        onSubmit={() => {
          void handleSavePress();
        }}
      />
    </View>
  );
}
