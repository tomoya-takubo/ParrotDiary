'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Star, Gift, Book, Award, LogOut, Shield, Medal, Trophy } from 'lucide-react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/authentication';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { getStreakData } from '@/utils/streakUtils';

// コンポーネントのインポート
import GachaAnimation from '@/components/dashboard/gacha/GachaAnimation';
import ActivityHistory from '@/components/dashboard/ActivityHistory/ActivityHistory';
import Diary from '@/components/dashboard/Diary/Diary';
import EditDiaryModal from '@/components/dashboard/modals/EditDiaryModal';
import type { UserStatus } from '@/types';

export default function Dashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();

  const [showGachaModal, setShowGachaModal] = useState(false);
  const [showNewDiaryModal, setShowNewDiaryModal] = useState<boolean>(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(true);
  const [userStatus, setUserStatus] = useState<UserStatus>({
    level: 1,
    currentXP: 0,
    nextLevelXP: 1000,
    totalDiaryEntries: 0,
    streak: 0,
    ranking: 'ブロンズ'
  });
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingUserStatus, setIsLoadingUserStatus] = useState<boolean>(true);

  // ランクの閾値
  const RANK_THRESHOLDS = {
    SILVER: 10,
    GOLD: 30,
    PLATINUM: 60
  };

  /**
   * ランクに応じたスタイル（アイコン・グラデーション）を返す
   */
  const getRankStyle = (rank: string) => {
    switch (rank) {
      case 'ブロンズ':
        return {
          icon: Shield,
          gradient: 'linear-gradient(135deg, #cd7f32, #a65c00)'
        };
      case 'シルバー':
        return {
          icon: Medal,
          gradient: 'linear-gradient(135deg, #cbd5e0, #a0aec0)'
        };
      case 'ゴールド':
        return {
          icon: Trophy,
          gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)'
        };
      case 'プラチナ':
        return {
          icon: Star,
          gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)'
        };
      default:
        return {
          icon: Shield,
          gradient: 'linear-gradient(135deg, #e2e8f0, #cbd5e0)'
        };
    }
  };

  /**
   * レベルに基づいて次のレベルに必要なXPを計算
   */
  const calculateRequiredXpForLevel = (level: number): number => {
    return Math.floor(1000 * Math.pow(level, 1.5));
  };

  /**
   * 連続ログイン日数からランク名を決定
   */
  const getRankFromStreak = React.useCallback((streak: number): string => {
    if (streak >= RANK_THRESHOLDS.PLATINUM) return 'プラチナ';
    if (streak >= RANK_THRESHOLDS.GOLD) return 'ゴールド';
    if (streak >= RANK_THRESHOLDS.SILVER) return 'シルバー';
    return 'ブロンズ';
  }, [RANK_THRESHOLDS.PLATINUM, RANK_THRESHOLDS.GOLD, RANK_THRESHOLDS.SILVER]);

  /**
   * 合計XPからレベル情報を計算
   */
  const calculateLevelInfo = React.useCallback((totalXp: number, currentLevel: number): { 
    level: number, 
    currentXP: number, 
    nextLevelXP: number 
  } => {
    const level = currentLevel;
    let accumulatedXp = 0;
    for (let i = 1; i < level; i++) {
      accumulatedXp += calculateRequiredXpForLevel(i);
    }
    const currentLevelXp = totalXp - accumulatedXp;
    const nextLevelRequiredXp = calculateRequiredXpForLevel(level);
    return {
      level,
      currentXP: currentLevelXp,
      nextLevelXP: nextLevelRequiredXp
    };
  }, []);

  /**
   * ランクのサブテキストを生成
   */
  const getRankSubtext = (streak: number): string => {
    if (streak >= RANK_THRESHOLDS.PLATINUM) {
      return '最高ランクです！';
    } else if (streak >= RANK_THRESHOLDS.GOLD) {
      const daysToNextRank = RANK_THRESHOLDS.PLATINUM - streak;
      return `プラチナまであと${daysToNextRank}日`;
    } else if (streak >= RANK_THRESHOLDS.SILVER) {
      const daysToNextRank = RANK_THRESHOLDS.GOLD - streak;
      return `ゴールドまであと${daysToNextRank}日`;
    } else {
      const daysToNextRank = RANK_THRESHOLDS.SILVER - streak;
      return `シルバーまであと${daysToNextRank}日`;
    }
  };

  /**
   * 継続記録のサブテキストを生成
   */
  const getStreakSubtext = (streak: number): string => {
    if (streak === 0) return '今日から始めましょう！';
    if (streak < 7) return '一週間を目指しましょう！';
    if (streak < 30) return '継続中、その調子！';
    if (streak < 100) return 'もっともっと！まだまだいける！！';
    return 'すごい継続力です！';
  };

  /**
   * 日記総記録数のサブテキストを生成
   */
  const getDiarySubtext = (count: number): string => {
    if (count === 0) return '最初の記録を作成しましょう！';
    if (count < 10) return 'コツコツ記録していきましょう！';
    if (count < 50) return '継続は力なり！';
    if (count < 100) return '素晴らしい記録数です！';
    return '記録の達人です！';
  };

  /**
   * 新規日記用エントリーのテンプレートを返す
   */
  const getNewDiaryEntry = () => {
    const now = new Date();
    const formattedTime = now.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return {
      time: formattedTime,
      tags: [],
      activities: [],
      parrots: []
    };
  };


  // ログイン直後に新規日記モーダルを表示
  useEffect(() => {
    const checkAndShowModal = async () => {
      try {
        if (!isLoadingUserStatus) {
          const { data: { user } } = await supabase.auth.getUser();
          if (user?.id) {
            const sessionKey = `diary_modal_shown_${user.id}`;
            if (!sessionStorage.getItem(sessionKey)) {
              setShowNewDiaryModal(true);
              sessionStorage.setItem(sessionKey, 'true');
            }
          }
        }
      } catch (error) {
        console.error('認証確認エラー:', error);
      }
    };
    checkAndShowModal();
  }, [isLoadingUserStatus, supabase.auth]);

  // ユーザー情報・チケット情報を取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUserStatus(true);
        setIsLoadingTickets(true);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          router.push('/login');
          return;
        }

        // ユーザー基本情報
        const { data: userData } = await supabase
          .from('users')
          .select('level, total_xp')
          .eq('id', user.id)
          .single();

        // 継続記録データの取得
        let loginStreak = 0;
        try {
          // ダッシュボード表示時にストリーク情報を取得
          console.log('ダッシュボード: ストリーク情報取得開始:', user.id);
          const streakData = await getStreakData(user.id);
          
          if (streakData) {
            loginStreak = streakData.login_streak_count;
            console.log('ダッシュボード: ストリーク情報取得完了:', {
              currentStreak: streakData.login_streak_count,
              maxStreak: streakData.login_max_streak,
              lastLoginDate: streakData.last_login_date
            });
            
          } else {
            console.warn('ダッシュボード: ストリーク情報取得に失敗');
          }
        } catch (streakError) {
          console.error('❌ ストリークデータ取得中の例外:', streakError);
          loginStreak = 0;
        }

        // 日記件数
        const { count: diaryCount } = await supabase
          .from('diary_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

        if (userData) {
          const levelInfo = calculateLevelInfo(userData.total_xp, userData.level);
          const currentRank = getRankFromStreak(loginStreak);
          setUserStatus({
            level: levelInfo.level,
            currentXP: levelInfo.currentXP,
            nextLevelXP: levelInfo.nextLevelXP,
            totalDiaryEntries: diaryCount || 0,
            streak: loginStreak,
            ranking: currentRank
          });
        }

        // チケット情報
        const { data: ticketData } = await supabase
          .from('gacha_tickets')
          .select('ticket_count')
          .eq('user_id', user.id)
          .single();
        setTicketCount(ticketData ? ticketData.ticket_count : 0);

      } catch {
        router.push('/login');
      } finally {
        setIsLoadingUserStatus(false);
        setIsLoadingTickets(false);
      }
    };
    fetchUserData();
  }, [supabase, refreshKey, router, calculateLevelInfo, getRankFromStreak]);

  // ガチャ完了後にチケット数を更新
  const updateTicketCount = React.useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('gacha_tickets')
        .select('ticket_count')
        .eq('user_id', user.id)
        .single();
      setTicketCount(data ? data.ticket_count : 0);
    } catch (error) {
      console.error('❌ チケット更新中にエラーが発生しました:', error);
    }
  }, [supabase]);

  useEffect(() => {
    updateTicketCount();
  }, [refreshKey, updateTicketCount]);

  /** 活動履歴セルクリック */
  const handleActivityCellClick = (date: string) => {
    if (showGachaModal) return;
    console.log(`セルがクリックされました: ${date}`);
  };

  /** ログアウト処理 */
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await signOut();
      if (response.success) {
        router.push('/');
      } else {
        alert('ログアウトに失敗しました。もう一度お試しください。');
        setIsLoggingOut(false);
      }
    } catch {
      alert('ログアウト中にエラーが発生しました。');
      setIsLoggingOut(false);
    }
  };

  /** 新規日記モーダルを閉じる */
  const handleCloseDiaryModal = () => {
    setShowNewDiaryModal(false);
  };

  /** ガチャ開始 */
  const startGacha = async () => {
    if (ticketCount <= 0) {
      alert('チケットがありません。活動を行ってチケットを獲得してください。');
      return;
    }
    setShowGachaModal(true);
  };

  /** ガチャを閉じる */
  const closeGacha = () => {
    setShowGachaModal(false);
  };

  // ランクスタイルの計算をメモ化
  const rankStyle = useMemo(() => getRankStyle(userStatus.ranking), [userStatus.ranking]);

  // サブテキストの計算をメモ化
  const rankSubtext = useMemo(() => getRankSubtext(userStatus.streak), [userStatus.streak]);
  const streakSubtext = useMemo(() => getStreakSubtext(userStatus.streak), [userStatus.streak]);
  const diarySubtext = useMemo(() => getDiarySubtext(userStatus.totalDiaryEntries), [userStatus.totalDiaryEntries]);

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        {/* ヘッダー */}
        <div className={styles.headerContainer}>
          <h1 className={styles.appTitle}>ぱろっとだいありー</h1>
          <div className={styles.navButtons}>
            {/* ログアウトボタン */}
            <button 
              className={`${styles.navButton}`}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={20} />
              <span>{isLoggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
            </button>
            <div className={styles.divider}></div>
            {/* パロットコレクションボタン */}
            <button 
              className={`${styles.navButton} ${styles.primaryButton}`}
              onClick={() => router.push('/collection')}
            >
              <Book size={20} />
              <span>コレクション</span>
            </button>
          </div>
        </div>

        {/* XPステータスバーとガチャボタン */}
        <div className={styles.statusCard}>
          <div className={styles.statusCardContent}>
            {/* レベル進捗バー */}
            <div className={styles.levelProgress}>
              <div className={styles.levelInfo}>
                <span>
                  {isLoadingUserStatus 
                    ? 'ロード中...' 
                    : `Level ${userStatus.level}`
                  }
                </span>
                <span>
                  {isLoadingUserStatus 
                    ? '' 
                    : `${userStatus.currentXP} / ${userStatus.nextLevelXP} XP`
                  }
                </span>
              </div>
              <div className={styles.progressBarContainer}>
                <div 
                  className={styles.progressBar}
                  style={{ 
                    width: isLoadingUserStatus 
                      ? '0%' 
                      : `${(userStatus.currentXP / userStatus.nextLevelXP) * 100}%` 
                  }}
                />
              </div>
            </div>

            <div>
              {/* ガチャボタン */}
              <button 
                className={styles.gachaButton} 
                onClick={startGacha}
                disabled={showGachaModal || isLoadingTickets}
              >
                <div className={styles.ticketContainer}>
                  <span className={styles.ticketLabel}>チケット</span>
                  <span className={styles.ticketCount}>
                    {isLoadingTickets ? '読込中...' : `${ticketCount}枚`}
                  </span>
                </div>
                <div className={styles.gachaButtonContent}>
                  <Gift size={24} />
                  <span>ガチャを回す</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* 統計カード */}
        <div className={styles.statsCard}>
          <div className={styles.statsGrid}>
            {/* 日記総記録数 */}
            <div className={styles.statItem}>
              <div className={styles.statHeader}>
                <div 
                  className={styles.statIconContainer}
                  style={{ background: 'linear-gradient(135deg, #60a5fa, #3b82f6)' }}
                >
                  <Book size={20} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statLabel}>日記総記録数</div>
                  <div className={styles.statValue}>
                    {isLoadingUserStatus ? '読込中...' : `${userStatus.totalDiaryEntries}件`}
                  </div>
                </div>
              </div>
              <div className={styles.statDescription}>
                {isLoadingUserStatus ? '読込中...' : diarySubtext}
              </div>
            </div>
            
            {/* 継続記録 */}
            <div className={styles.statItem}>
              <div className={styles.statHeader}>
                <div 
                  className={styles.statIconContainer}
                  style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}
                >
                  <Award size={20} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statLabel}>継続記録</div>
                  <div className={styles.statValue}>
                    {isLoadingUserStatus ? '読込中...' : `${userStatus.streak}日連続`}
                  </div>
                </div>
              </div>
              <div className={styles.statDescription}>
                {isLoadingUserStatus ? '読込中...' : streakSubtext}
              </div>
            </div>
            
            {/* ランク */}
            <div className={styles.statItem}>
              <div className={styles.statHeader}>
                <div 
                  className={styles.statIconContainer}
                  style={{ background: rankStyle.gradient }}
                >
                  <rankStyle.icon size={20} />
                </div>
                <div className={styles.statInfo}>
                  <div className={styles.statLabel}>ランク</div>
                  <div className={styles.statValue}>
                    {isLoadingUserStatus ? '読込中...' : userStatus.ranking}
                  </div>
                </div>
              </div>
              <div className={styles.statDescription}>
                {isLoadingUserStatus ? '読込中...' : rankSubtext}
              </div>
            </div>
          </div>
        </div>
      
        {/* 活動履歴 */}
        <ActivityHistory 
          onCellClick={handleActivityCellClick} 
          isGachaOpen={showGachaModal} 
          onSave={() => setRefreshKey(k => k + 1)}
          refreshKey={refreshKey}
        />

        {/* 3行日記 */}
        <Diary key={`diary-${refreshKey}`} onSave={() => setRefreshKey(k => k + 1)} />

        {/* ガチャアニメーション */}
        <GachaAnimation
          isOpen={showGachaModal}
          startGacha={updateTicketCount}
          onClose={closeGacha}
        />

        {/* 新規日記モーダル */}
        {showNewDiaryModal && (
          <EditDiaryModal
            isOpen={showNewDiaryModal}
            onClose={handleCloseDiaryModal}
            entry={getNewDiaryEntry()}
            date={new Date().toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
            onSave={() => {
              setRefreshKey(k => k + 1);
              setShowNewDiaryModal(false);
            }}
          />
        )}
      </div>
    </div>
  );
}