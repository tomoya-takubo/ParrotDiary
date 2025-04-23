'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthModal from './AuthModal';
import styles from '../styles/Home.module.css';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import React, { ReactNode } from 'react';

interface EnhanceTapAreaProps {
  children: ReactNode;
  padding?: string;
}

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

  // ローディング状態が変わったときにbodyのクラスを操作
  useEffect(() => {
    if (isLoading) {
      document.body.classList.add('overlay-active');
    } else {
      document.body.classList.remove('overlay-active');
    }

    // クリーンアップ関数
    return () => {
      document.body.classList.remove('overlay-active');
    };
  }, [isLoading]);

  // ボタンクリック時のハンドラー修正
  const handleButtonClick = async () => {
    try {
      // すでにローディング中なら何もしない
      if (isLoading) return;
      
      // ボタンクリック時にローディング状態を設定
      setIsLoading(true);
      
      // セッションをチェックする前に強制的にセッションをクリア
      await supabase.auth.signOut();
      
      // モーダルを表示
      setIsModalOpen(true);
      // ローディング状態を解除
      setIsLoading(false);
      
    } catch (error) {
      console.error('認証確認エラー:', error);
      // エラーが発生した場合は安全のためモーダルを表示
      setIsModalOpen(true);
      setIsLoading(false);
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  // タップエリアを拡大する高階コンポーネント
  const EnhanceTapArea: React.FC<EnhanceTapAreaProps> = ({ children, padding = '8px' }) => {
    return (
      <div style={{ 
        padding, 
        margin: `-${padding}`,
        display: 'inline-block'
      }}>
        {children}
      </div>
    );
  };

  return (
    <>
      <EnhanceTapArea>
        <button 
          className={styles.button}
          onClick={handleButtonClick}
          disabled={isLoading}
        >
          {isLoading ? 'ロード中...' : 'はじめる'}
        </button>
      </EnhanceTapArea>
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose}
        key={isModalOpen ? 'open' : 'closed'}
      />
      
      {/* グローバルローディングオーバーレイ - 認証確認中またはボタンが無効化されている時に表示 */}
      {isLoading && (
        <div className={styles.globalOverlay}>
          {/* オーバーレイの内容はローディング中のみシンプルに保つ */}
        </div>
      )}
    </>
  );
}