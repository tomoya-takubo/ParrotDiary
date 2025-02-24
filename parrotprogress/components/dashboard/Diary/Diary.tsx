import React, { useState } from 'react';
import { Edit2, Search, Clock, Calendar } from 'lucide-react';
import styles from './Diary.module.css';

type DiaryEntryType = {
  id: number;
  timestamp: string;
  content: string[] | null;
  tags?: string[];
  type: 'pomodoro' | 'regular';
  recordType?: 'immediate' | 'later';
  duration?: number;
  pomodoroType?: string;
};

type DiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entry: DiaryEntryType | null;
  onSave: (content: string[]) => void;
};

type TabValue = 'all' | 'pomodoro' | 'regular';

//#region DiaryModal コンポーネント - 3行日記の編集モーダル
const DiaryModal: React.FC<DiaryModalProps> = ({ isOpen, onClose, entry, onSave }) => {
  const [editContent, setEditContent] = useState<string[]>(entry?.content || ['', '', '']);

  // モーダル外のクリックを処理するハンドラー
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // オーバーレイ自体がクリックされた場合にのみモーダルを閉じる
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen || !entry) return null;

  return (
    <div 
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContainer}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {entry.content ? '3行日記を編集' : '3行日記を記録'}
          </h2>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.entryTimestamp}>
            {entry.timestamp} の記録
            {entry.type === 'pomodoro' && entry.pomodoroType && (
              <span style={{ marginLeft: '8px' }}>
                {entry.pomodoroType} ({entry.duration}分)
              </span>
            )}
          </div>
          
          {/* 3行の入力フィールド */}
          {[0, 1, 2].map((index) => (
            <div key={index} className={styles.inputGroup}>
              <label className={styles.inputLabel}>{index + 1}行目</label>
              <input
                type="text"
                value={editContent[index]}
                onChange={(e) => {
                  const newContent = [...editContent];
                  newContent[index] = e.target.value;
                  setEditContent(newContent);
                }}
                className={styles.textInput}
                placeholder={`${index + 1}行目を入力`}
              />
            </div>
          ))}
          
          <div className={styles.modalActions}>
            <button
              onClick={onClose}
              className={styles.cancelButton}
            >
              キャンセル
            </button>
            <button
              onClick={() => {
                onSave(editContent);
                onClose();
              }}
              className={styles.saveButton}
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
//#endregion

//#region DiaryEntry コンポーネント - 個別の日記エントリー表示
const DiaryEntry: React.FC<{ entry: DiaryEntryType; onEditClick: (entry: DiaryEntryType) => void }> = ({ 
  entry, 
  onEditClick 
}) => (
  <div className={styles.diaryEntry}>
    <div className={styles.entryHeader}>
      <div className={styles.entryTimestamp}>
        記録時刻: {entry.timestamp}
        {entry.type === 'pomodoro' && !entry.content && entry.pomodoroType && (
          <span style={{ marginLeft: '8px' }}>
            {entry.pomodoroType} ({entry.duration}分)
          </span>
        )}
      </div>
      <div className={styles.entryTags}>
        {entry.recordType === 'immediate' && (
          <span className={`${styles.recordTypeTag} ${styles.immediateTag}`}>
            ポモドーロ記録
          </span>
        )}
        {entry.recordType === 'later' && (
          <span className={`${styles.recordTypeTag} ${styles.laterTag}`}>
            後から記録
          </span>
        )}
        {entry.tags?.map((tag, index) => (
          <span key={index} className={styles.entryTag}>
            #{tag}
          </span>
        ))}
        <button
          onClick={() => onEditClick(entry)}
          className={styles.editButton}
        >
          {entry.content ? '編集' : '記録する'}
        </button>
      </div>
    </div>
    
    {entry.content ? (
      <div className={styles.entryContent}>
        {entry.content.map((line, index) => (
          <div key={index} className={styles.entryLine}>{line}</div>
        ))}
      </div>
    ) : (
      <div className={styles.emptyEntry}>
        まだ記録がありません
      </div>
    )}
  </div>
);
//#endregion

