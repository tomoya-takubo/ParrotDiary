import { supabase } from '../lib/supabase';
import Image from 'next/image';

// Parrotの型を定義
interface Parrot {
  id: number;
  name: string;
  rarity_id: string;
  description: string;
  image_path: string;
}

export default async function CollectionPage() {
  // 非同期でデータを取得
  const { data: parrots, error } = await supabase.from('parrot_master').select('*');
  
  // エラー処理
  if (error) {
    console.error(error);
    return <div>エラーが発生しました。</div>;  // エラーメッセージを表示
  }

  console.log(parrots);  // データをコンソールに表示

  return (
    <div className="collection-page">
      <h1>パロットコレクション</h1>
      <div className="parrot-grid">
        {parrots?.map((parrot: Parrot) => (
          <div key={parrot.id} className="parrot-card">
            <div className="parrot-image">
              <Image src={parrot.image_path} alt={parrot.name} width={100} height={100} />
            </div>  
            <div className="parrot-info">
              <p className="parrot-name">{parrot.name}</p>
              <p className="parrot-rarity">{parrot.rarity_id}</p>
              <p className="parrot-rarity">{parrot.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
