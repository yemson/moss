import { UPDATE_HISTORY } from "@/lib/update-history";
import { Stack } from "expo-router";
import { Card } from "heroui-native";
import { ScrollView, Text, View } from "react-native";

export default function SettingsUpdatesRoute() {
  return (
    <>
      <Stack.Screen
        options={{
          title: "업데이트 내역",
          headerBackButtonDisplayMode: "minimal",
        }}
      />

      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        className="flex-1 px-4"
        contentContainerStyle={{ paddingBottom: 48, paddingTop: 20, gap: 16 }}
      >
        {UPDATE_HISTORY.map((entry) => (
          <Card
            key={entry.version}
            variant="default"
            className="rounded-[30px] p-5 shadow-lg shadow-neutral-300/10 dark:shadow-none"
          >
            <Card.Body className="gap-4 p-0">
              <View className="gap-1">
                <Card.Title className="text-lg font-semibold text-black dark:text-white">
                  버전 {entry.version}
                </Card.Title>
                <Card.Description className="text-sm text-foreground/50">
                  {entry.date}
                </Card.Description>
              </View>

              <View className="gap-3">
                {entry.highlights.map((highlight) => (
                  <View key={highlight} className="flex-row gap-2.5">
                    <Text className="pt-0.5 text-sm text-foreground/55">•</Text>
                    <Text className="min-w-0 flex-1 text-sm leading-6 text-black dark:text-white">
                      {highlight}
                    </Text>
                  </View>
                ))}
              </View>
            </Card.Body>
          </Card>
        ))}
      </ScrollView>
    </>
  );
}
