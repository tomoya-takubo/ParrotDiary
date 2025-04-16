import React from 'react';
import Image from 'next/image';
import styles from './styles.module.css';

type ParrotIconProps = {
  imageUrl: string;
  name: string;
  obtained: boolean;
}

const ParrotIcon: React.FC<ParrotIconProps> = ({ imageUrl, name, obtained }) => {
  return (
    <div className={`${styles.iconWrapper} ${!obtained ? styles.unobtained : ''}`}>
      <Image
        src={imageUrl}
        alt={`${name}の画像`}
        fill
        unoptimized
        style={{
          objectFit: 'contain',
          opacity: obtained ? 1 : 0.3,  // obtained状態に応じて透明度を変更
        }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};

export default ParrotIcon;
