"use client"

import React, { useEffect, useState } from 'react';
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
          setLoading(false);
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
          setLoading(false);
          return;
        }
        
        console.log('認証情報なし - リダイレクト必要');
        // ここでリダイレクト処理を行わない（下記の専用useEffectで行う）
        setLoading(false);
        
      } catch (error) {
        console.error('初期化エラー:', error);
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
          setLoading(false);
        }
      } else if (event === 'SIGNED_OUT') {
        console.log('ログアウト検出');
        setEffectiveUserId(null);
        setLoading(false);
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

  // ローディング中の表示
  if (loading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinnerWrapper}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loadingIconContainer}>
            <Image
              src="/parrot-icon.png"
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
    );
  }

  // ユーザーIDがある場合のみ日記検索コンポーネントを表示
  if (effectiveUserId) {
    return <DiarySearch initialUserId={effectiveUserId} />;
  }

  // 未認証の場合（リダイレクト中）
  return <div className={styles.loadingContainer}>リダイレクト中...</div>;
}