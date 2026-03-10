import { hapticSelection } from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ScrollShadow, TagGroup } from "heroui-native";
import { ScrollView, View } from "react-native";

interface SubscriptionCategoryFilterProps {
  categories: { id: string; name: string }[];
  selectedCategoryKey: string;
  onSelectionChange: (categoryKey: string) => void;
}

const ALL_CATEGORY_KEY = "all";

export function SubscriptionCategoryFilter({
  categories,
  selectedCategoryKey,
  onSelectionChange,
}: SubscriptionCategoryFilterProps) {
  return (
    <View className="min-w-0 flex-1">
      <ScrollShadow size={28} LinearGradientComponent={LinearGradient}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingRight: 16 }}
        >
          <TagGroup
            selectionMode="single"
            size="lg"
            variant="surface"
            selectedKeys={new Set([selectedCategoryKey])}
            onSelectionChange={(keys) => {
              const selectedKey = Array.from(keys)[0];
              const nextCategoryKey =
                selectedKey == null ? ALL_CATEGORY_KEY : String(selectedKey);

              if (nextCategoryKey === selectedCategoryKey) {
                return;
              }

              hapticSelection();
              onSelectionChange(nextCategoryKey);
            }}
          >
            <TagGroup.List className="flex-row gap-2">
              <TagGroup.Item id={ALL_CATEGORY_KEY}>전체</TagGroup.Item>
              {categories.map((category) => (
                <TagGroup.Item key={category.id} id={category.id}>
                  {category.name}
                </TagGroup.Item>
              ))}
            </TagGroup.List>
          </TagGroup>
        </ScrollView>
      </ScrollShadow>
    </View>
  );
}
