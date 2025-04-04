import { useAuth } from '@/lib/AuthContext'; // 認証コンテキストのインポート
import { supabase } from '@/lib/supabase'; // Supabaseクライアントのインポート
import { Edit2, Edit3, Hash, Plus, Search, X } from 'lucide-react';
import Image from 'next/image'; // Next.jsのImageコンポーネントをインポート
import { useRouter } from 'next/navigation'; // Next.jsのルーターを使用
import React, { useEffect, useState, useCallback } from 'react'; // React等インポート
import styles from './Diary.module.css'; // スタイル
import { getEntryParrots, ParrotSelector, saveEntryParrots } from './ParrotSelector'; // パロット関連
import EditDiaryModal from '@/components/dashboard/modals/EditDiaryModal'; // EditDiaryModalのインポート

//#region 型定義
// 3行日記エントリーの型定義
type DiaryEntryType = {
  entry_id: number;
  user_id: string;
  recorded_at: string;
  line1: string | null;
  line2: string | null;
  line3: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[]; // フロントエンド用のタグ情報
  parrots?: string[]; // パロットGIFのパス
};

// EditDiaryModal用のエントリ型
type EditDiaryEntryType = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number | string;
  parrots?: string[];
};

// モーダル状態の管理用
type ModalState = {
  isOpen: boolean;
  entry: EditDiaryEntryType | null;
  date: string | null;
};
//#endregion

/**
 * 3行日記のメインコンポーネント
 */
const Diary: React.FC = () => {
  // 既存のstateとhooks
  const router = useRouter();
  const { user: authUser, isLoading: authLoading } = useAuth();
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [reloadTrigger, setReloadTrigger] = useState(0);
  
  // モーダル状態の管理
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    entry: null,
    date: null
  });

  // データ再取得関数
  const reloadData = useCallback(() => {
    setReloadTrigger(prev => prev + 1);
  }, []);

  // useEffect内からポモドーロ関連の取得処理を削除
  useEffect(() => {
    const handleAuth = async () => {
      // 認証処理中は単に待機
      if (authLoading) {
        setIsLoading(true);
        return;
      }
      
      console.log('認証状態:', authUser ? '認証済み' : '未認証', 'User ID:', authUser?.id);
      
      if (authUser?.id) {
        setIsLoading(true);
        
        try {
          // 日記データの取得
          const { data: diaryData, error: diaryError } = await supabase
            .from('diary_entries')
            .select('*')
            .eq('user_id', authUser.id)
            .order('recorded_at', { ascending: false });
            
          if (diaryError) throw diaryError;
          
          console.log('取得した日記エントリー:', diaryData?.length || 0);
          
          // 各エントリーについてタグとパロット情報を取得
          const entriesWithTagsAndParrots = [];

          if (diaryData && diaryData.length > 0) {
            for (const entry of diaryData) {
              // タグ情報の取得（2つの別々のクエリに分割）
              let tags: string[] = [];
              // パロット情報取得
              let parrots: string[] = [];

              try {
                // パロット情報取得
                const parrotUrls = await getEntryParrots(entry.entry_id as string);
                // 確実に配列として扱う
                parrots = Array.isArray(parrotUrls) ? parrotUrls : [];
                
                console.log(`エントリー ${entry.entry_id} のパロット:`, parrots);
                
                // まずタグの使用履歴からタグIDを取得
                const { data: tagUsages, error: tagUsageError } = await supabase
                  .from('tag_usage_histories')
                  .select('tag_id')
                  .eq('entry_id', entry.entry_id as string)
                  .eq('user_id', authUser.id);
                
                if (tagUsageError) {
                  console.error('タグ使用履歴取得エラー:', tagUsageError);
                } else if (tagUsages && tagUsages.length > 0) {
                  // タグIDの配列を作成
                  const tagIds = tagUsages.map(usage => usage.tag_id).filter(Boolean);
                  
                  if (tagIds.length > 0) {
                    // タグIDを使ってタグ情報を取得
                    const { data: tagData, error: tagError } = await supabase
                      .from('tags')
                      .select('name')
                      .in('tag_id', tagIds);
                    
                    if (tagError) {
                      console.error('タグデータ取得エラー:', tagError);
                    } else if (tagData) {
                      // タグ名を抽出
                      tags = tagData.map(tag => tag.name as string).filter(Boolean);
                    }
                  }
                }
              } catch (err) {
                console.error('パロット取得エラー:', err);
              }
              
              // 日記エントリーとタグを結合し、パロットパスを追加
              entriesWithTagsAndParrots.push({
                ...entry,
                tags,
                parrots,
              } as DiaryEntryType);
            }
          }
          
          setDiaryEntries(entriesWithTagsAndParrots);
          
        } catch (err: unknown) {
          console.error('データ取得エラー:', err);
          setDiaryEntries([]);
        } finally {
          setIsLoading(false);
        }
      } else {
        // 未認証でも空データでUIを表示
        setDiaryEntries([]);
        setIsLoading(false);
      }
    };
    
    handleAuth();
  }, [authUser, authLoading, reloadTrigger]);

  // 編集モーダルを開く
  const openEditModal = (entry: DiaryEntryType) => {
    // DiaryEntryType から EditDiaryEntryType への変換
    const activities: string[] = [];
    if (entry.line1) activities.push(entry.line1);
    if (entry.line2) activities.push(entry.line2);
    if (entry.line3) activities.push(entry.line3);

    // 日付と時刻を分離
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
  
  // 新規作成モーダルを開く
  const openAddModal = () => {
    if (!authUser?.id) {
      console.log('未認証状態でのモーダルオープン試行 - User:', authUser);
      return;
    }
    
    // 現在時刻を取得し、日本時間に調整
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
    
    console.log('新規日記モーダルを開く');
    
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
  
  // モーダルを閉じる
  const closeModal = () => {
    setModalState({
      isOpen: false,
      entry: null,
      date: null
    });
  };

  /**
   * 表示するエントリーをフィルタリングする
   */
  const getFilteredEntries = () => {
    // 単純に最新の3件を返す
    return diaryEntries.slice(0, 3);
  };

  // ローディング中のレンダリング
  if (authLoading || isLoading) {
    return (
      <div className={styles.diaryContainer}>
        <div className={styles.emptyEntry}>
          <p>データを読み込み中...</p>
        </div>
      </div>
    );
  }

  // メインのレンダリング
  return (
    <div className={styles.diaryContainer}>
      {/* ヘッダー */}
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
      
      {/* ユーザー情報表示 */}
      {authUser?.id ? (
        <div className={styles.diarySubtitle}>
          {authUser.email || authUser.user_metadata?.name || 'ログインユーザー'}さんの日記
        </div>
      ) : (
        <div className={styles.diarySubtitle}>
          今日の出来事を3行で記録しましょう
        </div>
      )}
      
      {/* 未ログイン時のメッセージ */}
      {!authUser && !authLoading && (
        <div className={styles.diarySubtitle} style={{ fontSize: '0.8em', color: '#666' }}>
          ※ログインするとデータが保存されます
        </div>
      )}

      {/* 日記エントリーリスト */}
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
                  {/* タグの表示 */}
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

                  {/* パロットGIFの表示 */}
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

      {/* EditDiaryModalコンポーネントの使用 */}
      {modalState.isOpen && modalState.entry && (
        <EditDiaryModal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          entry={modalState.entry}
          date={modalState.date}
          onSave={reloadData}
        />
      )}
    </div>
  );
};

export default Diary;