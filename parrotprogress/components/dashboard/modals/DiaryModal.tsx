import React from 'react';
import { X, Calendar, Clock, Edit2 } from 'lucide-react';
import styles from './DiaryModal.module.css';

// ActivityHistoryで使用する日記エントリー型
type ActivityDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
};

// 修正したDiaryModalの型
type DiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  entries: ActivityDiaryEntry[];
  onDataUpdated: () => void;
  isToday: boolean;
  onEditEntry?: (entry: ActivityDiaryEntry) => void; // 型を修正
};

const DiaryModal: React.FC<DiaryModalProps> = ({ 
  isOpen, 
  onClose, 
  date, 
  entries, 
  onDataUpdated,
  isToday,
  onEditEntry
}) => {
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 編集ボタンクリック時のハンドラー
  const handleEditClick = (entry: ActivityDiaryEntry) => {
    if (onEditEntry) {
      onEditEntry(entry); // 親コンポーネントに編集対象のエントリーを渡す
    }
  };

  // 記録追加ボタンクリック時のハンドラー
  const handleAddRecordClick = () => {
    if (onEditEntry) {
      // 空のエントリーを作成して編集モードで開く
      const emptyEntry: ActivityDiaryEntry = {
        time: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
        tags: [],
        activities: ['', '', '']
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
                        {tag}
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
                
                {/* アクティビティリスト */}
                {entry.activities.map((activity, actIndex) => (
                  activity && (
                    <div 
                      key={actIndex} 
                      className={styles.activityItem}
                    >
                      {activity}
                    </div>
                  )
                ))}
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

        {/* フッター: 記録追加ボタン */}
        {isToday && (
          <div className={styles.addRecordSection}>
            <button 
              className={styles.addRecordButton}
              onClick={handleAddRecordClick}
            >
              <Clock size={20} />
              <span>記録を追加</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default DiaryModal;