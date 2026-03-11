import Svg, { Circle, Path, Rect, Polygon } from "react-native-svg";

interface SubscriptionTemplateLogoProps {
  size: number;
}

export function NetflixLogo({ size }: SubscriptionTemplateLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M18 12h7l14 25V12h7v40h-7L25 27v25h-7V12Z"
        fill="#E50914"
      />
    </Svg>
  );
}

export function YouTubePremiumLogo({ size }: SubscriptionTemplateLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Rect x="7" y="16" width="50" height="32" rx="12" fill="#FF0033" />
      <Polygon points="28,24 28,40 42,32" fill="#FFFFFF" />
    </Svg>
  );
}

export function SpotifyLogo({ size }: SubscriptionTemplateLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Circle cx="32" cy="32" r="25" fill="#1ED760" />
      <Path
        d="M20 27.5c8-2.2 16.2-1.7 24.6 1.7"
        stroke="#0B0B0F"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <Path
        d="M22.5 35c6.3-1.5 12.7-1.1 19 1.5"
        stroke="#0B0B0F"
        strokeWidth="3.5"
        strokeLinecap="round"
      />
      <Path
        d="M24.5 41.5c4.5-.9 9-.5 13.2 1.2"
        stroke="#0B0B0F"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function ICloudLogo({ size }: SubscriptionTemplateLogoProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" fill="none">
      <Path
        d="M21 47c-6.1 0-11-4.5-11-10.1 0-5 4.1-9.2 9.4-10 1.7-7.4 8.3-12.9 16.3-12.9 8 0 14.8 5.6 16.4 13.2 5 1.2 8.9 5.3 8.9 10 0 5.9-5.4 9.8-11.6 9.8H21Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}
