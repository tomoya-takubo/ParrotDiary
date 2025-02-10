'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import styles from '@/styles/ParrotCollection.module.css';

// パロットの型を定義
type Parrot = {
  id: number;
  name: string;
  rarity_id: string;
  description: string;
  image_path: string;
};

export default function ParrotCollection() {
  const [parrots, setParrots] = useState<Parrot[]>([]);

  useEffect(() => {
    const fetchParrots = async () => {
      const { data, error } = await supabase.from('parrot_master').select('*');
      if (error) {
        console.error('データ取得エラー:', error.message);
      } else {
        setParrots(data as Parrot[]);
      }
    };
    fetchParrots();
  }, []);

  return (
    <div className={styles.parrotGrid}>
      {parrots.map(parrot => (
        <div key={parrot.id} className={styles.parrotCard}>
          <Image src={parrot.image_path} alt={parrot.name} width={100} height={100} />
          <p>{parrot.name}</p>
        </div>
      ))}
    </div>
  );
}
