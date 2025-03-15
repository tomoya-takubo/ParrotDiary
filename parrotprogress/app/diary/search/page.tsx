"use client"

// src/app/diary/search/page.tsx
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DiarySearch from '@/components/diary/DiarySearch';
import { useAuth } from '@/lib/AuthContext';

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
      <div className="flex justify-center items-center h-screen">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  // 認証済みの場合は日記検索コンポーネントを表示
  return <DiarySearch />;
}