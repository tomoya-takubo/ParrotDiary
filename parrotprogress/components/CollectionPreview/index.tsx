"use client";

// components/CollectionPreview/index.tsx
import { useEffect, useState } from 'react';
import { Filter, Search, LogIn, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ParrotIcon from '../ParrotIcon';
import styles from './styles.module.css';
import { useAuth } from '@/lib/AuthContext'; // 認証コンテキストをインポート

// 型定義を UUID に対応させる
type Parrot = {
  parrot_id: string; // UUID型
  name: string;
  rarity_id: string; // UUID型
  category_id: string; // UUID型
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
}

type SortType = 'display_order' | 'rarity' | 'obtained_date';

type Category = {
  category_id: string; // UUID型
  code: string;
  name: string;
}

type UserParrot = {
  user_id: string;
  parrot_id: string;
  obtained_at: string;
  obtain_count: number;
};

type RawParrot = {
  parrot_id: string;
  name: string;
  rarity_id: string;
  category_id: string;
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

export default function CollectionPreview() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parrots, setParrots] = useState<Parrot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedParrot, setSelectedParrot] = useState<Parrot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRarity, setSearchRarity] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('display_order');
  const [showObtainedOnly, setShowObtainedOnly] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null); // 認証状態を追跡
  
  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(24); // デフォルトのアイテム数
  const [totalPages, setTotalPages] = useState(1);
  
  // AuthContextからユーザー情報を取得
  const { user, isLoading: authLoading } = useAuth();

  // 現在のユーザーを取得
  const getCurrentUser = async () => {
    try {
      setError(null);
      
      // AuthContextで認証情報がロード中でない、かつユーザーが存在する場合
      if (!authLoading && user) {
        console.log('AuthContextからユーザー情報を使用:', user.id);
        setCurrentUser(user.id);
        setIsAuthenticated(true);
        return user.id;
      }
      
      // 通常のSupabase認証を確認
      const { data: { user: supabaseUser }, error } = await supabase.auth.getUser();
      
      if (error) {
        console.error('認証エラー:', error);
        setIsAuthenticated(false);
        setCurrentUser(null);
        return null;
      }
      
      if (supabaseUser) {
        console.log('Supabase直接ユーザー確認:', supabaseUser.id);
        setCurrentUser(supabaseUser.id);
        setIsAuthenticated(true);
        return supabaseUser.id;
      } else {
        setCurrentUser(null);
        setIsAuthenticated(false);
        return null;
      }
    } catch (error) {
      console.error('ユーザー情報取得エラー:', error);
      setError('ユーザー情報の取得に失敗しました。');
      setIsAuthenticated(false);
      setCurrentUser(null);
      return null;
    }
  };

  // カテゴリーデータのロード
  const loadCategories = async () => {
    try {
      setError(null);
      const { data: categoryData, error } = await supabase
        .from('category')
        .select('*')
        .order('display_order');
 
      if (error) {
        console.error('カテゴリーデータ取得エラー:', error);
        setError('カテゴリーデータの取得に失敗しました。');
        return;
      }
      
      // 型安全な変換を行う
      if (categoryData) {
        const typedCategories: Category[] = categoryData.map(item => ({
          category_id: item.category_id as string,
          code: item.code as string,
          name: item.name as string
        }));
        setCategories(typedCategories);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('カテゴリーデータ取得エラー:', error);
      setError('カテゴリーデータの取得に失敗しました。');
    }
  };

  // パロットデータの読み込み
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
            category_id: item.category_id,
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
          };
        
          return parrot;
        });
                
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

  // 画面サイズに応じてitemsPerPageを調整する関数
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
            loadCategories(),
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
              loadCategories(),
              loadParrotData(session.user.id)
            ]);
          } else {
            // セッションがない場合は通常の認証フローで確認
            console.log('セッションなし、getCurrentUserを実行');
            const userId = await getCurrentUser();
            await Promise.all([loadCategories(), loadParrotData(userId)]);
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
  }, [selectedCategory, searchQuery, searchRarity, showObtainedOnly, sortType]);

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

  const handleLogin = () => {
    // ログインページへリダイレクト
    window.location.href = '/login';
  };
  
  // ページネーション制御関数
  const handlePageChange = (pageNumber: number) => {
    if (pageNumber < 1 || pageNumber > totalPages) return;
    setCurrentPage(pageNumber);
    // ページ上部にスクロール
    window.scrollTo({
      top: document.querySelector('.'+styles.filterSection)?.getBoundingClientRect().top 
           ? (document.querySelector('.'+styles.filterSection)?.getBoundingClientRect().top as number) + window.scrollY - 20
           : 0,
      behavior: 'smooth'
    });
  };

  const getRarityOrder = (rarityAbbreviation: string): number => {
    switch (rarityAbbreviation) {
      case 'N': return 3;
      case 'R': return 2;
      case 'SR': return 1;
      case 'UR': return 0;
      default: return 999;
    }
  };
  
  const ParrotModal = ({ parrot, onClose }: { parrot: Parrot; onClose: () => void }) => {
    // ユーザーの獲得情報を取得（ログインユーザーのものだけ）
    const obtainInfo = parrot.user_parrots.find(up => up.user_id === currentUser);

    const getModalClass = () => {
      if (!parrot.obtained) return styles.modalContentUnobtained;
      return styles[`modalContent${parrot.rarity.abbreviation}`];
    };

    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={`${styles.modalContent} ${getModalClass()}`} onClick={e => e.stopPropagation()}>
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
          </div>
        </div>
      </div>
    );
  };

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
  
  const filteredParrots = parrots
    .filter(parrot => {
      // カテゴリーフィルター
      const categoryMatch = selectedCategory ? parrot.category_id === selectedCategory : true;
      // 名前での検索
      const nameMatch = parrot.name.toLowerCase().includes(searchQuery.toLowerCase());
      // レアリティでの検索
      const rarityMatch = searchRarity ? parrot.rarity.abbreviation === searchRarity : true;
      // 獲得済みフィルター
      const obtainedMatch = showObtainedOnly ? parrot.obtained : true;
      
      return categoryMatch && nameMatch && rarityMatch && obtainedMatch;
    });

  // 並び替え関数
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

  // フィルター適用後のパロットをさらに並び替え
  const sortedAndFilteredParrots = sortParrots(filteredParrots);
  
  // 総ページ数の計算とページネーションデータの準備
  useEffect(() => {
    const pages = Math.ceil(sortedAndFilteredParrots.length / itemsPerPage);
    setTotalPages(pages || 1); // 0の場合は1ページ
    
    // ページ番号が範囲外になった場合、調整
    if (currentPage > pages && pages > 0) {
      setCurrentPage(pages);
    }
  }, [sortedAndFilteredParrots.length, itemsPerPage, currentPage]);
  
  // 現在のページのパロットだけを表示
  const currentParrots = sortedAndFilteredParrots.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // パロット名を処理する関数
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

  // ページネーションコンポーネント
  const Pagination = () => {
    // 表示するページ番号の範囲を決定（最大5ページ分）
    const getPageNumbers = () => {
      const pageNumbers = [];
      const maxVisiblePages = 5; // 表示するページボタンの最大数
      
      let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
      
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

  // ローディング表示 - より洗練されたローディング画面
  if (loading || authLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinnerWrapper}>
          <div className={styles.loadingSpinner}></div>
          <div className={styles.loadingIconContainer}>
            <img 
              src="/parrot-icon.png" 
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
          <div className={styles.nextGoal}>
            次の目標：85%達成でプラチナパロット解放！
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
        <div className={styles.filterHeader}>
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
            >
              全レアリティ
            </button>
            {['N', 'R', 'SR', 'UR'].map((rarity) => (
              <button
                key={rarity}
                className={`${styles.rarityButton} ${searchRarity === rarity ? styles.active : ''}`}
                onClick={() => setSearchRarity(rarity)}
              >
                {rarity}
              </button>
            ))}
          </div>
        </div>
        
        <div className={styles.categories}>
          <Filter size={20} className={styles.filterIcon} />
          <button
            className={`${styles.categoryButton} ${selectedCategory === null ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            すべて ({parrots.length})
          </button>
          {categories.map(category => (
            <button
              key={category.category_id}
              className={`${styles.categoryButton} ${selectedCategory === category.category_id ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category.category_id)}
            >
              {category.name} ({parrots.filter(p => p.category_id === category.category_id).length})
            </button>
          ))}
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
            </div>
            
            {/* 非ログイン時のロックアイコン（オプション） */}
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
              setSelectedCategory(null);
              setShowObtainedOnly(false);
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
        />
      )}
    </div>
  );
}