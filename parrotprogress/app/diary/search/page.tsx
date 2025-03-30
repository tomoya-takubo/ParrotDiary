"use client"

// src/app/diary/search/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DiarySearch from '@/components/diary/DiarySearch';
import { useAuth } from '@/lib/AuthContext';
import styles from './styles.module.css'; // スタイルをインポート
import Image from 'next/image';

/**
 * 日記検索ページ
 * 認証済みユーザーのみアクセス可能
 */
export default function DiarySearchPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  // 認証チェック
  useEffect(() => {
    // ロード中はチェックしない
    if (isLoading) return;

    // 未認証の場合はログインページへリダイレクト
    if (!user) {
      console.log('日記検索ページ: 未認証ユーザーをリダイレクト');
      router.push('/auth/login');
    }
  }, [user, isLoading, router]);

  // ロード中または未認証の場合はローディング表示
  if (isLoading || !user) {
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

  // 認証済みの場合は日記検索コンポーネントを表示
  return <DiarySearch />;
}