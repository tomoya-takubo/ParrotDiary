'use client';

//#region インポート
import { Card, CardContent } from './ui/Card';
import styles from '../styles/Home.module.css';
import { useCallback, useEffect, useRef, useState } from 'react';
import { validateEmailFormat, validatePasswordStrength } from '../lib/validation';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { useRouter } from 'next/navigation';
import { Database } from '../types/supabase';
//#endregion

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
}

type ModalMode = 'signin' | 'signup' | 'reset';

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  // Supabaseクライアントの初期化
  const supabase = createClientComponentClient<Database>();
  const router = useRouter();

  //#region フォームの状態を管理
  const [modalMode, setModalMode] = useState<ModalMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);
  //#endregion

  //#region 認証処理メイン関数
  /**
   * 認証フォーム送信時の処理を担当するメインハンドラー
   * 
   * このメソッドは以下の認証処理を扱います：
   * - 新規ユーザー登録（サインアップ）
   * - 既存ユーザーのログイン（サインイン）
   * - パスワードリセットメールの送信
   * 
   * 各処理では適切な入力検証を行い、Supabase認証およびデータベース操作を実行します。
   * エラー発生時は適切なエラーメッセージを表示し、成功時はダッシュボードへリダイレクトします。
   * 
   * @param e - フォーム送信イベント
   */
  const handleAuthSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    //#region バリデーション関数
    // メールアドレスの検証
    const validateEmail = (email: string) => {
      const validation = validateEmailFormat(email);
      setEmailError(validation.message);
      return validation.isValid;
    };

    // パスワード強度の検証
    const validatePassword = (pass: string) => {
      const validation = validatePasswordStrength(pass);
      setPasswordError(validation.message);
      return validation.isValid;
    };

    // パスワードと確認用パスワードの一致検証
    const validatePasswordMatch = () => {
      if (password !== confirmPassword) {
        setPasswordError('パスワードと確認用パスワードが一致しません');
        return false;
      }
      return true;
    };
    //#endregion

    // 基本的な入力検証
    // if (!validateEmail(email) || !validatePassword(password)) return;

    // 送信処理の開始
    setIsLoading(true);
    setFormFeedback(null); // 前回のフィードバックをクリア

    // 現在時刻を日本時間（JST）で取得
    const getCurrentJSTTime = () => {
      const now = new Date();
      // 日本時間に調整（UTC+9）
      now.setHours(now.getHours() + 9);
      return now.toISOString();
    };

    // 現在時刻を取得
    const currentTime = getCurrentJSTTime();

    try {
      //#region モード別処理分岐
      // modalModeに応じて処理を分岐（サインアップ、サインイン、パスワードリセット）
      if (modalMode === 'signup') {
        //#region アカウント新規作成処理
        // サインアップ用の追加検証
        if (!validateEmail(email) || !validatePassword(password) || !validatePasswordMatch()) {
          setIsLoading(false);
          return;
        }

        console.log('サインアッププロセス開始:', { email });

        // Step 1: Supabaseの認証システムにユーザーを登録
        const { data, error:signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            // メール確認をスキップしてすぐにサインイン状態にするための設定
            data: {
              email_confirmed: true
            }
          }
        });

        if (signUpError) throw signUpError;

        // Step 2: 作成したアカウントで即座にサインイン
        console.log('サインインプロセス開始');
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        // Step 3: 関連テーブルにユーザーデータを挿入
        if (data.user?.id && data.user?.email) {
          try {
            //#region データベースへのレコード挿入処理
            // Step 3.1: usersテーブルにユーザー基本情報を挿入
            console.log('usersテーブルに挿入開始');
            const { error: usersError } = await supabase.from('users').insert({
              id: data.user.id,
              email: data.user.email,
              password_hash: 'managed-by-supabase',
              last_login_at: currentTime, // 初回ログイン時刻を記録
              total_xp: 0,                // 初期経験値
              level: 1,                   // 初期レベル
              created_at: currentTime,    // 作成日時
              updated_at: currentTime     // 更新日時
            });

            if (usersError) {
              console.error('usersテーブル挿入エラー:', usersError);
              throw new Error(`usersテーブルINSERTエラー: ${usersError.message}`);
            }
            console.log('usersテーブル挿入成功');

            // Step 3.2: ユーザーストリーク情報を初期化
            console.log('user_streaksテーブルに挿入開始');
            const { error: streakError } = await supabase.from('user_streaks').insert({
              user_id: data.user.id,
              login_streak_count: 0,
              login_max_streak: 0,
              last_login_date: currentTime,
              created_at: currentTime,
              updated_at: currentTime
            });

            if (streakError) {
              console.error('user_streaksテーブル挿入エラー:', streakError);
              throw new Error(`user_streaksテーブルINSERTエラー: ${streakError.message}`);
            }
            console.log('user_streaksテーブル挿入成功');

            // Step 3.3: 初期ガチャチケットの付与
            console.log('gacha_ticketsテーブルに挿入開始');
            console.log('gacha_ticketsテーブルに挿入開始');
            const { error: gachaError } = await supabase.from('gacha_tickets').insert({
              user_id: data.user.id,
              ticket_count: 0,         // 'count' ではなく 'ticket_count'
              last_updated: currentTime // 'expires_at' や 'created_at' ではなく 'last_updated'
            });

            if (gachaError) {
              console.error('gacha_ticketsテーブル挿入エラー:', gachaError);
              throw new Error(`gacha_ticketsテーブルINSERTエラー: ${gachaError.message}`);
            }
            console.log('gacha_ticketsテーブル挿入成功');
            //#endregion

            console.log('全てのユーザー関連データが正常に作成されました');

          } catch (insertError) {
            //#region エラー時のクリーンアップ処理
            console.error('データ挿入エラー:', insertError);

            // エラー発生時は作成したレコードを削除してロールバック
            try {
              console.log('エラー発生によるクリーンアップ処理開始');

              // 各テーブルから関連レコードを削除
              await supabase.from('users').delete().eq('id', data.user.id);
              await supabase.from('user_streaks').delete().eq('user_id', data.user.id);
              await supabase.from('gacha_tickets').delete().eq('user_id', data.user.id);

              console.log('データベースからのクリーンアップ完了');

              // 注意: 認証システムからのユーザー削除はクライアントサイドでは通常実行できない
              console.log('注意: 認証システムからのユーザー削除はバックエンド側で行う必要があります');
            } catch (cleanupError) {
              console.error('クリーンアップ中にエラーが発生:', cleanupError);
            }
            //#endregion

            throw insertError; // 上位のcatchブロックで処理するためにエラーを再スロー
          }
        }

        // Step 4: 成功フィードバックとリダイレクト
        setFormFeedback({
          type: 'success',
          message: 'アカウントが作成されました。ダッシュボードに移動します...'
        });

        // グローバルローディングを有効にしてユーザー操作をブロック
        setGlobalLoading(true);

        // ダッシュボードへリダイレクト
        setTimeout(() => {
          router.push('/dashboard');
          onClose();
        }, 2000);
        //#endregion

      } else if (modalMode === 'signin') {
        //#region 既存ユーザーのサインイン処理
        // Step 1: Supabaseでサインイン認証
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (signInError) throw signInError;

        // Step 2: ユーザーテーブルとストリークテーブルのログイン関連フィールドを更新
        if (data.user?.id) {
          const now = new Date();
          const nowIso = now.toISOString();

          try {
            // users テーブルの更新
            const { error: usersError } = await supabase
              .from('users')
              .update({
                last_login_at: nowIso,
                updated_at: nowIso
              })
              .eq('id', data.user.id);

            if (usersError) {
              console.error('usersテーブルの更新エラー:', usersError);
            }

            // user_streaks テーブルの更新
            const { error: streaksError } = await supabase
              .from('user_streaks')
              .update({
                last_login_date: nowIso,
                updated_at: nowIso
              })
              .eq('user_id', data.user.id);

            if (streaksError) {
              console.error('user_streaksテーブルの更新エラー:', streaksError);
            }

          } catch (error) {
            console.error('ログイン情報更新中にエラー:', error);
          }
        }

        // Step 3: 成功フィードバックとリダイレクト
        setFormFeedback({
          type: 'success',
          message: 'サインインしました！'
        });

        // グローバルローディングを有効にしてユーザー操作をブロック
        setGlobalLoading(true);

        // ダッシュボードへリダイレクト
        setTimeout(() => {
          router.push('/dashboard');
          onClose();
        }, 1000);
        //#endregion

        //#region パスワードリセット処理
        // パスワードリセット前にメールアドレスの有効性を検証
        if (!validateEmail(email)) {
          setIsLoading(false);
          return;
        }
        
        // パスワードリセットメール送信
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth/reset-password` // リセット後のリダイレクト先
        });

        if (resetError) throw resetError;

        // 成功フィードバック
        setFormFeedback({
          type: 'success',
          message: 'パスワードリセット用のメールを送信しました。メールボックスをご確認ください。'
        });

        // 3秒後にモーダルを閉じる
        setTimeout(() => {
          onClose();
          resetForm();
        }, 3000);
        //#endregion
      }
      //#endregion
    } catch (error) {
      //#region エラーハンドリング
      // エラー内容をログに出力
      console.error('認証エラー:', error);

      // エラーメッセージの変換と表示
      const errorMessage = error instanceof Error ? error.message : '認証に失敗しました';
      let translatedError = translateAuthError(errorMessage);
      
      // レート制限エラーを明示的に処理
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        translatedError = 'リクエスト回数の上限に達しました。しばらく時間をおいてから再度お試しください。';
      }

      setFormFeedback({
        type: 'error',
        message: translatedError
      });
      //#endregion
    } finally {
      // 処理完了時に必ずローディング状態を解除
      setIsLoading(false);
    }
  };

  // エラーメッセージの日本語変換関数を改善
  const translateAuthError = (error: string): string => {
    // 一般的なSupabaseのエラーメッセージを日本語に変換
    const errorMap: { [key: string]: string } = {
      'Invalid login credentials': 'メールアドレスまたはパスワードが正しくありません',
      'Email not confirmed': 'メールアドレスが未確認です。確認メールをご確認ください',
      'User already registered': 'このメールアドレスは既に登録されています',
      'Password should be at least 6 characters': 'パスワードは6文字以上である必要があります',
      'Email format is invalid': 'メールアドレスの形式が正しくありません',
      'Password recovery requires an email': 'パスワード回復にはメールアドレスが必要です',
      'Rate limit exceeded': 'リクエスト回数の上限に達しました。しばらく経ってからお試しください',
      'User not found': 'ユーザーが見つかりません',
      'Too Many Requests': 'リクエスト回数の上限に達しました。しばらく経ってからお試しください',
    };

    return errorMap[error] || 'エラーが発生しました。もう一度お試しください';
  };

  //#region パスワードの検証
  const validatePassword = (pass: string) => {
    const validation = validatePasswordStrength(pass);
    setPasswordError(validation.message);
    return validation.isValid;
  };
  //#endregion

  //#region タブ切り替え時にフォームをリセット
  const handleModeChange = (mode: ModalMode) => {
    setModalMode(mode);
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setEmailError('');
    setFormFeedback(null);
  }
  //#endregion

  //#region モーダルを閉じたときにフォームをリセット
  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setEmailError('');
    setFormFeedback(null);
    setModalMode('signin');
  };
  //#endregion

  //#region emailバリデーション関数を追加
  const validateEmail = (email: string) => {
    const validation = validateEmailFormat(email);
    setEmailError(validation.message);
    return validation.isValid;
  };
  //#endregion

  //#region フォームに入力があるか確認
  const hasFormInput = useCallback(() => {
    if (modalMode === 'reset') {
      return email.length > 0;
    }
    return email.length > 0 || password.length > 0 ||
      (modalMode === 'signup' && confirmPassword.length > 0);
  }, [email, password, confirmPassword, modalMode]);
  //#endregion

  //#region モーダルを閉じる前の確認
  const confirmClose = useCallback((): boolean => {
    // `hasFormInput` の結果を取得してから判定する
    if (!hasFormInput()) return true;
    return window.confirm('入力内容が破棄されます。よろしいですか？');
  }, [hasFormInput]);
  //#endregion

  //#region モーダルを閉じる処理
  const handleClose = useCallback(() => {
    if (confirmClose()) {
      setIsVisible(false);
      setTimeout(() => {
        onClose();
        resetForm();
      }, 200);
    }
  }, [confirmClose, onClose]);
  //#endregion

  //#region オーバーレイクリックのハンドラを追加
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };
  //#endregion

  const emailInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // 既存のuseEffect関連部分はそのまま維持
  //#region useEffectでisOpenの変更を監視
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [isOpen]);
  //#endregion

  //#region ESCキー検知のためのuseEffectを追加
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
  //#endregion

  //#region ブラウザのページ離脱防止イベントの設定
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
  //#endregion

  //#region モーダルを開いた時にメールアドレス入力欄にフォーカス
  useEffect(() => {
    if (isOpen && isVisible) {
      emailInputRef.current?.focus();
    }
  }, [isOpen, isVisible]);
  //#endregion

  //#region フォーカストラップの実装
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
  //#endregion

  // セッションの確認と自動リダイレクト
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // すでにログイン済みの場合はダッシュボードにリダイレクト
        router.push('/dashboard');
        onClose();
      }
    };

    if (isOpen) {
      checkSession();
    }
  }, [isOpen, router, onClose, supabase.auth]);
  
  useEffect(() => {
    console.log(modalMode);
  }, [modalMode]);

  // デバッグ用のログ追加
  useEffect(() => {
    if (modalMode === 'reset') {
      console.log('リセットモードに変更されました');
    }
  }, [modalMode]);

  // パスワードリセット専用の処理関数
  // パスワードリセット処理関数
  const handleResetPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    console.log('パスワードリセット処理開始');
    
    // 入力検証
    if (!validateEmail(email)) {
      console.log('メールバリデーション失敗');
      return;
    }
    
    setIsLoading(true);
    setFormFeedback(null);
    
    try {
      // 重要: 現在のURLのオリジンを使用するように修正
      // window.location.origin は現在のサイトのルートURLを取得
      // 例: https://parrot-diary.vercel.app
      const currentOrigin = window.location.origin;
      console.log('現在のオリジン:', currentOrigin);
      
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${currentOrigin}/auth/reset-password`
      });

      if (resetError) {
        console.error('リセットエラー:', resetError);
        throw resetError;
      }

      console.log('リセットメール送信成功');
      setFormFeedback({
        type: 'success',
        message: 'パスワードリセット用のメールを送信しました。メールボックスをご確認ください。'
      });

      // 成功時の処理
      setTimeout(() => {
        onClose();
        resetForm();
      }, 3000);
    } catch (error) {
      console.error('パスワードリセットエラー:', error);
      
      // エラーメッセージの変換と表示
      const errorMessage = error instanceof Error ? error.message : '認証に失敗しました';
      let translatedError = translateAuthError(errorMessage);
      
      // レート制限エラーを明示的に処理
      if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
        translatedError = 'リクエスト回数の上限に達しました。しばらく時間をおいてから再度お試しください。';
      }

      setFormFeedback({
        type: 'error',
        message: translatedError
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
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
                {/* 重要な修正: リセットパスワード用のフォームを専用のハンドラに接続 */}
                <form className={styles.form} onSubmit={handleResetPassword}>
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
                      }}
                      required
                    />
                    {emailError && (
                      <p id="emailError" className={styles.errorMessage}>
                        {emailError}
                      </p>
                    )}
                  </div>
                  {/* フィードバック表示部分 */}
                  {formFeedback && (
                    <div className={`${styles.feedbackWrapper} ${formFeedback.type === 'success' ?
                      styles.feedbackSuccess :
                      styles.feedbackError
                      }`}>
                      <div className={styles.feedbackContent}>
                        {formFeedback.type === 'success' ? '✓ ' : '⚠ '}
                        {formFeedback.message}
                      </div>
                    </div>
                  )}
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
              // サインイン/サインアップ用のフォーム部分は変更なし
              <div className={styles.modalInner}>
                <h2 id="modalTitle" className={styles.modalTitle}>
                  {modalMode === 'signup' ? 'アカウント作成' : 'サインイン'}
                </h2>
                {/* タブ切り替えを追加 */}
                <div className={styles.tabs}>
                  <button
                    className={`${styles.tab} ${modalMode === 'signin' ? styles.activeTab : ''}`}
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
                {formFeedback && (
                  <div className={`${styles.feedbackWrapper} ${formFeedback.type === 'success' ?
                    styles.feedbackSuccess :
                    styles.feedbackError
                    }`}>
                    <div className={styles.feedbackContent}>
                      {formFeedback.type === 'success' ? '✓ ' : '⚠ '}
                      {formFeedback.message}
                    </div>
                  </div>
                )}
                <form className={styles.form} onSubmit={handleAuthSubmit}>
                  {/* メールアドレス入力部 */}
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
                  {modalMode === 'signup' && (
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

      {/* グローバルローディングオーバーレイ */}
      {globalLoading && (
        <div className={styles.globalOverlay}>
          {/* ローディングアニメーションなどを配置可能 */}
        </div>
      )}
    </>
  );
}
