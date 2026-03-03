import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, ScrollView, Text, Alert, View } from "react-native";
import { useHeaderHeight } from "@react-navigation/elements";
import { ThemeModeTabs } from "@/components/theme-mode-tabs";
import { ListGroup, Separator } from "heroui-native";
import { MonitorIcon, SunIcon } from "lucide-uniwind";

export default function DetailsScreen() {
  const headerHeight = useHeaderHeight();

  return (
    <>
      <Stack.Screen.Title asChild>
        <Text className="text-lg font-medium">설정</Text>
      </Stack.Screen.Title>

      <ScrollView
        style={{ paddingTop: headerHeight + 15 }}
        className="flex-1 px-4"
      >
        <Text className="text-sm text-muted mb-2 ml-2">외관</Text>
        <ListGroup className="shadow-none px-1.5">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <SunIcon
                size={"18"}
                className="opacity-80 text-black dark:text-white"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="">화면 모드</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <ThemeModeTabs />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="opacity-40" />
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Payment Methods</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Visa ending in 4829
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>

        <Text className="text-sm text-muted mb-2 ml-2 mt-6">외관</Text>
        <ListGroup className="shadow-none px-1.5">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <SunIcon
                size={"18"}
                className="opacity-80 text-black dark:text-white"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="">화면 모드</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <ThemeModeTabs />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="opacity-40" />
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Payment Methods</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Visa ending in 4829
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>

        <Text className="text-sm text-muted mb-2 ml-2 mt-6">외관</Text>
        <ListGroup className="shadow-none px-1.5">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <SunIcon
                size={"18"}
                className="opacity-80 text-black dark:text-white"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="">화면 모드</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <ThemeModeTabs />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="opacity-40" />
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Payment Methods</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Visa ending in 4829
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>

        <Text className="text-sm text-muted mb-2 ml-2 mt-6">외관</Text>
        <ListGroup className="shadow-none px-1.5">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <SunIcon
                size={"18"}
                className="opacity-80 text-black dark:text-white"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="">화면 모드</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <ThemeModeTabs />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="opacity-40" />
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Payment Methods</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Visa ending in 4829
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>

        <Text className="text-sm text-muted mb-2 ml-2 mt-6">외관</Text>
        <ListGroup className="shadow-none px-1.5">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <SunIcon
                size={"18"}
                className="opacity-80 text-black dark:text-white"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="">화면 모드</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <ThemeModeTabs />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="opacity-40" />
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Payment Methods</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Visa ending in 4829
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>

        <Text className="text-sm text-muted mb-2 ml-2 mt-6">외관</Text>
        <ListGroup className="shadow-none px-1.5">
          <ListGroup.Item>
            <ListGroup.ItemPrefix>
              <SunIcon
                size={"18"}
                className="opacity-80 text-black dark:text-white"
              />
            </ListGroup.ItemPrefix>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle className="">화면 모드</ListGroup.ItemTitle>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix>
              <ThemeModeTabs />
            </ListGroup.ItemSuffix>
          </ListGroup.Item>
          <Separator className="opacity-40" />
          <ListGroup.Item>
            <ListGroup.ItemContent>
              <ListGroup.ItemTitle>Payment Methods</ListGroup.ItemTitle>
              <ListGroup.ItemDescription>
                Visa ending in 4829
              </ListGroup.ItemDescription>
            </ListGroup.ItemContent>
            <ListGroup.ItemSuffix />
          </ListGroup.Item>
        </ListGroup>

        <View className="flex justify-center items-center mt-14 mb-24">
          <Text className="opacity-50">버전 0.0.1</Text>
        </View>
      </ScrollView>
    </>
  );
}
