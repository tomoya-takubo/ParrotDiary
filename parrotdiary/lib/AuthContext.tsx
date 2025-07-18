"use client"

import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User, AuthResponse } from '@supabase/supabase-js';

/**
 * 認証コンテキストの型定義
 */
type AuthContextType = {
  /** 現在のセッション */
  session: Session | null;
  /** 現在のユーザー */
  user: User | null;
  /** ローディング状態 */
  isLoading: boolean;
  /** ログイン関数 */
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  /** ログアウト関数 */
  signOut: () => Promise<void>;
};

/**
 * 認証コンテキスト
 */
const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * 認証プロバイダーコンポーネント
 * @param props プロパティ
 * @param props.children 子コンポーネント
 * @returns 認証プロバイダー
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期セッションの取得とリスナー設定を分離せず、一度に行う
    const setupAuth = async () => {
      try {
        setIsLoading(true);
        
        // 既存のセッションを取得
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: セッション取得エラー:', error);
        } else {
          
          // 既存のセッションがあれば状態を更新
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
          }
        }
      } catch (error: unknown) {
        console.error('AuthContext: 初期セッション取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // 認証設定を実行
    setupAuth();

    // 認証状態変更の監視
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        
        // イベントに応じて状態を更新
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setSession(currentSession);
          setUser(currentSession?.user || null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
      }
    );

    // クリーンアップ
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  /**
   * ログイン関数
   * @param email メールアドレス
   * @param password パスワード
   * @returns 認証レスポンス
   */
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const response = await supabase.auth.signInWithPassword({ email, password });
      
      if (response.error) {
        console.error('AuthContext: ログインエラー:', response.error);
      } else {
      }
      
      return response;
    } catch (error: unknown) {
      console.error('AuthContext: ログイン例外:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * ログアウト関数
   * @returns void
   */
  const signOut = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: ログアウトエラー:', error);
      } else {
      }
    } catch (error: unknown) {
      console.error('AuthContext: ログアウト例外:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    session,
    user,
    isLoading,
    signIn,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

/**
 * 認証コンテキストを使用するためのフック
 * @returns AuthContextType
 */
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};