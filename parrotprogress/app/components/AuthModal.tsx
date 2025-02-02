'use client';

import { Card, CardContent } from './ui/Card';
import styles from '../styles/Home.module.css';
import { useCallback, useEffect, useState } from 'react';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
}

type ModalMode = 'signin' | 'signup' | 'reset';


export default function AuthModal({ isOpen, onClose }: AuthModalProps) {

  // フォームの状態を管理
  const [modalMode, setModalMode] = useState<ModalMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // サインインとサインアップのハンドラ
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!validateEmail(email)) return;
  
    // モードに応じた追加バリデーション
    if (modalMode !== 'reset') {
      if (!validatePassword(password)) return;
      if (modalMode === 'signup' && password !== confirmPassword) {
        setPasswordError('パスワードが一致しません');
        return;
      }
    }
  
    setIsLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      // モードに応じた送信データの構築
      const submitData = {
        email,
        mode: modalMode,
        ...(modalMode !== 'reset' && { password }),
        ...(modalMode === 'signup' && { confirmPassword })
      };
      console.log('送信されたデータ:', submitData);
    } finally {
      setIsLoading(false);
    }
  };
  
  // パスワードの検証
  const validatePassword = (pass: string) => {
    if (pass.length < 8) {
      setPasswordError('パスワードは8文字以上必要です');
      return false;
    }
    setPasswordError('');
    return true;
  };

  // タブ切り替え時にフォームをリセット
  const handleModeChange = (mode: ModalMode) => {
    setModalMode(mode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setEmailError('');
  }

  // emailバリデーション関数を追加
const validateEmail = (email: string) => {
  if (!email) {
    setEmailError('メールアドレスを入力してください');
    return false;
  }
  
  const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
  if (!emailRegex.test(email)) {
    setEmailError('有効なメールアドレスを入力してください');
    return false;
  }

  setEmailError('');
  return true;
};

// モーダルを閉じる処理
// useState等の後に追加
const handleClose = useCallback(() => {
  setIsVisible(false);
  setTimeout(onClose, 200);
}, [onClose]);

// オーバーレイクリックのハンドラを追加
const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
  // モーダル本体をクリックした場合は閉じない
  if (e.target === e.currentTarget) {
    handleClose();
  }
};

  // useEffectでisOpenの変更を監視
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);

  // ESCキー検知のためのuseEffectを追加
  useEffect(() => {
    const handleEscKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    // モーダルが開いている時のみイベントリスナーを設定
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      
      // クリーンアップ関数
      return () => {
        document.removeEventListener('keydown', handleEscKey);
      };
    }
  }, [isOpen, handleClose]);



  if (!isOpen) return null;

  return (
    <div 
      className={`${styles.modal} ${isVisible ? styles.modalVisible : ''}`}
      onClick={handleOverlayClick} 
    >
      <Card className={styles.modalCard}>
        <CardContent className={styles.modalContent}>
          <div className={styles.closeButton}>
            <button onClick={handleClose}>✕</button>
          </div>
          {modalMode === 'reset' ? (
            <div className={styles.modalInner}>
              <h2 className={styles.modalTitle}>パスワードをリセット</h2>
              <p className={styles.modalDescription}>
                登録済みのメールアドレスを入力してください。<br />
                パスワードリセット用のリンクをお送りします。
              </p>
              <form className={styles.form} onSubmit={handleAuthSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>メールアドレス</label>
                  <input 
                    type="email" 
                    className={`${styles.input} ${emailError ? styles.inputError : ''}`}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                      }
                    }
                    required
                  />
                  {emailError && (
                      <p className={styles.errorMessage}>{emailError}</p>
                  )}
                </div>
                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className={styles.loadingText}>送信中...</span>
                  ) : '送信する'}
                </button>
                  <button
                  type="button"
                  className={styles.backButton}
                  onClick={() => handleModeChange('signin')}
                >
                  ← サインインに戻る
                </button>
              </form>
            </div>
          ) : (
            <div className={styles.modalInner}>
              <h2 className={styles.modalTitle}>
                {modalMode === 'signup'  ? 'アカウント作成' : 'サインイン'}
              </h2>
              {/* タブ切り替えを追加 */}
              <div className={styles.tabs}>
                <button
                  className={`${styles.tab} ${modalMode === 'signin'  ? styles.activeTab : ''}`}
                  onClick={() => handleModeChange('signin')}
                >
                  サインイン
                </button>
                <button
                  className={`${styles.tab} ${modalMode === 'signup' ? styles.activeTab : ''}`}
                  onClick={() => handleModeChange('signup')}
                >
                  アカウント作成
                </button>
              </div>
              <form className={styles.form} onSubmit={handleAuthSubmit}>
                {/* メールアドレス入力部 */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>メールアドレス</label>
                  <input
                    type="email"
                    className={styles.input}
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      validateEmail(e.target.value);
                      }
                    }
                    required
                  />
                  {emailError && (
                      <p className={styles.errorMessage}>{emailError}</p>
                  )}
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

                {modalMode === 'signup'  && (
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

                <button 
                  type="submit" 
                  className={styles.submitButton}
                  disabled={isLoading}
                >
                {isLoading ? (
                  <span className={styles.loadingText}>送信中...</span>
                ) : (
                  modalMode === 'signup' ? 'アカウントを作成' : 'サインイン'
                )}
                </button>
                {modalMode === 'signin' && (
                  <button
                    type="button"
                    className={styles.forgotPasswordButton}
                    onClick={() => handleModeChange('reset')}
                  >
                    パスワードをお忘れの方はこちら
                  </button>
                )}
              </form>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}