import Constants from "expo-constants";
import { Mixpanel } from "mixpanel-react-native";
import { Platform } from "react-native";

const MIXPANEL_TOKEN = "bb40fab0141cf7293fecbecbede1ea95";

type AnalyticsPrimitive = string | number | boolean | null;
type AnalyticsProperties = Record<string, AnalyticsPrimitive | undefined>;
type QueuedEvent =
  | {
      type: "track";
      eventName: string;
      properties?: AnalyticsProperties;
    }
  | {
      type: "screen";
      screenName: string;
      properties?: AnalyticsProperties;
    };

let analyticsClient: Mixpanel | null = null;
let analyticsReady = false;
let analyticsInitPromise: Promise<void> | null = null;
let queuedEvents: QueuedEvent[] = [];

function getDefaultProperties(): AnalyticsProperties {
  return {
    app_version: Constants.expoConfig?.version ?? "unknown",
    build_type: __DEV__ ? "development" : "production",
    platform: Platform.OS,
  };
}

function sanitizeProperties(properties?: AnalyticsProperties) {
  if (!properties) {
    return undefined;
  }

  const nextProperties = Object.fromEntries(
    Object.entries(properties).filter(([, value]) => value !== undefined),
  ) as Record<string, AnalyticsPrimitive>;

  return Object.keys(nextProperties).length > 0 ? nextProperties : undefined;
}

function enqueueEvent(event: QueuedEvent) {
  queuedEvents.push(event);
}

function flushQueuedEvents() {
  if (!analyticsClient || !analyticsReady || queuedEvents.length === 0) {
    return;
  }

  const events = queuedEvents;
  queuedEvents = [];

  for (const event of events) {
    if (event.type === "screen") {
      analyticsClient.track(
        "screen_view",
        sanitizeProperties({
          screen: event.screenName,
          ...event.properties,
        }),
      );
      continue;
    }

    analyticsClient.track(event.eventName, sanitizeProperties(event.properties));
  }
}

export async function initAnalytics() {
  if (!MIXPANEL_TOKEN) {
    return;
  }

  if (analyticsReady) {
    return;
  }

  if (!analyticsInitPromise) {
    analyticsInitPromise = (async () => {
      try {
        const mixpanel = new Mixpanel(MIXPANEL_TOKEN, false);
        await mixpanel.init(false, getDefaultProperties());
        mixpanel.setLoggingEnabled(__DEV__);
        analyticsClient = mixpanel;
        analyticsReady = true;
        flushQueuedEvents();
      } catch (error) {
        analyticsClient = null;
        analyticsReady = false;
        analyticsInitPromise = null;
        console.error("Failed to initialize analytics:", error);
      }
    })();
  }

  await analyticsInitPromise;
}

export function track(eventName: string, properties?: AnalyticsProperties) {
  if (!analyticsReady || !analyticsClient) {
    enqueueEvent({ type: "track", eventName, properties });
    return;
  }

  analyticsClient.track(eventName, sanitizeProperties(properties));
}

export function trackScreen(
  screenName: string,
  properties?: AnalyticsProperties,
) {
  if (!analyticsReady || !analyticsClient) {
    enqueueEvent({ type: "screen", screenName, properties });
    return;
  }

  analyticsClient.track(
    "screen_view",
    sanitizeProperties({
      screen: screenName,
      ...properties,
    }),
  );
}

export function flushAnalytics() {
  analyticsClient?.flush();
}
