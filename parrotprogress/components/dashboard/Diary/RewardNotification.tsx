'use client';

import { useReward } from '@/lib/RewardContext'; // ← Contextから通知データ取得
import styles from './RewardNotification.module.css';

export default function RewardNotification() {
  const { reward } = useReward();

  if (!reward) return null;

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
