"use client";

import { createContext, useContext, useState } from 'react';

/**
 * 報酬データの型定義
 */
type Reward = {
  /** 経験値 */
  xp: number;
  /** チケット数 */
  tickets: number;
  /** レベルアップしたかどうか */
  levelUp: boolean;
  /** 新しいレベル */
  newLevel: number | null;
};

/**
 * 報酬コンテキストの型定義
 */
type RewardContextType = {
  /** 現在の報酬データ */
  reward: Reward | null;
  /** 報酬を表示する関数 */
  showReward: (reward: Reward) => void;
};

/**
 * 報酬コンテキスト
 */
const RewardContext = createContext<RewardContextType | undefined>(undefined);

/**
 * 報酬プロバイダーコンポーネント
 * @param props プロパティ
 * @param props.children 子コンポーネント
 * @returns 報酬プロバイダー
 */
export const RewardProvider = ({ children }: { children: React.ReactNode }) => {
  const [reward, setReward] = useState<Reward | null>(null);

  /**
   * 報酬を表示
   * @param r 表示する報酬データ
   */
  const showReward = (r: Reward) => {
    setReward(r);
    setTimeout(() => setReward(null), 5000); // 10秒で消える
  };

  return (
    <RewardContext.Provider value={{ reward, showReward }}>
      {children}
    </RewardContext.Provider>
  );
};

/**
 * 報酬コンテキストを使用するためのフック
 * @returns 報酬コンテキスト
 */
export const useReward = () => {
  const context = useContext(RewardContext);
  if (!context) throw new Error('useReward must be used within RewardProvider');
  return context;
};
