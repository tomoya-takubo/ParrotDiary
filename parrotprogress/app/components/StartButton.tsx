'use client';
import styles from '../styles/Home.module.css'

export default function StartButton(){

  function handleStart(): void {
    // Todo: 後でモーダルを実装する際に使用
    console.log("はじめるボタンがクリックされました");
  }

  return (
    <button 
    className={styles.button}
    onClick={handleStart}
  >
    はじめる
  </button>
  )
}