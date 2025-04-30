'use client';

import { useState, useEffect } from 'react';
import { updatePassword } from '@/lib/authentication';
import { useRouter } from 'next/navigation';
import styles from '@/styles/Home.module.css';
import { validatePasswordStrength } from '@/lib/validation';
import { Eye, EyeOff, Check, X } from 'lucide-react';

/**
 * パスワードリセットページコンポーネント
 * ユーザーが新しいパスワードを設定するためのフォームを提供します
 */
export default function ResetPasswordPage() {
  // #region 状態変数の定義
  // フォーム入力状態
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  // フォーム処理状態
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // パスワード強度と要件の状態
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong' | null>(null);
  const [requirements, setRequirements] = useState({
    length: false,
    uppercase: false,
    lowercase: false,
    number: false,
    special: false
  });
  
  const router = useRouter();
  // #endregion

  // #region パスワード強度と要件のチェック
  /**
   * パスワードの入力に応じて強度と要件充足状況を更新します
   */
  useEffect(() => {
    if (!password) {
      setPasswordStrength(null);
      setRequirements({
        length: false,
        uppercase: false,
        lowercase: false,
        number: false,
        special: false
      });
      return;
    }

    const hasLength = password.length >= 8;
    const hasUppercase = /[A-Z]/.test(password);
    const hasLowercase = /[a-z]/.test(password);
    const hasNumber = /[0-9]/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    setRequirements({
      length: hasLength,
      uppercase: hasUppercase,
      lowercase: hasLowercase,
      number: hasNumber,
      special: hasSpecial
    });

    // パスワード強度の計算
    const metRequirements = [hasLength, hasUppercase, hasLowercase, hasNumber, hasSpecial].filter(Boolean).length;
    
    if (metRequirements <= 2) {
      setPasswordStrength('weak');
    } else if (metRequirements <= 4) {
      setPasswordStrength('medium');
    } else {
      setPasswordStrength('strong');
    }
  }, [password]);
  // #endregion

  // #region ユーティリティ関数
  /**
   * パスワードが要件を満たしているか検証します
   * @param pass 検証するパスワード
   * @returns 検証結果
   */
  const validatePassword = (pass: string) => {
    const validation = validatePasswordStrength(pass);
    return validation.isValid;
  };

  /**
   * パスワード表示/非表示を切り替えます
   */
  const togglePasswordVisibility = () => {
    setPasswordVisible(!passwordVisible);
  };

  /**
   * 確認用パスワード表示/非表示を切り替えます
   */
  const toggleConfirmPasswordVisibility = () => {
    setConfirmPasswordVisible(!confirmPasswordVisible);
  };
  // #endregion

  // #region フォーム送信処理
  /**
   * フォーム送信時の処理を行います
   * @param e フォームイベント
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 入力検証
    if (!validatePassword(password)) {
      setError('パスワードが要件を満たしていません');
      return;
    }

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
      setMessage('パスワードが更新されました。ルートにリダイレクトします...');

      // 3秒後にルートにリダイレクト
      setTimeout(() => {
        router.push('/');
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
  // #endregion

  // #region レンダリング
  return (
    <div className={styles.resetContainer}>
      <div className={styles.resetPasswordCard}>
        {/* オプション: ロゴを追加 */}
        {/* <img src="/logo.svg" alt="Logo" className={styles.resetLogo} /> */}
        
        <h1 className={styles.resetTitle}>新しいパスワードを設定</h1>
        <p className={styles.resetSubtitle}>安全なパスワードを入力して、アカウントを保護してください</p>

        {/* エラーメッセージ表示 */}
        {error && (
          <div className={styles.errorMessage}>
            <p>{error}</p>
          </div>
        )}

        {/* 成功メッセージ表示 */}
        {message && (
          <div className={styles.successMessage}>
            <p>{message}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* 新しいパスワード入力フィールド */}
          <div className={styles.passwordField}>
            <label htmlFor="password" className={styles.label}>新しいパスワード</label>
            <div className={styles.passwordField}>
              <input
                id="password"
                type={passwordVisible ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.resetInput}
                placeholder="新しいパスワードを入力"
                required
              />
              <div 
                className={styles.passwordIcon} 
                onClick={togglePasswordVisibility}
                role="button"
                tabIndex={0}
                aria-label={passwordVisible ? "パスワードを隠す" : "パスワードを表示"}
              >
                {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>
            
            {/* パスワード強度メーター */}
            {password && (
              <div className={styles.passwordStrengthMeter}>
                <div 
                  className={`
                    ${styles.passwordStrengthIndicator} 
                    ${passwordStrength === 'weak' ? styles.strengthWeak : ''} 
                    ${passwordStrength === 'medium' ? styles.strengthMedium : ''} 
                    ${passwordStrength === 'strong' ? styles.strengthStrong : ''}
                  `}
                ></div>
              </div>
            )}
            
            {/* パスワード要件リスト */}
            <div className={styles.passwordRequirements}>
              <div className={`${styles.requirement} ${requirements.length ? styles.requirementMet : ''}`}>
                {requirements.length ? <Check size={14} className={styles.requirementIcon} /> : <X size={14} className={styles.requirementIcon} />}
                <span>8文字以上</span>
              </div>
              <div className={`${styles.requirement} ${requirements.uppercase ? styles.requirementMet : ''}`}>
                {requirements.uppercase ? <Check size={14} className={styles.requirementIcon} /> : <X size={14} className={styles.requirementIcon} />}
                <span>大文字を含む</span>
              </div>
              <div className={`${styles.requirement} ${requirements.lowercase ? styles.requirementMet : ''}`}>
                {requirements.lowercase ? <Check size={14} className={styles.requirementIcon} /> : <X size={14} className={styles.requirementIcon} />}
                <span>小文字を含む</span>
              </div>
              <div className={`${styles.requirement} ${requirements.number ? styles.requirementMet : ''}`}>
                {requirements.number ? <Check size={14} className={styles.requirementIcon} /> : <X size={14} className={styles.requirementIcon} />}
                <span>数字を含む</span>
              </div>
              <div className={`${styles.requirement} ${requirements.special ? styles.requirementMet : ''}`}>
                {requirements.special ? <Check size={14} className={styles.requirementIcon} /> : <X size={14} className={styles.requirementIcon} />}
                <span>特殊文字を含む (!@#$%^&*など)</span>
              </div>
            </div>
          </div>

          {/* パスワード確認フィールド */}
          <div className={styles.passwordField}>
            <label htmlFor="confirmPassword" className={styles.label}>パスワード（確認）</label>
            <div className={styles.passwordField}>
              <input
                id="confirmPassword"
                type={confirmPasswordVisible ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={styles.resetInput}
                placeholder="パスワードをもう一度入力"
                required
              />
              <div 
                className={styles.passwordIcon} 
                onClick={toggleConfirmPasswordVisibility}
                role="button"
                tabIndex={0}
                aria-label={confirmPasswordVisible ? "パスワードを隠す" : "パスワードを表示"}
              >
                {confirmPasswordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
              </div>
            </div>
            
            {/* パスワード一致インジケーター */}
            {confirmPassword && password && (
              <div className={styles.requirement} style={{ marginTop: '0.5rem' }}>
                {confirmPassword === password ? 
                  <><Check size={14} className={styles.requirementIcon} style={{ color: '#16a34a' }} /> <span style={{ color: '#16a34a' }}>パスワードが一致しています</span></> : 
                  <><X size={14} className={styles.requirementIcon} style={{ color: '#dc2626' }} /> <span style={{ color: '#dc2626' }}>パスワードが一致していません</span></>
                }
              </div>
            )}
          </div>

          {/* 送信ボタン */}
          <button
            type="submit"
            className={styles.resetButton}
            disabled={loading || !password || !confirmPassword || password !== confirmPassword || !validatePassword(password)}
          >
            {loading ? (
              <>
                <span>パスワード更新中</span>
                <div className={styles.loadingRing}></div>
              </>
            ) : (
              'パスワードを更新する'
            )}
          </button>
        </form>
      </div>
    </div>
  );
  // #endregion
}