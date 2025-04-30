// #region インポート
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Edit2, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import styles from './Diary.module.css';
import { getEntryParrots } from './ParrotSelector';
import EditDiaryModal from '@/components/dashboard/modals/EditDiaryModal';
// #endregion

// #region 型定義
/**
 * 日記エントリの型定義
 * データベースから取得した日記データの構造を表す
 */
type DiaryEntryType = {
  entry_id: number;
  user_id: string;
  recorded_at: string;
  line1: string | null;
  line2: string | null;
  line3: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[];
  parrots?: string[];
};

/**
 * 編集用の日記エントリ型定義
 * モーダルで編集する際のデータ構造
 */
type EditDiaryEntryType = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number | string;
  parrots?: string[];
};

/**
 * モーダル状態の型定義
 */
type ModalState = {
  isOpen: boolean;
  entry: EditDiaryEntryType | null;
  date: string | null;
};

/**
 * Diaryコンポーネントのプロパティ型定義
 */
type DiaryProps = {
  onSave?: () => void;
};
// #endregion

/**
 * 3行日記コンポーネント
 * ユーザーの日記エントリを表示し、新規作成や編集、検索機能を提供する
 */
const Diary: React.FC<DiaryProps> = ({ onSave }) => {
  // #region ステート管理
  const router = useRouter();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTrigger] = useState(0);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    entry: null,
    date: null
  });
  // #endregion

  // #region データ取得関数
  /**
   * 日記データを再読み込みする関数
   * タグやパロットの情報も含めて日記データを取得する
   */
  const reloadData = useCallback(async () => {
    if (!authUser?.id) return;
  
    try {
      // 日記エントリの取得
      const { data: diaryData, error: diaryError } = await supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', authUser.id)
        .order('recorded_at', { ascending: false })
        .limit(3);
  
      if (diaryError) throw diaryError;
  
      const entriesWithTagsAndParrots: DiaryEntryType[] = [];
  
      if (diaryData && diaryData.length > 0) {
        // 各エントリのパロット情報を取得
        const parrotPromises = diaryData.map(entry =>
          getEntryParrots(entry.entry_id as number)
        );
        const parrotResults = await Promise.all(parrotPromises);
  
        // 各エントリのタグ情報を取得してデータを構築
        for (let i = 0; i < diaryData.length; i++) {
          const entry = diaryData[i];
          const parrots = Array.isArray(parrotResults[i]) ? parrotResults[i] : [];
          let tags: string[] = [];
  
          try {
            // タグ使用履歴の取得
            const { data: tagUsages } = await supabase
              .from('tag_usage_histories')
              .select('tag_id')
              .eq('entry_id', entry.entry_id as number)
              .eq('user_id', authUser.id);
  
            const tagIds = tagUsages?.map(t => t.tag_id).filter(Boolean) || [];
  
            // タグIDに対応するタグ名の取得
            if (tagIds.length > 0) {
              const { data: tagData } = await supabase
                .from('tags')
                .select('name')
                .in('tag_id', tagIds);
  
              tags = (tagData as { name: string }[]).map(t => t.name).filter(Boolean);
            }
          } catch (e) {
            console.error('タグ取得エラー:', e);
          }
  
          // 完全な日記エントリデータを構築
          entriesWithTagsAndParrots.push({
            ...(entry as DiaryEntryType),
            tags,
            parrots,
          });
        }
      }
  
      // 完成したデータをステートに設定
      setDiaryEntries(entriesWithTagsAndParrots);
  
    } catch (err) {
      console.error('reloadData() 実行中のエラー:', err);
    }
  }, [authUser]);
  // #endregion

  // #region 副作用と初期化
  /**
   * 認証状態の変化やリロードトリガーの変更時にデータを取得
   */
  useEffect(() => {
    const handleAuth = async () => {
      // 認証データ読み込み中
      if (authLoading) {
        setIsLoading(true);
        return;
      }

      // ユーザーがログインしている場合
      if (authUser?.id) {
        setIsLoading(true);
        try {
          // reloadData関数と同様の処理だが、初期読み込み用
          // TODO: コードの重複を避けるためreloadDataを呼び出すように修正することを検討
          const { data: diaryData, error: diaryError } = await supabase
            .from('diary_entries')
            .select('*')
            .eq('user_id', authUser.id)
            .order('recorded_at', { ascending: false })
            .limit(3);
      
          if (diaryError) throw diaryError;
      
          const entriesWithTagsAndParrots: DiaryEntryType[] = [];
      
          if (diaryData && diaryData.length > 0) {
            const parrotPromises = diaryData.map(entry =>
              getEntryParrots(entry.entry_id as number)
            );
            const parrotResults = await Promise.all(parrotPromises);
      
            for (let i = 0; i < diaryData.length; i++) {
              const entry = diaryData[i];
              const parrots = Array.isArray(parrotResults[i]) ? parrotResults[i] : [];
              let tags: string[] = [];
      
              try {
                const { data: tagUsages } = await supabase
                  .from('tag_usage_histories')
                  .select('tag_id')
                  .eq('entry_id', entry.entry_id as number)
                  .eq('user_id', authUser.id);
      
                const tagIds = tagUsages?.map(t => t.tag_id).filter(Boolean) || [];
      
                if (tagIds.length > 0) {
                  const { data: tagData } = await supabase
                    .from('tags')
                    .select('name')
                    .in('tag_id', tagIds);
      
                  tags = (tagData as { name: string }[]).map(t => t.name).filter(Boolean);
                }
              } catch (e) {
                console.error('タグ取得エラー:', e);
              }
      
              entriesWithTagsAndParrots.push({
                ...(entry as DiaryEntryType),
                tags,
                parrots,
              });
            }
          }
      
          setDiaryEntries(entriesWithTagsAndParrots);
      
        } catch (err) {
          console.error('データ取得エラー:', err);
          setDiaryEntries([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // ログインしていない場合
        setDiaryEntries([]);
        setIsLoading(false);
      }
    };

    handleAuth();
  }, [authUser, authLoading, reloadTrigger]);
  // #endregion

  // #region モーダル操作関数
  /**
   * 編集モーダルを開く
   * @param entry 編集対象の日記エントリ
   */
  const openEditModal = (entry: DiaryEntryType) => {
    // 活動内容を配列に変換
    const activities: string[] = [];
    if (entry.line1) activities.push(entry.line1);
    if (entry.line2) activities.push(entry.line2);
    if (entry.line3) activities.push(entry.line3);

    // 日付と時刻のフォーマット処理
    const date = new Date(entry.recorded_at);
    const formattedDate = date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });

    // モーダル状態の更新
    setModalState({
      isOpen: true,
      entry: {
        time: formattedTime,
        tags: entry.tags || [],
        activities,
        entry_id: entry.entry_id,
        parrots: entry.parrots || []
      },
      date: formattedDate
    });
  };

  /**
   * 新規追加モーダルを開く
   */
  const openAddModal = () => {
    if (!authUser?.id) return;

    // 現在日時の取得とフォーマット
    const now = new Date();
    const formattedDate = now.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = now.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });
    
    // 新規作成用のモーダル状態を設定
    setModalState({
      isOpen: true,
      entry: {
        time: formattedTime,
        tags: [],
        activities: [],
        parrots: []
      },
      date: formattedDate
    });
  };

  /**
   * モーダルを閉じる
   */
  const closeModal = () => {
    setModalState({
      isOpen: false,
      entry: null,
      date: null
    });
  };
  // #endregion

  // #region ユーティリティ関数
  /**
   * 表示する日記エントリを最大3件まで取得
   */
  const getFilteredEntries = () => {
    return diaryEntries.slice(0, 3);
  };
  // #endregion

  // #region レンダリング
  return (
    <div className={styles.diaryContainer}>
      {/* タイトルは常に表示 */}
      <div className={styles.diaryHeader}>
        <h2 className={styles.diaryTitle}>3行日記</h2>
        <div className={styles.diaryTools}>
          <span title="新規日記を作成">
            <Edit2 
              size={20} 
              className={styles.diaryTool} 
              onClick={() => authUser?.id ? openAddModal() : console.log('ログインが必要です')}
              style={!authUser?.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            />
          </span>
          <span title="日記を検索">
            <Search 
              size={20} 
              className={styles.diaryTool}
              onClick={() => {
                if (authUser?.id) {
                  router.push('/diary/search');
                } else {
                  console.log('ログインが必要です');
                }
              }} 
              style={!authUser?.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            />
          </span>
        </div>
      </div>

      {/* ローディング中はそれ以外非表示 */}
      {authLoading || isLoading ? (
        <div className={styles.emptyEntry}>
          <p>データを読み込み中...</p>
        </div>
      ) : (
        <>
          {/* ログイン状態に応じたサブタイトル表示 */}
          {authUser?.id ? (
            <div className={styles.diarySubtitle}>
              {authUser.email || authUser.user_metadata?.name || 'ログインユーザー'}さんの日記
            </div>
          ) : (
            <div className={styles.diarySubtitle}>
              今日の出来事を3行で記録しましょう
            </div>
          )}

          {/* 未ログイン時の注意書き */}
          {!authUser && !authLoading && (
            <div className={styles.diarySubtitle} style={{ fontSize: '0.8em', color: '#666' }}>
              ※ログインするとデータが保存されます
            </div>
          )}

          {/* 日記エントリの表示 */}
          <div className={styles.diaryEntries}>
            {getFilteredEntries().length === 0 ? (
              <div className={styles.emptyEntry}>
                記録がありません
              </div>
            ) : (
              getFilteredEntries().map(entry => (
                <div key={entry.entry_id} className={styles.diaryEntry} style={{ position: 'relative' }}>
                  {/* エントリのヘッダー部分（日時・タグ・編集ボタン） */}
                  <div className={styles.entryHeader}>
                    <div className={styles.entryTimestamp}>
                      {(() => {
                        // 日付のフォーマット処理
                        const date = new Date(entry.recorded_at);
                        const year = date.getFullYear();
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        const day = String(date.getDate()).padStart(2, '0');
                        const hours = String(date.getHours()).padStart(2, '0');
                        const minutes = String(date.getMinutes()).padStart(2, '0');
                        
                        // 曜日の取得（日本語）
                        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
                        const weekday = weekdays[date.getDay()];
                        
                        // 日曜日か土曜日かに応じてクラス名を設定
                        const weekdayClass = date.getDay() === 0 ? styles.sundayText : 
                                            date.getDay() === 6 ? styles.saturdayText : '';
                        
                        return (
                          <>
                            {year}/{month}/{day}（<span className={weekdayClass}>{weekday}</span>） {hours}:{minutes}
                          </>
                        );
                      })()}
                    </div>
                    <div className={styles.entryTags}>
                      {/* タグの表示 */}
                      {entry.tags?.map((tag, index) => (
                        <span key={index} className={styles.entryTag}>
                          #{tag}
                        </span>
                      ))}
                      {/* 編集ボタン */}
                      <button
                        onClick={() => openEditModal(entry)}
                        className={styles.editButton}
                      >
                        <Edit2 size={14} />
                        {entry.line1 ? '編集' : '記録する'}
                      </button>
                    </div>
                  </div>
                  {/* エントリの内容部分 */}
                  {entry.line1 ? (
                    <div className={styles.entryContent}>
                      <div className={styles.entryLine}>{entry.line1}</div>
                      {entry.line2 && <div className={styles.entryLine}>{entry.line2}</div>}
                      {entry.line3 && <div className={styles.entryLine}>{entry.line3}</div>}
                      {/* パロット表示 */}
                      {entry.parrots && entry.parrots.length > 0 && (
                        <div className={styles.parrotBottomRight}>
                          {entry.parrots.map((parrot, index) => (
                            <div key={index} className={styles.parrotContainer}>
                              <Image 
                                src={parrot}
                                alt={`Parrot ${index + 1}`}
                                width={32}
                                height={32}
                                className={styles.parrotGif}
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={styles.emptyEntry}>
                      まだ記録がありません
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* 編集/追加モーダル */}
          {modalState.isOpen && modalState.entry && (
            <EditDiaryModal
              isOpen={modalState.isOpen}
              onClose={closeModal}
              entry={modalState.entry}
              date={modalState.date}
              onSave={() => {
                reloadData();
                onSave?.();
              }}
            />
          )}
        </>
      )}
    </div>
  );
  // #endregion
};

export default Diary;