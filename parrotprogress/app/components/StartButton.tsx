'use client';
import { useState } from 'react';
import AuthModal from './AuthModal';
import styles from '../styles/Home.module.css'

export default function StartButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  function handleStart(): void {
    setIsModalOpen(true);
  }

  return (
    <>
      <button 
        className={styles.button}
        onClick={handleStart}
      >
        はじめる
      </button>
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </>
  );
}