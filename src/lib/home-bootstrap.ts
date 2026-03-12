import {
  listSubscriptions,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";

export interface InitialHomeData {
  subscriptions: SubscriptionWithCategory[];
}

let initialHomeData: InitialHomeData | null = null;
let initialHomeDataPromise: Promise<InitialHomeData> | null = null;

export async function prepareInitialHomeData(): Promise<InitialHomeData> {
  if (initialHomeData) {
    return initialHomeData;
  }

  if (!initialHomeDataPromise) {
    initialHomeDataPromise = (async () => {
      const subscriptions = await listSubscriptions({ isActive: true });

      const nextInitialHomeData = {
        subscriptions,
      };

      initialHomeData = nextInitialHomeData;
      return nextInitialHomeData;
    })().catch((error) => {
      initialHomeDataPromise = null;
      throw error;
    });
  }

  return initialHomeDataPromise;
}

export function consumeInitialHomeData(): InitialHomeData | null {
  const nextInitialHomeData = initialHomeData;
  initialHomeData = null;
  return nextInitialHomeData;
}
