// lib/authentication.ts
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { AuthError, Session, User } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

export type AuthResponse = {
  success: boolean;
  error?: string;
  user?: User | null;
  session?: Session | null;
  message?: string; // message プロパティを追加
};

/**
 * メールとパスワードでサインアップ - メール確認なしバージョン
 */
export const signUpWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const supabase = createClientComponentClient<Database>();
  
  try {
    // 1. メール確認なしでユーザー登録
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // メール確認をスキップして即時アクティブ化
        data: {
          email_confirmed: true
        }
      }
    });
    
    if (error) throw error;
    
    // 2. ユーザーが作成されたら、カスタムテーブルにデータを挿入
    if (data.user && data.user.email) {
      console.log("ユーザー作成成功:", data.user.id);
      
      try {
        // usersテーブルに挿入
        const { error: usersError } = await supabase.from('users').insert({
          id: data.user.id,
          email: data.user.email,
          password_hash: 'managed-by-supabase', // Supabaseが管理するのでダミー値
          created_at: new Date().toISOString()
        });
        
        if (usersError) {
          console.error("usersテーブル挿入エラー:", usersError);
          throw usersError;
        }

        // 現在時刻を取得
        const nowJST = new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString();
        
        // ユーザー経験値の初期設定
        const { error: expError } = await supabase.from('user_experience').insert({
          user_id: data.user.id,
          xp_amount: 0,
          action_type: '初期登録',
          earned_at: nowJST,
          created_at: nowJST,
        });
        
        if (expError) {
          console.error("user_experienceテーブル挿入エラー:", expError);
          throw expError;
        }
        
        // ユーザーストリークの初期設定
        const { error: streakError } = await supabase.from('user_streaks').insert({
          user_id: data.user.id,
          login_streak_count: 0,     // ✅ 実在カラム
          login_max_streak: 0,       // ✅ 実在カラム
          last_login_date: nowJST,   // ✅ 実在カラム（UTCなら new Date().toISOString() でもOK）
          created_at: nowJST,
          updated_at: nowJST
        });
                
        if (streakError) {
          console.error("user_streaksテーブル挿入エラー:", streakError);
          throw streakError;
        }
        
        console.log("すべてのテーブルへのデータ挿入成功");
      } catch (insertError) {
        console.error("データ挿入エラー:", insertError);
        // エラーが発生したが、ユーザー作成自体は成功しているのでそのまま続行
      }
    }
    
    // 3. 自動的にログインも実行
    if (!data.session) {
      // セッションが自動的に作成されていない場合は、明示的にログイン
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) throw signInError;
      
      return {
        success: true,
        user: signInData.user,
        session: signInData.session,
      };
    }
    
    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('サインアップエラー:', error);
    return {
      success: false,
      error: error instanceof AuthError ? error.message : '予期せぬエラーが発生しました',
    };
  }
};

/**
 * メールとパスワードでログイン
 */
export const signInWithEmail = async (
  email: string,
  password: string
): Promise<AuthResponse> => {
  const supabase = createClientComponentClient<Database>();
  
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    // セッション情報を保存
    if (data.user && data.session) {
      const now = new Date();
      const expiresAt = new Date();
      expiresAt.setSeconds(now.getSeconds() + data.session.expires_in);
      
      // ログイン時間更新
      const { error: updateError } = await supabase
        .from('users')
        .update({ last_login_at: now.toISOString() })
        .eq('id', data.user.id);
        
      if (updateError) {
        console.error("ログイン時間更新エラー:", updateError);
      }
      
      // セッション記録
      const { error: sessionError } = await supabase.from('user_sessions').insert({
        user_id: data.user.id,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      if (sessionError) {
        console.error("セッション記録エラー:", sessionError);
      }
      
      // ログイン時にデイリーアクティビティを記録
      const today = new Date().toISOString().split('T')[0];
      
      const { error: activityError } = await supabase.from('user_daily_activities').insert({
        user_id: data.user.id,
        activity_date: today,
        activity_type: 'login',
      });
      
      if (activityError) {
        console.error("アクティビティ記録エラー:", activityError);
      }
    }
    
    return {
      success: true,
      user: data.user,
      session: data.session,
    };
  } catch (error) {
    console.error('ログインエラー:', error);
    return {
      success: false,
      error: error instanceof AuthError ? error.message : '予期せぬエラーが発生しました',
    };
  }
};

/**
 * パスワードリセットメールを送信
 */
export const sendPasswordResetEmail = async (email: string): Promise<AuthResponse> => {
  const supabase = createClientComponentClient<Database>();
  
  try {
    // リセットメール送信時に正確なリダイレクトURLを設定
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    
    if (error) throw error;
    
    return { 
      success: true,
      message: 'パスワードリセット用のメールを送信しました。メールをご確認ください。'
    };
  } catch (error) {
    console.error('パスワードリセットエラー:', error);
    return {
      success: false,
      error: error instanceof AuthError ? error.message : '予期せぬエラーが発生しました',
    };
  }
};

/**
 * パスワードを更新
 */
export const updatePassword = async (password: string): Promise<AuthResponse> => {
  const supabase = createClientComponentClient<Database>();
  
  try {
    console.log("パスワード更新プロセス開始");
    
    // 現在のセッションを確認
    const { data: sessionData } = await supabase.auth.getSession();
    console.log("セッション確認結果:", { hasSession: !!sessionData.session });
    
    if (!sessionData.session) {
      console.error("セッションが存在しません");
      return {
        success: false,
        error: 'セッションが無効です。再度パスワードリセットを依頼してください。',
        message: 'セッションが無効です。再度パスワードリセットを依頼してください。'
      };
    }
    
    // パスワード更新実行
    console.log("Supabase Auth updateUser 呼び出し");
    const { data, error } = await supabase.auth.updateUser({ 
      password 
    });
    
    if (error) {
      console.error("パスワード更新エラー:", error);
      throw error;
    }
    
    console.log("パスワード更新成功");
    return { 
      success: true,
      user: data.user,
      message: 'パスワードが正常に更新されました'
    };
  } catch (error) {
    console.error('パスワード更新処理エラー:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '予期せぬエラーが発生しました',
      message: 'パスワードの更新中にエラーが発生しました。再度お試しください。'
    };
  }
};

/**
 * サインアウト
 */
export const signOut = async (): Promise<AuthResponse> => {
  const supabase = createClientComponentClient<Database>();
  
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    
    return { success: true };
  } catch (error) {
    console.error('サインアウトエラー:', error);
    return {
      success: false,
      error: error instanceof AuthError ? error.message : '予期せぬエラーが発生しました',
    };
  }
};

/**
 * 現在のユーザーセッションを取得
 */
export const getCurrentSession = async (): Promise<Session | null> => {
  const supabase = createClientComponentClient<Database>();
  const { data } = await supabase.auth.getSession();
  return data.session;
};

/**
 * 現在のユーザー情報を取得
 */
export const getCurrentUser = async (): Promise<User | null> => {
  const supabase = createClientComponentClient<Database>();
  const { data } = await supabase.auth.getUser();
  return data.user;
};

// middlewareでのセッション検証のためのヘルパー関数
export const getUser = async () => {
  const supabase = createClientComponentClient<Database>();
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  } catch (error) {
    console.error('ユーザー取得エラー:', error);
    return null;
  }
};