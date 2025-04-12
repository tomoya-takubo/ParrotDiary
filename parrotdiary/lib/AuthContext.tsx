"use client"

import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User, AuthResponse } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期セッションの取得とリスナー設定を分離せず、一度に行う
    const setupAuth = async () => {
      try {
        console.log('AuthContext: 認証設定開始');
        setIsLoading(true);
        
        // 既存のセッションを取得
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthContext: セッション取得エラー:', error);
        } else {
          console.log('AuthContext: セッション取得結果:', {
            hasSession: !!data.session,
            userId: data.session?.user?.id || 'なし'
          });
          
          // 既存のセッションがあれば状態を更新
          if (data.session) {
            setSession(data.session);
            setUser(data.session.user);
            console.log('AuthContext: ユーザー情報設定', data.session.user.id);
          }
        }
      } catch (error) {
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
        console.log('AuthContext: 認証状態変更イベント:', event, {
          hasSession: !!currentSession,
          userId: currentSession?.user?.id || 'なし'
        });
        
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

  // ログイン関数
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      console.log('AuthContext: ログイン試行', email);
      const response = await supabase.auth.signInWithPassword({ email, password });
      
      if (response.error) {
        console.error('AuthContext: ログインエラー:', response.error);
      } else {
        console.log('AuthContext: ログイン成功:', response.data.user?.id);
      }
      
      return response;
    } catch (error) {
      console.error('AuthContext: ログイン例外:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ログアウト関数
  const signOut = async () => {
    setIsLoading(true);
    try {
      console.log('AuthContext: ログアウト試行');
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error('AuthContext: ログアウトエラー:', error);
      } else {
        console.log('AuthContext: ログアウト成功');
      }
    } catch (error) {
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

// 認証コンテキストを使用するためのフック
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};