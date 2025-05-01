"use client";

// components/CollectionPreview/index.tsx
import { useEffect, useState, useMemo } from 'react';
import { Search, LogIn, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import ParrotIcon from '../ParrotIcon';
import styles from './styles.module.css';
import { useAuth } from '@/lib/AuthContext';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';

// #region 型定義
/**
 * パロットに関する型定義
 */
type Parrot = {
  parrot_id: string; // UUID型
  name: string;
  rarity_id: string; // UUID型
  description: string | null;
  image_url: string;
  display_order?: number; // 表示順序（ソート用）
  rarity: {
    rarity_id: string; // UUID型
    name: string;
    abbreviation: string;
    drop_rate: number;
  };
  user_parrots: {
    user_id: string; // UUID型
    parrot_id: string; // UUID型
    obtained_at: string;
    obtain_count: number;
  }[];
  obtained?: boolean;
  tags?: ParrotTag[]; // タグ情報
}

/**
 * パロットのソート方法を指定する型
 */
type SortType = 'display_order' | 'rarity' | 'obtained_date';

/**
 * ユーザーが所持するパロットの情報
 */
type UserParrot = {
  user_id: string;
  parrot_id: string;
  obtained_at: string;
  obtain_count: number;
};

/**
 * Supabaseから取得する生のパロットデータ
 */
type RawParrot = {
  parrot_id: string;
  name: string;
  rarity_id: string;
  description: string | null;
  image_url: string;
  display_order?: number;
  rarity: {
    rarity_id: string;
    name: string;
    abbreviation: string;
    drop_rate: number;
  };
  user_parrots: UserParrot[];
};

/**
 * パロットに付けられたタグ情報
 */
type ParrotTag = {
  entry_id: string; // UUID型
  user_id: string; // UUID型
  parrot_id: string; // UUID型
  parrot_tag_name: string; // タグ名
  executed_at: string; // タグが追加された日時
};

/**
 * タグの使用頻度を追跡するための型
 */
type TagUsageCount = {
  parrot_tag_name: string;
  usage_count: number;
};
// #endregion

// #region メインコンポーネント
/**
 * パロットコレクション一覧を表示するメインコンポーネント
 */
export default function CollectionPreview() {
  // #region 状態管理
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parrots, setParrots] = useState<Parrot[]>([]);
  const [selectedParrot, setSelectedParrot] = useState<Parrot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRarity, setSearchRarity] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('display_order');
  const [showObtainedOnly, setShowObtainedOnly] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // 認証状態を追跡
  const [allTags, setAllTags] = useState<string[]>([]);
  const [searchTag, setSearchTag] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24); // デフォルトのアイテム数
  const [totalPages, setTotalPages] = useState(1);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  // #endregion

  // #region サブコンポーネント定義
  const supabase = createClientComponentClient();
  const { user, isLoading: authLoading } = useAuth();

  // #region ユーティリティ関数
  /**
   * レアリティの順序を数値として取得
   * @param rarityAbbreviation レアリティの略称
   * @returns 数値で表されたレアリティの順序（低いほど希少）
   */
  const getRarityOrder = (rarityAbbreviation: string): number => {
    switch (rarityAbbreviation) {
      case 'N': return 3;
      case 'R': return 2;
      case 'SR': return 1;
      case 'UR': return 0;
      default: return 999;
    }
  };

  /**
   * コレクションの進捗状況を計算
   * @param parrots パロットリスト
   * @returns 進捗情報（全体数、獲得数、達成率）
   */
  const calculateCollectionProgress = (parrots: Parrot[]) => {
    const total = parrots.length;
    const obtained = parrots.filter(parrot => parrot.obtained).length;
    const percentage = total > 0 ? Math.floor((obtained / total) * 100) : 0;
    return {
      total,
      obtained,
      percentage
    };
  };

  /**
   * パロット名を適切にフォーマットする（長い名前を改行して表示）
   * @param name パロット名
   * @returns フォーマット済みの名前（JSX）
   */
  const formatParrotName = (name: string) => {
    // パロット名の長さが一定以上の場合のみ処理
    if (name.length > 20) {  // この数値は調整可能
      const parts = name.split('parrot');
      if (parts.length > 1) {
        return (
          <>
            {parts[0]}
            <br />
            parrot{parts[1]}
          </>
        );
      }
    }
    // 短い名前やparrotを含まない名前はそのまま返す
    return name;
  };
  // #endregion

  // #region データ処理関数
  /**
   * パロットデータを読み込む
   * @param userId ユーザーID（未ログイン時はnull）
   */
  const loadParrotData = async (userId: string | null) => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: parrotData, error: parrotError } = await supabase
        .from('parrots')
        .select(`
          *,
          rarity:rarity_id(*),
          user_parrots(*)
        `);
  
      if (parrotError) {
        console.error('パロットデータ取得エラー:', parrotError);
        setError('パロットデータの取得に失敗しました。');
        setLoading(false);
        return;
      }
      
      if (parrotData && Array.isArray(parrotData)) {
        // 型安全な方法でデータを処理
        const processedParrots: Parrot[] = ((parrotData as unknown) as RawParrot[]).map((item: RawParrot, index: number) => {
          const parrot: Parrot = {
            parrot_id: item.parrot_id,
            name: item.name,
            rarity_id: item.rarity_id,
            description: item.description ?? null,
            image_url: item.image_url,
            display_order: typeof item.display_order === 'number' ? item.display_order : index + 1,
            rarity: {
              rarity_id: item.rarity.rarity_id,
              name: item.rarity.name,
              abbreviation: item.rarity.abbreviation,
              drop_rate: item.rarity.drop_rate,
            },
            user_parrots: Array.isArray(item.user_parrots)
              ? item.user_parrots.map((up) => ({
                  user_id: up.user_id,
                  parrot_id: up.parrot_id,
                  obtained_at: up.obtained_at,
                  obtain_count: up.obtain_count,
                }))
              : [],
            obtained: !!(
              userId &&
              Array.isArray(item.user_parrots) &&
              item.user_parrots.some((up) => up.user_id === userId)
            ),
            tags: [], // タグ情報の初期化
          };
        
          return parrot;
        });
        
        // ユーザーがログインしている場合、パロットのタグ情報を取得
        if (userId) {
          try {
            const { data: tagsData, error: tagsError } = await supabase
              .from('user_parrots_tags')
              .select('*')
              .eq('user_id', userId);
            
            if (tagsError) {
              console.error('パロットタグ取得エラー:', tagsError);
            } else if (tagsData && Array.isArray(tagsData)) {
              // 各パロットにタグ情報を関連付け
              processedParrots.forEach(parrot => {
                const parrotTags = tagsData.filter(tag => tag.parrot_id === parrot.parrot_id) as ParrotTag[];
                parrot.tags = parrotTags;
              });
                
              // すべてのユーザータグを取得して一意のタグリストを作成（フィルタリング用）
              const uniqueTags = [...new Set(tagsData.map(tag => tag.parrot_tag_name as string))].sort() as string[];
              setAllTags(uniqueTags);
            }
          } catch (error) {
            console.error('パロットタグ取得例外:', error);
          }
        }
                
        // 表示順でソート
        const sortedParrots = [...processedParrots].sort((a, b) => {
          const displayOrderA = typeof a.display_order === 'number' ? a.display_order : 0;
          const displayOrderB = typeof b.display_order === 'number' ? b.display_order : 0;
          return displayOrderA - displayOrderB;
        });
        
        setParrots(sortedParrots);
      } else {
        setParrots([]);
      }
    } catch (error) {
      console.error('パロットデータ取得エラー:', error);
      setError('パロットデータの取得に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  /**
   * ユーザーのタグ一覧を読み込む
   * @param userId ユーザーID
   */
  const loadAllTags = async (userId: string | null) => {
    if (!userId) return;
    
    try {
      const { data, error } = await supabase
        .from('user_parrots_tags')
        .select('parrot_tag_name')
        .eq('user_id', userId)
        .order('parrot_tag_name');
      
      if (error) {
        console.error('タグ取得エラー:', error);
        return;
      }
      
      // 型アサーションを使用して、データを適切な型に変換
      // 重複を削除して一意のタグ名のみを抽出
      const uniqueTags = [...new Set(data?.map(tag => tag.parrot_tag_name as string) || [])] as string[];
      setAllTags(uniqueTags);
    } catch (error) {
      console.error('タグ取得例外:', error);
    }
  };

  /**
   * パロットを指定されたソート方法で並び替える
   * @param parrots パロットリスト
   * @returns ソート済みパロットリスト
   */
  const sortParrots = (parrots: Parrot[]) => {
    switch (sortType) {
      case 'rarity':
        return [...parrots].sort((a, b) => {
          return getRarityOrder(a.rarity.abbreviation) - getRarityOrder(b.rarity.abbreviation);
        });
      case 'obtained_date':
        return [...parrots].sort((a, b) => {
          if (!a.obtained) return 1;  // 未獲得は後ろへ
          if (!b.obtained) return -1;
          
          // 現在のユーザーの獲得情報を取得
          const aObtainedInfo = a.user_parrots.find(up => up.user_id === currentUser);
          const bObtainedInfo = b.user_parrots.find(up => up.user_id === currentUser);
          
          if (!aObtainedInfo) return 1;
          if (!bObtainedInfo) return -1;
          
          try {
            // 獲得日時で並び替え（新しい順）
            const dateA = new Date(aObtainedInfo.obtained_at).getTime();
            const dateB = new Date(bObtainedInfo.obtained_at).getTime();
            return dateB - dateA;
          } catch (error) {
            console.error('日付変換エラー:', error);
            return 0; // 日付変換エラーの場合は順序を変更しない
          }
        });
      case 'display_order':
      default:
        return [...parrots].sort((a, b) => {
          const displayOrderA = typeof a.display_order === 'number' ? a.display_order : 0;
          const displayOrderB = typeof b.display_order === 'number' ? b.display_order : 0;
          return displayOrderA - displayOrderB;
        });
    }
  };
  // #endregion

  // #region イベントハンドラ
  /**
   * パロットカードクリック時の処理
   * @param parrot クリックされたパロット
   */
  const handleParrotClick = (parrot: Parrot) => {
    // ログイン済みユーザーの場合のみ、獲得済みパロットの詳細を表示
    if (isAuthenticated && parrot.obtained) {
      setSelectedParrot(parrot);
    } else if (isAuthenticated && !parrot.obtained) {
      // 獲得していないパロットはクリックできないことを視覚的に表示（既存の動作を維持）
      return;
    } else {
      // 未ログイン時はログインを促す
      alert('ログインすると獲得したパロットの詳細を確認できます');
    }
  };

  /**
   * ログインボタンクリック時の処理
   */
  const handleLogin = () => {
    // ログインページへリダイレクト
    window.location.href = '/login';
  };
  
  /**
   * ページネーション制御関数
   * @param pageNumber 移動先のページ番号
   */
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    
    // まずコンテンツにローディング状態を適用
    const gridElement = document.querySelector('.' + styles.grid);
    if (gridElement) {
      gridElement.classList.add(styles.loading);
    }
    
    // ページ番号を変更
    setCurrentPage(pageNumber);
    
    // ローディング状態を解除
    setTimeout(() => {
      if (gridElement) {
        gridElement.classList.remove(styles.loading);
      }
    }, 200);
  };

  /**
   * 画面サイズに応じてitemsPerPageを調整する関数
   */
  const updateItemsPerPage = () => {
    const width = window.innerWidth;
    if (width >= 1280) {
      setItemsPerPage(24); // 6x4の表示
    } else if (width >= 1024) {
      setItemsPerPage(20); // 5x4の表示
    } else if (width >= 768) {
      setItemsPerPage(16); // 4x4の表示
    } else if (width >= 640) {
      setItemsPerPage(12); // 3x4の表示
    } else {
      setItemsPerPage(8); // 小さい画面では2x4
    }
  };
  // #endregion

  // #region 検索とフィルタリング
  // 検索とフィルタリングを適用したパロットリスト
  const filteredParrots = parrots
    .filter(parrot => {
      // 名前での検索
      const nameMatch = parrot.name.toLowerCase().includes(searchQuery.toLowerCase());
      // レアリティでの検索
      const rarityMatch = searchRarity ? parrot.rarity.abbreviation === searchRarity : true;
      // 獲得済みフィルター
      const obtainedMatch = showObtainedOnly ? parrot.obtained : true;
      // タグによるフィルター
      const tagMatch = searchTag 
        ? parrot.tags && parrot.tags.some(tag => tag.parrot_tag_name === searchTag)
        : true;
      
      return nameMatch && rarityMatch && obtainedMatch && tagMatch;
    });

  // フィルター適用後のパロットをさらに並び替え
  const sortedAndFilteredParrots = sortParrots(filteredParrots);
  
  // 現在のページのパロットだけを表示
  const currentParrots = sortedAndFilteredParrots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
  // #endregion

  // #region 副作用（useEffect）
  // リサイズイベントのリスナー設定
  useEffect(() => {
    updateItemsPerPage(); // 初回のサイズ設定
    
    const handleResize = () => {
      updateItemsPerPage();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // ユーザー認証チェックと初期データ読み込み
  useEffect(() => {
    const initializeData = async () => {
      setLoading(true);
      
      try {
        // AuthContextのユーザー情報を優先して使用
        if (!authLoading && user) {
          console.log('AuthContextからユーザー情報を取得:', user.id);
          setCurrentUser(user.id);
          setIsAuthenticated(true);
          
          // カテゴリーとパロットデータを並行して読み込み
          await Promise.all([
            loadParrotData(user.id)
          ]);
        } else {
          // AuthContextでユーザーが取得できない場合は、Supabaseから直接確認
          console.log('Supabaseから直接セッション確認');
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session?.user) {
            // すでにログイン済みの場合は、認証状態をすぐに設定
            console.log('Supabaseセッションからユーザー情報を取得:', session.user.id);
            setCurrentUser(session.user.id);
            setIsAuthenticated(true);
            
            // カテゴリーとパロットデータを並行して読み込み
            await Promise.all([
              loadParrotData(session.user.id)
            ]);
          }
        }
      } catch (error) {
        console.error('初期化エラー:', error);
        setError('データの読み込みに失敗しました。');
      } finally {
        setLoading(false);
      }
    };
    
    initializeData();
    
    // 認証状態変更リスナー
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('認証状態変更イベント:', event);
      if (event === 'SIGNED_IN') {
        const user = session?.user;
        if (user) {
          setCurrentUser(user.id);
          setIsAuthenticated(true);
          loadParrotData(user.id);
        }
      } else if (event === 'SIGNED_OUT') {
        setCurrentUser(null);
        setIsAuthenticated(false);
        loadParrotData(null);
      }
    });
    
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [user, authLoading]); // user, authLoadingが変更されたときに実行

  // フィルタリングが変更された場合、ページを1に戻す
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchRarity, showObtainedOnly, sortType]);

  // タグが変更されたときにも、ページを1に戻す処理を追加
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, searchRarity, showObtainedOnly, sortType, searchTag, parrots]);

  // ユーザー認証状態変更時にタグを読み込む
  useEffect(() => {
    if (currentUser && isAuthenticated) {
      loadAllTags(currentUser);
    }
  }, [currentUser, isAuthenticated]); // 依存配列に currentUser と isAuthenticated を追加

  // 総ページ数の計算とページネーションデータの準備
  useEffect(() => {
    const pages = Math.ceil(sortedAndFilteredParrots.length / itemsPerPage);
    setTotalPages(pages || 1); // 0の場合は1ページ
    
    // ページ番号が範囲外になった場合、調整
    if (currentPage > pages && pages > 0) {
      setCurrentPage(pages);
    }
  }, [sortedAndFilteredParrots.length, itemsPerPage, currentPage]);
  // #endregion

  /**
   * フィルターボタンコンポーネント
   */
  const FilterButton = () => (
    <button 
      className={styles.filterToggleButton}
      onClick={() => setShowFilterMenu(!showFilterMenu)}
      aria-expanded={showFilterMenu}
    >
      {showFilterMenu ? 'フィルターを閉じる' : 'フィルターを開く'}
    </button>
  );

  /**
   * ページネーションコンポーネント
   */
  const Pagination = () => {
    // 表示するページ番号の範囲を決定（最大5ページ分）
    const getPageNumbers = () => {
      const pageNumbers = [];
      const maxVisiblePages = 5; // 表示するページボタンの最大数
      
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
      if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }
      
      return pageNumbers;
    };
    
    return (
      <div className={styles.paginationContainer}>
        <div className={styles.paginationInfo}>
          全 {sortedAndFilteredParrots.length} アイテム中 {sortedAndFilteredParrots.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} - {Math.min(currentPage * itemsPerPage, sortedAndFilteredParrots.length)} を表示
        </div>
        
        <div className={styles.paginationControls}>
          <button 
            className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
            onClick={() => handlePageChange(1)}
            disabled={currentPage === 1}
          >
            最初
          </button>
          
          <button 
            className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft size={16} />
          </button>
          
          {getPageNumbers().map(number => (
            <button 
              key={number}
              className={`${styles.paginationButton} ${currentPage === number ? styles.active : ''}`}
              onClick={() => handlePageChange(number)}
            >
              {number}
            </button>
          ))}
          
          <button 
            className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight size={16} />
          </button>
          
          <button 
            className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
            onClick={() => handlePageChange(totalPages)}
            disabled={currentPage === totalPages}
          >
            最後
          </button>
        </div>
        
        <div className={styles.itemsPerPageSelector}>
          <label htmlFor="itemsPerPage">1ページあたり: </label>
          <select 
            id="itemsPerPage"
            value={itemsPerPage}
            onChange={(e) => {
              const newValue = parseInt(e.target.value);
              setItemsPerPage(newValue);
              setCurrentPage(1); // ページ数変更時はページ1に戻る
            }}
            className={styles.itemsPerPageSelect}
          >
            <option value="12">12</option>
            <option value="24">24</option>
            <option value="36">36</option>
            <option value="48">48</option>
          </select>
        </div>
      </div>
    );
  };

  /**
   * パロット詳細モーダルコンポーネント
   */
  const ParrotModal = ({ 
    parrot, 
    onClose, 
    allParrots,
    parrots,
    setParrots
  }: {
    parrot: Parrot;
    onClose: () => void;
    allParrots: Parrot[];
    parrots: Parrot[];
    setParrots: React.Dispatch<React.SetStateAction<Parrot[]>>;
  }) => {
    const obtainInfo = parrot.user_parrots.find(up => up.user_id === currentUser);
    
    // タグ関連の状態
    const [tags, setTags] = useState<ParrotTag[]>([]);
    const [loading, setLoading] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [tagError, setTagError] = useState<string | null>(null);

    // 頻繁に使用されるタグを管理するための状態
    const [frequentTags, setFrequentTags] = useState<TagUsageCount[]>([]);

    // ナンバー表示用のindexを取得
    const parrotIndex = allParrots.findIndex(p => p.parrot_id === parrot.parrot_id);

    // タグデータの取得
    useEffect(() => {
      const fetchTags = async () => {
        if (!currentUser || !parrot.parrot_id) return;
        
        setLoading(true);
        try {
          const { data, error } = await supabase
            .from('user_parrots_tags')
            .select('*')
            .eq('user_id', currentUser)
            .eq('parrot_id', parrot.parrot_id);
          
          if (error) {
            console.error('タグ取得エラー:', error);
            setTagError('タグ情報の取得に失敗しました');
          } else {
            setTags((data || []) as ParrotTag[]);
          }
        } catch (error) {
          console.error('タグ取得例外:', error);
          setTagError('タグ情報の取得中にエラーが発生しました');
        } finally {
          setLoading(false);
        }
      };
      
      fetchTags();
    }, [currentUser, parrot.parrot_id]);

    // 頻出タグを取得するための useEffect
    useEffect(() => {
      const fetchFrequentTags = async () => {
        if (!currentUser) return;
        
        try {
          // ユーザーの全タグを取得
          const { data, error } = await supabase
            .from('user_parrots_tags')
            .select('parrot_tag_name')
            .eq('user_id', currentUser);
          
          if (error) {
            console.error('頻出タグ取得エラー:', error);
            return;
          }
          
          if (data && Array.isArray(data)) {
            // タグの使用回数をカウント
            const tagCounts: { [key: string]: number } = {};
            data.forEach(tag => {
              // 明示的に string 型としてアサーション
              const tagName = tag.parrot_tag_name as string;
              tagCounts[tagName] = (tagCounts[tagName] || 0) + 1;
            });
            
            // 使用頻度でソートして上位を取得
            const sortedTags: TagUsageCount[] = Object.entries(tagCounts)
              .map(([parrot_tag_name, usage_count]) => ({ 
                parrot_tag_name, 
                usage_count 
              }))
              .sort((a, b) => b.usage_count - a.usage_count)
              .slice(0, 5); // 上位5つを表示
            
            setFrequentTags(sortedTags);
          }
        } catch (error) {
          console.error('頻出タグ取得例外:', error);
        }
      };
      
      fetchFrequentTags();
    }, [currentUser]); // 依存配列にはcurrentUserのみを指定

    /**
     * 新しいタグを追加する関数
     */
    const addTag = async () => {
      if (!newTagName.trim()) return;
      if (!currentUser || !parrot.parrot_id) return;
      
      // タグ名の長さを制限（たとえば30文字）
      if (newTagName.length > 30) {
        setTagError('タグ名は30文字以内にしてください');
        return;
      }
      
      // 同じ名前のタグが既に存在するかチェック
      if (tags.some(tag => tag.parrot_tag_name.toLowerCase() === newTagName.trim().toLowerCase())) {
        setTagError('同じ名前のタグが既に存在します');
        return;
      }
      
      setLoading(true);
      setTagError(null);
      
      try {
        const { data, error } = await supabase
          .from('user_parrots_tags')
          .insert([
            {
              user_id: currentUser,
              parrot_id: parrot.parrot_id,
              parrot_tag_name: newTagName.trim(),
              executed_at: new Date().toISOString()
            }
          ])
          .select();
        
        if (error) {
          console.error('タグ追加エラー詳細:', error);
          setTagError(`タグの追加に失敗しました: ${error.message || 'エラーが発生しました'}`);
        } else if (data) {
          // モーダル内のタグリストを更新
          const newTagsData = data as ParrotTag[];
          setTags([...tags, ...newTagsData]);
          
          // 新しく追加したタグ名を取得
          const newTagNames = newTagsData.map(tag => tag.parrot_tag_name);
          
          // 入力欄をクリア
          setNewTagName('');
          
          // 全体のタグリストを更新
          setAllTags(prevTags => {
            // 重複を避けるためフィルタリング
            const updatedTags = [...prevTags];
            newTagNames.forEach(tagName => {
              if (!updatedTags.includes(tagName)) {
                updatedTags.push(tagName);
              }
            });
            return updatedTags.sort();
          });
          
          // parrots配列も更新して画面に即時反映
          const updatedParrots = parrots.map(p => {
            if (p.parrot_id === parrot.parrot_id) {
              // パロットのタグ配列を更新
              const updatedParrot = { ...p };
              if (!updatedParrot.tags) updatedParrot.tags = [];
              updatedParrot.tags = [...updatedParrot.tags, ...newTagsData];
              return updatedParrot;
            }
            return p;
          });
          
          // 親コンポーネントの状態を更新して絞り込み結果に反映
          setParrots(updatedParrots);
        }
      } catch (error) {
        console.error('タグ追加例外:', error);
        setTagError('タグの追加中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    /**
     * タグを削除する関数
     * @param tagId 削除するタグのID
     */
    const removeTag = async (tagId: string) => {
      if (!currentUser) return;
      
      setLoading(true);
      
      try {
        const { error } = await supabase
          .from('user_parrots_tags')
          .delete()
          .eq('entry_id', tagId)
          .eq('user_id', currentUser);
        
        if (error) {
          console.error('タグ削除エラー:', error);
          setTagError('タグの削除に失敗しました');
        } else {
          // 削除するタグの情報を取得
          const tagToRemove = tags.find(tag => tag.entry_id === tagId);
          
          // モーダル内のタグリストを更新
          setTags(tags.filter(tag => tag.entry_id !== tagId));
          
          if (tagToRemove) {
            // 1. パロットデータ全体の更新 - このタグを持つパロットから削除
            const updatedParrots = parrots.map(p => {
              if (p.parrot_id === parrot.parrot_id) {
                // パロットのタグ配列から削除対象のタグを除外
                const updatedParrot = { ...p };
                if (updatedParrot.tags) {
                  updatedParrot.tags = updatedParrot.tags.filter(t => t.entry_id !== tagId);
                }
                return updatedParrot;
              }
              return p;
            });
            
            // 2. 親コンポーネントのパロット状態を更新（絞り込み結果に即時反映）
            setParrots(updatedParrots);
            
            // 3. 全体のタグリスト更新（このタグが他で使われていなければリストから削除）
            const isTagUsedElsewhere = updatedParrots.some(p => 
              p.parrot_id !== parrot.parrot_id && 
              p.tags?.some(t => t.parrot_tag_name === tagToRemove.parrot_tag_name)
            );
            
            if (!isTagUsedElsewhere) {
              setAllTags(prevTags => prevTags.filter(t => t !== tagToRemove.parrot_tag_name));
              
              // 4. 現在このタグで絞り込み中なら、絞り込みをクリア
              if (searchTag === tagToRemove.parrot_tag_name) {
                setSearchTag(null);
              }
            }
          }
        }
      } catch (error) {
        console.error('タグ削除例外:', error);
        setTagError('タグの削除中にエラーが発生しました');
      } finally {
        setLoading(false);
      }
    };

    /**
     * 既存のタグをクリックして追加する関数
     * @param tagName 追加するタグ名
     */
    const handleTagClick = async (tagName: string) => {
      if (!currentUser || !parrot.parrot_id) return;
      
      // 既に同じタグが付いていないか確認
      if (tags.some(tag => tag.parrot_tag_name.toLowerCase() === tagName.toLowerCase())) {
        setTagError('このタグは既に追加されています');
        setTimeout(() => setTagError(null), 3000);
        return;
      }
      
      // 一時IDを作成（前回の実装と同様）
      const tempId = `temp-${Date.now()}`;
      
      // 新しいタグオブジェクトを作成
      const newTag = {
        entry_id: tempId,
        user_id: currentUser,
        parrot_id: parrot.parrot_id,
        parrot_tag_name: tagName,
        executed_at: new Date().toISOString()
      };
      
      // 即座にUIを更新
      setTags(prevTags => [...prevTags, newTag]);
      
      // parrots配列も即座に更新
      const updatedParrots = parrots.map(p => {
        if (p.parrot_id === parrot.parrot_id) {
          const updatedParrot = { ...p };
          if (!updatedParrot.tags) updatedParrot.tags = [];
          updatedParrot.tags = [...updatedParrot.tags, newTag];
          return updatedParrot;
        }
        return p;
      });
      
      // 親コンポーネントの状態を更新して絞り込み結果に反映
      setParrots(updatedParrots);
      
      // サーバー処理
      try {
        const { data, error } = await supabase
          .from('user_parrots_tags')
          .insert([{
            user_id: currentUser,
            parrot_id: parrot.parrot_id,
            parrot_tag_name: tagName,
            executed_at: new Date().toISOString()
          }])
          .select();
        
        if (error) {
          console.error('タグ追加エラー:', error);
          
          // エラー時は状態を元に戻す
          setTags(prevTags => prevTags.filter(t => t.entry_id !== tempId));
          
          // parrots配列も元に戻す
          const revertedParrots = parrots.map(p => {
            if (p.parrot_id === parrot.parrot_id) {
              const revertedParrot = { ...p };
              if (revertedParrot.tags) {
                revertedParrot.tags = revertedParrot.tags.filter(t => t.entry_id !== tempId);
              }
              return revertedParrot;
            }
            return p;
          });
          setParrots(revertedParrots);

          setTagError('タグの追加に失敗しました');
        } else if (data && data.length > 0) {
          // 成功時、一時IDを実際のIDに置き換え
          const realTag = data[0] as ParrotTag;

          // tagsの状態を更新
          setTags(prevTags =>
            prevTags.map(tag =>
              tag.entry_id === tempId ? realTag : tag
            )
          );

          // parrots配列も更新
          const finalParrots = parrots.map(p => {
            if (p.parrot_id === parrot.parrot_id) {
              const updatedParrot = { ...p };
              if (updatedParrot.tags) {
                updatedParrot.tags = updatedParrot.tags.map(tag => 
                  tag.entry_id === tempId ? realTag : tag
                );
              }
              return updatedParrot;
            }
            return p;
          });

          setParrots(finalParrots);

          // 全体のタグリストの更新（まだ存在しない場合のみ）
          const newTagName = realTag.parrot_tag_name;
          if (!allTags.includes(newTagName)) {
            setAllTags(prevTags => [...prevTags, newTagName].sort());
          }
        }
      } catch (error) {
        console.error('タグ追加例外:', error);
        
        // エラー時は状態を元に戻す
        setTags(prevTags => prevTags.filter(t => t.entry_id !== tempId));
        
        // parrots配列も元に戻す
        const revertedParrots = parrots.map(p => {
          if (p.parrot_id === parrot.parrot_id) {
            const revertedParrot = { ...p };
            if (revertedParrot.tags) {
              revertedParrot.tags = revertedParrot.tags.filter(t => t.entry_id !== tempId);
            }
            return revertedParrot;
          }
          return p;
        });

        setParrots(revertedParrots);
        
        setTagError('タグの追加中にエラーが発生しました');
      }
    };

    // 頻繁に使うタグをクリックして追加する関数（最適化版）
    const addFrequentTag = (tagName: string) => {
      // クリック時のタップハイライトを消す（フラッシュ防止）
      const activeElement = document.activeElement as HTMLElement;
      if (activeElement && typeof activeElement.blur === 'function') {
        activeElement.blur();
      }

      handleTagClick(tagName);
    };

    /**
     * モーダルのレアリティに応じたスタイルクラスを取得
     */
    const getModalClass = () => {
      if (!parrot.obtained) return styles.modalContentUnobtained;
      return styles[`modalContent${parrot.rarity.abbreviation}`];
    };

    /**
     * タグ入力フィールドでのキー押下イベント処理
     */
    const handleKeyPress = (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addTag();
      }
    };

    // ナビゲーション関連の関数
    /**
     * 前のパロットへ移動
     */
    const navigateToPreviousParrot = () => {
      // 獲得済みのパロットのみを対象にする
      const obtainedParrots = sortedAndFilteredParrots.filter(p => p.obtained);
      if (obtainedParrots.length <= 1) return;
      
      const currentIndex = obtainedParrots.findIndex(p => p.parrot_id === parrot.parrot_id);
      if (currentIndex === -1) return;
      
      const prevIndex = (currentIndex - 1 + obtainedParrots.length) % obtainedParrots.length;
      setSelectedParrot(obtainedParrots[prevIndex]);
    };

    /**
     * 次のパロットへ移動
     */
    const navigateToNextParrot = () => {
      // 獲得済みのパロットのみを対象にする
      const obtainedParrots = sortedAndFilteredParrots.filter(p => p.obtained);
      if (obtainedParrots.length <= 1) return;
      
      const currentIndex = obtainedParrots.findIndex(p => p.parrot_id === parrot.parrot_id);
      if (currentIndex === -1) return;
      
      const nextIndex = (currentIndex + 1) % obtainedParrots.length;
      setSelectedParrot(obtainedParrots[nextIndex]);
    };

    // タグボタンのレンダリングを最適化
    const frequentTagButtons = useMemo(() => {
      return frequentTags.map((tag) => {
        // 現在のタグリストから選択済みかどうかを判定
        const isSelected = tags.some(t => 
          t.parrot_tag_name.toLowerCase() === tag.parrot_tag_name.toLowerCase()
        );
        
        // key に一意の識別子を含める（リストの変更でもコンポーネントを再利用できるように）
        return (
          // タグボタンを最適化
          <button
            key={`tag-${tag.parrot_tag_name}`}
            className={`${styles.frequentTagButton} ${isSelected ? styles.tagSelected : ''}`}
            onClick={() => !isSelected && addFrequentTag(tag.parrot_tag_name)}
            aria-disabled={isSelected}
            title={tag.parrot_tag_name}
            // フォーカスアウトラインを非表示に
            style={{ outline: 'none', WebkitTapHighlightColor: 'transparent' }}
          >
            {tag.parrot_tag_name}
            <span className={styles.tagUsageCount}>{tag.usage_count}</span>
          </button>
        );
      });
    }, [frequentTags, tags]);

    // キーボードでのナビゲーション
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'ArrowLeft') {
          navigateToPreviousParrot();
        } else if (e.key === 'ArrowRight') {
          navigateToNextParrot();
        } else if (e.key === 'Escape') {
          onClose();
        }
      };
      
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }, [parrot.parrot_id]);

    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalNavigationWrapper}>
          {/* 左ナビゲーションボタン */}
          <button 
            className={`${styles.modalNavButton} ${styles.modalNavButtonLeft}`}
            onClick={(e) => {
              e.stopPropagation();
              navigateToPreviousParrot();
            }}
            aria-label="前のパロット"
          >
            <ChevronLeft size={24} />
          </button>
          
          {/* メインコンテンツ */}
          <div 
            className={`${styles.modalContent} ${getModalClass()}`} 
            onClick={e => e.stopPropagation()}
          >
            <button className={styles.closeButton} onClick={onClose}>×</button>
            
            <div className={styles.modalHeader}>
              <div className={styles.modalIconWrapper}>
                <ParrotIcon 
                  imageUrl={parrot.image_url}
                  name={parrot.name}
                  obtained={parrot.obtained || false}
                />
              </div>
              <div className={styles.modalInfo}>
                {/* パロットナンバーを追加（表示順を優先） */}
                <div className={styles.parrotNumber}>No.{parrot.display_order || parrotIndex + 1}</div>
                <h2 className={styles.modalTitle}>{parrot.name}</h2>
                <span 
                  className={`${styles.rarityBadge} ${styles[`rarityBadge${parrot.rarity.abbreviation}`]}`}
                >
                  {parrot.rarity.abbreviation}
                </span>
              </div>
            </div>
            <div className={styles.modalBody}>
              <p className={styles.description}>{parrot.description}</p>
              <div className={styles.detailsSection}>
                <h3>獲得情報</h3>
                {obtainInfo ? (
                  <>
                    <div className={styles.detailRow}>
                      <span>獲得日時</span>
                      <span>{new Date(obtainInfo.obtained_at).toLocaleString()}</span>
                    </div>
                    <div className={styles.detailRow}>
                      <span>重複獲得</span>
                      <span>{obtainInfo.obtain_count}回</span>
                    </div>
                  </>
                ) : (
                  <div className={styles.notObtained}>まだ獲得していません</div>
                )}
              </div>
              
              {/* タグセクション */}
              {obtainInfo && (
                <div className={styles.tagsSection}>
                  <h3>タグ</h3>

                  {frequentTags.length > 0 && (
                    <div className={styles.frequentTagsContainer}>
                      <p className={styles.frequentTagsLabel}>よく使うタグ:</p>
                      <div className={styles.frequentTagsItems}>
                        {frequentTagButtons}
                      </div>
                    </div>
                  )}
                  {tagError && (
                    <div className={styles.tagError}>
                      <AlertCircle size={16} />
                      <span>{tagError}</span>
                    </div>
                  )}
                  
                  <div className={styles.tagInputContainer}>
                    <input
                      type="text"
                      placeholder="新しいタグを追加"
                      value={newTagName}
                      onChange={(e) => setNewTagName(e.target.value)}
                      onKeyPress={handleKeyPress}
                      className={styles.tagInput}
                      disabled={loading}
                    />
                    <button 
                      onClick={addTag} 
                      className={styles.addTagButton}
                      disabled={loading || !newTagName.trim()}
                    >
                      追加
                    </button>
                  </div>
                  
                  <div className={styles.tagsContainer}>
                    {tags.length === 0 ? (
                      <p className={styles.noTags}>タグはまだありません</p>
                    ) : (
                      tags.map((tag) => (
                        <div 
                          key={tag.entry_id} 
                          className={styles.tagItem}
                          onClick={() => removeTag(tag.entry_id)} // タグ全体のクリックで削除関数を呼び出す
                        >
                          <span className={styles.tagText}>{tag.parrot_tag_name}</span>
                          <button 
                            className={styles.removeTagButton}
                            aria-label={`${tag.parrot_tag_name}を削除`}
                          >
                            ×
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* 右ナビゲーションボタン */}
          <button 
            className={`${styles.modalNavButton} ${styles.modalNavButtonRight}`}
            onClick={(e) => {
              e.stopPropagation();
              navigateToNextParrot();
            }}
            aria-label="次のパロット"
          >
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    );
  };
  // #endregion

  // #region レンダリング
  // ローディング表示
  if (loading || authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinnerWrapper}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loadingIconContainer}>
            <img 
              src="/gif/parrots/60fpsparrot.gif" 
              alt="Parrot Icon" 
              className={styles.loadingIcon}
              onError={(e) => {
                // 画像が404の場合は何も表示しない
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>
        <p className={styles.loadingText}>パロットデータを読み込み中...</p>
        <p className={styles.loadingSubtext}>お気に入りのパロットがもうすぐ表示されます</p>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className={styles.errorContainer}>
        <AlertCircle size={48} className={styles.errorIcon} />
        <h2>エラーが発生しました</h2>
        <p>{error}</p>
        <button 
          className={styles.retryButton}
          onClick={() => window.location.reload()}
        >
          再読み込み
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.titleSection}>
        <h1 className={styles.title}>パロットコレクション</h1>
        
        {/* ダッシュボードに戻るボタン */}
        <button
          onClick={() => window.location.href = '/dashboard'}
          className={styles.backToDashboardButton}
        >
          ダッシュボードに戻る
        </button>
      </div>
      
      {/* 未ログイン時のバナー */}
      {isAuthenticated === false && (
        <div className={styles.loginBanner}>
          <div className={styles.loginMessage}>
            <LogIn size={24} className={styles.loginIcon} />
            <div>
              <p className={styles.loginTitle}>ログインして獲得したパロットを確認しよう！</p>
              <p className={styles.loginDescription}>獲得したパロットの詳細情報や獲得日時を確認するには、ログインが必要です。</p>
            </div>
          </div>
          <button className={styles.loginButton} onClick={handleLogin}>
            ログイン
          </button>
        </div>
      )}
      
      <div className={styles.progressSection}>
        <div className={styles.progressInfo}>
          <div>
            <div className={styles.progressLabel}>コレクション達成率</div>
            <div className={styles.progressValue}>
              {calculateCollectionProgress(parrots).obtained} / {calculateCollectionProgress(parrots).total}
              <span className={styles.progressPercentage}>
                ({calculateCollectionProgress(parrots).percentage}%)
              </span>
            </div>
          </div>
        </div>
        <div className={styles.progressBarContainer}>
          <div 
            className={styles.progressBar} 
            style={{ width: `${calculateCollectionProgress(parrots).percentage}%` }}
          />
        </div>
      </div>
      
      <div className={styles.filterSection}>
        {/* モバイル表示時のフィルターボタン */}
        <div className={styles.mobileFilterToggle}>
          <FilterButton />
        </div>
        <div className={`${styles.filterHeader} ${showFilterMenu ? styles.show : ''}`}>
          <div className={styles.searchBox}>
            <Search className={styles.searchIcon} size={20} />
            <input
              type="text"
              placeholder="パロットを検索"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={styles.searchInput}
            />
          </div>

          <div className={styles.sortButtons}>
            <button
              className={`${styles.sortButton} ${sortType === 'display_order' ? styles.active : ''}`}
              onClick={() => setSortType('display_order')}
            >
              表示順
            </button>
            <button
              className={`${styles.sortButton} ${sortType === 'rarity' ? styles.active : ''}`}
              onClick={() => setSortType('rarity')}
            >
              レア度順
            </button>
            <button
              className={`${styles.sortButton} ${sortType === 'obtained_date' ? styles.active : ''}`}
              onClick={() => setSortType('obtained_date')}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? "ログインすると獲得日順で表示できます" : ""}
            >
              獲得日順
            </button>
          </div>

          <div className={styles.obtainedFilter}>
            <button
              className={`${styles.obtainedButton} ${showObtainedOnly ? styles.active : ''}`}
              onClick={() => setShowObtainedOnly(!showObtainedOnly)}
              disabled={!isAuthenticated}
              title={!isAuthenticated ? "ログインすると獲得済みのみの表示ができます" : ""}
            >
              {showObtainedOnly ? '全て表示' : '獲得済みのみ'}
            </button>
          </div>

          <div className={styles.rarityFilter}>
            <button
              className={`${styles.rarityButton} ${searchRarity === null ? styles.active : ''}`}
              onClick={() => setSearchRarity(null)}
              data-rarity="all"
            >
              All
            </button>
            {['N', 'R', 'SR', 'UR'].map((rarity) => (
              <button
                key={rarity}
                className={`${styles.rarityButton} ${searchRarity === rarity ? styles.active : ''}`}
                onClick={() => setSearchRarity(rarity)}
                data-rarity={rarity}
              >
                {rarity}
              </button>
            ))}
          </div>

          {isAuthenticated && allTags.length > 0 && (
          <div className={styles.tagFilter}>
            <div className={styles.tagFilterLabel}>
              タグで絞り込み:
            </div>
            <select
              className={styles.tagFilterSelect}
              value={searchTag || ''}
              onChange={(e) => setSearchTag(e.target.value || null)}
            >
              <option value="">すべてのタグ</option>
              {allTags.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            {searchTag && (
              <button
                className={styles.clearTagFilterButton}
                onClick={() => setSearchTag(null)}
              >
                クリア
              </button>
            )}
          </div>
        )}
        </div>
      </div>
      
      {/* ページネーション（上部） */}
      {totalPages > 1 && (
        <Pagination />
      )}
      
      <div className={styles.grid}>
        {currentParrots.map((parrot, index) => (
          <div 
            key={parrot.parrot_id} 
            className={`
              ${styles.parrotCard} 
              ${parrot.obtained ? styles.obtained : ''} 
              ${parrot.obtained ? styles[`rarity${parrot.rarity.abbreviation}`] : styles.unobtained}
              ${!isAuthenticated ? styles.notLoggedIn : ''}
            `}
            onClick={() => handleParrotClick(parrot)}
            title={!isAuthenticated ? "ログインして獲得したパロットを確認しよう" : 
                   !parrot.obtained ? "まだ獲得していません" : parrot.name}
          >
            <div className={styles.iconWrapper}>
              <ParrotIcon 
                imageUrl={parrot.image_url} 
                name={parrot.name}
                obtained={isAuthenticated ? (parrot.obtained || false) : false}
              />
            </div>
            <div className={styles.parrotName}>
              <div>No.{parrot.display_order || index + 1}</div>
              <div className={styles.parrotNameText}>
                {formatParrotName(parrot.name)}
              </div>
              <span 
                className={`${styles.rarityBadge} ${styles[`rarityBadge${parrot.rarity.abbreviation}`]}`}
              >
                {parrot.rarity.abbreviation}
              </span>
              {parrot.tags && parrot.tags.length > 0 && (
                <div className={styles.cardTagsContainer}>
                  {parrot.tags.slice(0, 2).map((tag, index) => (
                    <span key={index} className={styles.cardTagItem}>
                      {tag.parrot_tag_name}
                    </span>
                  ))}
                  {parrot.tags.length > 2 && (
                    <span className={styles.moreTagsBadge}>+{parrot.tags.length - 2}</span>
                  )}
                </div>
              )}
            </div>
            
            {/* 非ログイン時のロックアイコン */}
            {!isAuthenticated && (
              <div className={styles.lockOverlay}>
                <LogIn size={24} className={styles.lockIcon} />
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* ページネーション（下部） */}
      {totalPages > 1 && (
        <Pagination />
      )}
      
      {/* 結果が0件の場合のメッセージ */}
      {sortedAndFilteredParrots.length === 0 && (
        <div className={styles.noResults}>
          <AlertCircle size={32} />
          <p>条件に一致するパロットが見つかりませんでした</p>
          <button 
            className={styles.resetButton}
            onClick={() => {
              setSearchQuery('');
              setSearchRarity(null);
              setShowObtainedOnly(false);
              setSearchTag(null);
            }}
          >
            検索条件をリセット
          </button>
        </div>
      )}
      
      {selectedParrot && (
        <ParrotModal
          parrot={selectedParrot}
          onClose={() => setSelectedParrot(null)}
          allParrots={sortedAndFilteredParrots}
          parrots={parrots}
          setParrots={setParrots}
        />
      )}
    </div>
  );
  // #endregion
}