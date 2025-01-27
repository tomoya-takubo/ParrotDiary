import Image from "next/image";
import styles from './styles/Home.module.css';

export default function Home() {
  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.hero}>
          <h1 className={styles.title}> ぱろっとぷろぐれす </h1>
          <p className={styles.subtitle}>PartyParrotと一緒に楽しく継続</p>
          <button className={styles.button}>
            はじめる
          </button>
        </div>
      </div>
    </main>
  );
}