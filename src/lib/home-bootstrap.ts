import {
  listSubscriptionPaymentLogs,
  listSubscriptions,
  type SubscriptionPaymentLog,
  type SubscriptionWithCategory,
} from "@/lib/subscription-store";

export interface InitialHomeData {
  subscriptions: SubscriptionWithCategory[];
  paymentLogs: SubscriptionPaymentLog[];
}

let initialHomeData: InitialHomeData | null = null;
let initialHomeDataPromise: Promise<InitialHomeData> | null = null;

export async function prepareInitialHomeData(): Promise<InitialHomeData> {
  if (initialHomeData) {
    return initialHomeData;
  }

  if (!initialHomeDataPromise) {
    initialHomeDataPromise = (async () => {
      const [subscriptions, paymentLogs] = await Promise.all([
        listSubscriptions({ isActive: true }),
        listSubscriptionPaymentLogs({ sortDirection: "desc" }),
      ]);

      const nextInitialHomeData = {
        subscriptions,
        paymentLogs,
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
