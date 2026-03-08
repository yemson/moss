import { Alert, Keyboard, Pressable, Text, View } from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { CheckIcon } from "lucide-uniwind";
import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import {
  formatDateToYmd,
  parseAmountInput,
  resolveId,
  ymdToDate,
  type SelectOption,
} from "@/lib/subscription-editor";
import {
  getSubscriptionById,
  listCategories,
  type SubscriptionWithCategory,
  updateSubscription,
  type BillingCycle,
  type Currency,
} from "@/lib/subscription-store";

export default function EditSubscriptionRoute() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const subscriptionId = resolveId(params.id);
  const [loadedSubscription, setLoadedSubscription] = useState<
    SubscriptionWithCategory | null | undefined
  >(undefined);
  const [serviceName, setServiceName] = useState("");
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState<Currency>("KRW");
  const [billingDate, setBillingDate] = useState("");
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [memo, setMemo] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<SelectOption[]>([]);
  const [billingDateValue, setBillingDateValue] = useState(new Date());
  const [billingDateDraft, setBillingDateDraft] = useState(new Date());
  const [isBillingDateDialogOpen, setIsBillingDateDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadEditorData = async () => {
      if (!subscriptionId) {
        setLoadedSubscription(null);
        return;
      }

      try {
        const [categoriesResult, subscriptionResult] = await Promise.allSettled([
          listCategories(),
          getSubscriptionById(subscriptionId),
        ]);

        if (!isMounted) {
          return;
        }

        if (categoriesResult.status === "fulfilled") {
          const options = categoriesResult.value.map((category) => ({
            value: category.id,
            label: category.name,
          }));

          setCategoryOptions(options);
        } else {
          console.error("Failed to load categories:", categoriesResult.reason);
        }

        if (subscriptionResult.status === "rejected") {
          console.error(
            "Failed to load subscription editor data:",
            subscriptionResult.reason,
          );
          setLoadedSubscription(null);
          return;
        }

        const subscription = subscriptionResult.value;
        if (!subscription) {
          setLoadedSubscription(null);
          return;
        }

        const billingDateAsDate = ymdToDate(subscription.billingDate);

        setCategoryId(subscription.categoryId);
        setServiceName(subscription.name);
        setAmount(String(subscription.amount));
        setCurrency(subscription.currency);
        setBillingDate(subscription.billingDate);
        setBillingCycle(subscription.billingCycle);
        setMemo(subscription.memo ?? "");
        setBillingDateValue(billingDateAsDate);
        setBillingDateDraft(billingDateAsDate);
        setLoadedSubscription(subscription);
      } catch (error) {
        console.error("Failed to load subscription editor data:", error);
        if (!isMounted) {
          return;
        }

        setLoadedSubscription(null);
      }
    };

    void loadEditorData();

    return () => {
      isMounted = false;
    };
  }, [subscriptionId]);

  const handleBillingDateDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      Keyboard.dismiss();
      setBillingDateDraft(billingDateValue);
    }

    setIsBillingDateDialogOpen(nextOpen);
  };

  const handleApplyBillingDate = () => {
    setBillingDateValue(billingDateDraft);
    setBillingDate(formatDateToYmd(billingDateDraft));
    setIsBillingDateDialogOpen(false);
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
      Alert.alert("안내", "금액을 입력해주세요.");
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

    try {
      setIsSaving(true);
      Keyboard.dismiss();

      await updateSubscription(subscriptionId, {
        name: serviceName.trim(),
        amount: parsedAmount,
        currency,
        billingCycle,
        billingDate,
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

  return (
    <>
      <Stack.Screen
        options={{
          title: "구독 수정",
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
              <CheckIcon className="text-green-500" />
            </Pressable>
          </View>
        </Stack.Toolbar.View>
      </Stack.Toolbar>

      {!subscriptionId ? (
        <View className="flex-1 px-4">
          <View className="pt-28">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              유효하지 않은 구독입니다.
            </Text>
          </View>
        </View>
      ) : null}

      {subscriptionId && loadedSubscription === null ? (
        <View className="flex-1 px-4">
          <View className="pt-28">
            <Text className="text-sm text-neutral-500 dark:text-neutral-400">
              수정할 구독 정보를 찾을 수 없습니다.
            </Text>
          </View>
        </View>
      ) : null}

      {loadedSubscription ? (
        <SubscriptionForm
          mode="edit"
          values={{
            serviceName,
            amount,
            currency,
            billingDate,
            billingCycle,
            memo,
            categoryId,
            billingDateDraft,
            isBillingDateDialogOpen,
          }}
          categoryOptions={categoryOptions}
          onServiceNameChange={setServiceName}
          onAmountChange={setAmount}
          onCurrencyChange={setCurrency}
          onBillingCycleChange={setBillingCycle}
          onBillingDateDialogOpenChange={handleBillingDateDialogOpenChange}
          onBillingDateDraftChange={setBillingDateDraft}
          onBillingDateApply={handleApplyBillingDate}
          onCategoryChange={setCategoryId}
          onMemoChange={setMemo}
        />
      ) : null}
    </>
  );
}
