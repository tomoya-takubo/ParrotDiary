import React, { useState, useEffect } from 'react';
import { X, Calendar, Clock, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './DiaryModal.module.css';

/**
 * 日記エントリーの型定義
 * ActivityHistoryで使用する
 */
type ActivityDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
  entry_id?: number | string;
  parrots?: string[];
};

/**
 * DiaryModalのプロパティ定義
 */
type DiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  entries: ActivityDiaryEntry[];
  onDataUpdated: () => void;
  isToday: boolean;
  onEditEntry?: (entry: ActivityDiaryEntry) => void;
  onDateChange?: (newDate: string) => void; // 日付変更ハンドラ
};

/**
 * 日記モーダルコンポーネント
 * 日記エントリーを表示し、ナビゲーション機能を提供する
 */
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

  /**
   * 日付をyyyy年MM月dd日形式にフォーマットする関数
   */
  const formatDateToJapanese = (date: Date): string => {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    
    return `${year}年${month}月${day}日`;
  };

  /**
   * モーダルのオーバーレイをクリックした時のハンドラ
   * モーダル外をクリックした場合のみ閉じる
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * エントリー編集ボタンクリック時のハンドラ
   */
  const handleEditClick = (entry: ActivityDiaryEntry) => {
    if (onEditEntry) {
      onEditEntry(entry);
    }
  };

  /**
   * 記録追加ボタンクリック時のハンドラ
   * 空のエントリーを作成して編集モードを開始
   */
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

  /**
   * 前日へナビゲートする関数
   * 現在の日付から1日前の日付を計算し、親コンポーネントに通知
   */
  const navigateToPreviousDay = () => {
    if (isLoading) return; // ローディング中は操作を無効化
    
    console.log('前日ボタンがクリックされました');
    console.log('現在の日付:', date);
    console.log('onDateChangeは存在しますか?', !!onDateChange);
    
    if (!date || !onDateChange) return;
    
    try {
      setIsLoading(true); // ローディング状態を開始
      
      // 日付文字列をDateオブジェクトに変換（より堅牢な方法）
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
      
      console.log('解析された日付:', year, month + 1, day);
      
      const currentDate = new Date(year, month, day);
      
      // 前日の日付を計算
      currentDate.setDate(currentDate.getDate() - 1);
      
      // yyyy年MM月dd日 形式に変換
      const newDateStr = formatDateToJapanese(currentDate);
      console.log('新しい日付:', newDateStr);
      
      // 親コンポーネントに通知
      onDateChange(newDateStr);
    } catch (e) {
      console.error('日付変換エラー:', e);
      setIsLoading(false);
    }
  };

  /**
   * 翌日へナビゲートする関数
   * 現在の日付から1日後の日付を計算し、今日より未来でなければ親コンポーネントに通知
   */
  const navigateToNextDay = () => {
    if (isLoading) return; // ローディング中は操作を無効化
    
    console.log('翌日ボタンがクリックされました');
    console.log('現在の日付:', date);
    console.log('onDateChangeは存在しますか?', !!onDateChange);
    
    if (!date || !onDateChange) return;
    
    try {
      setIsLoading(true); // ローディング状態を開始
      
      // 日付文字列をDateオブジェクトに変換（より堅牢な方法）
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
      
      console.log('解析された日付:', year, month + 1, day);
      
      const currentDate = new Date(year, month, day);
      
      // 翌日の日付を計算
      currentDate.setDate(currentDate.getDate() + 1);
      
      // 現在の日付（今日）
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 今日より未来の日付は選択できないようにする
      if (currentDate <= today) {
        const newDateStr = formatDateToJapanese(currentDate);
        console.log('新しい日付:', newDateStr);
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

  /**
   * 日付変更が完了したときの処理
   * 新しいエントリーを受け取ったらローディング状態を解除
   */
  useEffect(() => {
    // 日付が変更されたらローディング状態を解除
    setIsLoading(false);
  }, [entries]);

  /**
   * キーボードでのナビゲーション設定
   * 左右矢印キーで日付移動、ESCキーでモーダルを閉じる
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      if (e.key === 'ArrowLeft') {
        navigateToPreviousDay();
      } else if (e.key === 'ArrowRight') {
        navigateToNextDay();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, date]);

  // モーダルが閉じているときは何も表示しない
  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContentWrapper}>
        {/* 左ナビゲーションボタン */}
        <button 
          className={`${styles.modalNavButton} ${styles.modalNavButtonLeft} ${isLoading ? styles.loading : ''}`} 
          onClick={(e) => {
            e.stopPropagation();
            navigateToPreviousDay();
          }}
          aria-label="前日"
          disabled={isLoading}
        >
          <ChevronLeft size={24} />
        </button>
        
        {/* メインコンテンツ */}
        <div className={styles.modalContainer}>
          {/* ローディングインジケーター */}
          {isLoading && (
            <div className={styles.loadingIndicator}>
              <div className={styles.spinner}></div>
            </div>
          )}
          
          {/* ヘッダー */}
          <div className={styles.modalHeader}>
            <div className={styles.headerTitleContainer}>
              <Calendar className={styles.diaryIcon} size={24} />
              <h2 className={styles.modalTitle}>
                {(() => {
                  if (!date) return 'の記録';
                  
                  // 日付から曜日を取得する
                  const matches = date.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
                  if (matches) {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const [_, yearStr, monthStr, dayStr] = matches;
                    const year = parseInt(yearStr);
                    const month = parseInt(monthStr) - 1; // JavaScriptの月は0-11
                    const day = parseInt(dayStr);
                    
                    const dateObj = new Date(year, month, day);
                    const dayOfWeek = dateObj.getDay(); // 0:日曜日, 1:月曜日, ..., 6:土曜日
                    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                    const weekDay = weekDays[dayOfWeek];
                    
                    // 曜日のクラス名を決定
                    const weekdayClass = dayOfWeek === 0 ? styles.sundayText : 
                                        dayOfWeek === 6 ? styles.saturdayText : '';
                    
                    return (
                      <>
                        {date}（<span className={weekdayClass}>{weekDay}</span>）の記録
                      </>
                    );
                  }
                  
                  return `${date}の記録`;
                })()}
              </h2>
            </div>
            <button 
              onClick={onClose} 
              className={styles.closeButton}
            >
              <X size={24} />
            </button>
          </div>

          {/* 記録追加ボタン（今日の日付の場合のみ表示） */}
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
        </div>
        
        {/* 右ナビゲーションボタン */}
        <button 
          className={`${styles.modalNavButton} ${styles.modalNavButtonRight} ${isLoading ? styles.loading : ''}`} 
          onClick={(e) => {
            e.stopPropagation();
            navigateToNextDay();
          }}
          aria-label="翌日"
          disabled={isToday || isLoading} // 今日の場合またはローディング中は翌日ボタンを無効化
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </div>
  );
};

export default DiaryModal;