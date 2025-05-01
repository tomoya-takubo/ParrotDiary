"use client"

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import DiarySearch from '@/components/diary/DiarySearch';
import { useAuth } from '@/lib/AuthContext';
import styles from './styles.module.css';
import Image from 'next/image';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { ExtendedDiaryEntry, TagWithCount } from '@/services/diaryService';

// #region 型定義
/**
 * DiarySearchコンポーネントへの参照用インターフェース
 */
interface DiarySearchRef {
  isDataLoaded: () => boolean;
  getEntries: () => ExtendedDiaryEntry[];
  getTags: () => TagWithCount[];
}
// #endregion

/**
 * 日記検索ページのメインコンポーネント
 * ユーザー認証とデータ読み込みの管理、および
 * DiarySearchコンポーネントの表示を制御します
 */
export default function DiarySearchPage() {
  // #region 状態管理
  // 認証関連
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const supabase = createClientComponentClient();
  
  // ユーザー情報と読み込み状態
  const [loading, setLoading] = useState(true);                // 認証処理の読み込み状態
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null); // 有効なユーザーID
  const [dataLoaded, setDataLoaded] = useState(false);         // データ読み込み完了フラグ
  const [minLoadingTimeElapsed, setMinLoadingTimeElapsed] = useState(false); // 最低表示時間経過フラグ
  
  // DiarySearchコンポーネントへの参照
  const diarySearchRef = useRef<DiarySearchRef | null>(null);
  
  // 両方の条件（データロード完了 AND 最低表示時間経過）が満たされるまでローディング画面を表示
  const shouldShowLoading = loading || !effectiveUserId || !dataLoaded || !minLoadingTimeElapsed;
  // #endregion

  // #region 初期化処理
  /**
   * ユーザー認証とセッション状態の初期化
   */
  useEffect(() => {
    const initializeAuth = async () => {
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
        // リダイレクト処理は別のuseEffectで行う
      } catch (error) {
        console.error('初期化エラー:', error);
      } finally {
        setLoading(false);
      }
    };
    
    // 初期化処理の実行
    initializeAuth();
    
    // 認証状態変更リスナーの設定
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
    
    // クリーンアップ関数
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [user, authLoading, router, supabase.auth]);
  
  /**
   * 最低表示時間のタイマー設定
   * ユーザー体験のためにローディング画面を少なくとも3秒間表示する
   */
  useEffect(() => {
    // ページロード時に最低表示時間のタイマーを開始
    const timer = setTimeout(() => {
      setMinLoadingTimeElapsed(true);
      console.log('最低表示時間（3秒）経過');
    }, 3000); // 3秒間のタイマー

    return () => clearTimeout(timer);
  }, []);
  
  /**
   * リダイレクト処理
   * ログインしていない場合はホームページにリダイレクト
   */
  useEffect(() => {
    if (!loading && !effectiveUserId) {
      const timer = setTimeout(() => {
        console.log('未認証状態確認 - リダイレクト実行');
        router.push('/');
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [loading, effectiveUserId, router]);
  // #endregion

  // #region イベントハンドラ
  /**
   * DiarySearchコンポーネントからのデータ読み込み完了通知を受け取るハンドラ
   */
  const handleDataLoaded = () => {
    console.log('DiarySearch: データロード完了通知を受信');
    setDataLoaded(true);
  };
  // #endregion

  // #region レンダリング
  /**
   * ローディング画面のレンダリング
   */
  if (shouldShowLoading) {
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
  
  /**
   * メインコンテンツのレンダリング
   * ユーザーIDがある場合のみ日記検索コンポーネントを表示
   */
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

  /**
   * 未認証時のフォールバック表示
   */
  return <div className={styles.loadingContainer}>リダイレクト中...</div>;
  // #endregion
}