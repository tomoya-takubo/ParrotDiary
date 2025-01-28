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
          <h2>認証モーダル</h2>
        </CardContent>
      </Card>
    </div>
  );
}