// ...すでにある import 群は変更なしです
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Edit2, Search } from 'lucide-react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import React, { useEffect, useState, useCallback } from 'react';
import styles from './Diary.module.css';
import { getEntryParrots } from './ParrotSelector';
import EditDiaryModal from '@/components/dashboard/modals/EditDiaryModal';

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

type EditDiaryEntryType = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number | string;
  parrots?: string[];
};

type ModalState = {
  isOpen: boolean;
  entry: EditDiaryEntryType | null;
  date: string | null;
};

type DiaryProps = {
  onSave?: () => void;
};

const Diary: React.FC<DiaryProps> = ({ onSave }) => {
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

  const reloadData = useCallback(async () => {
    if (!authUser?.id) return;
  
    try {
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
      console.error('reloadData() 実行中のエラー:', err);
    }
  }, [authUser]);
  
  useEffect(() => {
    const handleAuth = async () => {
      if (authLoading) {
        setIsLoading(true);
        return;
      }

      if (authUser?.id) {
        setIsLoading(true);
        try {
          if (authUser?.id) {
            setIsLoading(true);
            try {
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
            setDiaryEntries([]);
            setIsLoading(false);
          }
          
        } catch (err) {
          console.error('データ取得エラー:', err);
          setDiaryEntries([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        setDiaryEntries([]);
        setIsLoading(false);
      }
    };

    handleAuth();
  }, [authUser, authLoading, reloadTrigger]);

  const openEditModal = (entry: DiaryEntryType) => {
    const activities: string[] = [];
    if (entry.line1) activities.push(entry.line1);
    if (entry.line2) activities.push(entry.line2);
    if (entry.line3) activities.push(entry.line3);

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

  const openAddModal = () => {
    if (!authUser?.id) return;

    const now = new Date();
    const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const formattedDate = jstTime.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = jstTime.toLocaleTimeString('ja-JP', {
      hour: '2-digit',
      minute: '2-digit'
    });

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

  const closeModal = () => {
    setModalState({
      isOpen: false,
      entry: null,
      date: null
    });
  };

  const getFilteredEntries = () => {
    return diaryEntries.slice(0, 3);
  };

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
          {authUser?.id ? (
            <div className={styles.diarySubtitle}>
              {authUser.email || authUser.user_metadata?.name || 'ログインユーザー'}さんの日記
            </div>
          ) : (
            <div className={styles.diarySubtitle}>
              今日の出来事を3行で記録しましょう
            </div>
          )}

          {!authUser && !authLoading && (
            <div className={styles.diarySubtitle} style={{ fontSize: '0.8em', color: '#666' }}>
              ※ログインするとデータが保存されます
            </div>
          )}

          <div className={styles.diaryEntries}>
            {getFilteredEntries().length === 0 ? (
              <div className={styles.emptyEntry}>
                記録がありません
              </div>
            ) : (
              getFilteredEntries().map(entry => (
                <div key={entry.entry_id} className={styles.diaryEntry} style={{ position: 'relative' }}>
                  <div className={styles.entryHeader}>
                    <div className={styles.entryTimestamp}>
                      記録時刻: {new Date(entry.recorded_at).toLocaleString('ja-JP')}
                    </div>
                    <div className={styles.entryTags}>
                      {entry.tags?.map((tag, index) => (
                        <span key={index} className={styles.entryTag}>
                          #{tag}
                        </span>
                      ))}
                      <button
                        onClick={() => openEditModal(entry)}
                        className={styles.editButton}
                      >
                        {entry.line1 ? '編集' : '記録する'}
                      </button>
                    </div>
                  </div>
                  {entry.line1 ? (
                    <div className={styles.entryContent}>
                      <div className={styles.entryLine}>{entry.line1}</div>
                      {entry.line2 && <div className={styles.entryLine}>{entry.line2}</div>}
                      {entry.line3 && <div className={styles.entryLine}>{entry.line3}</div>}
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
};

export default Diary;
