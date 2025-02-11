"use client";

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

// パロットの型定義（category_id, rarity_id を使用）
type Parrot = {
  id: number;
  name: string;
  category_id: string;
  rarity_id: string;
  category_name?: string;
  rarity_name?: string;
  description: string;
  image_url: string;
};

export default function ParrotCollection() {
  const [parrots, setParrots] = useState<Parrot[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const fetchParrots = async () => {
      const { data, error } = await supabase
        .from('parrots')
        .select(`
          id, name, category_id, rarity_id, description, image_url,
          category (name)
        `);

        console.log('取得データ:', data); // 🟢 データの構造を確認

      if (error) {
        console.error('データ取得エラー:', error.message);
      } else {
        // category[0]?.name で配列の最初の要素を取得
        const formattedData: Parrot[] = data.map(parrot => ({
          ...parrot,
          category_name: parrot.category?.[0]?.name || '不明',
        }));

        setParrots(formattedData);
      }
    };
    fetchParrots();
  }, []);

  // フィルタリング
  const filteredParrots = selectedCategory === 'all'
    ? parrots
    : parrots.filter(parrot => parrot.category_name === selectedCategory);

  return (
    <div>
      <h1>パロットコレクション</h1>

      {/* カテゴリフィルタ */}
      <div>
        <button onClick={() => setSelectedCategory('all')}>すべて</button>
        <button onClick={() => setSelectedCategory('ガチャ')}>ガチャ</button>
        <button onClick={() => setSelectedCategory('実績')}>実績</button>
      </div>

      {/* 一覧表示 */}
      <div className="parrotGrid">
        {filteredParrots.length === 0 && <p>該当するパロットがありません</p>}
        {filteredParrots.map(parrot => (
          <div key={parrot.id} className="parrotCard">
            <Image src={parrot.image_url} alt={parrot.name} width={100} height={100} />
            <p>{parrot.name}</p>
            <p>カテゴリ: {parrot.category_name}</p>
            <p>レア度: {parrot.rarity_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
