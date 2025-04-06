'use client';

import React, { useState, useEffect } from 'react';
import { Star, Gift, Book, Award, LogOut, Shield, Medal, Trophy } from 'lucide-react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { signOut } from '@/lib/authentication';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// コンポーネントのインポート
import GachaAnimation from '@/components/dashboard/gacha/GachaAnimation';
import ActivityHistory from '@/components/dashboard/ActivityHistory/ActivityHistory';
import Diary from '@/components/dashboard/Diary/Diary';
import type { UserStatus } from '@/types';

//#region Dashboard コンポーネント - メインダッシュボード
export default function Dashboard() {
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  //#region State
  // モーダル表示用のstate
  const [showGachaModal, setShowGachaModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // チケット情報を格納するstate
  const [ticketCount, setTicketCount] = useState<number>(0);
  const [isLoadingTickets, setIsLoadingTickets] = useState<boolean>(true);
  
  // ユーザー情報を格納するstate
  const [userStatus, setUserStatus] = useState<UserStatus>({
    level: 1,
    currentXP: 0,
    nextLevelXP: 1000,
    totalDiaryEntries: 0,
    streak: 0,
    ranking: 'ブロンズ'
  });

  const getRankStyle = (rank: string) => {
    switch (rank) {
      case 'ブロンズ':
        return {
          icon: Shield,
          gradient: 'linear-gradient(135deg, #cd7f32, #a65c00)', // 🔶 銅色グラデ
          subtext: 'シルバーまであと10日'
        };
      case 'シルバー':
        return {
          icon: Medal,
          gradient: 'linear-gradient(135deg, #cbd5e0, #a0aec0)', // シルバー風
          subtext: 'ゴールドまであと30日'
        };
      case 'ゴールド':
        return {
          icon: Trophy,
          gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)', // ゴールド
          subtext: 'プラチナまであと60日'
        };
      case 'プラチナ':
        return {
          icon: Star,
          gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)', // プラチナ感
          subtext: '最高ランクです！'
        };
      default:
        return {
          icon: Shield,
          gradient: 'linear-gradient(135deg, #e2e8f0, #cbd5e0)',
          subtext: ''
        };
    }
  };

  const rankStyle = getRankStyle(userStatus.ranking);

  const [isLoadingUserStatus, setIsLoadingUserStatus] = useState<boolean>(true);

  // useStateで更新トリガーを追加
  const [refreshKey, setRefreshKey] = useState(0);


  // レベルに基づいて必要なXPを計算する関数
  const calculateRequiredXpForLevel = (level: number): number => {
    // レベルごとの必要XPの計算式（例: 基本値 × レベル^1.5）
    return Math.floor(1000 * Math.pow(level, 1.5));
  };
  
  // 連続ログイン日数からランクを決定する関数
  const getRankFromStreak = (streak: number): string => {
    if (streak >= 60) return 'プラチナ';
    if (streak >= 30) return 'ゴールド';
    if (streak >= 10) return 'シルバー';
    return 'ブロンズ';
  };
  
  // 合計XPからレベル情報を計算する関数
  const calculateLevelInfo = (totalXp: number, currentLevel: number): { 
    level: number, 
    currentXP: number, 
    nextLevelXP: number 
  } => {
    // データベースのレベルをベースに計算
    const level = currentLevel;
    
    // 累積XPの計算（現在のレベルまでに必要だったXP）
    let accumulatedXp = 0;
    for (let i = 1; i < level; i++) {
      accumulatedXp += calculateRequiredXpForLevel(i);
    }
    
    // 現在のレベルでの経験値
    const currentLevelXp = totalXp - accumulatedXp;
    
    // 次のレベルに必要な経験値
    const nextLevelRequiredXp = calculateRequiredXpForLevel(level);
    
    // もし現在の経験値が次のレベルに必要な経験値を超えていたら、
    // データベースのレベルが最新でない可能性があるため、警告をログに出す
    if (currentLevelXp >= nextLevelRequiredXp) {
      console.warn('データベースのレベルが最新ではない可能性があります。レベルアップ処理が必要かもしれません。');
    }
    
    return {
      level,
      currentXP: currentLevelXp,
      nextLevelXP: nextLevelRequiredXp
    };
  };
  //#endregion

  // ページ読み込み時にユーザー情報とチケット情報を取得
  useEffect(() => {
    console.log('📦 [Dashboard] refreshKey による再取得: refreshKey =', refreshKey);
  
    const fetchUserData = async () => {
      try {
        setIsLoadingUserStatus(true);
        setIsLoadingTickets(true);
  
        console.log('📤 Supabase からユーザー情報・チケット情報の再取得開始');
  
        const { data: { user } } = await supabase.auth.getUser();
        console.log('👤 現在のユーザー:', user);
  
        if (!user) {
          console.error('❌ ユーザーが認証されていません');
          setIsLoadingUserStatus(false);
          setIsLoadingTickets(false);
          return;
        }
  
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('level, total_xp, streak')
          .eq('id', user.id)
          .single();
  
        if (userError) {
          console.error('❌ ユーザー情報の取得に失敗:', userError);
        } else if (userData) {
          
          // ✅ user_streaks（継続記録）の取得と判定
          const { data: streakData } = await supabase
          .from('user_streaks')
          .select('login_streak_count, last_login_date')
          .eq('user_id', user.id)
          .single();

          let loginStreak = 0;
          if (streakData?.last_login_date) {
          const today = new Date();
          const lastLogin = new Date(streakData.last_login_date);
          const diffInDays = Math.floor((today.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));
          loginStreak = diffInDays <= 1 ? streakData.login_streak_count : 0;
          }

          // ✅ 日記件数の取得
          const { count: diaryCount } = await supabase
          .from('diary_entries')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id);

          if (userData) {
            const levelInfo = calculateLevelInfo(userData.total_xp, userData.level);

            setUserStatus({
              level: levelInfo.level,
              currentXP: levelInfo.currentXP,
              nextLevelXP: levelInfo.nextLevelXP,
              totalDiaryEntries: diaryCount || 0,
              streak: loginStreak,
              ranking: getRankFromStreak(loginStreak)
            });
          }
        }
  
        const { data: ticketData, error: ticketError } = await supabase
          .from('gacha_tickets')
          .select('ticket_count')
          .eq('user_id', user.id)
          .single();
  
        if (ticketError) {
          console.error('❌ チケット情報の取得に失敗:', ticketError);
          setTicketCount(0);
        } else if (ticketData) {
          console.log('🎟️ チケットデータ取得成功:', ticketData);
          setTicketCount(ticketData.ticket_count);
        } else {
          console.warn('⚠️ チケットデータが存在しません。');
          setTicketCount(0);
        }
      } catch (error) {
        console.error('❌ データ取得中の例外:', error);
      } finally {
        setIsLoadingUserStatus(false);
        setIsLoadingTickets(false);
      }
    };
  
    fetchUserData();
  }, [supabase, refreshKey]);
  
  //#region Handlers
  /**
   * 活動履歴のセルがクリックされたときのハンドラ
   * 選択された日付の日記データをSupabaseから取得し、モーダルで表示する
   */
  const handleActivityCellClick = (date: string) => {
    // ガチャモーダルが開いている場合は処理を中断
    if (showGachaModal) {
      return;
    }
    
    console.log(`セルがクリックされました: ${date}`);
            
  };

  // ログアウト処理を行うハンドラ
  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      const response = await signOut();
      
      if (response.success) {
        // ログアウト成功時にホームページへリダイレクト
        router.push('/');
      } else {
        console.error('ログアウトエラー:', response.error);
        alert('ログアウトに失敗しました。もう一度お試しください。');
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('ログアウト処理エラー:', error);
      alert('ログアウト中にエラーが発生しました。');
      setIsLoggingOut(false);
    }
  };
  //#endregion

  // ガチャを開始する関数
  // startGacha関数を簡素化
  const startGacha = async () => {
    if (ticketCount <= 0) {
      alert('チケットがありません。活動を行ってチケットを獲得してください。');
      return;
    }
    setShowGachaModal(true);
  };

  // ガチャ完了後に画面のチケット数を更新する関数を追加
  const updateTicketCount = async () => {
    try {
      // 現在ログイン中のユーザー情報を取得
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('ユーザーが認証されていません');
        return;
      }
      
      // 最新のチケット情報を取得
      const { data, error } = await supabase
        .from('gacha_tickets')
        .select('ticket_count')
        .eq('user_id', user.id)
        .single();
        
      if (error) {
        console.error('❌ チケット情報の取得に失敗しました:', error);
        return;
      }
  
      console.log('🎟️ チケット再取得成功（updateTicketCount）:', data?.ticket_count);
  
      // ローカルのチケットカウントを更新
      setTicketCount(data ? data.ticket_count : 0);
    } catch (error) {
      console.error('❌ チケット更新中にエラーが発生しました:', error);
    }
  };

  useEffect(() => {
    updateTicketCount();
  }, [refreshKey]);

  // ガチャを閉じる関数
  const closeGacha = () => {
    setShowGachaModal(false);
  };

  return (
    <div className={styles.pageContainer}>
      <div className={styles.contentContainer}>
        {/* ヘッダー */}
        <div className={styles.headerContainer}>
          <h1 className={styles.appTitle}>ぱろっとだいありー</h1>
          <div className={styles.navButtons}>
            {/* ログアウトボタンを追加 */}
            <button 
              className={`${styles.navButton}`}
              onClick={handleLogout}
              disabled={isLoggingOut}
            >
              <LogOut size={20} />
              <span>{isLoggingOut ? 'ログアウト中...' : 'ログアウト'}</span>
            </button>
            <div className={styles.divider}></div>
            {/* <button className={styles.navButton}>
              <Star size={20} />
              <span>統計</span>
            </button> */}
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
                // ガチャモーダルが開いているときはボタンを無効化
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
            {[
              {
                icon: Book,
                title: '日記総記録数',
                value: isLoadingUserStatus ? '読込中...' : `${userStatus.totalDiaryEntries}件`,
                subtext: '継続は力なり！',
                gradient: 'linear-gradient(135deg, #60a5fa, #3b82f6)'
              },
              {
                icon: Award,
                title: '継続記録',
                value: isLoadingUserStatus ? '読込中...' : `${userStatus.streak}日連続`,
                subtext: '自己ベスト更新中！',
                gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)'
              },
              {
                icon: rankStyle.icon,
                title: 'ランク',
                value: isLoadingUserStatus ? '読込中...' : userStatus.ranking,
                subtext: rankStyle.subtext,
                gradient: rankStyle.gradient
              }
            ].map((stat, index) => (
              <div key={index} className={styles.statItem}>
                <div className={styles.statHeader}>
                  <div 
                    className={styles.statIconContainer}
                    style={{ background: stat.gradient }}
                  >
                    <stat.icon size={20} />
                  </div>
                  <div className={styles.statInfo}>
                    <div className={styles.statLabel}>{stat.title}</div>
                    <div className={styles.statValue}>{stat.value}</div>
                  </div>
                </div>
                <div className={styles.statDescription}>{stat.subtext}</div>
              </div>
            ))}
          </div>
        </div>
      
        {/* 活動履歴 - ガチャモーダルの状態を渡す */}
        <ActivityHistory 
          onCellClick={handleActivityCellClick} 
          isGachaOpen={showGachaModal} 
          onSave={() => {
            setRefreshKey(k => k + 1); // ← 追加
          }}
        />

        {/* 3行日記 */}
        <Diary key={`diary-${refreshKey}`} onSave={() => setRefreshKey(k => k + 1)} />

        {/* モーダルコンポーネント */}
        {/* ガチャアニメーションコンポーネント */}
        <GachaAnimation
        isOpen={showGachaModal}
        startGacha={updateTicketCount}
        onClose={closeGacha}
      />        
      </div>
    </div>
  );
}
//#endregion