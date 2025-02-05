'use client';
import { useState } from 'react';
import AuthModal from './AuthModal';
import styles from '../styles/Home.module.css'

export default function StartButton() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleModalOpen = () => {
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <button 
        className={styles.button}
        onClick={handleModalOpen}
      >
        はじめる
      </button>
      <AuthModal 
        isOpen={isModalOpen} 
        onClose={handleModalClose} 
        key={isModalOpen ? 'open' : 'closed'}  // keyを追加
      />
    </>
  );
}