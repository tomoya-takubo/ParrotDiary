"use client";

// lib/RewardContext.tsx
import { createContext, useContext, useState } from 'react';

type Reward = {
  xp: number;
  tickets: number;
  levelUp: boolean;
  newLevel: number | null;
};

type RewardContextType = {
  reward: Reward | null;
  showReward: (reward: Reward) => void;
};

const RewardContext = createContext<RewardContextType | undefined>(undefined);

export const RewardProvider = ({ children }: { children: React.ReactNode }) => {
  const [reward, setReward] = useState<Reward | null>(null);

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

export const useReward = () => {
  const context = useContext(RewardContext);
  if (!context) throw new Error('useReward must be used within RewardProvider');
  return context;
};
