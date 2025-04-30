import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import styles from './ParrotSelector.module.css';

// #region 型定義
/**
 * パロットの型定義
 */
type ParrotType = {
  parrot_id: string;
  name?: string;
  image_url?: string;
  description?: string;
  rarity_id?: string;
  display_order?: number;
  tags?: ParrotTagInfo[]; // タグ情報
};

/**
 * データベースから取得した生のパロットデータの型定義
 */
type RawParrot = {
  parrot_id: string | number;
  name?: string;
  image_url?: string;
  description?: string;
  rarity_id?: string;
  display_order?: number;
};

/**
 * パロットタグの型定義
 */
type ParrotTagInfo = {
  entry_id: string;
  user_id: string;
  parrot_id: string;
  parrot_tag_name: string;
  executed_at: string;
};

/**
 * 人気タグ用の型定義
 */
type ParrotTag = {
  tag_name: string;
  count: number;
};

/**
 * ParrotSelectorコンポーネントのProps
 */
interface ParrotSelectorProps {
  userId: string;                             // ユーザーID
  selectedParrots: string[];                  // 選択されたパロット
  onParrotsChange: (parrots: string[]) => void; // パロット変更時のコールバック
  maxParrots?: number;                        // 最大選択可能数
  compact?: boolean;                          // コンパクト表示モード
  forceOpen?: boolean;                        // 強制的に開く
}

/**
 * キャッシュするパロットデータの型
 */
interface ParrotCache {
  [userId: string]: {
    timestamp: number;
    parrots: ParrotType[];
  }
}
// #endregion 型定義

// #region 定数・ユーティリティ
// パロットデータをメモリにキャッシュ（セッション中のみ）
const parrotCache: ParrotCache = {};
const CACHE_DURATION = 5 * 60 * 1000; // 5分間キャッシュを保持

/**
 * URLからファイル名を抽出するヘルパー関数
 */
function getFileNameFromUrl(url: string): string {
  if (!url) return '';

  // 最後のスラッシュ以降をファイル名として取得
  const parts = url.split('/');
  return parts[parts.length - 1];
}
// #endregion 定数・ユーティリティ

// #region メインコンポーネント
/**
 * パロット選択コンポーネント
 * ユーザーが所有するパロットを表示し、選択できるようにする
 */
