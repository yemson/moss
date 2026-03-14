import {
  BannerAd,
  BannerAdSize,
  TestIds,
  useForeground,
} from "react-native-google-mobile-ads";
import React, { useRef, useState } from "react";
import { Skeleton } from "heroui-native";
import { View } from "react-native";

const BANNER_WIDTH = 320;
const BANNER_HEIGHT = 50;
const PRODUCTION_BANNER_UNIT_ID = "ca-app-pub-3328690901134365/4610474320";

export function SubscriptionSummaryNativeAd() {
  const bannerRef = useRef<BannerAd>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(BANNER_HEIGHT);
  const bannerUnitId = __DEV__ ? TestIds.BANNER : PRODUCTION_BANNER_UNIT_ID;

  useForeground(() => {
    bannerRef.current?.load();
  });

  if (hasFailed) {
    return null;
  }

  return (
    <View className="items-center">
      <View
        className="overflow-hidden"
        style={{ height: bannerHeight, width: BANNER_WIDTH }}
      >
        {!hasLoaded ? (
          <Skeleton
            className="absolute inset-0"
            style={{ height: bannerHeight, width: BANNER_WIDTH }}
          />
        ) : null}
        <BannerAd
          ref={bannerRef}
          unitId={bannerUnitId}
          size={BannerAdSize.BANNER}
          onAdLoaded={(dimensions) => {
            setHasLoaded(true);
            setHasFailed(false);
            setBannerHeight(dimensions.height);
          }}
          onAdFailedToLoad={(error) => {
            console.error("Failed to load banner ad:", error);
            setHasFailed(true);
          }}
          onSizeChange={(dimensions) => {
            setBannerHeight(dimensions.height);
          }}
        />
      </View>
    </View>
  );
}
