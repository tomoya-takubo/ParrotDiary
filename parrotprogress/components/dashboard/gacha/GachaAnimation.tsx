'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import Image from 'next/image';

//#region Supabase設定
/**
 * Supabaseクライアントの初期化
 * 環境変数からURLとAPIキーを取得
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);
//#endregion

//#region 型定義
/**
 * パロットの型定義
 * parrots テーブルの構造に合わせています
 */
interface Parrot {
  parrot_id: number;
  name: string;
  category_id: number;
  rarity_id: number;
  description: string | null;
  image_url: string | null;
}

/**
 * レアリティの型定義
 * rarity テーブルの構造に合わせています
 */
interface Rarity {
  rarity_id: number;
  name: string;
  abbreviation: string;
}

/**
 * レアリティ表示設定の型定義
 * UIの見た目の設定を管理します
 */
interface RarityConfig {
  title: string;
  colors: string;
  bgGradient: string;
  particleColors: readonly string[];
  stars: number;
  particleCount: number;
}

/**
 * コンポーネントのプロパティ型定義
 */
interface GachaAnimationProps {
  isOpen: boolean;
  startGacha: () => void;
  onClose: () => void;
  tickets?: number;
  userId?: number; // ユーザーIDを追加（デフォルトは1）
}

/**
 * レアリティタイプの定義
 * データベースのrarity_idに対応
 */
type RarityType = "ultra_rare" | "super_rare" | "rare" | "normal";
//#endregion

//#region レアリティ設定
/**
 * レアリティIDとタイプのマッピング
 */
const rarityIdToType: Record<number, RarityType> = {
  1: "normal",
  2: "rare",
  3: "super_rare",
  4: "ultra_rare"
};

/**
 * レアリティタイプに対応するUI設定
 * 表示の見た目を制御します
 */
const rarityConfigs: Record<RarityType, RarityConfig> = {
  ultra_rare: {
    title: "ULTRA RARE",
    colors: "from-purple-600 via-pink-600 to-blue-600",
    bgGradient: "linear-gradient(to right, #ff0000, #ff8000, #ffff00, #00ff00, #0000ff, #8000ff, #ff0000)",
    particleColors: ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-blue-400", "bg-purple-400"],
    stars: 4,
    particleCount: 20
  },
  super_rare: {
    title: "SUPER RARE",
    colors: "from-purple-500 to-pink-500",
    bgGradient: "linear-gradient(to right, #9333ea, #ec4899, #9333ea)",
    particleColors: ["bg-purple-400", "bg-pink-400"],
    stars: 3,
    particleCount: 12
  },
  rare: {
    title: "RARE",
    colors: "from-blue-500 to-cyan-500",
    bgGradient: "linear-gradient(to right, #3b82f6, #06b6d4, #3b82f6)",
    particleColors: ["bg-blue-400", "bg-cyan-400"],
    stars: 2,
    particleCount: 8
  },
  normal: {
    title: "NORMAL",
    colors: "from-gray-400 to-gray-500",
    bgGradient: "linear-gradient(to right, #9ca3af, #6b7280, #9ca3af)",
    particleColors: ["bg-gray-400"],
    stars: 1,
    particleCount: 4
  }
} as const;
//#endregion

// 現在の日本時間をISO形式で取得する関数
const getJSTISOString = () => {
  const now = new Date();
  // 日本時間 = UTC + 9時間
  return new Date(now.getTime() + (9 * 60 * 60 * 1000)).toISOString();
};

/**
 * ガチャアニメーションコンポーネント
 * Supabaseと連携してパロットを抽選し、ユーザーのコレクションに追加します
 */
