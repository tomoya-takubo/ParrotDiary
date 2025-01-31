'use client';

import { Card, CardContent } from './ui/Card';
import styles from '../styles/Home.module.css';
import { useState } from 'react';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {

  // フォームの状態を管理
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSignUp, setIsSignUp]= useState(false); // サインアップボード管理
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // パスワードの検証
  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      setPasswordError('パスワードは8文字以上必要です');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // フォーム送信時の処理
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validatePassword(password)) return;

    if (isSignUp && password !== confirmPassword) {
      setPasswordError('パスワードが一致しません');
      return;
    }

    console.log('送信されたデータ: ', {
      email, 
      password, 
      ...(isSignUp && {confirmPassword}),
      mode: isSignUp ? 'サインアップ' : 'サインイン'
    });
    // TODO: 後で認証処理を実装
  }

  // タブ切り替え時にフォームをリセット
  const handleModeChange = (signUp: boolean) => {
    setIsSignUp(signUp);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  }

  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <Card className={styles.modalCard}>
        <CardContent className={styles.modalContent}>
          <div className={styles.closeButton}>
            <button onClick={onClose}>✕</button>
          </div>
          <div className={styles.modalInner}>
            <h2 className={styles.modalTitle}>
              {isSignUp ? 'アカウント作成' : 'サインイン'}
            </h2>
            {/* タブ切り替えを追加 */}
            <div className={styles.tabs}>

              <button
                className={`${styles.tab} ${!isSignUp ? styles.activeTab : ''}`}
                onClick={() => handleModeChange(false)}
              >
                サインイン
              </button>

              <button
                className={`${styles.tab} ${isSignUp ? styles.activeTab : ''}`}
                onClick={() => handleModeChange(true)}
              >
                アカウント作成
              </button>

            </div>
            <form className={styles.form} onSubmit={handleSubmit}>

              {/* メールアドレス入力部 */}
              <div className={styles.formGroup}>
                <label className={styles.label}>メールアドレス</label>
                <input
                  type="email"
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {/* パスワード入力部 */}
              <div className={styles.formGroup}>
  <label className={styles.label}>パスワード</label>
  <div className={styles.passwordInput}>
    <input 
      type={showPassword ? "text" : "password"}
      className={`${styles.input} ${passwordError ? styles.inputError : ''}`}
      value={password}
      onChange={(e) => {
        setPassword(e.target.value);
        validatePassword(e.target.value);
      }}
      required
    />
    <button 
      type="button"
      className={styles.togglePassword}
      onClick={() => setShowPassword(!showPassword)}
    >
      {showPassword ? "非表示" : "表示"}
    </button>
  </div>
  {passwordError && (
    <p className={styles.errorMessage}>{passwordError}</p>
  )}
</div>

              {isSignUp && (
                <div className={styles.formGroup}>
                  <label className={styles.label}>パスワード（確認）</label>
                  <input 
                    type="password" 
                    className={styles.input}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              )}

              <button type="submit" className={styles.submitButton}>
                {isSignUp ? 'アカウントを作成' : 'サインイン'}
              </button>

            </form>

          </div>
        </CardContent>
      </Card>
    </div>
  );
}