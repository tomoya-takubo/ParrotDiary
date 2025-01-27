'use client'; 
import StartButton from './components/StartButton';
import styles from './styles/Home.module.css';

export default function Home() {
  
  
  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.hero}>
          <h1 className={styles.title}> ぱろっとぷろぐれす </h1>
          <p className={styles.subtitle}>PartyParrotと一緒に楽しく継続</p>
          <StartButton />
        </div>
      </div>
    </main>
  );
}