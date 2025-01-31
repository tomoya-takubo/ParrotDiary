'use client';

import styles from '../styles/Home.module.css';

export default function ForgotPasswordButton() {
  return (
    <button 
      type="button"
      className={styles.forgotPasswordButton}
      onClick={() => console.log('パスワードリセット')}
    >
      パスワードをお忘れの方はこちら
    </button>
  );
}