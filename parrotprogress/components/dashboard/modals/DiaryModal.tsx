import React from 'react';
import { X, Calendar, Clock } from 'lucide-react';
import type { DiaryEntry } from '@/types';
import styles from './DiaryModal.module.css';

type DiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  entries: DiaryEntry[];
};

const DiaryModal: React.FC<DiaryModalProps> = ({
  isOpen,
  onClose,
  date,
  entries
}) => {
  // モーダル外のクリックを処理するハンドラー
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // オーバーレイ自体がクリックされた場合にのみモーダルを閉じる
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContainer}>
        {/* ヘッダー */}
        <div className={styles.modalHeader}>
          <div className={styles.headerTitleContainer}>
            <Calendar className={styles.diaryIcon} size={24} />
            <h2 className={styles.modalTitle}>{date}の記録</h2>
          </div>
          <button 
            onClick={onClose} 
            className={styles.closeButton}
          >
            <X size={24} />
          </button>
        </div>

        {/* エントリーリスト */}
        <div className={styles.entriesContainer}>
          {entries.map((entry, index) => (
            <div key={index} className={styles.entryCard}>
              {/* エントリーヘッダー */}
              <div className={styles.entryHeader}>
                <div className={styles.entryTime}>
                  <Clock size={16} />
                  <span>{entry.time}</span>
                </div>
                <div className={styles.entryTags}>
                  {entry.tags.map((tag, tagIndex) => (
                    <span
                      key={tagIndex}
                      className={styles.entryTag}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
              
              {/* アクティビティリスト */}
              {entry.activities.map((activity, actIndex) => (
                <div 
                  key={actIndex} 
                  className={styles.activityItem}
                >
                  {activity}
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* フッター: 記録追加ボタン */}
        <div className={styles.addRecordSection}>
          <button className={styles.addRecordButton}>
            <Clock size={20} />
            <span>記録を追加</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiaryModal;