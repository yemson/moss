import { Stack } from "expo-router";
import type { ComponentType, ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { ListGroup, Separator } from "heroui-native";
import { BellIcon, CreditCardIcon, SunIcon } from "lucide-uniwind";
import { CurrencyDisplayTabs } from "@/features/settings/components/currency-display-tabs";
import { ThemeModeTabs } from "@/features/settings/components/theme-mode-tabs";

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

const SECTIONS: SettingSection[] = [
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
    ],
  },
  {
    id: "billing",
    title: "결제",
    items: [
      {
        id: "currency-display",
        title: "금액 표기",
        suffix: <CurrencyDisplayTabs />,
      },
      {
        id: "payment",
        title: "결제 수단",
        description: "Visa ending in 4829",
        icon: CreditCardIcon,
      },
      {
        id: "notifications",
        title: "결제 알림",
        description: "청구일 1일 전 알림",
        icon: BellIcon,
      },
    ],
  },
];

export default function SettingsScreen() {
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
        {SECTIONS.map((section) => (
          <View key={section.id} className="mt-6 first:mt-0">
            <Text className="text-sm text-muted mb-2 ml-2">{section.title}</Text>
            <ListGroup className="shadow-none px-1.5">
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

                      <ListGroup.ItemSuffix>{item.suffix ?? null}</ListGroup.ItemSuffix>
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
          <Text className="opacity-50">버전 0.0.1</Text>
        </View>
      </ScrollView>
    </>
  );
}
