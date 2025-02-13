// components/ParrotIcon/index.tsx
import React from 'react';
import Image from 'next/image';

type ParrotIconProps = {
  imageUrl: string;
  name: string;  // alt属性用
}

const ParrotIcon: React.FC<ParrotIconProps> = ({ imageUrl, name }) => {
  return (
    <div className="relative w-full h-full">
      <Image
        src={imageUrl}
        alt={`${name}の画像`}
        fill
        style={{ objectFit: 'contain' }}
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
      />
    </div>
  );
};

export default ParrotIcon;