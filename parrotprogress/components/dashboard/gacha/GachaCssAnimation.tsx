import React, { useState, useEffect } from 'react';
import { Star, Sparkles, X } from 'lucide-react';
import styles from './GachaCssAnimation.module.css';

// ガチャアイテムの型定義
export type GachaItem = {
  id: string;
  name: string;
  description: string;
  image: string;
  rarity: 'normal' | 'rare' | 'super_rare' | 'ultra_rare';
};

type GachaAnimationProps = {
  isOpen: boolean;
  onClose: () => void;
  tickets?: number;
};

type RarityType = 'normal' | 'rare' | 'super_rare' | 'ultra_rare';

type RarityConfig = {
  title: string;
  colors: string;
  bgGradient: string;
  particleColors: string[];
  stars: number;
  probability: string;
  particleCount: number;
  threshold?: number;
  parrotName: string;
};

/**
 * ガチャアニメーションコンポーネント
 * CSSアニメーションを利用した豪華なガチャ演出を提供します
 */
const GachaCssAnimation: React.FC<GachaAnimationProps> = ({ 
  isOpen, 
  onClose,
  tickets = 3
}) => {
  // 状態管理
  const [showResult, setShowResult] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [currentRarity, setCurrentRarity] = useState<RarityType | null>(null);
  const [result, setResult] = useState<GachaItem | null>(null);

  // レア度ごとの設定
  const rarityConfigs: Record<RarityType, RarityConfig> = {
    ultra_rare: {
      title: "ULTRA RARE",
      colors: "from-purple-600 via-pink-600 to-blue-600",
      bgGradient: "linear-gradient(to right, #ff0000, #ff8000, #ffff00, #00ff00, #0000ff, #8000ff, #ff0000)",
      particleColors: ['#ef4444', '#f97316', '#facc15', '#22c55e', '#3b82f6', '#8b5cf6'],
      stars: 4,
      probability: "1%",
      particleCount: 20,
      threshold: 0.01,
      parrotName: "Rainbow Phoenix Parrot"
    },
    super_rare: {
      title: "SUPER RARE",
      colors: "from-purple-500 to-pink-500",
      bgGradient: "linear-gradient(to right, #9333ea, #ec4899, #9333ea)",
      particleColors: ['#a855f7', '#ec4899'],
      stars: 3,
      probability: "5%",
      particleCount: 12,
      threshold: 0.06,
      parrotName: "Crystal Star Parrot"
    },
    rare: {
      title: "RARE",
      colors: "from-blue-500 to-cyan-500",
      bgGradient: "linear-gradient(to right, #3b82f6, #06b6d4, #3b82f6)",
      particleColors: ['#3b82f6', '#06b6d4'],
      stars: 2,
      probability: "15%",
      particleCount: 8,
      threshold: 0.21,
      parrotName: "Sapphire Wave Parrot"
    },
    normal: {
      title: "NORMAL",
      colors: "from-gray-400 to-gray-500",
      bgGradient: "linear-gradient(to right, #9ca3af, #6b7280, #9ca3af)",
      particleColors: ['#9ca3af'],
      stars: 1,
      probability: "79%",
      particleCount: 4,
      parrotName: "Common Parrot"
    }
  };

  // レア度を決定する関数
  const determineRarity = (): RarityType => {
    const rand = Math.random();
    if (rand < rarityConfigs.ultra_rare.threshold!) {
      return 'ultra_rare';
    } else if (rand < rarityConfigs.super_rare.threshold!) {
      return 'super_rare';
    } else if (rand < rarityConfigs.rare.threshold!) {
      return 'rare';
    }
    return 'normal';
  };

  // ガチャ演出をリセットする関数
  const resetGachaState = () => {
    setSpinning(false);
    setShowResult(false);
    setCurrentRarity(null);
    setResult(null);
  };

  // モーダルが閉じられたときの処理
  useEffect(() => {
    if (!isOpen) {
      resetGachaState();
    }
  }, [isOpen]);

  // ガチャ演出を開始する関数
  const startGacha = () => {
    // レア度を決定
    const rarity = determineRarity();
    setCurrentRarity(rarity);
    setSpinning(true);
    
    // モックデータ: 実際の実装ではAPIからデータを取得する
    const mockResults: Record<RarityType, GachaItem> = {
      'ultra_rare': {
        id: 'parrot-ur-1',
        name: 'レインボーフェニックスパロット',
        description: '非常に珍しい虹色のパロット',
        image: '/api/placeholder/120/120',
        rarity: 'ultra_rare'
      },
      'super_rare': {
        id: 'parrot-sr-1',
        name: 'クリスタルスターパロット',
        description: '星の力を持つパロット',
        image: '/api/placeholder/120/120',
        rarity: 'super_rare'
      },
      'rare': {
        id: 'parrot-r-1',
        name: 'サファイアウェーブパロット',
        description: '海の色を持つパロット',
        image: '/api/placeholder/120/120',
        rarity: 'rare'
      },
      'normal': {
        id: 'parrot-n-1',
        name: 'コモンパロット',
        description: '一般的なパロット',
        image: '/api/placeholder/120/120',
        rarity: 'normal'
      }
    };
    
    // 3秒後に結果表示
    setTimeout(() => {
      setSpinning(false);
      setResult(mockResults[rarity]);
      setShowResult(true);
    }, 3000);
  };

  // モーダルを閉じる関数
  const handleClose = () => {
    // 結果表示中のみ閉じることができる
    if (showResult) {
      onClose();
    }
  };

  // モーダル外をクリックしたときの処理
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && showResult) {
      handleClose();
    }
  };

  // パーティクルエフェクトコンポーネント
  const Particles = ({ config }: { config: RarityConfig }) => (
    <div className={styles.particlesContainer}>
      {Array.from({ length: config.particleCount }).map((_, i) => {
        const randomDelay = Math.random() * 2;
        const randomX = 50 + (Math.random() - 0.5) * 100;
        const randomY = 50 + (Math.random() - 0.5) * 100;
        
        return (
          <div
            key={i}
            className={styles.particle}
            style={{
              backgroundColor: config.particleColors[i % config.particleColors.length],
              animationDelay: `${randomDelay}s`,
              left: `${randomX}%`,
              top: `${randomY}%`
            }}
          />
        );
      })}
    </div>
  );

  // グラデーションのスタイル生成
  const getGradientStyle = (gradientString: string) => {
    if (gradientString.startsWith('from-')) {
      // Tailwindクラスのような文字列の場合、対応するグラデーションに変換
      if (gradientString.includes('from-purple-600 via-pink-600 to-blue-600')) {
        return 'linear-gradient(to right, #7c3aed, #db2777, #2563eb)';
      } else if (gradientString.includes('from-purple-500 to-pink-500')) {
        return 'linear-gradient(to right, #8b5cf6, #ec4899)';
      } else if (gradientString.includes('from-blue-500 to-cyan-500')) {
        return 'linear-gradient(to right, #3b82f6, #06b6d4)';
      } else if (gradientString.includes('from-gray-400 to-gray-500')) {
        return 'linear-gradient(to right, #9ca3af, #6b7280)';
      }
      return 'linear-gradient(to right, #9ca3af, #6b7280)'; // デフォルト
    }
    return gradientString; // 既にCSS用のグラデーション文字列の場合はそのまま返す
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay} onClick={handleOverlayClick}>
      <div className={styles.modalContainer}>
        {currentRarity && (
          <div 
            className={styles.backgroundGlow}
            style={{
              background: rarityConfigs[currentRarity].bgGradient
            }}
          />
        )}

        <div className={styles.contentWrapper}>
          {!showResult ? (
            // 回転アニメーション表示
            <div className={styles.spinningContainer}>
              <div 
                className={styles.spinningCircle}
                style={{
                  background: currentRarity 
                    ? getGradientStyle(rarityConfigs[currentRarity].colors)
                    : 'gray'
                }}
              >
                <img src="/api/placeholder/80/80" alt="Spinning Parrot" className={styles.spinningImage} />
              </div>
              <p className={styles.spinningText}>
                ✨ パロットを探しています... ✨
              </p>
            </div>
          ) : (
            // 結果表示
            <div className={styles.resultContainer}>
              {currentRarity && <Particles config={rarityConfigs[currentRarity]} />}
              
              <div className={styles.resultImageContainer}>
                <div
                  className={`${styles.resultCircle} ${currentRarity === 'ultra_rare' ? styles.ultraRareRotate : ''}`}
                  style={{
                    background: currentRarity 
                      ? getGradientStyle(rarityConfigs[currentRarity].colors)
                      : 'gray'
                  }}
                >
                  <div className={`${styles.resultImageWrapper} ${currentRarity === 'ultra_rare' ? styles.ultraRareCounterRotate : ''}`}>
                    {result && <img src={result.image} alt={result.name} className={styles.resultImage} />}
                  </div>
                </div>
              </div>

              {result && currentRarity && (
                <div className={styles.resultInfoContainer}>
                  <div
                    className={styles.rarityTitle}
                    style={{
                      backgroundImage: getGradientStyle(rarityConfigs[currentRarity].colors)
                    }}
                  >
                    ✨ {rarityConfigs[currentRarity].title} ✨
                  </div>

                  <div
                    className={styles.parrotName}
                    style={{
                      backgroundImage: getGradientStyle(rarityConfigs[currentRarity].colors)
                    }}
                  >
                    {rarityConfigs[currentRarity].parrotName}
                  </div>

                  <div className={styles.starsContainer}>
                    {Array.from({ length: rarityConfigs[currentRarity].stars }).map((_, i) => (
                      <div
                        key={i}
                        className={`${styles.starWrapper} ${currentRarity === 'ultra_rare' ? styles.ultraRareStar : ''}`}
                        style={{ animationDelay: `${i * 0.2}s` }}
                      >
                        <Star className={styles.star} />
                      </div>
                    ))}
                  </div>

                  <div className={styles.probabilityContainer}>
                    <Sparkles className={styles.sparkle} />
                    <span>出現確率 {rarityConfigs[currentRarity].probability}</span>
                    <Sparkles className={styles.sparkle} />
                  </div>

                  <button
                    onClick={handleClose}
                    className={styles.closeButton}
                    style={{
                      background: getGradientStyle(rarityConfigs[currentRarity].colors)
                    }}
                  >
                    OK!
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GachaCssAnimation;