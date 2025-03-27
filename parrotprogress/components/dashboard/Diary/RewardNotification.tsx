'use client';

// RewardNotification.tsx
import { useState, useEffect } from 'react';
import styles from './RewardNotification.module.css';

// 報酬の型を定義
interface RewardData {
  xp: number;
  tickets: number;
  levelUp: boolean;
  newLevel: number | null;
}

// グローバルな変数として通知キューを管理（型付き）
let notificationQueue: RewardData[] = [];
let showNotificationCallback: ((reward: RewardData) => void) | null = null;

// 通知を表示するためのグローバル関数
export function showReward(reward: RewardData): void {
  if (showNotificationCallback) {
    showNotificationCallback(reward);
  } else {
    notificationQueue.push(reward);
  }
}

export default function RewardNotification() {
  const [reward, setReward] = useState<RewardData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // コールバックを設定
    showNotificationCallback = (newReward: RewardData) => {
      setReward(newReward);
      setVisible(true);
      
      // 5秒後に非表示
      setTimeout(() => {
        setVisible(false);
      }, 5000);
    };
    
    // キューに溜まった通知を処理
    if (notificationQueue.length > 0 && notificationQueue[0]) {
      showNotificationCallback(notificationQueue.shift() as RewardData);
    }
    
    return () => {
      showNotificationCallback = null;
    };
  }, []);

  if (!visible || !reward) return null;

  return (
    <div className={styles.rewardNotification}>
      <div className={styles.rewardIcon}>🎉</div>
      <div className={styles.rewardContent}>
        <h3>報酬獲得！</h3>
        <p>{reward.xp} XP を獲得しました！</p>
        {reward.tickets > 0 && (
          <p>ガチャチケット {reward.tickets}枚 を獲得しました！</p>
        )}
        {reward.levelUp && (
          <p className={styles.levelUpText}>
            レベルアップ！ レベル{reward.newLevel}になりました！
          </p>
        )}
      </div>
    </div>
  );
}