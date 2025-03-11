"use client"

import React, { createContext, useState, useEffect, useContext } from 'react';
import { supabase } from '@/lib/supabase';
import { Session, User, AuthResponse } from '@supabase/supabase-js';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  // 戻り値の型を Supabase の AuthResponse に合わせる
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // 初期セッションの取得
    const getInitialSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        setSession(data.session);
        setUser(data.session?.user || null);
      } catch (error) {
        console.error('セッション取得エラー:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getInitialSession();

    // 認証状態の変更を監視
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log('Auth state changed:', event);
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setIsLoading(false);
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // ログイン関数 - 戻り値の型を修正
  const signIn = async (email: string, password: string) => {
    setIsLoading(true);
    const response = await supabase.auth.signInWithPassword({ email, password });
    setIsLoading(false);
    return response;
  };

  // ログアウト関数
  const signOut = async () => {
    setIsLoading(true);
    await supabase.auth.signOut();
    setIsLoading(false);
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