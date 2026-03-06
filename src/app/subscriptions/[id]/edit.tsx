import { useLocalSearchParams } from "expo-router";
import SubscriptionEditorScreen from "@/features/subscriptions/screens/subscription-editor-screen";
import { resolveId } from "@/features/subscriptions/utils/editor";

export default function EditSubscriptionRoute() {
  const params = useLocalSearchParams<{ id?: string | string[] }>();

  return (
    <SubscriptionEditorScreen mode="edit" subscriptionId={resolveId(params.id)} />
  );
}