export const ParrotSelector: React.FC<ParrotSelectorProps> = ({
  userId,
  selectedParrots,
  onParrotsChange,
  maxParrots = 1,
  compact = false,
  forceOpen = false,
}) => {
  // #region state定義
  const [availableParrots, setAvailableParrots] = useState<ParrotType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [showParrotDropdown, setShowParrotDropdown] = useState(false);
  const [selectedCategory] = useState<string | null>(null);
  const [pageSize] = useState(8); // 一度に表示するパロットの数
  const [currentPage, setCurrentPage] = useState(0);
  const [popularTags, setPopularTags] = useState<ParrotTag[]>([]);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  // #endregion state定義

  // #region データ取得関連
  /**
   * パロットデータをキャッシュから取得する関数
   */
  const getCachedParrots = (userId: string): ParrotType[] | null => {
    const cachedData = parrotCache[userId];
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_DURATION) {
      return cachedData.parrots;
    }
    return null;
  };

  /**
   * 人気タグデータを取得する関数
   */
  const fetchPopularTags = useCallback(async () => {
    if (!userId) return;
    
    try {
      // user_parrots_tags テーブルからタグを取得して集計
      const { data, error } = await supabase
        .from('user_parrots_tags')
        .select('parrot_tag_name')
        .eq('user_id', userId);
      
      if (error) {
        console.error('タグ取得エラー:', error);
        return;
      }
      
      if (data && data.length > 0) {
        // タグの出現回数を集計
        const tagCounts: Record<string, number> = {};
        
        data.forEach(item => {
          const tagName = item.parrot_tag_name as string;
          tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
        });
        
        // 配列に変換してソート
        const sortedTags = Object.entries(tagCounts)
          .map(([tag_name, count]) => ({ tag_name, count }))
          .sort((a, b) => b.count - a.count) // 多い順にソート
          .slice(0, 10); // 上位10件を取得
        
        setPopularTags(sortedTags);
      }
    } catch (error) {
      console.error('人気タグの取得エラー:', error);
    }
  }, [userId]);

  /**
   * ユーザーが獲得済みのパロットを取得
   */
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
            .select('parrot_id, name, image_url, description, rarity_id, display_order')
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
          rarity_id: parrot.rarity_id ? String(parrot.rarity_id) : undefined,
          display_order: typeof parrot.display_order === 'number' ? parrot.display_order : undefined,
          tags: [] as ParrotTagInfo[] // 明示的に型を指定
        }));

        // パロットのタグ情報を取得
        try {
          const { data: tagsData, error: tagsError } = await supabase
            .from('user_parrots_tags')
            .select('*')
            .eq('user_id', userId);
            
          if (tagsError) {
            console.error('パロットタグ取得エラー:', tagsError);
          } else if (tagsData && tagsData.length > 0) {
            // パロットにタグを関連付け
            formattedParrots.forEach(parrot => {
              const parrotTags = tagsData.filter(tag => tag.parrot_id === parrot.parrot_id);
              if (parrotTags.length > 0) {
                parrot.tags = parrotTags as ParrotTagInfo[];
              }
            });
            
            console.log(`${tagsData.length}件のタグ情報を取得`);
          }
        } catch (tagError) {
          console.error('タグ情報取得エラー:', tagError);
        }
        
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
          rarity_id: 'common',
          display_order: 1,
          tags: [] as ParrotTagInfo[]
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
          rarity_id: 'common',
          display_order: 1,
          tags: [] as ParrotTagInfo[]
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isLoading]);
  // #endregion データ取得関連

  // #region イベントハンドラ
  /**
   * パロットの選択/解除を処理する関数
   */
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

  /**
   * +ボタンがクリックされたときに呼ばれる関数
   */
  const handleAddButtonClick = () => {
    setShowParrotDropdown(!showParrotDropdown);
  };

  /**
   * 選択されたパロットを削除する関数
   */
  const removeParrot = (parrotImageUrl: string) => {
    onParrotsChange(selectedParrots.filter(p => p !== parrotImageUrl));
  };

  /**
   * タグをクリックした時の処理
   */
  const handleTagClick = (tagName: string) => {
    setSelectedTag(selectedTag === tagName ? null : tagName);
    setCurrentPage(0); // ページをリセット
  };
  // #endregion イベントハンドラ

  // #region フィルタリングとページング
  /**
   * パロットをフィルタリングする処理
   */
  const filteredParrots = availableParrots.filter(parrot => {
    // 検索条件を削除し、カテゴリーとタグのみでフィルタリング
    const matchesCategory = !selectedCategory || 
      selectedCategory === 'all';
    // 選択されたタグでフィルタリング
    const matchesTag = !selectedTag || 
      (parrot.tags && parrot.tags.some(tag => tag.parrot_tag_name === selectedTag));
      
    return matchesCategory && matchesTag;
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
  // #endregion フィルタリングとページング

  // #region useEffect
  // ユーザーIDが変更されたときに再取得
  useEffect(() => {
    if (userId) {
      fetchUserParrots();
      fetchPopularTags();
    }
  }, [userId, fetchUserParrots, fetchPopularTags]);

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
  
  // forceOpenが変更されたときの処理
  useEffect(() => {
    if (forceOpen) {
      setShowParrotDropdown(true); // モーダル表示時に展開
    }
  }, [forceOpen]);
  // #endregion useEffect

  // #region サブコンポーネント
  /**
   * 人気タグ表示コンポーネント
   */
  const PopularTagsSection = () => {
    if (popularTags.length === 0) return null;
    
    return (
      <div className={styles.popularTagsSection}>
        <div className={styles.popularTagsTitle}>よく使うタグ</div>
        <div className={styles.popularTagsList}>
          {popularTags.map(tag => (
            <button
              key={tag.tag_name}
              className={`${styles.tagButton} ${
                selectedTag === tag.tag_name ? styles.tagButtonActive : ''
              }`}
              onClick={() => handleTagClick(tag.tag_name)}
              title={`${tag.tag_name}`} // ホバー時にフルテキストを表示
            >
              {tag.tag_name}
            </button>
          ))}
        </div>
      </div>
    );
  };
  // #endregion サブコンポーネント

  // #region レンダリング
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
      {/* 選択中のパロットを表示 */}
      <div className={styles.selectedParrotsPreview}>
        {/* 固定数の枠を作成（例：最大5つなら） */}
        {Array(maxParrots).fill(null).map((_, index) => (
          <div key={index} className={styles.selectedParrotItem}>
            {selectedParrots[index] ? (
              <div 
                onClick={() => removeParrot(selectedParrots[index])}
                title="タップで削除"
              >
                <Image
                  src={selectedParrots[index]}
                  alt={`Selected Parrot ${index + 1}`}
                  width={compact ? 20 : 24}
                  height={compact ? 20 : 24}
                  className={styles.parrotGif}
                />
              </div>
            ) : (
              <div className={styles.emptyParrotSlot} onClick={handleAddButtonClick} />
            )}
          </div>
        ))}
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
          
            {/* 人気タグセクション */}
            <PopularTagsSection />
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
                &apos;パロットがありません&apos;
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
  // #endregion レンダリング
};
// #endregion メインコンポーネント

// #region ユーティリティ関数
/**
 * 日記エントリー保存時にパロット情報を保存する関数
 * @param entryId エントリーID
 * @param userId ユーザーID
 * @param parrotImageUrls パロット画像URL配列
 * @returns 保存成功したかどうか
 */
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

    // URL正規化 - HTTPSなどで始まるURLは変更しない
    const normalizedUrls = parrotImageUrls.map(url => {
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

/**
 * 日記エントリー読み込み時にパロット情報も取得する関数
 * @param entryId エントリーID
 * @returns パロット画像URLの配列
 */
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
// #endregion ユーティリティ関数