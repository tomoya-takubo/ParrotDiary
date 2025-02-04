'use client';

import { useState, useEffect } from 'react';
import styles from '../styles/Home.module.css';
import { ParrotImage } from '@/app/types';

const getRandomParrots = (parrots: ParrotImage[], count: number) => {
  const shuffled = [...parrots].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};

export const ParrotCollection = () => {
  const [displayParrots, setDisplayParrots] = useState<ParrotImage[]>([]);

  useEffect(() => {
    const fetchParrots = async () => {
      const response = await fetch('/api/parrots');
      const allParrots = await response.json();
      setDisplayParrots(getRandomParrots(allParrots, 4));
    };

    fetchParrots();
  }, []);

  return (
    <div className={styles.parrotGrid}>
      {displayParrots.map((parrot, i) => (
        <div key={i} className={styles.parrotItem}>
          <img src={parrot.src} alt={parrot.alt} />
        </div>
      ))}
    </div>
  );
};