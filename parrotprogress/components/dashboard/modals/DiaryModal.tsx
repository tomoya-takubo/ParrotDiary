import React, { useEffect, useState } from 'react';
import { X, Calendar, Clock, Edit2 } from 'lucide-react';
import styles from './DiaryModal.module.css';
import Image from 'next/image'; // パロット表示のためにImageをインポート
import { getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector'; // パロット取得関数をインポート

// ActivityHistoryで使用する日記エントリー型
type ActivityDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
  entry_id?: number | string; // パロット取得のためにentry_idを追加（文字列または数値型）
  parrots?: string[]; // パロット情報を保持するプロパティを追加
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
  // エントリーごとのパロット情報を管理する状態
  const [entriesWithParrots, setEntriesWithParrots] = useState<ActivityDiaryEntry[]>(entries);
  // パロット取得中かどうかを管理する状態
  const [isLoadingParrots, setIsLoadingParrots] = useState(false);

  // エントリーが変更されたとき、パロット情報を取得する
  useEffect(() => {
    const fetchParrots = async () => {
      if (!isOpen || entries.length === 0) return;

      setIsLoadingParrots(true);
      try {
        console.log("パロット情報取得開始:", entries.length, "件のエントリー");
        
        const updatedEntries = await Promise.all(
          entries.map(async (entry) => {
            // すでにパロット情報がある場合はそのまま使用
            if (entry.parrots && entry.parrots.length > 0) {
              console.log("既存のパロット情報を使用:", entry.parrots);
              return entry;
            }
            
            // entry_idがある場合、パロット情報を取得
            if (entry.entry_id) {
              try {
                // entry_idを文字列に変換して渡す
                const entryIdStr = String(entry.entry_id);
                console.log("パロット取得:", entryIdStr);
                
                const parrotUrls = await getEntryParrots(entryIdStr);
                console.log("取得したパロット:", parrotUrls);
                
                return {
                  ...entry,
                  parrots: Array.isArray(parrotUrls) ? parrotUrls : []
                };
              } catch (error) {
                console.error('パロット取得エラー:', error, entry.entry_id);
                return entry;
              }
            }
            
            return entry;
          })
        );
        
        console.log("パロット取得完了:", updatedEntries);
        setEntriesWithParrots(updatedEntries);
      } catch (error) {
        console.error("パロット取得中にエラー発生:", error);
      } finally {
        setIsLoadingParrots(false);
      }
    };

    if (isOpen) {
      fetchParrots();
    }
  }, [isOpen, entries]);

  // デバッグ用：パロット状態が変わるたびにログ出力
  useEffect(() => {
    console.log("entriesWithParrots更新:", 
      entriesWithParrots.map(e => ({
        entry_id: e.entry_id,
        parrots: e.parrots?.length || 0
      }))
    );
  }, [entriesWithParrots]);

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

        {/* エントリーリスト */}
        <div className={styles.entriesContainer}>
          {entriesWithParrots.length > 0 ? (
            entriesWithParrots.map((entry, index) => (
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
                
                {/* アクティビティリストとパロット表示 */}
                <div className={styles.entryContent}>
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
                
                  {/* パロットGIFの表示 */}
                  {entry.parrots && entry.parrots.length > 0 && (
                    <div className={styles.parrotContainer}>
                      {entry.parrots.map((parrot, parrotIndex) => (
                        <Image 
                          key={parrotIndex}
                          src={parrot}
                          alt={`Parrot ${parrotIndex + 1}`}
                          width={24}
                          height={24}
                          className={styles.parrotGif}
                        />
                      ))}
                    </div>
                  )}
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