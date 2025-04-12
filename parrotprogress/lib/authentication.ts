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
