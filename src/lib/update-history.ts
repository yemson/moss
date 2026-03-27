export interface UpdateHistoryEntry {
  version: string;
  date: string;
  highlights: string[];
}

export const UPDATE_HISTORY: UpdateHistoryEntry[] = [
  {
    version: "1.0.2",
    date: "2026.03.27",
    highlights: [
      "알림 날짜를 더 세밀하게 선택할 수 있게 개선했어요.",
      "설정 화면 전반을 더 편하게 정리했어요.",
      "앱 안내에서 필요한 항목을 더 쉽게 찾을 수 있게 했어요.",
    ],
  },
  {
    version: "1.0.1",
    date: "2026.03.23",
    highlights: [
      "온보딩을 스와이프로 넘길 수 있게 개선했어요.",
      "설정에서 직접 카테고리를 추가하고 관리할 수 있게 되었어요.",
      "설정 화면의 이동 방식을 더 자연스럽게 정리했어요.",
      "카테고리가 많을 때 선택 목록이 넘치지 않도록 사용성을 개선했어요.",
    ],
  },
  {
    version: "1.0.0",
    date: "2026.03.16",
    highlights: [
      "첫 출시!",
    ],
  },
];
