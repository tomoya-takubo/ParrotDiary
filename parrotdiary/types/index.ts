/**
 * ガチャ結果の型定義
 */
export type GachaResult = {
  type: 'normal' | 'rare' | 'super_rare' | 'ultra_rare';
  name: string;
  description: string;
  image: string;
};

/**
 * ユーザーステータスの型定義
 */
export type UserStatus = {
  level: number;
  currentXP: number;
  nextLevelXP: number;
  totalDiaryEntries: number;
  streak: number;
  ranking: string;
};