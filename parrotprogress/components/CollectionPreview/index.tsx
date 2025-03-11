"use client";

// components/CollectionPreview/index.tsx
import { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ParrotIcon from '../ParrotIcon';
import styles from './styles.module.css';

// 型定義を UUID に対応させる
type Parrot = {
  parrot_id: string; // UUID型に変更
  name: string;
  rarity_id: string; // UUID型に変更
  category_id: string; // UUID型に変更
  description: string | null;
  image_url: string;
  display_order?: number; // 表示順序を追加（ソート用）
  rarity: {
    rarity_id: string; // UUID型に変更
    name: string;
    abbreviation: string;
    drop_rate: number;
  };
  user_parrots: {
    user_id: string; // UUID型に変更
    parrot_id: string; // UUID型に変更
    obtained_at: string;
    obtain_count: number;
  }[];
  obtained?: boolean;
}

type SortType = 'display_order' | 'rarity' | 'obtained_date';

type Category = {
  category_id: string; // UUID型に変更
  code: string;
  name: string;
}

export default function CollectionPreview() {
  const [loading, setLoading] = useState(true);
  const [parrots, setParrots] = useState<Parrot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null); // UUID型に変更
  const [selectedParrot, setSelectedParrot] = useState<Parrot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRarity, setSearchRarity] = useState<string | null>(null);
  const [sortType, setSortType] = useState<SortType>('display_order'); // id -> display_order に変更
  const [showObtainedOnly, setShowObtainedOnly] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<string | null>(null); // 現在のユーザーIDを保持

  // 現在のユーザーを取得
  const getCurrentUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUser(user.id);
      }
    } catch (error) {
      console.error('Error getting current user:', error);
    }
  };

  const loadCategories = async () => {
    try {
      const { data: categoryData, error } = await supabase
        .from('category')
        .select('*')
        .order('display_order'); // IDでのソートではなく表示順でソート
 
      if (error) throw error;
      console.log('Loaded categories:', categoryData);
      setCategories(categoryData || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  }

  const loadParrotData = async () => {
    try {
      setLoading(true);
      
      // 現在のユーザーを取得
      await getCurrentUser();
      
      const { data: parrotData, error: parrotError } = await supabase
        .from('parrots')
        .select(`
          *,
          rarity:rarity_id(*),
          user_parrots(*)
        `);
  
      if (parrotError) throw parrotError;
      
      if (parrotData) {
        // ログを追加して変換前のデータを確認
        console.log('Before mapping:', parrotData[0].user_parrots);
        
        // データに表示順がなければ手動で追加
        const parrotsWithDisplayOrder = parrotData.map((parrot, index) => ({
          ...parrot,
          display_order: parrot.display_order || index + 1 // 表示順がなければインデックス+1を使用
        }));
        
        // パロットをdisplay_orderでソート
        const sortedParrotData = parrotsWithDisplayOrder.sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
        
        // ログインユーザーのIDを使用して獲得状態をチェック
        const parrotsWithObtainedStatus = sortedParrotData.map(parrot => ({
          ...parrot,
          obtained: Array.isArray(parrot.user_parrots) && 
                    parrot.user_parrots.some((up: { user_id: string }) => up.user_id === currentUser)
        }));

        // ログを追加して変換後のデータを確認
        console.log('After mapping:', parrotsWithObtainedStatus[0].obtained);
        
        setParrots(parrotsWithObtainedStatus);
      }
  
    } catch (error) {
      console.error('Error loading parrot data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, []);

  // ユーザーIDが変更されたときにパロットデータをリロード
  useEffect(() => {
    loadParrotData();
  }, [currentUser]);

  const handleParrotClick = (parrot: Parrot) => {
    if (parrot.obtained) {
      setSelectedParrot(parrot);
    }
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
              {obtainInfo && (
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
          
          // 獲得日時で並び替え（新しい順）
          return new Date(bObtainedInfo.obtained_at).getTime() - 
                 new Date(aObtainedInfo.obtained_at).getTime();
        });
      case 'display_order':
      default:
        return [...parrots].sort((a, b) => 
          (a.display_order || 0) - (b.display_order || 0)
        );
    }
  };

  // フィルター適用後のパロットをさらに並び替え
  const sortedAndFilteredParrots = sortParrots(filteredParrots);

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

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>パロットコレクション</h1>
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

        {/* 並び替えボタンのJSX - 'ID順'を'表示順'に変更 */}
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
          >
            獲得日順
          </button>
        </div>

        <div className={styles.obtainedFilter}>
          <button
            className={`${styles.obtainedButton} ${showObtainedOnly ? styles.active : ''}`}
            onClick={() => setShowObtainedOnly(!showObtainedOnly)}
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
    <div className={styles.grid}>
        {sortedAndFilteredParrots.map((parrot, index) => (
          <div 
            key={parrot.parrot_id} 
            className={`
              ${styles.parrotCard} 
              ${parrot.obtained ? styles.obtained : ''} 
              ${parrot.obtained ? styles[`rarity${parrot.rarity.abbreviation}`] : styles.unobtained}
            `}
            onClick={() => handleParrotClick(parrot)}
          >
            <div className={styles.iconWrapper}>
              <ParrotIcon 
                imageUrl={parrot.image_url} 
                name={parrot.name}
                obtained={parrot.obtained || false}
              />
            </div>
            <div className={styles.parrotName}>
              <div>No.{parrot.display_order || index + 1}</div>  {/* 番号を表示順またはインデックスで表示 */}
                <div className={styles.parrotNameText}>
                  {formatParrotName(parrot.name)}
                </div>
                <span 
                  className={`${styles.rarityBadge} ${styles[`rarityBadge${parrot.rarity.abbreviation}`]}`}
                >
                {parrot.rarity.abbreviation}
                </span>
            </div>
          </div>
        ))}
      </div>
      {selectedParrot && (
        <ParrotModal
          parrot={selectedParrot}
          onClose={() => setSelectedParrot(null)}
        />
      )}
    </div>
  );
}