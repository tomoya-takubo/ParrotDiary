// components/CollectionPreview/index.tsx
"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ParrotIcon from '../ParrotIcon';
import styles from './styles.module.css';

type Parrot = {
  parrot_id: number;
  name: string;
  category_id: number;
  rarity_id: number;
  description: string | null;
  image_url: string;
    rarity: {
    rarity_id: string;
    name: string;
    color_code: string;
  };
}

type UserParrot = {
  user_id: number;
  parrot_id: number;
  obtained_at: string;
  obtain_count: number;
}

export default function CollectionPreview() {
  const [loading, setLoading] = useState(true);
  const [parrots, setParrots] = useState<Parrot[]>([]);
  const [userParrots, setUserParrots] = useState<UserParrot[]>([]);

  useEffect(() => {
    loadParrotData();
  }, []);

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

      console.log('Fetched parrot data:', parrotData);
      
      if (parrotData) {
        setParrots(parrotData);
      }

    } catch (error) {
      console.error('Error loading parrot data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>パロットコレクション</h1>
      <div className={styles.grid}>
        {parrots.map(parrot => {
          console.log('Parrot data:', {
            id: parrot.parrot_id,
            name: parrot.name,
            imageUrl: parrot.image_url
          });

          return (
            <div key={parrot.parrot_id} className={styles.parrotCard}>
              <div className={styles.iconWrapper}>
                <ParrotIcon 
                  imageUrl={parrot.image_url} 
                  name={parrot.name}
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
          );
        })}
      </div>
    </div>
  );
}