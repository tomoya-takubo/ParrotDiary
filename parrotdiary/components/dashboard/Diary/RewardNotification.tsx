'use client';

import { useReward } from '@/lib/RewardContext'; // RewardContextから通知データを取得
import styles from './RewardNotification.module.css';

/**
 * RewardNotification - ユーザーが報酬を獲得した際に表示される通知コンポーネント
 * 
 * このコンポーネントは画面右上に表示され、獲得したXP、チケット、レベルアップ情報を表示します。
 * RewardContextから報酬データを取得し、データがある場合のみ表示されます。
 * @returns 報酬通知コンポーネント（報酬がない場合はnull）
 */
export default function RewardNotification() {
  const { reward } = useReward(); // RewardContextから報酬データを取得

  // 報酬データがない場合は何も表示しない
  if (!reward) return null;

  return (
    <div className={styles.rewardNotification}>
      {/* 報酬アイコン */}
      <div className={styles.rewardIcon}>🎉</div>
      
      {/* 報酬内容 */}
      <div className={styles.rewardContent}>
        <h3>報酬獲得！</h3>
        <p>{reward.xp} XP を獲得しました！</p>
        
        {/* チケット獲得時のみ表示 */}
        {reward.tickets > 0 && (
          <p>ガチャチケット {reward.tickets}枚 を獲得しました！</p>
        )}
        
        {/* レベルアップ時のみ表示 */}
        {reward.levelUp && (
          <p className={styles.levelUpText}>
            レベルアップ！ レベル{reward.newLevel}になりました！
          </p>
        )}
      </div>
    </div>
  );
}
