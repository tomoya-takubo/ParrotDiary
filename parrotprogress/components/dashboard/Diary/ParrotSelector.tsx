import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Search, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ParrotSelector.module.css';

// パロットの型定義
type ParrotType = {
  parrot_id: string;
  name?: string;
  image_url?: string;  // テーブルに合わせて image_url を使用
  description?: string;
  category_id?: string;
  rarity_id?: string;
  display_order?: number;
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
  const [showParrotDropdown, setShowParrotDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          // パロットIDの配列を作成
          const parrotIds = userParrotData.map(record => String(record.parrot_id));
          
          // パロット情報を取得
          // テーブル構造に合わせてカラム名を修正
          const { data: parrotData, error: parrotError } = await supabase
            .from('parrots')
            .select('parrot_id, name, image_url, description, category_id, rarity_id, display_order')
            .in('parrot_id', parrotIds)
            .order('display_order', { ascending: true });

          if (parrotError) throw parrotError;
          
          if (parrotData) {
            setAvailableParrots(parrotData.map(parrot => ({
              parrot_id: String(parrot.parrot_id),
              name: parrot.name ? String(parrot.name) : undefined,
              image_url: parrot.image_url ? String(parrot.image_url) : undefined,
              description: parrot.description ? String(parrot.description) : undefined,
              category_id: parrot.category_id ? String(parrot.category_id) : undefined,
              rarity_id: parrot.rarity_id ? String(parrot.rarity_id) : undefined,
              display_order: typeof parrot.display_order === 'number' ? parrot.display_order : undefined
            })));
          }
        } else {
          // ユーザーがまだパロットを持っていない場合はデフォルトパロットを設定
          setAvailableParrots([
            { 
              parrot_id: 'default',
              name: 'デフォルトパロット',
              image_url: '/gif/parrots/60fpsparrot.gif',
              description: 'デフォルトパロット',
              category_id: 'default',
              rarity_id: 'default',
              display_order: 1
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
            image_url: '/gif/parrots/60fpsparrot.gif',
            description: 'デフォルトパロット',
            category_id: 'default',
            rarity_id: 'default',
            display_order: 1
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserParrots();
  }, [userId]);

  // ドロップダウンの外側をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowParrotDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // パロットの選択/解除
  const toggleParrot = (parrot: ParrotType) => {
    if (!parrot.image_url) return; // image_url がない場合は処理しない
    
    const parrotImageUrl = parrot.image_url;
    
    if (selectedParrots.includes(parrotImageUrl)) {
      // 選択済みなら解除
      onParrotsChange(selectedParrots.filter(p => p !== parrotImageUrl));
    } else {
      // 未選択なら追加（最大数を超えない場合）
      if (selectedParrots.length < maxParrots) {
        onParrotsChange([...selectedParrots, parrotImageUrl]);
      }
    }
  };

  // +ボタンがクリックされたときに呼ばれる関数
  const handleAddButtonClick = () => {
    setShowParrotDropdown(!showParrotDropdown);
  };

  // 選択されたパロットを削除する関数
  const removeParrot = (parrotImageUrl: string) => {
    onParrotsChange(selectedParrots.filter(p => p !== parrotImageUrl));
  };

  if (isLoading) {
    return <div className={styles.parrotSelectorLoading}>Loading...</div>;
  }

  return (
    <div className={styles.parrotSelectorContainer}>
      <div className={styles.selectedParrotsPreview}>
        {/* 選択中のパロットを表示 */}
        {selectedParrots.map((parrotImageUrl, index) => (
          <div key={index} className={styles.selectedParrotItem}>
            <Image
              src={parrotImageUrl}
              alt={`Selected Parrot ${index + 1}`}
              width={24}
              height={24}
              className={styles.parrotGif}
            />
            <button
              onClick={() => removeParrot(parrotImageUrl)}
              className={styles.removeParrotButton}
              aria-label="Remove parrot"
            >
              <X size={10} />
            </button>
          </div>
        ))}

        {/* 追加ボタン - 5つ未満の場合のみ表示 */}
        {selectedParrots.length < maxParrots && (
          <div 
            className={styles.addParrotButton}
            onClick={handleAddButtonClick}
            title="パロットを追加"
          >
            <Plus size={14} />
          </div>
        )}
      </div>

      {/* パロット選択ドロップダウン - 追加ボタンをクリックすると表示/非表示が切り替わる */}
      {showParrotDropdown && (
        <div ref={dropdownRef} className={styles.parrotDropdown}>
          <div className={styles.dropdownHeader}>
            <div className={styles.dropdownTitle}>
              パロットを選択 ({selectedParrots.length}/{maxParrots})
              <button 
                className={styles.closeDropdownButton}
                onClick={() => setShowParrotDropdown(false)}
                aria-label="パロット選択を閉じる"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* パロットグリッド */}
          <div className={styles.parrotGrid}>
            {availableParrots.length > 0 ? (
              availableParrots.map((parrot) => (
                <div
                  key={parrot.parrot_id}
                  className={`${styles.parrotGridItem} ${
                    parrot.image_url && selectedParrots.includes(parrot.image_url) ? styles.selectedParrot : ''
                  }`}
                  onClick={() => toggleParrot(parrot)}
                  title={parrot.name || 'Parrot'}
                >
                  <div className={styles.parrotImageContainer}>
                    {parrot.image_url && (
                      <Image
                        src={parrot.image_url}
                        alt={parrot.name || 'Parrot'}
                        width={40}
                        height={40}
                        className={styles.parrotGridImage}
                      />
                    )}
                    {parrot.image_url && selectedParrots.includes(parrot.image_url) && (
                      <div className={styles.selectedParrotIndicator}>✓</div>
                    )}
                  </div>
                  {parrot.name && <div className={styles.parrotName}>{parrot.name}</div>}
                </div>
              ))
            ) : (
              <div className={styles.noParrotsMessage}>
                パロットがありません
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 日記エントリー保存時にパロット情報も保存する関数
export const saveEntryParrots = async (
  entryId: number,
  userId: string,
  parrotImageUrls: string[]
): Promise<boolean> => {
  if (!entryId || !userId || !parrotImageUrls.length) return false;

  try {
    // まず既存のパロット関連付けを削除
    const { error: deleteError } = await supabase
      .from('diary_parrot_icons')
      .delete()
      .eq('entry_id', entryId);
    
    if (deleteError) throw deleteError;

    // パロットURLからIDを取得 - image_url を使用
    const { data: parrotData, error: parrotError } = await supabase
      .from('parrots')
      .select('parrot_id, image_url')
      .in('image_url', parrotImageUrls);
    
    if (parrotError) throw parrotError;
    
    if (parrotData && parrotData.length > 0) {
      // パロットURLからIDへのマッピングを作成 - 型安全のために明示的に変換
      const urlToIdMap: Record<string, string> = {};
      parrotData.forEach(parrot => {
        if (parrot && parrot.image_url && parrot.parrot_id) {
          urlToIdMap[String(parrot.image_url)] = String(parrot.parrot_id);
        }
      });
      
      // 新しいパロット関連付けを追加
      const parrotInserts = parrotImageUrls
        .filter(url => urlToIdMap[url]) // 有効なURLのみフィルタリング
        .map((url, index) => ({
          entry_id: entryId,
          parrot_id: urlToIdMap[url],
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
        .select('image_url')  // テーブル構造に合わせて image_url を使用
        .in('parrot_id', parrotIds);
      
      if (parrotError) throw parrotError;
      
      if (parrotData) {
        // 型安全のために明示的にstring型に変換
        return parrotData
          .filter(parrot => parrot.image_url) // null/undefined をフィルタリング
          .map(parrot => String(parrot.image_url));
      }
    }
    
    return [];
  } catch (error) {
    console.error('日記パロット取得エラー:', error);
    return [];
  }
};