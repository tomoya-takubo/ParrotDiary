import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, Edit2 } from 'lucide-react';
import styles from './DiaryModal.module.css';
import { getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector';

// ActivityHistoryで使用する日記エントリー型
type ActivityDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
  entry_id?: number | string;
  parrots?: string[];
};

// 修正したDiaryModalの型
type DiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  entries: ActivityDiaryEntry[];
  onDataUpdated: () => void;
  isToday: boolean;
  onEditEntry?: (entry: ActivityDiaryEntry) => void;
};

const DiaryModal: React.FC<DiaryModalProps> = ({ 
  isOpen, 
  onClose, 
  date, 
  entries, // すでにパロット情報を含むエントリー
  isToday,
  onEditEntry
}) => {
  // parrotsLoaded状態を追加
  const [parrotsLoaded] = useState(false);
  // エントリーごとのパロット情報を管理する状態
  const [entriesWithParrots] = useState<ActivityDiaryEntry[]>([]);
  
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleEditClick = (entry: ActivityDiaryEntry) => {
    if (onEditEntry) {
      onEditEntry(entry);
    }
  };

  const handleAddRecordClick = () => {
    if (onEditEntry) {
      const emptyEntry: ActivityDiaryEntry = {
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        tags: [],
        activities: ['', '', ''],
        parrots: []
      };
      onEditEntry(emptyEntry);
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

        {/* 記録追加ボタンを上に移動 */}
        {isToday && (
          <div className={styles.addRecordTop}>
            <button 
              className={styles.addRecordButton}
              onClick={handleAddRecordClick}
            >
              <Clock size={20} />
              <span>記録を追加</span>
            </button>
          </div>
        )}

        {/* エントリーリスト */}
        <div className={styles.entriesContainer}>
          {entries.length > 0 ? (
            entries.map((entry, index) => (
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
                        #{tag}
                      </span>
                    ))}
                    {/* 編集ボタン */}
                    <button
                      onClick={() => handleEditClick(entry)}
                      className={styles.editButton}
                    >
                      <Edit2 size={14} />
                      編集
                    </button>
                  </div>
                </div>
                
                {/* アクティビティリストとパロット表示 */}
                <div className={styles.entryContent}>
                  {/* アクティビティリスト */}
                  <div className={styles.activitiesSection}>
                    {entry.activities.filter(Boolean).map((activity, actIndex) => (
                      <div 
                        key={actIndex} 
                        className={styles.activityItem}
                      >
                        {activity}
                      </div>
                    ))}
                  </div>
                
                  {/* パロットGIFの表示 - imgタグを使用 */}
                  {entry.parrots && entry.parrots.length > 0 ? (
                    <div className={styles.parrotContainer}>
                      {entry.parrots.map((parrot, parrotIndex) => {
                        console.log(`パロット表示: ${parrot}`); // デバッグ用
                        return (
                          <img 
                            key={parrotIndex}
                            src={parrot}
                            alt={`Parrot ${parrotIndex + 1}`}
                            width={24}
                            height={24}
                            className={styles.parrotGif}
                          />
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noEntriesMessage}>
              <div className={styles.noEntriesIcon}>📝</div>
              <p>この日の記録はありません</p>
              {isToday && <p className={styles.noEntriesSubtext}>下の「記録を追加」ボタンから新しい記録を作成できます</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DiaryModal;