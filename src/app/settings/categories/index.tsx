import { hapticSelection } from "@/lib/haptics";
import {
  createCategory,
  deleteCategory,
  listCategories,
  type Category,
} from "@/lib/subscription-store";
import { useFocusEffect } from "@react-navigation/native";
import { Stack } from "expo-router";
import {
  Button,
  Input,
  ListGroup,
  Separator,
  TextField,
} from "heroui-native";
import { Trash2Icon } from "lucide-uniwind";
import { useCallback, useState } from "react";
import {
  Alert,
  Keyboard,
  ScrollView,
  Text,
  View,
} from "react-native";

function getCategoryErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "";

  if (message === "Category name is required.") {
    return "카테고리 이름을 입력해주세요.";
  }

  if (message.includes("UNIQUE constraint failed")) {
    return "이미 있는 카테고리예요.";
  }

  if (
    message ===
    "This category is used by a subscription. Change subscription categories first."
  ) {
    return "이 카테고리를 쓰는 구독이 있어 삭제할 수 없어요.";
  }

  if (message === "Category not found.") {
    return "카테고리를 찾을 수 없어요.";
  }

  return "카테고리를 처리하지 못했어요.";
}

export default function CategorySettingsRoute() {
  const [categories, setCategories] = useState<Category[] | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
    null,
  );

  const loadCategories = useCallback(async () => {
    try {
      setCategories(await listCategories());
    } catch (error) {
      console.error("Failed to load categories:", error);
      Alert.alert("오류", "카테고리를 불러오지 못했어요.");
      setCategories([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadCategories();
    }, [loadCategories]),
  );

  const handleCreateCategory = useCallback(async () => {
    if (isCreatingCategory) {
      return;
    }

    const trimmedName = newCategoryName.trim();
    if (trimmedName.length === 0) {
      Alert.alert("안내", "카테고리 이름을 입력해주세요.");
      return;
    }

    try {
      setIsCreatingCategory(true);
      Keyboard.dismiss();
      await createCategory({ name: trimmedName });
      await loadCategories();
      setNewCategoryName("");
    } catch (error) {
      Alert.alert("오류", getCategoryErrorMessage(error));
    } finally {
      setIsCreatingCategory(false);
    }
  }, [isCreatingCategory, loadCategories, newCategoryName]);

  const handleDeleteCategory = useCallback(
    async (category: Category) => {
      if (deletingCategoryId || category.isPreset) {
        return;
      }

      Alert.alert(
        "카테고리 삭제",
        `"${category.name}" 카테고리를 삭제할까요?`,
        [
          { text: "취소", style: "cancel" },
          {
            text: "삭제",
            style: "destructive",
            onPress: () => {
              void (async () => {
                try {
                  setDeletingCategoryId(category.id);
                  await deleteCategory(category.id);
                  await loadCategories();
                } catch (error) {
                  Alert.alert("오류", getCategoryErrorMessage(error));
                } finally {
                  setDeletingCategoryId(null);
                }
              })();
            },
          },
        ],
      );
    },
    [deletingCategoryId, loadCategories],
  );

  return (
    <>
      <Stack.Screen
        options={{
          title: "카테고리 관리",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 96 }}
        keyboardShouldPersistTaps="handled"
      >
        <View className="mt-6">
          <TextField isRequired>
            <Text className="ml-1 font-semibold dark:text-white">
              카테고리 이름
            </Text>
            <Input
              className="ios:shadow-lg shadow-neutral-300/10 dark:shadow-none"
              value={newCategoryName}
              onChangeText={setNewCategoryName}
              onFocus={hapticSelection}
              placeholder="예: 뉴스"
              autoCapitalize="none"
              returnKeyType="done"
              onSubmitEditing={() => {
                void handleCreateCategory();
              }}
            />
          </TextField>
          <Button
            className="mt-3"
            variant="tertiary"
            isDisabled={isCreatingCategory}
            onPressIn={hapticSelection}
            onPress={() => {
              void handleCreateCategory();
            }}
          >
            <Button.Label>
              {isCreatingCategory ? "추가 중" : "카테고리 추가"}
            </Button.Label>
          </Button>
        </View>

        <View className="mt-6">
          <Text className="text-sm text-muted mb-2 ml-2">카테고리</Text>
          <ListGroup className="shadow-lg shadow-neutral-300/10 dark:shadow-none px-1.5">
            {(categories ?? []).map((category, index) => (
              <View key={category.id}>
                <ListGroup.Item>
                  <ListGroup.ItemContent>
                    <ListGroup.ItemTitle>{category.name}</ListGroup.ItemTitle>
                    {category.isPreset ? (
                      <ListGroup.ItemDescription>
                        기본 카테고리
                      </ListGroup.ItemDescription>
                    ) : null}
                  </ListGroup.ItemContent>
                  {category.isPreset ? null : (
                    <ListGroup.ItemSuffix>
                      <Button
                        variant="danger-soft"
                        size="sm"
                        isIconOnly
                        isDisabled={deletingCategoryId != null}
                        accessibilityLabel={`${category.name} 카테고리 삭제`}
                        onPressIn={hapticSelection}
                        onPress={() => {
                          void handleDeleteCategory(category);
                        }}
                      >
                        <Trash2Icon size={18} className="text-danger" />
                      </Button>
                    </ListGroup.ItemSuffix>
                  )}
                </ListGroup.Item>
                {index < (categories?.length ?? 0) - 1 ? (
                  <Separator className="opacity-40" />
                ) : null}
              </View>
            ))}
          </ListGroup>
        </View>
      </ScrollView>
    </>
  );
}
