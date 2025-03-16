import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './Diary.module.css';

// パロットの型定義
type ParrotType = {
  parrot_id: string;
  name?: string;
  path: string;
};

interface ParrotSelectorProps {
  userId: string;
  selectedParrots: string[];
  onParrotsChange: (parrots: string[]) => void;
  maxParrots?: number;
}

export const ParrotSelector: React.FC<ParrotSelectorProps> = ({
  userId,
  selectedParrots,
  onParrotsChange,
  maxParrots = 5
}) => {
  const [availableParrots, setAvailableParrots] = useState<ParrotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ユーザーが獲得済みのパロットを取得
  useEffect(() => {
    const fetchUserParrots = async () => {
      if (!userId) return;
      
      setIsLoading(true);
      try {
        // ユーザーが獲得済みのパロットを取得
        const { data: userParrotData, error: userParrotError } = await supabase
          .from('user_parrots')
          .select('parrot_id, obtained_at')
          .eq('user_id', userId);

        if (userParrotError) throw userParrotError;

        if (userParrotData && userParrotData.length > 0) {
          // パロットIDの配列を作成 - 型安全のために明示的にstring型に変換
          const parrotIds = userParrotData.map(record => String(record.parrot_id));
          
          // パロット情報を取得
          const { data: parrotData, error: parrotError } = await supabase
            .from('parrots')
            .select('parrot_id, name, path')
            .in('parrot_id', parrotIds);

          if (parrotError) throw parrotError;
          
          if (parrotData) {
            // 型安全のために明示的にParrotType型に変換
            const typedParrotData: ParrotType[] = parrotData.map(parrot => ({
              parrot_id: String(parrot.parrot_id),
              name: parrot.name ? String(parrot.name) : undefined,
              path: String(parrot.path)
            }));
            
            setAvailableParrots(typedParrotData);
          }
        } else {
          // ユーザーがまだパロットを持っていない場合はデフォルトパロットを設定
          setAvailableParrots([
            { 
              parrot_id: 'default',
              name: 'デフォルトパロット',
              path: '/gif/parrots/60fpsparrot.gif'
            }
          ]);
        }
      } catch (error) {
        console.error('パロットデータの取得エラー:', error);
        // エラー時もデフォルトパロットを表示
        setAvailableParrots([
          { 
            parrot_id: 'default',
            name: 'デフォルトパロット',
            path: '/gif/parrots/60fpsparrot.gif'
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserParrots();
  }, [userId]);

  // パロットの選択/解除
  const toggleParrot = (parrot: ParrotType) => {
    const parrotPath = parrot.path;
    
    if (selectedParrots.includes(parrotPath)) {
      // 選択済みなら解除
      onParrotsChange(selectedParrots.filter(p => p !== parrotPath));
    } else {
      // 未選択なら追加（最大数を超えない場合）
      if (selectedParrots.length < maxParrots) {
        onParrotsChange([...selectedParrots, parrotPath]);
      }
    }
  };

  if (isLoading) {
    return <div className={styles.parrotSelectorLoading}>Loading...</div>;
  }

  return (
    <div className={styles.parrotSelectorContainer}>
      <div className={styles.parrotSelectorTitle}>パロットを選択 ({selectedParrots.length}/{maxParrots})</div>
      
      <div className={styles.parrotGrid}>
        {availableParrots.map((parrot) => (
          <div
            key={parrot.parrot_id}
            className={`${styles.parrotGridItem} ${
              selectedParrots.includes(parrot.path) ? styles.selectedParrot : ''
            }`}
            onClick={() => toggleParrot(parrot)}
            title={parrot.name || 'Parrot'}
          >
            <div className={styles.parrotImageContainer}>
              <Image
                src={parrot.path}
                alt={parrot.name || 'Parrot'}
                width={40}
                height={40}
                className={styles.parrotGridImage}
              />
              {selectedParrots.includes(parrot.path) && (
                <div className={styles.selectedParrotIndicator}>✓</div>
              )}
            </div>
            {parrot.name && <div className={styles.parrotName}>{parrot.name}</div>}
          </div>
        ))}
      </div>
    </div>
  );
};

// 日記エントリー保存時にパロット情報も保存する関数
export const saveEntryParrots = async (
  entryId: number,
  userId: string,
  parrotPaths: string[]
): Promise<boolean> => {
  if (!entryId || !userId || !parrotPaths.length) return false;

  try {
    // まず既存のパロット関連付けを削除
    const { error: deleteError } = await supabase
      .from('diary_parrot_icons')
      .delete()
      .eq('entry_id', entryId);
    
    if (deleteError) throw deleteError;

    // パロットパスからIDを取得
    const { data: parrotData, error: parrotError } = await supabase
      .from('parrots')
      .select('parrot_id, path')
      .in('path', parrotPaths);
    
    if (parrotError) throw parrotError;
    
    if (parrotData && parrotData.length > 0) {
      // パロットパスからIDへのマッピングを作成 - 型安全のために明示的に変換
      const pathToIdMap: Record<string, string> = {};
      parrotData.forEach(parrot => {
        if (parrot && parrot.path && parrot.parrot_id) {
          pathToIdMap[String(parrot.path)] = String(parrot.parrot_id);
        }
      });
      
      // 新しいパロット関連付けを追加
      const parrotInserts = parrotPaths
        .filter(path => pathToIdMap[path]) // 有効なパスのみフィルタリング
        .map((path, index) => ({
          entry_id: entryId,
          parrot_id: pathToIdMap[path],
          position: index
        }));
      
      if (parrotInserts.length > 0) {
        const { error: insertError } = await supabase
          .from('diary_parrot_icons')
          .insert(parrotInserts);
        
        if (insertError) throw insertError;
      }
    }
    
    return true;
  } catch (error) {
    console.error('日記パロット保存エラー:', error);
    return false;
  }
};

// 日記エントリー読み込み時にパロット情報も取得する関数
export const getEntryParrots = async (entryId: number): Promise<string[]> => {
  if (!entryId) return [];
  
  try {
    // エントリーに関連付けられたパロットIDを取得
    const { data: iconData, error: iconError } = await supabase
      .from('diary_parrot_icons')
      .select('parrot_id')
      .eq('entry_id', entryId)
      .order('position', { ascending: true });
    
    if (iconError) throw iconError;
    
    if (iconData && iconData.length > 0) {
      // パロットIDからパロット情報を取得 - 型安全のために明示的にstring型に変換
      const parrotIds = iconData.map(icon => String(icon.parrot_id));
      
      const { data: parrotData, error: parrotError } = await supabase
        .from('parrots')
        .select('path')
        .in('parrot_id', parrotIds);
      
      if (parrotError) throw parrotError;
      
      if (parrotData) {
        // 型安全のために明示的にstring型に変換
        return parrotData.map(parrot => String(parrot.path));
      }
    }
    
    return [];
  } catch (error) {
    console.error('日記パロット取得エラー:', error);
    return [];
  }
};