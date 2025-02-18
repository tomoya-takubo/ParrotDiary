"use client";

// components/CollectionPreview/index.tsx
import { useEffect, useState } from 'react';
import { Filter, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import ParrotIcon from '../ParrotIcon';
import styles from './styles.module.css';

type Parrot = {
  parrot_id: number;
  name: string;
  rarity_id: number;
  category_id: number;
  description: string | null;
  image_url: string;
  rarity: {
    rarity_id: number;
    name: string;
    abbreviation: string;
    drop_rate: number;
  };
  user_parrots: {
    user_id: number;
    parrot_id: number;
    obtained_at: string;
    obtain_count: number;
  }[];
  obtained?: boolean;  // obtainedをオプショナルに
}

type Category = {
  category_id: number;
  code: string;
  name: string;
}

export default function CollectionPreview() {
  const [loading, setLoading] = useState(true);
  const [parrots, setParrots] = useState<Parrot[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedParrot, setSelectedParrot] = useState<Parrot | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchRarity, setSearchRarity] = useState<string | null>(null);
  

  const loadCategories = async () => {
    try {
      const { data: categoryData, error } = await supabase
        .from('category')
        .select('*')
        .order('category_id');
 
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
        
        const sortedParrotData = parrotData.sort((a, b) => a.parrot_id - b.parrot_id);
        const parrotsWithObtainedStatus = sortedParrotData.map(parrot => ({
          ...parrot,
          obtained: Array.isArray(parrot.user_parrots) && parrot.user_parrots.length > 0
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
    loadParrotData();
  }, []);

  const handleParrotClick = (parrot: Parrot) => {
    if (parrot.obtained) {
      setSelectedParrot(parrot);
    }
  };

  const ParrotModal = ({ parrot, onClose }: { parrot: Parrot; onClose: () => void }) => {
    // 獲得情報を取得
    const obtainInfo = parrot.user_parrots[0];

    return (
      <div className={styles.modalOverlay} onClick={onClose}>
        <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
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
    const percentage = Math.floor((obtained / total) * 100);
    
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
    
    return categoryMatch && nameMatch && rarityMatch;
  })
  .sort((a, b) => a.parrot_id - b.parrot_id);
  
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
        <div className={styles.rarityFilter}>
          <button
            className={`${styles.rarityButton} ${searchRarity === null ? styles.active : ''}`}
            onClick={() => setSearchRarity(null)}
          >
            全レアリティ
          </button>
          {['UR', 'SR', 'R', 'N'].map((rarity) => (
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
        {filteredParrots.map(parrot => (
          <div 
            key={parrot.parrot_id} 
            className={`
              ${styles.parrotCard} 
              ${parrot.obtained ? styles.obtained : ''} 
              ${styles[`rarity${parrot.rarity.abbreviation}`]}
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
              <div>No.{parrot.parrot_id}</div>  {/* 番号を追加 */}
                {parrot.name}
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