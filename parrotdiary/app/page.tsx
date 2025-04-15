'use client';

import { ArrowRight, BookOpen, Gift } from 'lucide-react';
import StartButton from '@/components/StartButton';
import styles from '@/styles/Home.module.css';
import { ParrotCollection } from '@/components/ParrotCollection';
import { createClient } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';
import Image from 'next/image';

// Supabase クライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const getSingleGifUrl = (folder: string, fileName: string) => {
  return supabase.storage.from('Parrots').getPublicUrl(`${folder}/${fileName}`).data.publicUrl;
};

export default function Home() {

  const [gifUrl, setGifUrl] = useState<string | null>(null);

  useEffect(() => {
    const url = getSingleGifUrl('parrots', '60fpsparrot.gif');
    setGifUrl(url);
  }, []);

  return (
    <main className={styles.container}>
      <div className={styles.wrapper}>
        <div className={styles.hero}>
          <h1 className={styles.title}> ぱろっとだいありー </h1>
          <p className={styles.subtitle}>PartyParrotと一緒に楽しく継続</p>
          <div className={styles.heroParrot}>
            {gifUrl && (
              <Image
                src={gifUrl}
                alt="Party Parrot"
                width={400}
                height={400}
                style={{
                  width: '100%',
                  height: 'auto',
                  maxWidth: '100%'
                }}
                priority // 優先的に読み込み
              />
            )}
          </div>
          <StartButton />
        </div>
      </div>
      <section className={styles.features}>
        <div className={styles.featureGrid}>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={`${styles.iconWrapper} ${styles.iconPurple}`}>
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className={styles.featureTitle}>3行日記</h3>
            </div>
            <p className={styles.featureDescription}>
              シンプルな3行で今日を振り返り。<br />
              活動記録カレンダーで過去の記録数や日記を確認できます。
            </p>
          </div>
          <div className={styles.featureCard}>
            <div className={styles.featureIcon}>
              <div className={`${styles.iconWrapper} ${styles.iconPink}`}>
                <Gift className="w-6 h-6" />
              </div>
              <h3 className={styles.featureTitle}>PartyParrotガチャ</h3>
            </div>
            <p className={styles.featureDescription}>
              獲得したチケットでレアなPartyParrotをゲット！<br />
              個性的なPartyParrotをたくさん集めよう！
            </p>
          </div>
        </div>
      </section>
      <section className={styles.collection}>
        <div className={styles.collectionInner}>
          <h2 className={styles.collectionTitle}>可愛いPartyParrotを集めよう！</h2>
          <ParrotCollection />
          <p className={styles.collectionDescription}>
            目標達成や継続記録でレアなPartyParrotをゲット！
          </p>
        </div>
      </section>
      <section className={styles.ecoSection}>
        <div className={styles.ecoInner}>
          <h2 className={styles.ecoTitle}>カカポ保護活動への貢献</h2>
          <div className={styles.ecoDescription}>
            <p>あなたの継続的な活動が、実際のカカポ（PartyParrotのモデル）の保護活動に貢献します。</p>
            <p>カカポは絶滅が危惧されている貴重な鳥類です。</p>
          </div>
          <a
            href="https://www.doc.govt.nz/kakapo-recovery"
            target="_blank"
            rel="noopener noreferrer"
            className={styles.ecoLink}
          >
            詳しく見る <ArrowRight className={styles.ecoArrow} />
          </a>
        </div>
      </section>
    </main>
  );
}