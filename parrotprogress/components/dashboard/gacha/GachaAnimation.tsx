'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Sparkles } from 'lucide-react';

interface RarityConfig {
  title: string;
  colors: string;
  bgGradient: string;
  particleColors: readonly string[];
  stars: number;
  probability: string;
  particleCount: number;
  threshold: number;
  parrotName: string;
}

interface GachaAnimationProps {
  isOpen: boolean;
  startGacha: () => void;
  onClose: () => void;
  tickets?: number;
}

type RarityType = "ultra_rare" | "super_rare" | "rare" | "normal";

const rarityConfigs: Record<RarityType, RarityConfig>  = {
  ultra_rare: {
    title: "ULTRA RARE",
    colors: "from-purple-600 via-pink-600 to-blue-600",
    bgGradient: "linear-gradient(to right, #ff0000, #ff8000, #ffff00, #00ff00, #0000ff, #8000ff, #ff0000)",
    particleColors: ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-400", "bg-blue-400", "bg-purple-400"],
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
    particleColors: ["bg-purple-400", "bg-pink-400"],
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
    particleColors: ["bg-blue-400", "bg-cyan-400"],
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
    particleColors: ["bg-gray-400"],
    stars: 1,
    probability: "79%",
    particleCount: 4,
    threshold: 1.0,
    parrotName: "Common Parrot"
  }
} as const;

const GachaAnimation: React.FC<GachaAnimationProps> = ({ isOpen, startGacha, onClose, tickets = 3 }) => {
  // const [isOpen, setIsOpen] = useState(false);
  const [showResult, setShowResult] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [currentRarity, setCurrentRarity] = useState<RarityType | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      startGachaAnimation(); // ✅ `isOpen` が true になったらガチャ開始
    }
  }, [isOpen]);

  const startGachaAnimation = () => {
    const rarity: RarityType = determineRarity();
    setCurrentRarity(rarity);
    setSpinning(true);
    setShowResult(false);
    setTimeout(() => {
      setSpinning(false);
      setShowResult(true);
    }, 3000);
  };

  const Particles: React.FC<{ config: RarityConfig }> = ({ config }) => {
    return(
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
  }

  const determineRarity = () => {
    if (!isMounted) return "normal"; // 🚀 SSR では固定の値を返す
    const rand = Math.random();
    if (rand < rarityConfigs.ultra_rare.threshold) return "ultra_rare";
    if (rand < rarityConfigs.super_rare.threshold) return "super_rare";
    if (rand < rarityConfigs.rare.threshold) return "rare";
    return "normal";
  };

  const handleStartGacha = () => {
    const rarity: RarityType = determineRarity();
    setCurrentRarity(rarity);
    setSpinning(true);
    setShowResult(false);
    setTimeout(() => {
      setSpinning(false);
      setShowResult(true);
    }, 3000);
  };

  const handleCloseGacha = () => {
    setShowResult(false);
    setSpinning(false);
    setCurrentRarity(null);
    onClose();
  };

  const closeGacha = () => {
    if (!showResult) return;
    // setIsOpen(false);
    setShowResult(false);
    setSpinning(false);
    setCurrentRarity(null);
    onClose();
  };

  if (!isMounted) return null; // 🚀 SSR でのエラーを防ぐ

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
                {!showResult ? (
                  <div className="py-12">
                    <motion.div
                      animate={spinning ? {
                        rotate: 360,
                        scale: [1, 1.2, 1],
                      } : {}}
                      transition={{
                        duration: 0.8,
                        repeat: Infinity,
                        ease: "linear"
                      }}
                      className={`w-32 h-32 mx-auto bg-gradient-to-r ${rarityConfigs[currentRarity].colors} rounded-full flex items-center justify-center shadow-lg`}
                    >
                      <img src="/api/placeholder/80/80" alt="Spinning Parrot" className="w-20 h-20" />
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
                    <Particles config={rarityConfigs[currentRarity]} />
                    
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
                          rotate: currentRarity === 'ultra_rare' ? [0, 360] : 0,
                          backgroundPosition: ['0% 50%', '100% 50%', '0% 50%'],
                        }}
                        transition={{
                          rotate: {
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          },
                          backgroundPosition: {
                            duration: 5,
                            repeat: Infinity,
                            ease: "linear"
                          }
                        }}
                        className={`w-48 h-48 mx-auto rounded-full flex items-center justify-center bg-gradient-to-r ${rarityConfigs[currentRarity].colors}`}
                      >
                        <motion.div
                          className="bg-white rounded-full p-2"
                          animate={{ 
                            rotate: currentRarity === 'ultra_rare' ? [0, -360] : 0
                          }}
                          transition={{
                            duration: 20,
                            repeat: Infinity,
                            ease: "linear"
                          }}
                        >
                          <img src="/api/placeholder/120/120" alt="Rare Parrot" className="w-32 h-32" />
                        </motion.div>
                      </motion.div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="mt-6"
                    >
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

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className={`text-xl font-medium mb-4 bg-clip-text text-transparent bg-gradient-to-r ${rarityConfigs[currentRarity].colors}`}
                      >
                        {rarityConfigs[currentRarity].parrotName}
                      </motion.div>

                      <motion.div
                        animate={{ scale: [1, 1.05, 1] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="flex justify-center gap-2 mb-4"
                      >
                        {Array.from({ length: rarityConfigs[currentRarity].stars }).map((_, i) => (
                          <motion.div
                            key={i}
                            animate={{
                              rotate: currentRarity === 'ultra_rare' ? [0, 360] : 0,
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

                      <motion.div
                        animate={{ y: [0, -5, 0] }}
                        transition={{ duration: 1, repeat: Infinity }}
                        className="flex items-center justify-center gap-2 text-pink-500 font-medium"
                      >
                        <Sparkles className="h-5 w-5" />
                        <span>出現確率 {rarityConfigs[currentRarity].probability}</span>
                        <Sparkles className="h-5 w-5" />
                      </motion.div>
                    </motion.div>

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
};

export default GachaAnimation;
