'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '@/styles/Home.module.css';
import Image from 'next/image';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabaseクライアントを作成
const supabase = createClient(supabaseUrl, supabaseKey);

// ランダムに指定数のファイルを選択する関数
const getRandomFiles = (files: string[], count: number) => {
  return [...files].sort(() => Math.random() - 0.5).slice(0, count);
};

type SupabaseFile = {
  name: string;
  id?: string; // フォルダには `id` がない可能性がある
};

// フォルダ内の全ファイルを再帰的に取得する関数
const fetchAllFiles = async (path = '', allFiles: string[] = []): Promise<string[]> => {
  const { data, error } = await supabase.storage.from('Parrots').list(path);

  if (error) {
    console.error('Supabase API Error:', error);
    return allFiles;
  }

  for (const item of data as SupabaseFile[]) {
    const fullPath = path ? `${path}/${item.name}` : item.name;

    if (!item.id) {
      // ファイルならリストに追加
      await fetchAllFiles(fullPath, allFiles);
    } else {
      // ファイルの場合、リストに追加
      allFiles.push(fullPath);
    }
  }
  return allFiles;
};

const getPublicUrl = (path: string) => {
  return `${supabase.storage.from('Parrots').getPublicUrl(path).data.publicUrl}?t=${Date.now()}`;
};


export const ParrotCollection = () => {
  const [displayParrots, setDisplayParrots] = useState<string[]>([]);

  useEffect(() => {

    const fetchParrotImages = async () => {
      const allFiles = await fetchAllFiles() || []; // undefined を防ぐ
      const gifFiles = allFiles.filter((file) => file.endsWith('.gif'));
    
      if (gifFiles.length === 0) {
        console.warn('No GIF files found.');
        return;
      }
    
      const selectedGifs = getRandomFiles(gifFiles, 4);
      console.log('Selected GIFs:', selectedGifs); // ランダム選択されたGIFを確認
    
      const urls = selectedGifs.map((path) => {
        const url = getPublicUrl(path);
        console.log('Generated URL:', url); // 生成されたURLを確認
        return url;
      });
    
      setDisplayParrots(urls);
    };
        
    fetchParrotImages();
  }, []);

  return (
    <div className={styles.parrotGrid}>
      {displayParrots.map((url, i) => (
        <div key={i} className={styles.parrotItem}>
          <Image src={url} alt={`Parrot ${i + 1}`} />
        </div>
      ))}
    </div>
  );
};
