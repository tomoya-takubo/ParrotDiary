import React, { useState, useEffect } from 'react';
import { Gift, X } from 'lucide-react';
import type { GachaResult } from '@/types';
import styles from './GachaModal.module.css';

type GachaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tickets?: number;
};

type AnimationState = 'initial' | 'spinning' | 'result';

const GachaModal: React.FC<GachaModalProps> = ({ isOpen, onClose, tickets = 3 }) => {
  const [animationState, setAnimationState] = useState<AnimationState>('initial');
  const [result, setResult] = useState<GachaResult | null>(null);

  // モーダルが閉じられたときにステートをリセット
  useEffect(() => {
    if (!isOpen) {
      setAnimationState('initial');
      setResult(null);
    }
  }, [isOpen]);

  const startGacha = () => {
    // ガチャ演出開始
    setAnimationState('spinning');

    // 仮の結果を表示（本来はAPIから取得）
    setTimeout(() => {
      setResult({
        type: 'rare',
        name: 'レアアイテム',
        description: '特別なアイテムです',
        image: '/api/placeholder/200/200'
      });
      setAnimationState('result');
    }, 2000);
  };

  // モーダル外のクリックを処理するハンドラー
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // オーバーレイ自体がクリックされた場合にのみモーダルを閉じる
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContainer}>
        {/* ヘッダー */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>ガチャ</h2>
          <button
            onClick={onClose}
            className={styles.closeButton}
          >
            <X size={24} />
          </button>
        </div>

        {/* 初期状態 */}
        {animationState === 'initial' && (
          <div className={styles.initialState}>
            <div className={styles.iconWrapper}>
              <Gift size={64} />
            </div>
            <p className={styles.prompt}>
              チケットを使用してガチャを回しますか？
            </p>
            <button
              onClick={startGacha}
              className={styles.gachaButton}
            >
              回す（チケット {tickets}枚）
            </button>
          </div>
        )}

        {/* ガチャ演出中 */}
        {animationState === 'spinning' && (
          <div className={styles.spinningState}>
            <div className={styles.spinner} />
            <p className={styles.spinnerText}>ガチャ実行中...</p>
          </div>
        )}

        {/* 結果表示 */}
        {animationState === 'result' && result && (
          <div className={styles.resultState}>
            <img
              src={result.image}
              alt={result.name}
              className={styles.resultImage}
            />
            <h3 className={styles.resultTitle}>{result.name}</h3>
            <p className={styles.resultDescription}>{result.description}</p>
            <button
              onClick={onClose}
              className={styles.closeResultButton}
            >
              閉じる
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GachaModal;