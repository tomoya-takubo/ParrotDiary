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

  // useStateで更新トリガーを追加
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoadingUserStatus, setIsLoadingUserStatus] = useState<boolean>(true);
  
  // ランクの閾値を定義
  const RANK_THRESHOLDS = {
    SILVER: 10,
    GOLD: 30,
    PLATINUM: 60
  };

  const getRankStyle = (rank: string) => {
    switch (rank) {
      case 'ブロンズ':
        return {
          icon: Shield,
          gradient: 'linear-gradient(135deg, #cd7f32, #a65c00)' // 銅色グラデ
        };
      case 'シルバー':
        return {
          icon: Medal,
          gradient: 'linear-gradient(135deg, #cbd5e0, #a0aec0)' // シルバー風
        };
      case 'ゴールド':
        return {
          icon: Trophy,
          gradient: 'linear-gradient(135deg, #fbbf24, #f59e0b)' // ゴールド
        };
      case 'プラチナ':
        return {
          icon: Star,
          gradient: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' // プラチナ感
        };
      default:
        return {
          icon: Shield,
          gradient: 'linear-gradient(135deg, #e2e8f0, #cbd5e0)'
        };
    }
  };

  // レベルに基づいて必要なXPを計算する関数
  const calculateRequiredXpForLevel = (level: number): number => {
    return Math.floor(1000 * Math.pow(level, 1.5));
  };
  
  // 連続ログイン日数からランクを決定する関数
  const getRankFromStreak = (streak: number): string => {
    if (streak >= RANK_THRESHOLDS.PLATINUM) return 'プラチナ';
    if (streak >= RANK_THRESHOLDS.GOLD) return 'ゴールド';
    if (streak >= RANK_THRESHOLDS.SILVER) return 'シルバー';
    return 'ブロンズ';
  };
  
  // 合計XPからレベル情報を計算する関数
  const calculateLevelInfo = (totalXp: number, currentLevel: number): { 
    level: number, 
    currentXP: number, 
    nextLevelXP: number 
  } => {
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

  // ===== サブテキスト生成関数 =====
  
  // ランクに応じたサブテキストを生成する関数
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

  // 継続記録のサブテキストを生成する関数
  const getStreakSubtext = (streak: number): string => {
    if (streak === 0) return '今日から始めましょう！';
    if (streak < 7) return '一週間を目指しましょう！';
    if (streak < 30) return '継続中、その調子！';
    if (streak < 100) return 'もっともっと！まだまだいける！！';
    return 'すごい継続力です！';
  };

  // 日記総記録数のサブテキストを生成する関数
  const getDiarySubtext = (count: number): string => {
    if (count === 0) return '最初の記録を作成しましょう！';
    if (count < 10) return 'コツコツ記録していきましょう！';
    if (count < 50) return '継続は力なり！';
    if (count < 100) return '素晴らしい記録数です！';
    return '記録の達人です！';
  };

  // ページ読み込み時にユーザー情報とチケット情報を取得
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setIsLoadingUserStatus(true);
        setIsLoadingTickets(true);

        console.log('📤 Supabase からユーザー情報の再取得開始');

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError) {
          console.error('❌ ユーザー情報取得エラー:', userError);
          // セッションが無効になっている可能性がある場合はログインページにリダイレクト
          router.push('/login');
          return;
        }
        
        console.log('👤 現在のユーザー:', user);

        if (!user) {
          console.error('❌ ユーザーが認証されていません');
          setIsLoadingUserStatus(false);
          setIsLoadingTickets(false);
          // ログインページにリダイレクト
          router.push('/login');
          return;
        }

        // ユーザー基本情報の取得
        const { data: userData, error: userError2 } = await supabase
          .from('users')
          .select('level, total_xp')
          .eq('id', user.id)
          .single();

        if (userError2) {
          console.error('❌ ユーザー情報の取得に失敗:', userError2);
        } else if (userData) {
          
          // ✅ user_streaks（継続記録）の取得と判定
          let loginStreak = 0;
          
          try {
            const { data: streakData, error: streakError } = await supabase
              .from('user_streaks')
              .select('login_streak_count, last_login_date')
              .eq('user_id', user.id)
              .single();

            console.log('🔍 取得したuser_streaksテーブルデータ:', streakData, streakError);
            
            if (streakError) {
              console.error('❌ ストリークデータの取得に失敗:', streakError);
            } else if (streakData) {
              // 確実に数値として扱う
              loginStreak = streakData.login_streak_count || 0;
              console.log('✅ 取得したログインストリーク:', loginStreak);
  
              // 連続ログイン更新処理
              if (streakData.last_login_date) {
                // 現在の日時を取得（UTC）
                const now = new Date();
                const nowIso = now.toISOString(); // UTC時間のままでOK
                
                // 日本時間のタイムゾーンオフセット（+9時間 = +9*60*60*1000ミリ秒）
                const jstOffset = 9 * 60 * 60 * 1000;
                
                // 現在時刻と前回ログイン時刻をJST基準の日付文字列に変S換
                const getJstDateString = (dateString: string | Date): string => {
                  const date = new Date(dateString);
                  // UTC時間に9時間を加算して日本時間にする
                  const jstDate = new Date(date.getTime() + (9 * 60 * 60 * 1000));
                  // YYYY/MM/DD 形式の文字列を返す
                  return `${jstDate.getFullYear()}/${jstDate.getMonth() + 1}/${jstDate.getDate()}`;
                };
                
                const todayJst = getJstDateString(now);
                const lastLoginJst = getJstDateString(streakData.last_login_date);
                
                // 昨日の日本時間の日付を取得
                const yesterday = new Date(now.getTime() - (24 * 60 * 60 * 1000)); // 24時間前
                const yesterdayJst = getJstDateString(yesterday);
                
                // 日付文字列を比較
                const isSameDay = todayJst === lastLoginJst;
                const isYesterday = lastLoginJst === yesterdayJst;
                
                console.log('📅 日付比較:', {
                  today: todayJst,
                  lastLogin: lastLoginJst,
                  isSameDay,
                  yesterdayString: yesterdayJst,
                  isYesterday,
                  nowUtc: now.toISOString(),
                  lastLoginUtc: streakData.last_login_date,
                  nowJst: new Date(now.getTime() + jstOffset).toISOString()
                });
                
                // 同日のログインの場合はストリークを更新しないが、updated_atは更新する
                if (isSameDay) {
                  console.log('📝 同日のログインなのでストリークは更新しませんが、updated_atは更新します');
                  
                  const { error: updateTimeError } = await supabase
                    .from('user_streaks')
                    .update({
                      updated_at: nowIso // UTCのまま保存
                    })
                    .eq('user_id', user.id);
                    
                  if (updateTimeError) {
                    console.error('❌ updated_at更新エラー:', updateTimeError);
                  } else {
                    console.log('✅ updated_atを更新しました');
                  }
                }
                // 昨日のログインの場合のみストリークを更新
                else if (isYesterday) {
                  // まず、今日すでにストリークを更新したかどうかを確認
                  const today = new Date();
                  const todayString = today.toISOString().split('T')[0]; // YYYY-MM-DD形式
                  
                  const { data: todayLoginCheck, error: todayLoginError } = await supabase
                    .from('user_streaks')
                    .select('updated_at')
                    .eq('user_id', user.id)
                    .single();
                    
                  // 今日の日付でupdated_atが更新されているか確認
                  const lastUpdatedDate = todayLoginCheck && todayLoginCheck.updated_at 
                    ? new Date(todayLoginCheck.updated_at).toISOString().split('T')[0]
                    : null;
                    
                  if (lastUpdatedDate === todayString) {
                    console.log('✅ 今日すでにストリークを更新済みのため、更新をスキップします');
                  } else {
                    // ストリークを更新
                    const updatedStreak = streakData.login_streak_count + 1;

                    const { error: streakUpdateError } = await supabase
                      .from('user_streaks')
                      .update({
                        login_streak_count: updatedStreak,
                        last_login_date: nowIso, // UTCのまま保存
                        updated_at: nowIso      // UTCのまま保存
                      })
                      .eq('user_id', user.id);

                    if (streakUpdateError) {
                      console.error('❌ streak更新エラー:', streakUpdateError);
                    } else {
                      console.log('✅ streakを更新しました:', updatedStreak);
                      loginStreak = updatedStreak; // 更新された値を使用
                    }
                  }
                }
                // 昨日でも当日でもない場合（2日以上経過している場合）はストリークをリセット
                else {
                  console.log('❌ 2日以上ログインがなかったため、ストリークをリセットします');
                  
                  const { error: streakResetError } = await supabase
                    .from('user_streaks')
                    .update({
                      login_streak_count: 0,
                      last_login_date: nowIso,
                      updated_at: nowIso
                    })
                    .eq('user_id', user.id);
                    
                  if (streakResetError) {
                    console.error('❌ ストリークリセットエラー:', streakResetError);
                  } else {
                    console.log('✅ ストリークを0にリセットしました');
                    loginStreak = 0; // リセットされた値を使用
                  }
                }
              }
            }
          } catch (streakError) {
            console.error('❌ ストリークデータ取得中の例外:', streakError);
          }
          
          // ✅ 日記件数の取得
          const { count: diaryCount, error: diaryCountError } = await supabase
            .from('diary_entries')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

          if (diaryCountError) {
            console.error('❌ 日記件数取得エラー:', diaryCountError);
          }
          
          console.log('📓 日記件数:', diaryCount);

          if (userData) {
            const levelInfo = calculateLevelInfo(userData.total_xp, userData.level);
            const currentRank = getRankFromStreak(loginStreak);
            
            console.log('📊 計算後のユーザーステータス:', {
              level: levelInfo.level,
              currentXP: levelInfo.currentXP,
              nextLevelXP: levelInfo.nextLevelXP,
              totalDiaryEntries: diaryCount || 0,
              streak: loginStreak,
              ranking: currentRank
            });

            // ステート更新
            setUserStatus({
              level: levelInfo.level,
              currentXP: levelInfo.currentXP,
              nextLevelXP: levelInfo.nextLevelXP,
              totalDiaryEntries: diaryCount || 0,
              streak: loginStreak,
              ranking: currentRank
            });
          }
        }

        // チケット情報の取得
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
        // 重大なエラーの場合はログインページにリダイレクト
        router.push('/login');
      } finally {
        setIsLoadingUserStatus(false);
        setIsLoadingTickets(false);
      }
    };

    fetchUserData();
  }, [supabase, refreshKey, router]); // router を依存配列に追加

  //#region Handlers
  /**
   * 活動履歴のセルがクリックされたときのハンドラ
   */
  const handleActivityCellClick = (date: string) => {
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
  const startGacha = async () => {
    if (ticketCount <= 0) {
      alert('チケットがありません。活動を行ってチケットを獲得してください。');
      return;
    }
    setShowGachaModal(true);
  };

  // ガチャ完了後に画面のチケット数を更新する関数
  const updateTicketCount = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('ユーザーが認証されていません');
        return;
      }
      
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

  // 現在のランクスタイルを取得
  const rankStyle = getRankStyle(userStatus.ranking);

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
                {isLoadingUserStatus ? '読込中...' : getDiarySubtext(userStatus.totalDiaryEntries)}
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
                {isLoadingUserStatus ? '読込中...' : getStreakSubtext(userStatus.streak)}
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
                {isLoadingUserStatus ? '読込中...' : getRankSubtext(userStatus.streak)}
              </div>
            </div>
          </div>
        </div>
      
        {/* 活動履歴 - ガチャモーダルの状態を渡す */}
        <ActivityHistory 
          onCellClick={handleActivityCellClick} 
          isGachaOpen={showGachaModal} 
          onSave={() => {
            setRefreshKey(k => k + 1);
          }}
        />

        {/* 3行日記 */}
        <Diary key={`diary-${refreshKey}`} onSave={() => setRefreshKey(k => k + 1)} />

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