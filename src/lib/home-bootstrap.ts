import {
  getStoredUsdKrwRate,
  listSubscriptions,
  type SubscriptionWithCategory,
  type UsdKrwExchangeRate,
} from "@/lib/subscription-store";

export interface InitialHomeData {
  subscriptions: SubscriptionWithCategory[];
  exchangeRate: UsdKrwExchangeRate | null;
}

let initialHomeData: InitialHomeData | null = null;
let initialHomeDataPromise: Promise<InitialHomeData> | null = null;

export async function prepareInitialHomeData(): Promise<InitialHomeData> {
  if (initialHomeData) {
    return initialHomeData;
  }

  if (!initialHomeDataPromise) {
    initialHomeDataPromise = (async () => {
      const [subscriptions, exchangeRate] = await Promise.all([
        listSubscriptions({ isActive: true }),
        getStoredUsdKrwRate(),
      ]);

      const nextInitialHomeData = {
        subscriptions,
        exchangeRate,
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
