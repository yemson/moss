import type { ImageSourcePropType } from "react-native";
import type { ImageContentFit } from "expo-image";

export interface SubscriptionTemplate {
  key: string;
  name: string;
  categoryId: string;
  categoryLabel: string;
  logo?: ImageSourcePropType;
  logoContentFit?: ImageContentFit;
}

export const SUBSCRIPTION_TEMPLATES: readonly SubscriptionTemplate[] = [
  {
    key: "netflix",
    name: "넷플릭스",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/netflix.png"),
  },
  {
    key: "youtube-premium",
    name: "유튜브 프리미엄",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/youtube.png"),
  },
  {
    key: "disney-plus",
    name: "디즈니+",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/disneyplus.png"),
  },
  {
    key: "apple-tv-plus",
    name: "Apple TV+",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/appletv.png"),
  },
  {
    key: "tving",
    name: "티빙",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/tving.png"),
  },
  {
    key: "wavve",
    name: "웨이브",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/wavve.png"),
  },
  {
    key: "coupang-play",
    name: "쿠팡플레이",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/coupangplay.png"),
  },
  {
    key: "laftel",
    name: "라프텔",
    categoryId: "cat_ott",
    categoryLabel: "OTT",
    logo: require("../../assets/icon/laftel.jpg"),
  },
  {
    key: "spotify",
    name: "Spotify",
    categoryId: "cat_music",
    categoryLabel: "음악",
    logo: require("../../assets/icon/spotify.png"),
  },
  {
    key: "apple-music",
    name: "Apple Music",
    categoryId: "cat_music",
    categoryLabel: "음악",
    logo: require("../../assets/icon/applemusic.png"),
  },
  {
    key: "youtube-music",
    name: "YouTube Music",
    categoryId: "cat_music",
    categoryLabel: "음악",
    logo: require("../../assets/icon/youtubemusic.png"),
  },
  {
    key: "melon",
    name: "멜론",
    categoryId: "cat_music",
    categoryLabel: "음악",
    logo: require("../../assets/icon/melon.png"),
  },
  {
    key: "icloud-plus",
    name: "iCloud+",
    categoryId: "cat_cloud",
    categoryLabel: "클라우드",
    logo: require("../../assets/icon/icloudplus.png"),
    logoContentFit: "contain",
  },
  {
    key: "google-one",
    name: "Google One",
    categoryId: "cat_cloud",
    categoryLabel: "클라우드",
    logo: require("../../assets/icon/googleone.png"),
  },
  {
    key: "dropbox",
    name: "Dropbox",
    categoryId: "cat_cloud",
    categoryLabel: "클라우드",
    logo: require("../../assets/icon/dropbox.png"),
  },
  {
    key: "notion",
    name: "Notion",
    categoryId: "cat_productivity",
    categoryLabel: "생산성",
    logo: require("../../assets/icon/notion.png"),
  },
  {
    key: "chatgpt-plus",
    name: "ChatGPT Plus",
    categoryId: "cat_productivity",
    categoryLabel: "생산성",
    logo: require("../../assets/icon/chatgpt.png"),
  },
  {
    key: "microsoft-365",
    name: "Microsoft 365",
    categoryId: "cat_productivity",
    categoryLabel: "생산성",
    logo: require("../../assets/icon/microsoft365.png"),
  },
  {
    key: "adobe-creative-cloud",
    name: "Adobe Creative Cloud",
    categoryId: "cat_productivity",
    categoryLabel: "생산성",
    logo: require("../../assets/icon/adobe.png"),
  },
  {
    key: "naver-plus",
    name: "네이버플러스 멤버십",
    categoryId: "cat_etc",
    categoryLabel: "기타",
    logo: require("../../assets/icon/naver.png"),
  },
] as const;

export function getSubscriptionTemplate(
  templateKey: string | null | undefined,
) {
  if (!templateKey) {
    return null;
  }

  return (
    SUBSCRIPTION_TEMPLATES.find((template) => template.key === templateKey) ??
    null
  );
}
