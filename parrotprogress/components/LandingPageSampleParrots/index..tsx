'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from '@/styles/Home.module.css';

// Supabaseクライアントを作成
const supabase = createClient(
  'https://pjoolpfjjhnqyvohvixf.supabase.co', 
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqb29scGZqamhucXl2b2h2aXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzkxMTE3NDcsImV4cCI6MjA1NDY4Nzc0N30.jmdewkn9T5s0vwRDuSiXw-ouPHKuoL_bjvpy-jxebu8');

// ランダムに指定数のファイルを選択する関数
const getRandomFiles = (files: any[], count: number) => {
  return [...files].sort(() => Math.random() - 0.5).slice(0, count);
};

// フォルダ内の全ファイルを再帰的に取得する関数
const fetchAllFiles = async (path = '', allFiles: any[] = []) => {
  const { data, error } = await supabase.storage.from('Parrots').list(path);

  if (error) {
    console.error('Supabase API Error:', error);
    return allFiles;
  }

  for (const item of data) {
    const fullPath = path ? `${path}/${item.name}` : item.name;

    if (item.id) {
      // ファイルならリストに追加
      allFiles.push(fullPath);
    } else {
      // フォルダなら再帰的に取得
      await fetchAllFiles(fullPath, allFiles);
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
          <img src={url} alt={`Parrot ${i + 1}`} />
        </div>
      ))}
    </div>
  );
};
