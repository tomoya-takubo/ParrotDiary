import React, { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { X, Search, Plus, ChevronDown, ChevronUp } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ParrotSelector.module.css';

// パロットの型定義
type ParrotType = {
  parrot_id: string;
  name?: string;
  image_url?: string;
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
  compact?: boolean; // コンパクト表示モード
}

export const ParrotSelector: React.FC<ParrotSelectorProps> = ({
  userId,
  selectedParrots,
  onParrotsChange,
  maxParrots = 5,
  compact = false
}) => {
  const [availableParrots, setAvailableParrots] = useState<ParrotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showParrotDropdown, setShowParrotDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // カテゴリーリスト（例）
  const categories = [
    { id: 'all', name: 'すべて' },
    { id: 'common', name: '一般' },
    { id: 'rare', name: 'レア' },
    { id: 'epic', name: 'エピック' },
    { id: 'legendary', name: '伝説' }
  ];

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
              category_id: 'common',
              rarity_id: 'common',
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
            category_id: 'common',
            rarity_id: 'common',
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

  // パロットをフィルタリングする関数
  const filteredParrots = availableParrots.filter(parrot => {
    // 検索条件とカテゴリーでフィルタリング
    const matchesSearch = !searchTerm || 
      (parrot.name && parrot.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (parrot.description && parrot.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
    const matchesCategory = !selectedCategory || 
      selectedCategory === 'all' || 
      parrot.category_id === selectedCategory;
      
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return <div className={styles.parrotSelectorLoading}>Loading...</div>;
  }

  // コンパクトモード用のCSSクラス
  const containerClass = compact 
    ? `${styles.parrotSelectorContainer} ${styles.compactSelector}` 
    : styles.parrotSelectorContainer;

  return (
    <div className={containerClass}>
      <div className={styles.selectedParrotsPreview}>
        {/* 選択中のパロットを表示 */}
        {selectedParrots.map((parrotImageUrl, index) => (
          <div key={index} className={styles.selectedParrotItem}>
            <Image
              src={parrotImageUrl}
              alt={`Selected Parrot ${index + 1}`}
              width={compact ? 20 : 24}
              height={compact ? 20 : 24}
              className={styles.parrotGif}
            />
            <button
              onClick={() => removeParrot(parrotImageUrl)}
              className={styles.removeParrotButton}
              aria-label="Remove parrot"
            >
              <X size={compact ? 8 : 10} />
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
            <Plus size={compact ? 12 : 14} />
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
          
            {/* 検索フィールド */}
            <div className={styles.searchContainer}>
              <Search size={14} className={styles.searchIcon} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="パロットを検索..."
                className={styles.searchInput}
              />
            </div>

            {/* カテゴリー選択 */}
            <div className={styles.parrotTypeSelector}>
              {categories.map(category => (
                <button
                  key={category.id}
                  className={`${styles.parrotTypeButton} ${
                    selectedCategory === category.id ? styles.parrotTypeButtonActive : ''
                  }`}
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.id ? null : category.id
                  )}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* パロットグリッド */}
          <div className={styles.parrotGrid}>
            {filteredParrots.length > 0 ? (
              filteredParrots.map((parrot) => (
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
                {searchTerm ? 
                  '検索条件に一致するパロットがありません' : 
                  'パロットがありません'
                }
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 日記エントリー保存時にパロット情報を保存する関数（修正版）
export const saveEntryParrots = async (
  entryId: string | number, // 文字列も受け入れるように変更
  userId: string,
  parrotImageUrls: string[]
): Promise<boolean> => {
  console.log("saveEntryParrots関数開始:", { entryId, userId, parrotImageUrls });
  if (!entryId || !userId || !parrotImageUrls.length) {
    console.log("早期リターン条件:", { 
      validEntryId: !!entryId, 
      validUserId: !!userId, 
      hasParrots: parrotImageUrls.length > 0 
    });
    return false;
  }

  try {
    console.log(`パロット保存開始: entryId=${entryId}, parrots=${parrotImageUrls.length}件`);
    
    // まず既存のパロット関連付けを削除
    const { error: deleteError } = await supabase
      .from('diary_parrot_icons')
      .delete()
      .eq('entry_id', entryId);
    
    if (deleteError) {
      console.error('既存パロット削除エラー:', deleteError);
      throw deleteError;
    }
    
    console.log('既存パロット削除成功');

    // パロットURLからIDを取得 - 正規化したURLで照合
    const normalizedUrls = parrotImageUrls.map(url => {
      // URL正規化 - 先頭の/を確実に付ける
      return url.startsWith('/') ? url : `/${url}`;
    });
    
    console.log('正規化後のURL:', normalizedUrls);

    // データベースから全パロットを取得（より確実に一致させるため）
    const { data: allParrots, error: parrotError } = await supabase
      .from('parrots')
      .select('parrot_id, image_url');
    
    if (parrotError) {
      console.error('パロットデータ取得エラー:', parrotError);
      throw parrotError;
    }

    console.log(`パロットデータ取得成功: ${allParrots?.length || 0}件`);
    
    // パロットが見つからない場合のデフォルト値
    if (!allParrots || allParrots.length === 0) {
      console.warn('パロットデータが見つかりませんでした');
      return false;
    }
    
    // URLからIDへのマッピングを作成（部分一致もサポート）
    const urlToIdMap: Record<string, string> = {};
    
    for (const url of normalizedUrls) {
      // 完全一致を試みる
      const exactMatch = allParrots.find(p => p.image_url === url);
      if (exactMatch && exactMatch.parrot_id) {
        urlToIdMap[url] = String(exactMatch.parrot_id);
        continue;
      }
      
      // パスの最後の部分での一致を試みる（ファイル名のみ）
      const urlParts = url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      
      const partialMatch = allParrots.find(p => {
        if (!p.image_url || typeof p.image_url !== 'string') return false;
        const dbParts = p.image_url.split('/');
        return dbParts[dbParts.length - 1] === fileName;
      });
            
      if (partialMatch && partialMatch.parrot_id) {
        urlToIdMap[url] = String(partialMatch.parrot_id);
      } else {
        console.warn(`パロットID未検出: URL=${url}`);
      }
    }
    
    console.log('URLからIDへのマッピング:', urlToIdMap);
    
    // 新しいパロット関連付けを追加
    const parrotInserts = normalizedUrls
      .filter(url => urlToIdMap[url]) // 有効なURLのみフィルタリング
      .map((url, index) => ({
        entry_id: entryId,
        parrot_id: urlToIdMap[url],
        position: index,
        // 必要に応じて追加フィールド
        user_id: userId,
        created_at: new Date().toISOString()
      }));
    
    console.log(`挿入するパロットデータ: ${parrotInserts.length}件`, parrotInserts);
    
    if (parrotInserts.length > 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('diary_parrot_icons')
        .insert(parrotInserts)
        .select(); // 結果を返すことで挿入の成功を確認
      
      if (insertError) {
        console.error('パロット挿入エラー:', insertError);
        throw insertError;
      }
      
      console.log(`パロット挿入成功: ${insertData?.length || 0}件`);
    } else {
      console.warn('挿入するパロットデータがありません');
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