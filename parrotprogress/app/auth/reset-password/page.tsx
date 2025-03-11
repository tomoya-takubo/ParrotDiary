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
  const router = useRouter();
  const supabase = createClientComponentClient();

  useEffect(() => {
    // パスワードリセットページに来たときに、セッションがあるか確認
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      
      // セッションがない場合はログインページへリダイレクト
      if (!data.session) {
        setError('無効または期限切れのリセットリンクです。再度パスワードリセットを依頼してください。');
        setTimeout(() => {
          router.push('/');
        }, 3000);
      }
    };

    checkSession();
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
      const response = await updatePassword(password);
      
      if (!response.success) {
        throw new Error(response.error);
      }
      
      setMessage('パスワードが更新されました。ダッシュボードにリダイレクトします...');
      
      // 3秒後にダッシュボードにリダイレクト
      setTimeout(() => {
        router.push('/dashboard');
      }, 3000);
    } catch (error) {
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('パスワードの更新中にエラーが発生しました');
      }
    } finally {
      setLoading(false);
    }
  };

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