import React from 'react';
import Image from 'next/image';
import styles from './styles.module.css';

/**
 * パロットアイコンコンポーネントのプロパティ型定義
 */
type ParrotIconProps = {
  /** パロット画像のURL */
  imageUrl: string;
  /** パロットの名前 */
  name: string;
  /** ユーザーが所持しているかどうか */
  obtained: boolean;
}

/**
 * パロットアイコン表示コンポーネント
 * ユーザーの所持状況に応じて透明度を変更して表示する
 * @param props コンポーネントのプロパティ
 * @param props.imageUrl パロット画像のURL
 * @param props.name パロットの名前
 * @param props.obtained ユーザーが所持しているかどうか
 * @returns パロットアイコンコンポーネント
 */
const ParrotIcon: React.FC<ParrotIconProps> = ({ imageUrl, name, obtained }) => {
  return (
    <div className={`${styles.iconWrapper} ${!obtained ? styles.unobtained : ''}`}>
      <Image
        src={imageUrl}
        alt={`${name}の画像`}
        fill
        style={{
          objectFit: 'contain',
          opacity: obtained ? 1 : 0.3,  // obtained状態に応じて透明度を変更
        }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        priority={obtained}
        loading={obtained ? 'eager' : 'lazy'}
      />
    </div>
  );
};

export default ParrotIcon;
