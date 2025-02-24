export type ParrotImage = {
  src: string;
  alt: string;
};

// ガチャ関連の型定義
export type GachaResult = {
  type: 'normal' | 'rare' | 'super_rare' | 'ultra_rare';
  name: string;
  description: string;
  image: string;
};

// 日記関連の型定義
export type DiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
};

// ユーザーステータスの型定義
export type UserStatus = {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  dailyXP: number;
  dailyGoalXP: number;
  focusTimeToday: number;
  focusTimeGoal: number;
  streak: number;
  ranking: string;
};