'use client';

import { useState, useEffect } from 'react';
import { updatePassword } from '@/lib/authentication';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import styles from '@/styles/Home.module.css';
import { validatePasswordStrength } from '@/lib/validation';

export default function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isProcessingToken, setIsProcessingToken] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    const handlePasswordReset = async () => {
      try {
        console.log("パスワードリセットページ初期化");
        setIsProcessingToken(true);
        
        // クライアントサイドのみで実行
        if (typeof window !== 'undefined') {
          // URLからクエリパラメータを取得
          const urlParams = new URLSearchParams(window.location.search);
          const resetCode = urlParams.get('code');
          
          console.log("URL:", window.location.href);
          console.log("Reset code:", resetCode);
          
          if (resetCode) {
            // codeパラメータがある場合、それを使用してセッションを確立
            try {
              // Supabaseの認証システムにcodeを渡して処理
              const { data, error } = await supabase.auth.exchangeCodeForSession(resetCode);
              
              if (error) {
                console.error("コード交換エラー:", error);
                throw error;
              }
              
              if (data.session) {
                console.log("コードからセッションを設定成功");
                setIsProcessingToken(false);
              } else {
                throw new Error("セッションが作成されませんでした");
              }
            } catch (err) {
              console.error("リセットコード処理エラー:", err);
              setError('リセットリンクが無効または期限切れです。再度パスワードリセットを依頼してください。');
              setTimeout(() => {
                router.push('/');
              }, 5000);
            }
          } else {
            // codeパラメータがない場合は既存セッションを確認
            checkExistingSession();
          }
        }
      } catch (err) {
        console.error("URL処理エラー:", err);
        setError('ページ処理中にエラーが発生しました。');
        setIsProcessingToken(false);
      }
    };
    
    // 既存セッションの確認
    const checkExistingSession = async () => {
      const { data } = await supabase.auth.getSession();
      console.log("既存セッション確認:", { hasSession: !!data.session });
      
      if (data.session) {
        setIsProcessingToken(false);
      } else {
        setError('セッションが見つかりません。再度パスワードリセットを依頼してください。');
        setTimeout(() => {
          router.push('/');
        }, 5000);
      }
    };
    
    handlePasswordReset();
  }, [router, supabase.auth]);
  
  const validatePassword = (pass: string) => {
    const validation = validatePasswordStrength(pass);
    setPasswordError(validation.message);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    if (!validatePassword(password)) return;
    
    if (password !== confirmPassword) {
      setError('パスワードが一致しません');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("パスワード更新処理開始");
      const response = await updatePassword(password);
      
      if (!response.success) {
        throw new Error(response.error || "不明なエラーが発生しました");
      }
      
      console.log("パスワード更新成功");
      setMessage('パスワードが更新されました。ダッシュボードにリダイレクトします...');
      
      // 3秒後にダッシュボードにリダイレクト
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error) {
      console.error("パスワード更新エラー:", error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('パスワードの更新中にエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

  // トークン処理中はローディング表示
  if (isProcessingToken) {
    return (
      <div className={styles.container}>
        <div className={styles.resetPasswordCard}>
          <h1 className={styles.title}>パスワードリセット処理中...</h1>
          <p>しばらくお待ちください</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.resetPasswordCard}>
        <h1 className={styles.title}>新しいパスワードを設定</h1>
        
        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}
        
        {message && (
          <div className={styles.successMessage}>
            <p>{message}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor="password" className={styles.label}>新しいパスワード</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                validatePassword(e.target.value);
              }}
              className={styles.input}
              required
            />
            {passwordError && (
              <p className={styles.errorMessage}>{passwordError}</p>
            )}
          </div>
          
          <div className={styles.formGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>パスワード（確認）</label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={styles.input}
              required
            />
          </div>
          
          <button
            type="submit"
            className={styles.submitButton}
            disabled={loading}
          >
            {loading ? 'パスワード更新中...' : 'パスワードを更新する'}
          </button>
        </form>
      </div>
    </div>
  );
}