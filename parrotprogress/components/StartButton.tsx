'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
import styles from '../styles/Home.module.css';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

export default function StartButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const supabase = createClientComponentClient();

  // コンポーネントマウント時に認証状態をチェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        // ユーザーセッションを取得
        setIsLoading(false);
      } catch (error) {
        console.error('認証状態確認エラー:', error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [supabase.auth]);

  const handleButtonClick = async () => {
    try {
      // ボタンクリック時に改めて認証状態を確認
      const { data } = await supabase.auth.getSession();
      
      if (data.session) {
        // 認証済みの場合はダッシュボードへリダイレクト
        router.push('/dashboard');
      } else {
        // 未認証の場合はログインモーダルを表示
        setIsModalOpen(true);
      }
    } catch (error) {
      console.error('認証確認エラー:', error);
      // エラーが発生した場合は安全のためモーダルを表示
      setIsModalOpen(true);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button 
        className={styles.button}
        onClick={handleButtonClick}
        disabled={isLoading}
      >
        {isLoading ? 'ロード中...' : 'はじめる'}
      </button>
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        key={isModalOpen ? 'open' : 'closed'}
      />
    </>
  );
}