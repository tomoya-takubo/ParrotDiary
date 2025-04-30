'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '@/styles/Home.module.css';
import Image from 'next/image';

// #region 定数・設定
/**
 * Supabase関連の設定
 * - 環境変数からSupabaseの接続情報を取得
 * - クライアントインスタンスの作成
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
// #endregion

// #region ユーティリティ関数
/**
 * 画像の公開URLを取得する関数
 * @param path ストレージ内のファイルパス
 * @return 公開アクセス可能なURL
 */
const getPublicUrl = (path: string): string => {
  return supabase.storage.from('Parrots').getPublicUrl(path).data.publicUrl;
};
// #endregion

/**
 * ParrotCollection コンポーネント
 * オウムのGIF画像をランダムに4つ表示するコンポーネント
 */
export const ParrotCollection = () => {
  // #region 状態管理
  // 表示する画像のURLリスト
  const [displayParrots, setDisplayParrots] = useState<string[]>([]);
  // 読み込み状態
  const [isLoading, setIsLoading] = useState(true);
  // #endregion

  // #region データフェッチ
  useEffect(() => {
    /**
     * Supabaseストレージから画像を取得する非同期関数
     */
    const fetchParrotImages = async () => {
      try {
        setIsLoading(true);
        
        // 'parrots'フォルダからファイルリストを取得（パフォーマンス向上のため特定フォルダに限定）
        const { data, error } = await supabase.storage.from('Parrots').list('parrots');
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // GIFファイルのみをフィルタリング
          const gifFiles = data
            .filter(file => file.name.endsWith('.gif'))
            .map(file => `parrots/${file.name}`);
          
          if (gifFiles.length > 0) {
            // ランダムに4つ選択
            const shuffled = [...gifFiles]
              .sort(() => Math.random() - 0.5)
              .slice(0, 4);
            
            // 公開URLを取得して画像プリロード
            const urls = shuffled.map(path => getPublicUrl(path));
            
            // 画像をプリロードしてから表示（UX向上のため）
            Promise.all(
              urls.map(url => {
                return new Promise((resolve) => {
                  const img = new window.Image(); // ブラウザのImage APIを使用
                  img.onload = () => resolve(url);
                  img.src = url;
                });
              })
            ).then(() => {
              setDisplayParrots(urls);
              setIsLoading(false);
            });
          }
        }
      } catch (error) {
        console.error('Failed to fetch images:', error);
        setIsLoading(false);
      }
    };

    // コンポーネントマウント時に画像取得を実行
    fetchParrotImages();
  }, []);
  // #endregion

  // #region レンダリング
  return (
    <div className={styles.parrotGrid}>
      {isLoading ? (
        // ローディング中はスケルトンローダーを表示
        Array(4).fill(0).map((_, i) => (
          <div key={i} className={`${styles.parrotItem} ${styles.parrotLoading}`}>
            {/* スケルトンローダー */}
          </div>
        ))
      ) : (
        // 画像の表示
        displayParrots.map((url, i) => (
          <div key={i} className={styles.parrotItem}>
            <Image
              src={url}
              alt={`Parrot ${i + 1}`}
              width={200}
              height={200}
              unoptimized
              priority
            />
          </div>
        ))
      )}
    </div>
  );
  // #endregion
};