const GachaAnimation: React.FC<GachaAnimationProps> = ({
  isOpen,
  startGacha,
  onClose,
  tickets = 3,
  userId = 1 // デフォルトユーザーID
}) => {
  //#region 状態管理
  const [showResult, setShowResult] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [currentRarity, setCurrentRarity] = useState<RarityType | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedParrot, setSelectedParrot] = useState<Parrot | null>(null);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  //#endregion

  //#region ライフサイクル管理
  // コンポーネントマウント時の処理
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // isOpenが変更された時の処理
  useEffect(() => {
    if (isOpen) {
      startGachaAnimation();
    }
  }, [isOpen]);

  useEffect(() => {
    const url = getSingleGifUrl('parrots', 'confusedparrot.gif');
    setGifUrl(url);
  }, []);
  
  //#endregion

  //#region 一匹のparrotのgifのURLを取得
  const getSingleGifUrl = (folder: string, fileName: string) => {
    return supabase.storage.from('Parrots').getPublicUrl(`${folder}/${fileName}`).data.publicUrl;
  };
  //#endregion

  //#region ガチャ処理関数
  /**
   * ガチャを引いてパロットを抽選する関数
   * すべてのパロットから均等な確率で1つを選択
   */
  const pullGacha = async (): Promise<{ parrot: Parrot, rarityType: RarityType }> => {
    try {
      // 1. 全パロットを取得
      const { data: parrots, error } = await supabase
        .from('parrots')
        .select('*');

      if (error || !parrots || parrots.length === 0) {
        throw new Error('パロット取得エラー: ' + error?.message);
      }

      // 2. ランダムにパロットを1つ選択（すべて均等な確率）
      const randomIndex = Math.floor(Math.random() * parrots.length);
      const selectedParrot = parrots[randomIndex];
      
      // 3. 選択されたパロットのレアリティタイプを取得
      const rarityType = rarityIdToType[selectedParrot.rarity_id] || "normal";

      return {
        parrot: selectedParrot,
        rarityType
      };
    } catch (error) {
      console.error('パロット抽選エラー:', error);
      // エラー時はデフォルト値を返す
      return {
        parrot: {
          parrot_id: 1,
          name: "Unknown Parrot",
          category_id: 1,
          rarity_id: 1,
          description: null,
          image_url: null
        },
        rarityType: "normal"
      };
    }
  };

  /**
   * 獲得したパロットをデータベースに登録する関数
   * user_parrotsテーブルとlast_updatedテーブルを更新
   */
  const saveParrotToUser = async (parrot: Parrot) => {
    try {
      // 1. まず既存のエントリを確認
      const { data: existingParrots, error: fetchError } = await supabase
        .from('user_parrots')
        .select('*')
        .eq('user_id', userId)
        .eq('parrot_id', parrot.parrot_id);

      if (fetchError) {
        throw new Error('既存パロット確認エラー: ' + fetchError.message);
      }

      // 2. user_parrotsテーブルの処理
      if (existingParrots && existingParrots.length > 0) {
        // 既に持っている場合はカウントを+1
        const { error: updateError } = await supabase
          .from('user_parrots')
          .update({ 
            obtain_count: existingParrots[0].obtain_count + 1,
            obtained_at: getJSTISOString() // 最終取得日を更新
          })
          .eq('user_id', userId)
          .eq('parrot_id', parrot.parrot_id);

        if (updateError) {
          throw new Error('パロット更新エラー: ' + updateError.message);
        }
      } else {
        // 初めて獲得した場合は新規レコード作成
        const { error: insertError } = await supabase
          .from('user_parrots')
          .insert([{
            user_id: userId,
            parrot_id: parrot.parrot_id,
            obtained_at: getJSTISOString(),
            obtain_count: 1
          }]);

        if (insertError) {
          throw new Error('パロット登録エラー: ' + insertError.message);
        }
      }

      // 3. ガチャ履歴テーブルに記録
      const { error: historyError } = await supabase
        .from('last_updated')
        .insert([{
          gacha_id: 1, // ガチャID（適宜変更）
          user_id: userId,
          parrot_id: parrot.parrot_id,
          executed_at: new Date().toISOString()
        }]);

      if (historyError) {
        throw new Error('ガチャ履歴登録エラー: ' + historyError.message);
      }

    } catch (error) {
      // エラーをログに記録するが、UXを妨げないよう処理は続行
      console.error('データベース操作エラー:', error);
    }
  };

  /**
   * ガチャアニメーションを開始する関数
   * パロットを抽選し、データベースに保存してアニメーションを表示
   */
  const startGachaAnimation = async () => {
    setSpinning(true);
    setShowResult(false);

    try {
      // 1. ガチャを引く
      const { parrot, rarityType } = await pullGacha();
      
      // 2. 状態を更新
      setSelectedParrot(parrot);
      setCurrentRarity(rarityType);
      
      // 3. パロットをユーザーに登録
      await saveParrotToUser(parrot);

      // 4. アニメーション完了後に結果表示
      setTimeout(() => {
        setSpinning(false);
        setShowResult(true);
      }, 3000);
    } catch (error) {
      console.error('ガチャ処理エラー:', error);
      // エラー時も演出は継続（デフォルト値で表示）
      setCurrentRarity("normal");
      setTimeout(() => {
        setSpinning(false);
        setShowResult(true);
      }, 3000);
    }
  };
  //#endregion

  //#region UIコンポーネント
  /**
   * パーティクル効果のコンポーネント
   * レアリティに応じたパーティクルエフェクトを表示
   */
  const Particles: React.FC<{ config: RarityConfig }> = ({ config }) => {
    return (
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: config.particleCount }).map((_, i) => (
          <motion.div
            key={i}
            initial={{
              scale: 0,
              x: '50%',
              y: '50%',
              opacity: 0
            }}
            animate={{
              scale: [1, 0],
              x: [
                '50%',
                `${50 + (Math.random() - 0.5) * 100}%`
              ],
              y: [
                '50%',
                `${50 + (Math.random() - 0.5) * 100}%`
              ],
              opacity: [1, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              delay: Math.random() * 2,
              ease: "easeOut"
            }}
            className={`absolute w-3 h-3 rounded-full ${config.particleColors[i % config.particleColors.length]}`}
            style={{
              filter: 'blur(1px)'
            }} />
        ))}
      </div>
    );
  };
  //#endregion

  //#region イベントハンドラ
  /**
   * ガチャを閉じる処理
   * 状態をリセットして閉じる
   */
  const handleCloseGacha = () => {
    setShowResult(false);
    setSpinning(false);
    setCurrentRarity(null);
    setSelectedParrot(null);
    onClose();
  };

  /**
   * 結果表示後にガチャを閉じる処理
   */
  const closeGacha = () => {
    if (!showResult) return;
    setShowResult(false);
    setSpinning(false);
    setCurrentRarity(null);
    setSelectedParrot(null);
    onClose();
  };
  //#endregion

  // モーダルが閉じている場合は何も表示しない
  if (!isOpen) return null;

  //#region レンダリング
  return (
    <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
      <AnimatePresence>
        {isOpen && currentRarity && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center backdrop-blur-sm"
            onClick={(e) => {
              if (e.target === e.currentTarget && showResult) {
                closeGacha();
              }
            }}
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              className="bg-white rounded-xl p-6 w-full max-w-md relative overflow-hidden shadow-2xl"
            >
              {/* 背景のグラデーション */}
              <motion.div
                animate={{
                  backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                }}
                transition={{
                  duration: 5,
                  repeat: Infinity,
                  ease: "linear"
                }}
                className="absolute inset-0 opacity-25"
                style={{
                  background: rarityConfigs[currentRarity].bgGradient,
                  backgroundSize: '200% 100%',
                }}
              />

              <div className="relative text-center z-10">
                {/* スピン中の表示 */}
                {!showResult ? (
                  <div className="py-12">
                    <motion.div
                      animate={spinning ? {
                        scale: [1, 1.2, 1],
                      } : {}}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className={`w-32 h-32 mx-auto bg-gradient-to-r ${rarityConfigs[currentRarity].colors} rounded-full flex items-center justify-center shadow-lg`}
                    >
                      {gifUrl && <Image src={gifUrl} alt="Party Parrot" width={400} height={400}/>}
                    </motion.div>
                    <motion.p
                      animate={{
                        opacity: [1, 0.5, 1]
                      }}
                      transition={{
                        duration: 1,
                        repeat: Infinity
                      }}
                      className="mt-4 text-gray-600 font-medium"
                    >
                      ✨ パロットを探しています... ✨
                    </motion.p>
                  </div>
                ) : (
                  // 結果表示
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{
                      type: "spring",
                      stiffness: 260,
                      damping: 20
                    }}
                    className="py-8"
                  >
                    {/* パーティクルエフェクト */}
                    <Particles config={rarityConfigs[currentRarity]} />
                    
                    {/* パロット表示部分 */}
                    <motion.div
                      animate={{
                        y: [0, -10, 0],
                        scale: [1, 1.1, 1],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut"
                      }}
                      className="relative"
                    >
                      <motion.div
                        animate={{
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                          backgroundPosition: {
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear"
                          }
                        }}
                        className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center bg-gradient-to-r ${rarityConfigs[currentRarity].colors}`}
                      >
                        <div className="bg-white rounded-full p-2">
                          {/* 実際のパロット画像がある場合はそれを表示 */}
                          <img 
                            src={selectedParrot?.image_url || "/api/placeholder/120/120"} 
                            alt={selectedParrot?.name || "Rare Parrot"} 
                            className="w-32 h-32" 
                          />
                        </div>
                      </motion.div>
                    </motion.div>

                    {/* パロット情報表示 */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-6"
                    >
                      {/* レアリティタイトル */}
                      <motion.div
                        animate={{
                          scale: [1, 1.1, 1],
                        }}
                        transition={{
                          duration: 2,
                          repeat: Infinity,
                        }}
                        className={`text-3xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r ${rarityConfigs[currentRarity].colors}`}
                      >
                        ✨ {rarityConfigs[currentRarity].title} ✨
                      </motion.div>

                      {/* パロット名 */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className={`text-xl font-medium mb-4 bg-clip-text text-transparent bg-gradient-to-r ${rarityConfigs[currentRarity].colors}`}
                      >
                        {selectedParrot?.name || "不明なパロット"}
                      </motion.div>

                      {/* スター表示 */}
                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="flex justify-center gap-2 mb-4"
                      >
                        {Array.from({ length: rarityConfigs[currentRarity].stars }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              rotate: [0, 360],
                              scale: [1, 1.2, 1],
                            }}
                            transition={{
                              duration: 2,
                              repeat: Infinity,
                              delay: i * 0.2,
                            }}
                          >
                            <Star className="h-8 w-8 text-yellow-400 fill-current" />
                          </motion.div>
                        ))}
                      </motion.div>

                      {/* パロット説明文（あれば表示） */}
                      {selectedParrot?.description && (
                        <motion.p
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ delay: 0.5 }}
                          className="text-gray-600 mt-2 mb-4"
                        >
                          {selectedParrot.description}
                        </motion.p>
                      )}
                    </motion.div>

                    {/* OKボタン */}
                    <motion.button
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.6 }}
                      onClick={closeGacha}
                      className={`mt-6 px-8 py-3 bg-gradient-to-r ${rarityConfigs[currentRarity].colors} text-white rounded-lg hover:opacity-90 shadow-lg z-50 relative`}
                    >
                      OK!
                    </motion.button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
  //#endregion
};

export default GachaAnimation;