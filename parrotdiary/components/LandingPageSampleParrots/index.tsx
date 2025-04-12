'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '@/styles/Home.module.css';
import Image from 'next/image';

//#region Supabase クライアントの作成
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);
//#endregion

//#region Supabase ストレージ内の全ファイルを取得する関数
type SupabaseFile = {
  name: string;
  id?: string; // フォルダには `id` がない可能性がある
};

const fetchAllFiles = async (path = '', allFiles: string[] = []): Promise<string[]> => {
  try {
    const { data, error } = await supabase.storage.from('Parrots').list(path);

    if (error) throw new Error(`Supabase API Error: ${error.message}`);

    for (const item of data as SupabaseFile[]) {
      const fullPath = path ? `${path}/${item.name}` : item.name;

      if (!item.id) {
        // フォルダの場合、再帰的に探索
        await fetchAllFiles(fullPath, allFiles);
      } else {
        // ファイルの場合、リストに追加
        allFiles.push(fullPath);
      }
    }
  } catch (error) {
    console.error(error);
  }
  return allFiles;
};
//#endregion

//#region 画像の公開URLを取得する関数
const getPublicUrl = (path: string) => {
  return supabase.storage.from('Parrots').getPublicUrl(path).data.publicUrl;
};
//#endregion

export const ParrotCollection = () => {
  const [allParrots, setAllParrots] = useState<string[]>([]);
  const [displayParrots, setDisplayParrots] = useState<string[]>([]);
  const [timestamp, setTimestamp] = useState<string | null>(null);

  useEffect(() => {
    setTimestamp(`?t=${Date.now()}`);

    const fetchParrotImages = async () => {
      try {
        const allFiles = await fetchAllFiles();
        if (!allFiles || allFiles.length === 0) {
          console.warn('No files found in storage.');
          return;
        }

        // GIF ファイルのみを抽出
        const gifFiles = allFiles.filter((file) => file.endsWith('.gif'));
        if (gifFiles.length === 0) {
          console.warn('No GIF files found.');
          return;
        }

        // 取得した全GIFファイルをステートに保存 (SSR時にはこのリストがある)
        setAllParrots(gifFiles);
      } catch (error) {
        console.error('Failed to fetch images:', error);
      }
    };

    fetchParrotImages();
  }, []);

  // クライアントサイドでランダム化する
  useEffect(() => {
    if (allParrots.length > 0) {
      const shuffled = [...allParrots].sort(() => Math.random() - 0.5).slice(0, 4);
      const urls = shuffled.map((path) => getPublicUrl(path));
      setDisplayParrots(urls);
    }
  }, [allParrots]);

  return (
    <div className={styles.parrotGrid}>
      {displayParrots.map((url, i) => (
        <div key={i} className={styles.parrotItem}>
          <Image
            src={timestamp ? `${url}${timestamp}` : url}
            alt={`Parrot ${i + 1}`}
            width={200} // 画像のサイズを明示
            height={200} // 画像のサイズを明示
            priority // 高速読み込みを有効化
          />
        </div>
      ))}
    </div>
  );
};
