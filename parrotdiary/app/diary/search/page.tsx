"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DiarySearch from '@/components/diary/DiarySearch';
import { useAuth } from '@/lib/AuthContext';
import styles from './styles.module.css';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function DiarySearchPage() {
  // 認証情報
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // 状態
  const [loading, setLoading] = useState(true);
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const [dataLoaded, setDataLoaded] = useState(false);
  const diarySearchRef = useRef<any>(null);

  // 初期化処理
  useEffect(() => {
    // パターンをコレクションページと完全に合わせる
    const initializeData = async () => {
      try {
        setLoading(true);
        console.log('認証状態確認開始');
        
        // AuthContextのユーザー情報を優先して使用
        if (!authLoading && user) {
          console.log('AuthContextからユーザー情報取得:', user.id);
          setEffectiveUserId(user.id);
          return;
        }
        
        // AuthContextでユーザーが取得できない場合は、遅延を入れる
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Supabaseから直接確認
        console.log('Supabaseから直接セッション確認');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          // すでにログイン済みの場合
          console.log('Supabaseセッションからユーザー情報取得:', session.user.id);
          setEffectiveUserId(session.user.id);
          return;
        }
        
        console.log('認証情報なし - リダイレクト必要');
        // ここでリダイレクト処理を行わない（下記の専用useEffectで行う）
        
      } catch (error) {
        console.error('初期化エラー:', error);
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
    
    // 認証状態変更リスナー - コレクションページと同じパターン
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態変更イベント:', event, session?.user?.id || 'なし');
      
      if (event === 'SIGNED_IN') {
        if (session?.user) {
          console.log('ログイン検出:', session.user.id);
          setEffectiveUserId(session.user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('ログアウト検出');
        setEffectiveUserId(null);
        router.push('/');
      }
    });
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [user, authLoading, router, supabase.auth]);
  
  // リダイレクト処理用のuseEffect（ロード完了後かつユーザーIDがない場合）
  useEffect(() => {
    if (!loading && !effectiveUserId) {
      const timer = setTimeout(() => {
        console.log('未認証状態確認 - リダイレクト実行');
        router.push('/');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, effectiveUserId, router]);
  
  // データの読み込み完了通知を受け取るハンドラ
  const handleDataLoaded = () => {
    setDataLoaded(true);
  };

  // ローディング中の表示
  if (loading || !effectiveUserId || !dataLoaded) {
    return (
      <div style={{ position: 'relative', minHeight: '100vh' }}>
        <div className={styles.loadingContainer}>
          <div className={styles.loadingSpinnerWrapper}>
            <div className={styles.loadingSpinner}></div>
            <div className={styles.loadingIconContainer}>
              <Image
                src="/gif/parrots/60fpsparrot.gif"
                alt="Parrot Icon"
                width={64}
                height={64}
                className={styles.loadingIcon}
              />
            </div>
          </div>
          <p className={styles.loadingText}>日記データを読み込み中...</p>
          <p className={styles.loadingSubtext}>お気に入りの日記がもうすぐ表示されます</p>
        </div>
        
        {/* 不可視のDiarySearchコンポーネントを背後でレンダリングしてデータを先読み */}
        {effectiveUserId && (
          <div style={{ visibility: 'hidden', position: 'absolute', left: '-9999px', height: '0px', overflow: 'hidden' }}>
            <DiarySearch 
              initialUserId={effectiveUserId} 
              ref={diarySearchRef}
              onDataLoaded={() => {
                console.log('DiarySearch: データロード完了通知を受信');
                setDataLoaded(true);
              }} 
              preloadData={true}
            />
          </div>
        )}
      </div>
    );
  }
  
  // ユーザーIDがある場合のみ日記検索コンポーネントを表示
  if (effectiveUserId) {
    // diarySearchRefから取得したデータを新しいコンポーネントインスタンスに渡す
    return (
      <DiarySearch 
        initialUserId={effectiveUserId} 
        preloadData={false}
        // 重要: 既に読み込んだデータを初期データとして渡す
        initialEntries={diarySearchRef.current?.getEntries() || []}
        initialTags={diarySearchRef.current?.getTags() || []}
      />
    );
  }

  // 未認証の場合（リダイレクト中）
  return <div className={styles.loadingContainer}>リダイレクト中...</div>;
}