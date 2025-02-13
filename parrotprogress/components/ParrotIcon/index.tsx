// components/ParrotIcon/index.tsx
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
      <div className={styles.imageContainer}>
        <Image
          src={imageUrl}
          alt={`${name}の画像`}
          width={100}
          height={100}
          style={{ 
            objectFit: 'contain',
            width: '100%',
            height: '100%'
          }}
        />
      </div>
    </div>
  );
};

export default ParrotIcon;