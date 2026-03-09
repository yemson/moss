import { CurrencyDisplayTabs } from "@/components/settings/currency-display-tabs";
import { ThemeModeTabs } from "@/components/settings/theme-mode-tabs";
import { useHeaderHeight } from "@react-navigation/elements";
import { Stack } from "expo-router";
import { ListGroup, Separator } from "heroui-native";
import { BanknoteIcon, SunIcon } from "lucide-uniwind";
import type { ComponentType, ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";

interface SettingItem {
  id: string;
  title: string;
  description?: string;
  icon?: ComponentType<{ size?: string | number; className?: string }>;
  suffix?: ReactNode;
}

interface SettingSection {
  id: string;
  title: string;
  items: SettingItem[];
}

const sections: SettingSection[] = [
  {
    id: "appearance",
    title: "외관",
    items: [
      {
        id: "theme",
        title: "화면 모드",
        icon: SunIcon,
        suffix: <ThemeModeTabs />,
      },
      {
        id: "currency-display",
        title: "금액 표기",
        icon: BanknoteIcon,
        suffix: <CurrencyDisplayTabs />,
      },
    ],
  },
];

export default function SettingsRoute() {
  const headerHeight = useHeaderHeight();

  return (
    <>
      <Stack.Screen
        options={{
          title: "설정",
        }}
      />

      <ScrollView
        style={{ paddingTop: headerHeight + 15 }}
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        {sections.map((section) => (
          <View key={section.id} className="mt-6 first:mt-0">
            <Text className="text-sm text-muted mb-2 ml-2">
              {section.title}
            </Text>
            <ListGroup className="shadow-lg shadow-neutral-300/10 dark:shadow-none px-1.5">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <View key={item.id}>
                    <ListGroup.Item>
                      {Icon ? (
                        <ListGroup.ItemPrefix>
                          <Icon
                            size={18}
                            className="opacity-80 text-black dark:text-white"
                          />
                        </ListGroup.ItemPrefix>
                      ) : null}

                      <ListGroup.ItemContent>
                        <ListGroup.ItemTitle>{item.title}</ListGroup.ItemTitle>
                        {item.description ? (
                          <ListGroup.ItemDescription>
                            {item.description}
                          </ListGroup.ItemDescription>
                        ) : null}
                      </ListGroup.ItemContent>

                      <ListGroup.ItemSuffix>
                        {item.suffix ?? null}
                      </ListGroup.ItemSuffix>
                    </ListGroup.Item>

                    {index < section.items.length - 1 ? (
                      <Separator className="opacity-40" />
                    ) : null}
                  </View>
                );
              })}
            </ListGroup>
          </View>
        ))}

        <View className="flex justify-center items-center mt-14">
          <Text className="opacity-50 text-black dark:text-white">
            버전 0.8.3
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
