import React, { useState, useEffect } from 'react';
import { Gift, X } from 'lucide-react';
import type { GachaResult } from '@/types';
import styles from './GachaModal.module.css';

// #region 型定義
/**
 * GachaModalコンポーネントのプロパティ
 * @param isOpen モーダルの表示状態
 * @param onClose モーダルを閉じる関数
 * @param tickets 所持チケット数（デフォルト: 3）
 */
type GachaModalProps = {
  isOpen: boolean;
  onClose: () => void;
  tickets?: number;
};

/**
 * ガチャのアニメーション状態
 * initial: 初期状態
 * spinning: 回転中（ガチャ実行中）
 * result: 結果表示
 */
type AnimationState = 'initial' | 'spinning' | 'result';
// #endregion 型定義

/**
 * ガチャ機能用モーダルコンポーネント
 * ユーザーがチケットを使用してガチャを引くための機能を提供
 */
const GachaModal: React.FC<GachaModalProps> = ({ isOpen, onClose, tickets = 3 }) => {
  // #region 状態管理
  // アニメーション状態の管理
  const [animationState, setAnimationState] = useState<AnimationState>('initial');
  // ガチャ結果の管理
  const [result, setResult] = useState<GachaResult | null>(null);
  // #endregion 状態管理

  // #region 副作用
  /**
   * モーダルが閉じられたときに状態をリセットする
   */
  useEffect(() => {
    if (!isOpen) {
      setAnimationState('initial');
      setResult(null);
    }
  }, [isOpen]);
  // #endregion 副作用

  // #region イベントハンドラー
  /**
   * ガチャを開始する
   * アニメーション状態を「spinning」に変更し、
   * 一定時間後に結果を表示する
   */
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

  /**
   * モーダルの外側（オーバーレイ）がクリックされたときに
   * モーダルを閉じる処理
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // オーバーレイ自体がクリックされた場合にのみモーダルを閉じる
    if (e.target === e.currentTarget) {
      onClose();
    }
  };
  // #endregion イベントハンドラー

  // モーダルが非表示の場合は何も描画しない
  if (!isOpen) return null;

  // #region レンダリング
  return (
    <div 
      className={styles.modalOverlay} 
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContainer}>
        {/* モーダルヘッダー */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>ガチャ</h2>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
          >
            <X size={24} />
          </button>
        </div>

        {/* モーダルコンテンツ - 状態に応じて表示内容を切り替え */}
        {/* 初期状態 - ガチャを引く前 */}
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

        {/* ガチャ演出中 - スピナー表示 */}
        {animationState === 'spinning' && (
          <div className={styles.spinningState}>
            <div className={styles.spinner} />
            <p className={styles.spinnerText}>ガチャ実行中...</p>
          </div>
        )}

        {/* 結果表示 - 獲得アイテム表示 */}
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
  // #endregion レンダリング
};

export default GachaModal;