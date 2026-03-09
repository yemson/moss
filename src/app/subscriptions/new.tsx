import { SubscriptionForm } from "@/components/subscriptions/subscription-form";
import { hapticImpactLight, hapticSelection } from "@/lib/haptics";
import {
  formatDateToYmd,
  parseAmountInput,
  type SelectOption,
} from "@/lib/subscription-editor";
import {
  createSubscription,
  listCategories,
  type BillingCycle,
  type Currency,
} from "@/lib/subscription-store";
import { Stack, useRouter } from "expo-router";
import { CheckIcon, XIcon } from "lucide-uniwind";
import { useEffect, useState } from "react";
import { Alert, Keyboard, Pressable, View } from "react-native";

export default function NewSubscriptionRoute() {
  const router = useRouter();
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

    const loadCategories = async () => {
      try {
        const categories = await listCategories();
        if (!isMounted) {
          return;
        }

        const options = categories.map((category) => ({
          value: category.id,
          label: category.name,
        }));

        setCategoryOptions(options);
        setCategoryId(
          (currentCategoryId) => currentCategoryId ?? options[0]?.value ?? null,
        );
      } catch (error) {
        console.error("Failed to load categories:", error);
        if (!isMounted) {
          return;
        }

        Alert.alert("오류", "카테고리 목록을 불러오지 못했습니다.");
      }
    };

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

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

      await createSubscription({
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
          : "구독을 저장하지 못했습니다. 잠시 후 다시 시도해주세요.";
      Alert.alert("오류", message);
    } finally {
      setIsSaving(false);
    }
  };

  const saveDisabled = isSaving || !categoryId;

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
    </View>
  );
}