//#region Diary コンポーネント - メインの3行日記コンポーネント
const Diary: React.FC = () => {
  // モーダル表示用のstate
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDiary, setSelectedDiary] = useState<DiaryEntryType | null>(null);
  const [activeTab, setActiveTab] = useState<TabValue>('all');

  // ポモドーロ関連の日記
  const [pomodoroDiaries, setPomodoroDiaries] = useState<DiaryEntryType[]>([
    {
      id: 1,
      timestamp: '2024/03/02 09:30',
      content: ['英語の勉強を開始', '新しい単語を習得', '明日も頑張ろう'],
      tags: ['集中', '英語'],
      type: 'pomodoro',
      recordType: 'immediate'
    },
    {
      id: 2,
      timestamp: '2024/03/02 14:45',
      content: null,
      type: 'pomodoro',
      duration: 25,
      pomodoroType: '標準'
    },
    {
      id: 3,
      timestamp: '2024/03/01 15:45',
      content: ['集中できた一日', 'タスクを完了', '達成感がある'],
      tags: ['達成', 'タスク'],
      type: 'pomodoro',
      recordType: 'later'
    }
  ]);

  // 通常の日記
  const [regularDiaries, setRegularDiaries] = useState<DiaryEntryType[]>([
    {
      id: 4,
      timestamp: '2024/03/02 12:30',
      content: ['新しい本を買った', '読書を始めた', '面白そう'],
      tags: ['趣味', '読書'],
      type: 'regular'
    }
  ]);

  // 編集モーダルを開く
  const openEditModal = (diary: DiaryEntryType) => {
    setSelectedDiary(diary);
    setIsEditModalOpen(true);
  };

  // 日記を保存する
  const handleSaveDiary = (content: string[]) => {
    if (!selectedDiary) return;

    // 実際のアプリケーションではここでsupabaseに保存
    if (selectedDiary.type === 'pomodoro') {
      setPomodoroDiaries(prev => 
        prev.map(entry => 
          entry.id === selectedDiary.id 
            ? { ...entry, content } 
            : entry
        )
      );
    } else {
      setRegularDiaries(prev => 
        prev.map(entry => 
          entry.id === selectedDiary.id 
            ? { ...entry, content } 
            : entry
        )
      );
    }
  };

  // タブを切り替える
  const handleTabChange = (value: TabValue) => {
    setActiveTab(value);
  };

  // 全ての日記を日付順にソート
  const allDiaries = [...pomodoroDiaries, ...regularDiaries]
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // 現在のタブに表示する日記を選択
  let displayDiaries: DiaryEntryType[];
  if (activeTab === 'all') {
    displayDiaries = allDiaries;
  } else if (activeTab === 'pomodoro') {
    displayDiaries = pomodoroDiaries;
  } else {
    displayDiaries = regularDiaries;
  }

  return (
    <div className={styles.diaryContainer}>
      {/* ヘッダー */}
      <div className={styles.diaryHeader}>
        <h2 className={styles.diaryTitle}>3行日記</h2>
        <div className={styles.diaryTools}>
          <Edit2 size={20} className={styles.diaryTool} />
          <Search size={20} className={styles.diaryTool} />
        </div>
      </div>
      
      {/* サブヘッダー */}
      <div className={styles.diarySubtitle}>
        今日の出来事を3行で記録しましょう
      </div>

      {/* タブと日記エントリー */}
      <div>
        <div className={styles.tabsList}>
          <button 
            className={`${styles.tabsTrigger} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => handleTabChange('all')}
          >
            すべて
          </button>
          <button 
            className={`${styles.tabsTrigger} ${activeTab === 'pomodoro' ? styles.active : ''}`}
            onClick={() => handleTabChange('pomodoro')}
          >
            ポモドーロ
          </button>
          <button 
            className={`${styles.tabsTrigger} ${activeTab === 'regular' ? styles.active : ''}`}
            onClick={() => handleTabChange('regular')}
          >
            通常の記録
          </button>
        </div>

        <div className={styles.diaryEntries}>
          {displayDiaries.map(entry => (
            <DiaryEntry 
              key={entry.id} 
              entry={entry} 
              onEditClick={openEditModal} 
            />
          ))}
        </div>
      </div>

      {/* 編集モーダル */}
      <DiaryModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        entry={selectedDiary}
        onSave={handleSaveDiary}
      />
    </div>
  );
};
//#endregion

export default Diary;