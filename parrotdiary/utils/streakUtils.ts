/**
 * 継続記録（ストリーク）に関するユーティリティ関数
 */

import { supabase } from '@/lib/supabase';

/**
 * 継続記録の更新結果の型定義
 */
export interface StreakUpdateResult {
  success: boolean;
  currentStreak: number;
  maxStreak: number;
  isNewRecord: boolean;
  error?: string;
}

/**
 * 継続記録データの型定義
 */
interface StreakData {
  login_streak_count: number;
  login_max_streak: number;
  last_login_date: string;
}

/**
 * 現在時刻を日本時間（JST）で取得
 * @returns ISO形式の日本時間文字列
 */
export const getCurrentJSTTime = (): string => {
  const now = new Date();
  // 日本時間に調整（UTC+9時間 = 9 * 60 * 60 * 1000ミリ秒）
  const jstTime = new Date(now.getTime() + (9 * 60 * 60 * 1000));
  return jstTime.toISOString();
};

/**
 * 日付文字列をJSTの日付（YYYY-MM-DD）に変換
 * @param dateString ISO形式の日付文字列
 * @returns YYYY-MM-DD形式の日付文字列
 */
export const formatDateToJST = (dateString: string): string => {
  const date = new Date(dateString);
  
  // データベースから取得した日時がすでにJSTの可能性を考慮
  // まずは日時をそのまま解釈して日付部分を取得
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
};

/**
 * 今日の日付をJST（YYYY-MM-DD）で取得
 * @returns YYYY-MM-DD形式の今日の日付
 */
export const getTodayJST = (): string => {
  return formatDateToJST(getCurrentJSTTime());
};

/**
 * 2つの日付の差（日数）を計算
 * @param date1 日付1（YYYY-MM-DD形式）
 * @param date2 日付2（YYYY-MM-DD形式）
 * @returns 日数の差（date2 - date1）
 */
export const calculateDateDifference = (date1: string, date2: string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diffTime = d2.getTime() - d1.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * ユーザーの継続記録を更新
 * @param userId ユーザーID
 * @returns 更新結果
 */
export const updateLoginStreak = async (userId: string): Promise<StreakUpdateResult> => {
  try {
    console.log('継続記録更新開始:', { userId });
    
    // 現在の継続記録データを取得
    const { data: currentStreakData, error: fetchError } = await supabase
      .from('user_streaks')
      .select('login_streak_count, login_max_streak, last_login_date')
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('継続記録取得エラー:', fetchError);
      return {
        success: false,
        currentStreak: 0,
        maxStreak: 0,
        isNewRecord: false,
        error: `継続記録取得エラー: ${fetchError.message}`
      };
    }

    const streakData = currentStreakData as StreakData;
    const today = getTodayJST();
    
    // デバッグ：生の日付データを確認
    console.log('🔍 デバッグ - 生データ:', {
      raw_last_login_date: streakData.last_login_date,
      today_jst: today
    });
    
    const lastLoginDate = streakData.last_login_date ? formatDateToJST(streakData.last_login_date) : null;
    
    console.log('🔍 デバッグ - 変換後:', {
      formatted_last_login_date: lastLoginDate,
      today: today
    });
    
    console.log('継続記録判定:', { today, lastLoginDate, currentStreak: streakData.login_streak_count });

    let newStreakCount = streakData.login_streak_count;
    let newMaxStreak = streakData.login_max_streak;
    let isNewRecord = false;

    if (!lastLoginDate) {
      // 初回ログイン
      newStreakCount = 1;
      console.log('初回ログイン検出');
    } else {
      const daysDiff = calculateDateDifference(lastLoginDate, today);
      
      if (daysDiff === 0) {
        // 同日内のログイン（更新不要）
        console.log('同日内のログイン - 更新スキップ');
        return {
          success: true,
          currentStreak: newStreakCount,
          maxStreak: newMaxStreak,
          isNewRecord: false
        };
      } else if (daysDiff === 1) {
        // 連続日のログイン
        newStreakCount += 1;
        console.log('連続日ログイン検出 - ストリーク増加:', newStreakCount);
      } else {
        // 1日以上空いた場合はリセット
        newStreakCount = 1;
        console.log('ログイン間隔が空いた - ストリークリセット');
      }
    }

    // 最大継続記録の更新チェック
    if (newStreakCount > newMaxStreak) {
      newMaxStreak = newStreakCount;
      isNewRecord = true;
      console.log('新記録達成:', newMaxStreak);
    }

    // データベースを更新
    const updateData = {
      login_streak_count: newStreakCount,
      login_max_streak: newMaxStreak,
      last_login_date: getCurrentJSTTime(),
      updated_at: getCurrentJSTTime()
    };

    const { error: updateError } = await supabase
      .from('user_streaks')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('継続記録更新エラー:', updateError);
      return {
        success: false,
        currentStreak: streakData.login_streak_count,
        maxStreak: streakData.login_max_streak,
        isNewRecord: false,
        error: `継続記録更新エラー: ${updateError.message}`
      };
    }

    console.log('継続記録更新成功:', { newStreakCount, newMaxStreak, isNewRecord });
    
    return {
      success: true,
      currentStreak: newStreakCount,
      maxStreak: newMaxStreak,
      isNewRecord
    };

  } catch (error) {
    console.error('継続記録更新処理エラー:', error);
    return {
      success: false,
      currentStreak: 0,
      maxStreak: 0,
      isNewRecord: false,
      error: `継続記録更新処理エラー: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * 継続記録データを取得
 * @param userId ユーザーID
 * @returns 継続記録データまたはnull
 */
export const getStreakData = async (userId: string): Promise<StreakData | null> => {
  try {
    const { data, error } = await supabase
      .from('user_streaks')
      .select('login_streak_count, login_max_streak, last_login_date')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('継続記録取得エラー:', error);
      return null;
    }

    return data as StreakData;
  } catch (error) {
    console.error('継続記録取得処理エラー:', error);
    return null;
  }
};