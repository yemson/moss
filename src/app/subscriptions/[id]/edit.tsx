import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { useAppSettings } from "@/lib/app-settings";
import { track } from "@/lib/analytics";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import { syncSubscriptionNotifications } from "@/lib/subscription-notifications";
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
  listCategories,
  updateSubscription,
  type BillingCycle,
  type Category,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { CheckIcon } from "lucide-uniwind";
import { useEffect, useMemo, useRef, useState } from "react";
import { Alert, Keyboard, Pressable, Text, View } from "react-native";

export default function EditSubscriptionRoute() {
  const router = useRouter();
  const { notificationsEnabled } = useAppSettings();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = resolveId(params.id);
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [billingDate, setBillingDate] = useState("");
  const [isReminderEnabled, setIsReminderEnabled] = useState(false);
  const [notificationLeadDays, setNotificationLeadDays] = useState<number[]>(
    [],
  );
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [memo, setMemo] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [billingDateValue, setBillingDateValue] = useState(new Date());
  const [billingDateDraft, setBillingDateDraft] = useState(new Date());
  const [isBillingDateSheetOpen, setIsBillingDateSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const initializedSubscriptionIdRef = useRef<string | null>(null);
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [loadedSubscription, setLoadedSubscription] = useState<
    SubscriptionWithCategory | null | undefined
  >(undefined);
  const hasTrackedEditStartedRef = useRef(false);

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

    setCategoryId(loadedSubscription.categoryId);
    setServiceName(loadedSubscription.name);
    setAmount(String(loadedSubscription.amount));
    setBillingDate(loadedSubscription.billingDate);
    setIsReminderEnabled(loadedSubscription.notificationLeadDays.length > 0);
    setNotificationLeadDays(loadedSubscription.notificationLeadDays);
    setBillingCycle(loadedSubscription.billingCycle);
    setMemo(loadedSubscription.memo ?? "");
    setBillingDateValue(billingDateAsDate);
    setBillingDateDraft(billingDateAsDate);
    initializedSubscriptionIdRef.current = loadedSubscription.id;
  }, [loadedSubscription]);

  useEffect(() => {
    if (!loadedSubscription || hasTrackedEditStartedRef.current) {
      return;
    }

    hasTrackedEditStartedRef.current = true;
    track("subscription_edit_started", {
      billing_cycle: loadedSubscription.billingCycle,
      category_id: loadedSubscription.categoryId,
      has_template: loadedSubscription.templateKey != null,
    });
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

    const parsedAmount = parseAmountInput(amount);
    if (parsedAmount == null) {
      Alert.alert("안내", "결제액을 입력해주세요.");
      return;
    }

    if (!billingDate.trim()) {
      Alert.alert("안내", "결제일을 입력해주세요.");
      return;
    }

    if (!categoryId) {
      Alert.alert("안내", "카테고리를 선택해주세요.");
      return;
    }

    if (isReminderEnabled && notificationLeadDays.length === 0) {
      Alert.alert("안내", "알림 날짜를 하나 이상 선택해주세요.");
      return;
    }

    try {
      setIsSaving(true);
      Keyboard.dismiss();

      await updateSubscription(subscriptionId, {
        name: serviceName.trim(),
        amount: parsedAmount,
        billingCycle,
        billingDate,
        notificationLeadDays,
        categoryId,
        memo: memo.trim() || null,
      });
      await syncSubscriptionNotifications(notificationsEnabled);
      track("subscription_updated", {
        billing_cycle: billingCycle,
        category_id: categoryId,
        has_template: loadedSubscription?.templateKey != null,
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
    setAmount(sanitizeAmountInput(nextAmount));
  };

  const handleReminderEnabledChange = (nextEnabled: boolean) => {
    setIsReminderEnabled(nextEnabled);

    if (!nextEnabled) {
      setNotificationLeadDays([]);
    }
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
            billingDate,
            isReminderEnabled,
            notificationLeadDays,
            notificationsEnabled,
            billingCycle,
            memo,
            categoryId,
            billingDateDraft,
            isBillingDateSheetOpen,
          }}
          categoryOptions={categoryOptions}
          onServiceNameChange={setServiceName}
          onAmountChange={handleAmountChange}
          onBillingCycleChange={setBillingCycle}
          onReminderEnabledChange={handleReminderEnabledChange}
          onNotificationLeadDaysChange={setNotificationLeadDays}
          onBillingDateSheetOpenChange={handleBillingDateSheetOpenChange}
          onBillingDateDraftChange={setBillingDateDraft}
          onBillingDateApply={handleApplyBillingDate}
          onCategoryChange={setCategoryId}
          onMemoChange={setMemo}
        />
      )}
    </>
  );
}
