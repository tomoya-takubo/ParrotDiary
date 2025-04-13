import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DiaryModal.module.css';

// ActivityHistoryで使用する日記エントリー型
type ActivityDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
  entry_id?: number | string;
  parrots?: string[];
};

// DiaryModalの型
type DiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  entries: ActivityDiaryEntry[];
  onDataUpdated: () => void;
  isToday: boolean;
  onEditEntry?: (entry: ActivityDiaryEntry) => void;
  onDateChange?: (newDate: string) => void;
};

const DiaryModal: React.FC<DiaryModalProps> = ({ 
  isOpen, 
  onClose, 
  date, 
  entries,
  isToday,
  onEditEntry,
  onDateChange
}) => {
  // ローディングインジケーター表示のための状態
  const [isLoading, setIsLoading] = useState(false);

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

  // 日付をyyyy年MM月dd日形式にフォーマットする関数
  const formatDateToJapanese = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}年${month}月${day}日`;
  };

  // 前日へナビゲート
  const navigateToPreviousDay = () => {
    if (isLoading || !date || !onDateChange) return;
    
    try {
      setIsLoading(true);
      
      // 日付文字列をDateオブジェクトに変換
      const matches = date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (!matches) {
        console.error('日付形式が一致しません:', date);
        setIsLoading(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, yearStr, monthStr, dayStr] = matches;
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // JavaScriptの月は0-11
      const day = parseInt(dayStr);
      
      const currentDate = new Date(year, month, day);
      
      // 前日の日付を計算
      currentDate.setDate(currentDate.getDate() - 1);
      
      // yyyy年MM月dd日 形式に変換
      const newDateStr = formatDateToJapanese(currentDate);
      
      // 親コンポーネントに通知
      onDateChange(newDateStr);
    } catch (e) {
      console.error('日付変換エラー:', e);
      setIsLoading(false);
    }
  };

  // 翌日へナビゲート
  const navigateToNextDay = () => {
    if (isLoading || !date || !onDateChange) return;
    
    try {
      setIsLoading(true);
      
      // 日付文字列をDateオブジェクトに変換
      const matches = date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (!matches) {
        console.error('日付形式が一致しません:', date);
        setIsLoading(false);
        return;
      }
      
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, yearStr, monthStr, dayStr] = matches;
      const year = parseInt(yearStr);
      const month = parseInt(monthStr) - 1; // JavaScriptの月は0-11
      const day = parseInt(dayStr);
      
      const currentDate = new Date(year, month, day);
      
      // 翌日の日付を計算
      currentDate.setDate(currentDate.getDate() + 1);
      
      // 現在の日付（今日）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 今日より未来の日付は選択できないようにする
      if (currentDate <= today) {
        const newDateStr = formatDateToJapanese(currentDate);
        onDateChange(newDateStr);
      } else {
        console.log('未来の日付は選択できません');
        setIsLoading(false);
      }
    } catch (e) {
      console.error('日付変換エラー:', e);
      setIsLoading(false);
    }
  };
  
  // 日付変更が完了したときの処理
  useEffect(() => {
    // 日付が変更されたらローディング状態を解除
    setIsLoading(false);
  }, [entries]);

  // キーボードでのナビゲーション
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowLeft') {
        navigateToPreviousDay();
      } else if (e.key === 'ArrowRight' && !isToday) {
        navigateToNextDay();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, date, isToday]);

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContainer}>
        {/* ローディングインジケーター */}
        {isLoading && (
          <div className={styles.loadingIndicator}>
            <div className={styles.spinner}></div>
          </div>
        )}
        
        {/* 日付ナビゲーション - モーダル内部に配置 */}
        <div className={styles.dateNavigation}>
          <button 
            className={styles.dateNavButton}
            onClick={navigateToPreviousDay}
            disabled={isLoading}
            aria-label="前日"
          >
            <ChevronLeft size={20} />
          </button>
          
          <div className={styles.dateDisplay}>
            <Calendar size={20} />
            <span>{date}</span>
          </div>
          
          <button 
            className={styles.dateNavButton}
            onClick={navigateToNextDay}
            disabled={isToday || isLoading}
            aria-label="翌日"
          >
            <ChevronRight size={20} />
          </button>
        </div>
        
        {/* 閉じるボタン */}
        <button 
          onClick={onClose} 
          className={styles.closeButton}
        >
          <X size={24} />
        </button>

        {/* 記録追加ボタン */}
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
                      <span>編集</span>
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
                
                  {/* パロットGIFの表示 */}
                  {entry.parrots && entry.parrots.length > 0 ? (
                    <div className={styles.parrotContainer}>
                      {entry.parrots.map((parrot, parrotIndex) => (
                        <img 
                          key={parrotIndex}
                          src={parrot}
                          alt={`Parrot ${parrotIndex + 1}`}
                          width={24}
                          height={24}
                          className={styles.parrotGif}
                        />
                      ))}
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
        
        {/* 元のナビゲーション - 非表示にするため残しておく */}
        <div className={styles.modalNavigationWrapper}>
          <button className={styles.modalNavButton} disabled>
            <ChevronLeft size={24} />
          </button>
          
          <button className={styles.modalNavButton} disabled>
            <ChevronRight size={24} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DiaryModal;