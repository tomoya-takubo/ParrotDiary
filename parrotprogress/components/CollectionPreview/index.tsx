"use client";

import { useEffect, useState } from 'react';
import { Filter } from 'lucide-react';
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
    rarity_id: string;
    name: string;
    color_code: string;
  };
  obtained: boolean;
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

  const loadCategories = async () => {
    try {
      const { data: categoryData, error } = await supabase
        .from('category')
        .select('*')
        .order('category_id');

      if (error) throw error;
      console.log('Loaded categories:', categoryData); // デバッグ用
      setCategories(categoryData || []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const loadParrotData = async () => {
    try {
      setLoading(true);
      const { data: parrotData, error: parrotError } = await supabase
        .from('parrots')
        .select(`
          *,
          rarity:rarity_id(*)
        `);

      if (parrotError) throw parrotError;
      
      if (parrotData) {
        // パロット一覧をセット
        setParrots(parrotData);
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

  // パロットのフィルタリング
  const filteredParrots = selectedCategory
    ? parrots.filter(parrot => parrot.category_id === selectedCategory)
    : parrots;

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>パロットコレクション</h1>
      
      <div className={styles.filterSection}>
        <div className={styles.categories}>
          <Filter size={20} className={styles.filterIcon} />
          <button
            className={`${styles.categoryButton} ${selectedCategory === null ? styles.active : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            すべて
          </button>
          {categories.map(category => (
            <button
              key={category.category_id}
              className={`${styles.categoryButton} ${selectedCategory === category.category_id ? styles.active : ''}`}
              onClick={() => setSelectedCategory(category.category_id)}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.grid}>
        {filteredParrots.map(parrot => (
          <div key={parrot.parrot_id} className={styles.parrotCard}>
            <div className={styles.iconWrapper}>
              <ParrotIcon 
                imageUrl={parrot.image_url} 
                name={parrot.name}
                obtained={parrot.obtained || false}
              />
            </div>
            <div className={styles.parrotName}>
              {parrot.name}
              <span 
                className={styles.rarityBadge}
                style={{ backgroundColor: parrot.rarity.color_code }}
              >
                {parrot.rarity.name}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}