import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X, Search, Plus } from 'lucide-react';
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

type RawParrot = {
  parrot_id: string | number;
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
  forceOpen?: boolean; // ← 追加
}

// キャッシュするパロットデータの型
interface ParrotCache {
  [userId: string]: {
    timestamp: number;
    parrots: ParrotType[];
  }
}

// パロットデータをメモリにキャッシュ（セッション中のみ）
const parrotCache: ParrotCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュを保持

export const ParrotSelector: React.FC<ParrotSelectorProps> = ({
  userId,
  selectedParrots,
  onParrotsChange,
  maxParrots = 1,
  compact = false,
  forceOpen = false,
}) => {
  const [availableParrots, setAvailableParrots] = useState<ParrotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showParrotDropdown, setShowParrotDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pageSize] = useState(16); // 一度に表示するパロットの数
  const [currentPage, setCurrentPage] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // カテゴリーリスト（例）
  const categories = [
    { id: 'all', name: 'すべて' },
    { id: 'common', name: '一般' },
    { id: 'rare', name: 'レア' },
    { id: 'epic', name: 'エピック' },
    { id: 'legendary', name: '伝説' }
  ];

  // パロットデータをキャッシュするか確認する関数
  const getCachedParrots = (userId: string): ParrotType[] | null => {
    const cachedData = parrotCache[userId];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.parrots;
    }
    return null;
  };

  // ユーザーが獲得済みのパロットを取得（メモ化して再レンダリングを防止）
  const fetchUserParrots = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    setLoadError(null);
    
    try {
      // キャッシュからデータを取得
      const cachedParrots = getCachedParrots(userId);
      if (cachedParrots) {
        console.log('キャッシュからパロットデータを使用');
        setAvailableParrots(cachedParrots);
        setIsLoading(false);
        return;
      }

      // キャッシュがない場合はAPIから取得
      console.log('パロットデータをAPIから取得開始');
      
      // タイムアウト設定 (10秒)
      const timeout = setTimeout(() => {
        if (isLoading) {
          setLoadError('データ取得がタイムアウトしました。再読み込みしてください。');
          setIsLoading(false);
        }
      }, 10000);
      
      // ユーザーが獲得済みのパロットを取得
      const { data: userParrotData, error: userParrotError } = await supabase
        .from('user_parrots')
        .select('parrot_id, obtained_at')
        .eq('user_id', userId)
        .limit(1000); // 取得数に制限を設定

      clearTimeout(timeout);
      
      if (userParrotError) throw userParrotError;

      if (userParrotData && userParrotData.length > 0) {
        // パロットIDの配列を作成
        const parrotIds = userParrotData.map(record => String(record.parrot_id));
        
        console.log(`ユーザーのパロットID ${parrotIds.length}件を取得`);
        
        // パロット情報をバッチで取得 (100件ずつ)
        let allParrotData: RawParrot[] = [];
        
        // IDを100件ずつのバッチに分割
        for (let i = 0; i < parrotIds.length; i += 100) {
          const batchIds = parrotIds.slice(i, i + 100);
          
          const { data: parrotBatch, error: batchError } = await supabase
            .from('parrots')
            .select('parrot_id, name, image_url, description, category_id, rarity_id, display_order')
            .in('parrot_id', batchIds)
            .order('display_order', { ascending: true });
            
          if (batchError) throw batchError;
          
          if (parrotBatch) {
            allParrotData = [...allParrotData, ...(parrotBatch as unknown as RawParrot[])];
          }
          
          console.log(`バッチ ${i/100 + 1}: ${parrotBatch?.length || 0}件のパロットデータを取得`);
        }
        
        const formattedParrots = allParrotData.map(parrot => ({
          parrot_id: String(parrot.parrot_id),
          name: parrot.name ? String(parrot.name) : undefined,
          image_url: parrot.image_url ? String(parrot.image_url) : undefined,
          description: parrot.description ? String(parrot.description) : undefined,
          category_id: parrot.category_id ? String(parrot.category_id) : undefined,
          rarity_id: parrot.rarity_id ? String(parrot.rarity_id) : undefined,
          display_order: typeof parrot.display_order === 'number' ? parrot.display_order : undefined
        }));
        
        // キャッシュに保存
        parrotCache[userId] = {
          timestamp: Date.now(),
          parrots: formattedParrots
        };
        
        setAvailableParrots(formattedParrots);
      } else {
        // ユーザーがまだパロットを持っていない場合はデフォルトパロットを設定
        const defaultParrot = [{ 
          parrot_id: 'default',
          name: 'デフォルトパロット',
          image_url: '/gif/parrots/60fpsparrot.gif',
          description: 'デフォルトパロット',
          category_id: 'common',
          rarity_id: 'common',
          display_order: 1
        }];
        
        // キャッシュに保存
        parrotCache[userId] = {
          timestamp: Date.now(),
          parrots: defaultParrot
        };
        
        setAvailableParrots(defaultParrot);
      }
    } catch (error) {
      console.error('パロットデータの取得エラー:', error);
      setLoadError('パロットデータの取得中にエラーが発生しました');
      
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
  }, [userId, isLoading]);

  // ユーザーIDが変更されたときに再取得
  useEffect(() => {
    if (userId) {
      fetchUserParrots();
    }
  }, [userId, fetchUserParrots]);

  // ドロップダウンの外側をクリックしたときに閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!forceOpen && dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowParrotDropdown(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [forceOpen]);
  
  useEffect(() => {
    if (forceOpen) {
      setShowParrotDropdown(true); // モーダル表示時に展開
    }
  }, [forceOpen]);

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

  // ページング用のパロット (現在のページに表示するパロットのみ)
  const pagedParrots = filteredParrots.slice(
    currentPage * pageSize, 
    (currentPage + 1) * pageSize
  );

  // 次のページがあるかどうか
  const hasNextPage = filteredParrots.length > (currentPage + 1) * pageSize;
  // 前のページがあるかどうか
  const hasPrevPage = currentPage > 0;

  // エラー表示
  if (loadError) {
    return (
      <div className={styles.parrotSelectorLoading}>
        <div>{loadError}</div>
        <button 
          onClick={() => {
            setIsLoading(true);
            setLoadError(null);
            fetchUserParrots();
          }}
          className={styles.parrotTypeButton}
          style={{ marginTop: '10px' }}
        >
          再読み込み
        </button>
      </div>
    );
  }

  // ローディング表示
  if (isLoading) {
    return <div className={styles.parrotSelectorLoading}>パロットを読み込み中...</div>;
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

        {/* 追加ボタン - 最大数未満の場合のみ表示 */}
        {!forceOpen && selectedParrots.length < maxParrots && (
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
        <div ref={dropdownRef} className={styles.parrotSelectorModal}>
          <div className={styles.parrotSelectorHeader}>
            <div className={styles.parrotSelectorTitle}>
              パロットを選択 ({selectedParrots.length}/{maxParrots})
              <button 
                className={styles.toggleSelectorButton}
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
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(0); // 検索時にページをリセット
                }}
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
                  onClick={() => {
                    setSelectedCategory(
                      selectedCategory === category.id ? null : category.id
                    );
                    setCurrentPage(0); // カテゴリー変更時にページをリセット
                  }}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>

          {/* パロットグリッド */}
          <div className={styles.parrotGrid}>
            {pagedParrots.length > 0 ? (
              pagedParrots.map((parrot) => (
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
            
            {/* ページングコントロール - 必要な場合のみ表示 */}
            {(hasPrevPage || hasNextPage) && (
              <div style={{ 
                gridColumn: "1 / -1", 
                display: "flex", 
                justifyContent: "space-between",
                padding: "8px 0" 
              }}>
                <button 
                  onClick={() => setCurrentPage(currentPage - 1)} 
                  disabled={!hasPrevPage}
                  className={styles.parrotTypeButton}
                  style={{ opacity: hasPrevPage ? 1 : 0.5 }}
                >
                  前のページ
                </button>
                <span>
                  {currentPage + 1} / {Math.ceil(filteredParrots.length / pageSize)}
                </span>
                <button 
                  onClick={() => setCurrentPage(currentPage + 1)} 
                  disabled={!hasNextPage}
                  className={styles.parrotTypeButton}
                  style={{ opacity: hasNextPage ? 1 : 0.5 }}
                >
                  次のページ
                </button>
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
  entryId: string | number,
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

    // URL正規化の修正 - HTTPSなどで始まるURLは変更しない
    const normalizedUrls = parrotImageUrls.map(url => {
      // URL正規化を改善 - すでにHTTPS/HTTPで始まる場合は変更しない
      if (url.startsWith('http://') || url.startsWith('https://')) {
        return url;
      }
      return url.startsWith('/') ? url : `/${url}`;
    });
    
    console.log('正規化後のURL:', normalizedUrls);

    // データベースから全パロットを取得
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
    
    // より柔軟なURL照合のために、URLからIDへのマッピングを作成
    const urlToIdMap: Record<string, string> = {};
    
    for (const url of normalizedUrls) {
      if (!url) continue;
      
      // 完全一致を試みる
      const exactMatch = allParrots.find(p => p.image_url === url);
      if (exactMatch && exactMatch.parrot_id) {
        urlToIdMap[url] = String(exactMatch.parrot_id);
        continue;
      }
      
      // ファイル名だけでの一致を試みる
      const urlFileName = getFileNameFromUrl(url);
      
      const filenameMatch = allParrots.find(p => {
        if (!p.image_url) return false;
        return getFileNameFromUrl(p.image_url as string) === urlFileName;
      });
      
      if (filenameMatch && filenameMatch.parrot_id) {
        urlToIdMap[url] = String(filenameMatch.parrot_id);
        continue;
      }
      
      console.warn(`パロットID未検出: URL=${url}`);
    }
    
    console.log('URLからIDへのマッピング:', urlToIdMap);
    
    // 新しいパロット関連付けを追加
    const parrotInserts = normalizedUrls
      .filter(url => urlToIdMap[url])
      .map((url, index) => ({
        entry_id: entryId,
        parrot_id: urlToIdMap[url],
        position: index,
        user_id: userId
      }));
    
    console.log(`挿入するパロットデータ: ${parrotInserts.length}件`, parrotInserts);
    
    if (parrotInserts.length > 0) {
      const { data: insertData, error: insertError } = await supabase
        .from('diary_parrot_icons')
        .insert(parrotInserts)
        .select();
      
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
export const getEntryParrots = async (entryId: string | number): Promise<string[]> => {
  if (!entryId) return [];
  
  try {
    console.log(`getEntryParrots: entryId=${entryId} の取得開始`);
    
    // エントリーに関連付けられたパロットIDを取得
    const { data: iconData, error: iconError } = await supabase
      .from('diary_parrot_icons')
      .select('parrot_id')
      .eq('entry_id', entryId)
      .order('position', { ascending: true });
    
    if (iconError) {
      console.error('パロットアイコン取得エラー:', iconError);
      throw iconError;
    }
    
    console.log(`パロットアイコン取得成功: ${iconData?.length || 0}件`);
    
    if (iconData && iconData.length > 0) {
      // パロットIDからパロット情報を取得
      const parrotIds = iconData.map(icon => String(icon.parrot_id));
      
      const { data: parrotData, error: parrotError } = await supabase
        .from('parrots')
        .select('image_url')
        .in('parrot_id', parrotIds);
      
      if (parrotError) {
        console.error('パロット情報取得エラー:', parrotError);
        throw parrotError;
      }
      
      console.log(`パロット情報取得成功: ${parrotData?.length || 0}件`);
      
      if (parrotData) {
        // 型安全のために明示的にstring型に変換し、null値を除外
        const imageUrls = parrotData
          .filter(parrot => parrot.image_url)
          .map(parrot => String(parrot.image_url));
          
        console.log('取得したパロットURL:', imageUrls);
        return imageUrls;
      }
    } else {
      console.log('このエントリーにはパロットがありません');
    }
    
    return [];
  } catch (error) {
    console.error('日記パロット取得エラー:', error);
    return [];
  }
};

// 追加: ファイル名を取得するヘルパー関数
function getFileNameFromUrl(url: string): string {
  if (!url) return '';
  
  // 最後のスラッシュ以降をファイル名として取得
  const parts = url.split('/');
  return parts[parts.length - 1];
}