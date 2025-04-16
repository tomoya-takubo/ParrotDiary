'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '@/styles/Home.module.css';
import Image from 'next/image';

// Supabase クライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

// 画像の公開URLを取得する関数
const getPublicUrl = (path: string): string => {
  return supabase.storage.from('Parrots').getPublicUrl(path).data.publicUrl;
};

export const ParrotCollection = () => {
  const [displayParrots, setDisplayParrots] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchParrotImages = async () => {
      try {
        setIsLoading(true);
        
        // 特定のフォルダ（例：'parrots'）のみリストを取得してパフォーマンス向上
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
            
            // プリロードしてから表示
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

    fetchParrotImages();
  }, []);

  return (
    <div className={styles.parrotGrid}>
      {isLoading ? (
        // ローディング表示
        Array(4).fill(0).map((_, i) => (
          <div key={i} className={`${styles.parrotItem} ${styles.parrotLoading}`}>
            {/* スケルトンローダー */}
          </div>
        ))
      ) : (
        // 画像表示
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
};