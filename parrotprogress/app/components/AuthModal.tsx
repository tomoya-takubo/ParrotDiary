'use client';

import { Card, CardContent } from './ui/Card';
import styles from '../styles/Home.module.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { signIn, signUp } from '@/app/lib/auth';

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
  const [authError, setAuthError] = useState<string>('');

  const { user, login } = useAuth();

  const emailInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // サインインとサインアップのハンドラ
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateEmail(email) || !validatePassword(password)) return;
  
    setIsLoading(true);
    try {
      const userData = await (modalMode === 'signup' ? 
        signUp(email, password) : 
        signIn(email, password)
      );
      login(userData);
      onClose();
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : '認証に失敗しました');
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
    setAuthError('');
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
  const handleClose = useCallback(() => {
    if (confirmClose()) {
      setIsVisible(false);
      setTimeout(onClose, 200);
    }
  }, [onClose]);

  // オーバーレイクリックのハンドラを追加
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // フォームに入力があるか確認
  const hasFormInput = useCallback((): boolean => {
    if (modalMode === 'reset') {
      return email.length > 0;
    }
    return email.length > 0 || password.length > 0 || 
      (modalMode === 'signup' && confirmPassword.length > 0);
  }, [email, password, confirmPassword, modalMode]);

  // モーダルを閉じる前の確認
  const confirmClose = (): boolean => {
    if (!hasFormInput()) return true;
    return window.confirm('入力内容が破棄されます。よろしいですか？');
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

  // ブラウザのページ離脱防止イベントの設定
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasFormInput()) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    // モーダルが開いている時のみイベントリスナーを設定
    if (isOpen) {
      window.addEventListener('beforeunload', handleBeforeUnload);
      
      // クリーンアップ関数
      return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
      };
    }
  }, [isOpen, hasFormInput]);


    // モーダルを開いた時にメールアドレス入力欄にフォーカス
    useEffect(() => {
      if (isOpen && isVisible) {
        emailInputRef.current?.focus();
      }
    }, [isOpen, isVisible]);
  
    // フォーカストラップの実装
    useEffect(() => {
      const handleTabKey = (e: KeyboardEvent) => {
        if (e.key === 'Tab' && modalRef.current) {
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;
  
          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              e.preventDefault();
              lastElement.focus();
            }
          } else {
            if (document.activeElement === lastElement) {
              e.preventDefault();
              firstElement.focus();
            }
          }
        }
      };
  
      if (isOpen) {
        document.addEventListener('keydown', handleTabKey);
        return () => {
          document.removeEventListener('keydown', handleTabKey);
        };
      }
    }, [isOpen]);
  

  if (!isOpen) return null;

  return (
    <div 
      ref={modalRef}
      className={`${styles.modal} ${isVisible ? styles.modalVisible : ''}`}
      onClick={handleOverlayClick} 
      role="dialog"
      aria-modal="true"
      aria-labelledby="modalTitle"
    >
      <Card className={styles.modalCard}>
        <CardContent className={styles.modalContent}>
          <div className={styles.closeButton}>
            <button onClick={handleClose}>✕</button>
          </div>
          {modalMode === 'reset' ? (
            <div className={styles.modalInner}>
              <h2 id="modalTitle" className={styles.modalTitle}>パスワードをリセット</h2>
              <p className={styles.modalDescription}>
                登録済みのメールアドレスを入力してください。<br />
                パスワードリセット用のリンクをお送りします。
              </p>
              <form className={styles.form} onSubmit={handleAuthSubmit}>
                <div className={styles.formGroup}>
                  <label className={styles.label}>メールアドレス</label>
                  <input 
                    ref={emailInputRef}
                    id="email"
                    name="email"
                    type="email"
                    aria-required="true"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "emailError" : undefined}
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
                    <p id="emailError" className={styles.errorMessage}>
                      {emailError}
                    </p>
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
              <h2 id="modalTitle" className={styles.modalTitle}>
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
                {authError && (
                  <p className={styles.errorMessage}>{authError}</p>
                )}
                <div className={styles.formGroup}>
                  <label className={styles.label}>メールアドレス</label>
                  <input
                    ref={emailInputRef}  // この行を追加
                    id="email"
                    name="email"
                    type="email"
                    aria-required="true"
                    aria-invalid={!!emailError}
                    aria-describedby={emailError ? "emailError" : undefined}
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
                    <p id="emailError" className={styles.errorMessage}>
                      {emailError}
                    </p>
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