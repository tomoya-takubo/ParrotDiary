'use client';

import { Card, CardContent } from './ui/Card';
import styles from '../styles/Home.module.css';

type AuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  if (!isOpen) return null;

  return (
    <div className={styles.modal}>
      <Card className={styles.modalCard}>
        <CardContent className={styles.modalContent}>
          <div className={styles.closeButton}>
            <button onClick={onClose}>✕</button>
          </div>
          <div className={styles.modalInner}>
            <h2 className={styles.modalTitle}>サインイン</h2>
            <form className={styles.form}>
              <div className={styles.formGroup}>
                <label className={styles.label}>メールアドレス</label>
                <input
                  type='email'
                  className={styles.input}
                  required
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.label}>パスワード</label>
                <input 
                  type="password" 
                  className={styles.input}
                  required
                />
              </div>
              <button type='submit' className={styles.submitButton}>
                サインイン
              </button>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}