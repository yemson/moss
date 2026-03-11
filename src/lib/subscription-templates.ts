import {
  ICloudLogo,
  NetflixLogo,
  SpotifyLogo,
  YouTubePremiumLogo,
} from "@/components/subscriptions/subscription-template-logos";
import type { ComponentType } from "react";

interface SubscriptionTemplateLogoProps {
  size: number;
}

export interface SubscriptionTemplate {
  key: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  badgeClassName: string;
  Logo: ComponentType<SubscriptionTemplateLogoProps>;
}

export const SUBSCRIPTION_TEMPLATES: readonly SubscriptionTemplate[] = [
  {
    key: "netflix",
    name: "넷플릭스",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    badgeClassName: "bg-black",
    Logo: NetflixLogo,
  },
  {
    key: "youtube-premium",
    name: "유튜브 프리미엄",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    badgeClassName: "bg-white",
    Logo: YouTubePremiumLogo,
  },
  {
    key: "spotify",
    name: "Spotify",
    categoryId: "cat_music",
    categoryLabel: "음악",
    badgeClassName: "bg-[#121212]",
    Logo: SpotifyLogo,
  },
  {
    key: "icloud-plus",
    name: "iCloud+",
    categoryId: "cat_cloud",
    categoryLabel: "클라우드",
    badgeClassName: "bg-[#0A84FF]",
    Logo: ICloudLogo,
  },
] as const;

export function getSubscriptionTemplate(templateKey: string | null | undefined) {
  if (!templateKey) {
    return null;
  }

  return (
    SUBSCRIPTION_TEMPLATES.find((template) => template.key === templateKey) ??
    null
  );
}
