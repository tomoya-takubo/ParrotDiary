// components/ParrotCollection/index.tsx
'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import styles from './styles.module.css';

type DebugInfo = {
  env?: {
    hasUrl: boolean;
    hasKey: boolean;
    urlPrefix: string;
  };
  tableCheck?: {
    success: boolean;
    error?: string;
    count?: number;
  };
  schema?: {
    success: boolean;
    error?: string;
    columnNames: string[];
  };
  query?: {
    success: boolean;
    error?: string;
    dataLength?: number;
    firstRow?: any;
  };
};

type Parrot = {
  id: number;
  name: string;
  category_id: string;
  rarity_id: string;
  description: string;
  image_url: string;
};

export default function ParrotCollection() {
  const [status, setStatus] = useState('初期状態');
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({});
  const [parrots, setParrots] = useState<Parrot[]>([]);

  useEffect(() => {
    const initializeSupabase = async () => {
      try {
        // 初期化状態をクリア
        setDebugInfo({});

        // 環境変数の確認
        setStatus('環境変数チェック中...');
        const envInfo = {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
          urlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 10) + '...',
        };
        setDebugInfo(prev => ({ ...prev, env: envInfo }));

        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
          throw new Error('環境変数が設定されていません');
        }

        // Supabaseクライアントの初期化
        setStatus('Supabaseクライアント初期化中...');
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        // テーブル構造の確認
        setStatus('テーブル構造確認中...');
        const { data: schemaData, error: schemaError } = await supabase
          .from('parrots')
          .select('*')
          .limit(1);

        setDebugInfo(prev => ({
          ...prev,
          schema: {
            success: !schemaError,
            error: schemaError?.message,
            columnNames: schemaData ? Object.keys(schemaData[0] || {}) : [],
          }
        }));

        // データ取得
        setStatus('データ取得中...');
        const { data, error } = await supabase
          .from('parrots')
          .select(`
            id,
            name,
            category_id,
            rarity_id,
            description,
            image_url
          `);

        console.log('取得したデータ:', data); // デバッグ用

        setDebugInfo(prev => ({
          ...prev,
          query: {
            success: !error,
            error: error?.message,
            dataLength: data?.length,
            firstRow: data?.[0]
          }
        }));

        if (error) throw error;

        setParrots(data || []);
        setStatus('完了');

      } catch (error) {
        console.error('エラー詳細:', error);
        setStatus(`エラー: ${error instanceof Error ? error.message : '不明なエラー'}`);
      }
    };

    initializeSupabase();
  }, []);

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>パロットコレクション</h1>
      
      <div className={styles.status}>
        <h2>現在の状態: {status}</h2>
        <p>取得データ数: {parrots.length}</p>
      </div>

      <div className={styles.debug}>
        <h2>デバッグ情報:</h2>
        <h3>環境変数:</h3>
        <pre>{JSON.stringify(debugInfo.env, null, 2)}</pre>
        
        <h3>テーブル確認:</h3>
        <pre>{JSON.stringify(debugInfo.tableCheck, null, 2)}</pre>

        <h3>テーブル構造:</h3>
        <pre>{JSON.stringify(debugInfo.schema, null, 2)}</pre>
        
        <h3>クエリ結果:</h3>
        <pre>{JSON.stringify(debugInfo.query, null, 2)}</pre>
      </div>
    </div>
  );

}