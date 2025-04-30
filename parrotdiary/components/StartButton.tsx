'use client';

//#region インポート
import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import React, { ReactNode } from 'react';
import AuthModal from './AuthModal';
import styles from '../styles/Home.module.css';
//#endregion

//#region 型定義
/**
 * タップエリア拡大用コンポーネントのプロパティ
 */
interface EnhanceTapAreaProps {
  /** 子要素 */
  children: ReactNode;
  /** パディングサイズ（デフォルト: 8px） */
  padding?: string;
}
//#endregion

/**
 * アプリケーション開始ボタンコンポーネント
 * 
 * ユーザー認証の入り口となるボタンを提供します。
 * クリックすると認証モーダルを表示し、ユーザーのログインまたは新規登録を促します。
 * 
 * @returns React コンポーネント
 */
export default function StartButton() {
  //#region 状態管理
  // モーダルの表示状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  // ローディング状態
  const [isLoading, setIsLoading] = useState(true);
  // Supabaseクライアント
  const supabase = createClientComponentClient();
  //#endregion

  //#region コンポーネント内部ヘルパーコンポーネント
  /**
   * タップエリアを拡大する高階コンポーネント
   * モバイルデバイスでのユーザビリティを向上させるため、
   * ボタンの実際のタップ可能領域を拡大します。
   * 
   * @param {EnhanceTapAreaProps} props - コンポーネントのプロパティ
   * @returns {JSX.Element} - 拡大されたタップエリアを持つコンポーネント
   */
  const EnhanceTapArea: React.FC<EnhanceTapAreaProps> = ({ 
    children, 
    padding = '8px' 
  }) => {
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
  //#endregion

  //#region イベントハンドラ
  /**
   * モーダルを閉じるハンドラー
   */
  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  /**
   * ボタンクリック時のハンドラー
   * セッションをクリアし、認証モーダルを表示します
   */
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
  //#endregion

  //#region 副作用
  /**
   * コンポーネントマウント時に認証状態をチェック
   */
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        // ユーザーセッションを取得するロジックがあれば追加
        setIsLoading(false);
      } catch (error) {
        console.error('認証状態確認エラー:', error);
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [supabase.auth]);

  /**
   * ローディング状態に応じてbodyのクラスを操作
   */
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
  //#endregion

  //#region レンダリング
  return (
    <>
      <EnhanceTapArea>
        <button 
          className={styles.button}
          onClick={handleButtonClick}
          disabled={isLoading}
          aria-label="アプリケーションを開始"
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
        <div 
          className={styles.globalOverlay}
          role="alert"
          aria-busy="true"
          aria-label="読み込み中"
        >
          {/* オーバーレイの内容はローディング中のみシンプルに保つ */}
        </div>
      )}
    </>
  );
  //#endregion
}