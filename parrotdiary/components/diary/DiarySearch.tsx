import React, { useState, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Search, FilterIcon, Calendar, ChevronLeft, ChevronRight, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import diaryService, { DiaryEntry, TagWithCount } from '@/services/diaryService';
import styles from './diary.module.css';
import Image from 'next/image';
import EditDiaryModal from '@/components/dashboard/modals/EditDiaryModal';
import { getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector';
import { supabase } from '@/lib/supabase';
import { EditDiaryEntryType } from '@/types/diary';

/**
 * 基本のDiaryEntryにパロット情報を追加した拡張型
 */
interface ExtendedDiaryEntry extends DiaryEntry {
  parrots?: string[]; // パロットGIF画像のURL配列
}

// コンポーネントのprops拡張
interface DiarySearchProps {
  initialUserId?: string;
  onDataLoaded?: () => void;  // データロード完了時のコールバック
  preloadData?: boolean;      // データ先読みモードかどうか
  initialEntries?: ExtendedDiaryEntry[];  // 追加
  initialTags?: TagWithCount[];          // 追加
}


/**
 * 日記検索ページのコンポーネント
 * ログインユーザーの日記を検索・フィルタリングする機能を提供します
 * @param props コンポーネントのプロパティ
 * @param props.initialUserId 初期ユーザーID
 * @param props.onDataLoaded データロード完了時のコールバック関数
 * @param props.preloadData データ先読みモードかどうか（デフォルト: false）
 * @param props.initialEntries 初期日記エントリー配列（デフォルト: []）
 * @param props.initialTags 初期タグ配列（デフォルト: []）
 * @param ref コンポーネントの参照
 * @returns 日記検索コンポーネント
 */
const DiarySearch = forwardRef(({ 
  initialUserId, 
  onDataLoaded, 
  preloadData = false,
  initialEntries = [],
  initialTags = []
}: DiarySearchProps, ref) => {
  const MAX_PARROTS = 5; // 最大パロット数

  // 認証情報
  const { user } = useAuth();
  const [effectiveUserId, setEffectiveUserId] = useState<string | undefined>(initialUserId);

  // 検索・フィルター関連の状態
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showAllTags, setShowAllTags] = useState(false);
  
  // データ関連の状態
  const [diaryEntries, setDiaryEntries] = useState<ExtendedDiaryEntry[]>(initialEntries);
  const [allTags, setAllTags] = useState<TagWithCount[]>(initialTags);
  const [isLoading, setIsLoading] = useState(initialEntries.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [dataInitialized, setDataInitialized] = useState(initialEntries.length > 0);

  // 編集モーダル用の状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<EditDiaryEntryType | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  
  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1);

  // パロット表示制御の状態
  const [showParrots, setShowParrots] = useState(true); // デフォルトでは表示する

  // 削除確認モーダル用の状態
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<ExtendedDiaryEntry | null>(null);

  // DOM参照
  const entriesContainerRef = useRef<HTMLDivElement>(null);

  // refを使って外部からデータ取得状態にアクセスできるようにする
  useImperativeHandle(ref, () => ({
    isDataLoaded: () => !isLoading && dataInitialized,
    getEntries: () => diaryEntries,
    getTags: () => allTags
  }));

  /**
   * 初期データ取得（コンポーネントマウント時）
   */
  useEffect(() => {
    // 既にデータが提供されている場合は取得処理をスキップ
    if (initialEntries.length > 0 && initialTags.length > 0 && !preloadData) {
      console.log('初期データが提供されているため、データ取得をスキップします');
      
      // 重要な修正: パロット情報がない場合は再取得する
      const needsParrottData = initialEntries.some(entry => 
        !entry.parrots || entry.parrots.length === 0
      );
      
      if (needsParrottData && effectiveUserId) {
        console.log('パロット情報が不足しているため、再取得します');
        // 初期ロード時はローディング表示しない
        fetchDataWithParrots(effectiveUserId, true);
        
        // ここでデータの読み込み完了を通知（非同期処理の完了を待たない）
        if (onDataLoaded) {
          onDataLoaded();
        }
      } else {
        // データが完全な場合はそのまま完了通知
        if (onDataLoaded) {
          onDataLoaded();
        }
      }
      return;
    }

    const fetchData = async () => {
      // ページから直接渡されたユーザーIDを優先して使用
      let userId = effectiveUserId || user?.id;
  
      if (!userId) {
        try {
          // バックアップとしてSupabaseセッションから直接取得
          const { data: { session } } = await supabase.auth.getSession();
          userId = session?.user?.id;
          
          // 取得できたIDを保存
          if (userId) {
            setEffectiveUserId(userId);
          }
        } catch (error) {
          console.error('Supabaseセッション取得エラー:', error);
        }
      }
      
      if (!userId) {
        console.error('有効なユーザーIDが見つかりません');
        setError('認証情報を取得できませんでした。再度ログインしてください。');
        setIsLoading(false);
        return;
      }
      
      console.log('DiarySearch: データ取得開始 - ユーザーID:', userId);
      
      try {
        setIsLoading(true);
        setError(null);
  
        // Supabaseサービスを使って日記データを取得
        // 重要：user!.id ではなく userId を使用
        const diaryResponse = await diaryService.getUserDiaryEntries(userId);
        
        // パロット情報を持つ拡張エントリーとして初期化
        const extendedEntries: ExtendedDiaryEntry[] = diaryResponse.map(entry => ({
          ...entry,
          parrots: [] // 初期値として空配列を設定
        }));
        
        // 一時的にエントリーを設定
        setDiaryEntries(extendedEntries);
        
        // タグデータを取得 - userId を使用
        const tagsResponse = await diaryService.getUserTags(userId);
        setAllTags(tagsResponse);
        
        // 各エントリーのパロット情報を取得
        const entriesWithParrots = await Promise.all(
          extendedEntries.map(async (entry) => {
            try {
              const entryId = String(entry.entry_id);
              const parrotUrls = await getEntryParrots(entryId);
              return {
                ...entry,
                parrots: Array.isArray(parrotUrls) ? parrotUrls : []
              };
            } catch (err) {
              console.error(`エントリー ${entry.entry_id} のパロット取得エラー:`, err);
              return entry;
            }
          })
        );
        
        // パロット情報を含むエントリーで更新
        setDiaryEntries(entriesWithParrots);
        setDataInitialized(true);
  
        // データ読み込み完了のコールバックを呼び出し
        if (onDataLoaded) {
          console.log('データ読み込み完了 - コールバック呼び出し');
          onDataLoaded();
        }
  
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
        setError('データの読み込み中にエラーが発生しました。再度お試しください。');
      } finally {
        setIsLoading(false);
      }
    };
  
    fetchData();
  }, [user, effectiveUserId, onDataLoaded, initialEntries.length, initialTags.length, preloadData]);

  /**
   * パロット情報を含むデータ再取得関数
   * 編集や削除後のデータ更新に使用
   * @param userId ユーザーID
   * @param isInitialLoad 初期ロード中かどうか（ローディング表示の制御用）
   */
  const fetchDataWithParrots = async (userId: string, isInitialLoad = false) => {
    try {
      // isInitialLoad=falseの場合にのみローディング状態を表示
      if (!isInitialLoad) {
        setIsLoading(true);
      }
      
      // 日記エントリーを取得
      let diaryResponse;
      
      if (isInitialLoad && diaryEntries.length > 0) {
        // 既存のエントリーを再利用（既にExtendedDiaryEntry型）
        diaryResponse = diaryEntries;
      } else {
        // 新しくエントリーを取得（DiaryEntry型）
        diaryResponse = await diaryService.getUserDiaryEntries(userId);
      }
      
      // パロット情報の取得処理
      const entriesWithParrots = await Promise.all(
        diaryResponse.map(async (entry) => {
          // ここで型を明示的に扱う
          const currentEntry = entry as ExtendedDiaryEntry;
          
          // 既にパロット情報があるか確認
          if (currentEntry.parrots && currentEntry.parrots.length > 0) {
            return currentEntry;
          }
          
          try {
            const entryId = String(entry.entry_id);
            const parrotUrls = await getEntryParrots(entryId);
            return {
              ...entry,
              parrots: Array.isArray(parrotUrls) ? parrotUrls : []
            } as ExtendedDiaryEntry;
          } catch (err) {
            console.error(`エントリー ${entry.entry_id} のパロット取得エラー:`, err);
            return {
              ...entry,
              parrots: []
            } as ExtendedDiaryEntry;
          }
        })
      );
      
      setDiaryEntries(entriesWithParrots);
      setDataInitialized(true);
      
    } catch (error) {
      console.error('データの再取得に失敗しました:', error);
      setError('データの更新中にエラーが発生しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  // 初期ページサイズの設定を画面サイズに応じて変更
  const getInitialPageSize = () => {
    if (typeof window !== 'undefined') {
      return window.innerWidth >= 1024 ? 6 : 3;
    }
    return 3; // デフォルト値
  };

  // ステート宣言部分で使用
  const [entriesPerPage, setEntriesPerPage] = useState(getInitialPageSize());


  /**
   * パロット表示/非表示切り替え
   */
  const handleParrotToggle = () => {
    setShowParrots(!showParrots);
  };

  /**
   * タグ選択/解除の切り替え
   */
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    // フィルター変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  /**
   * フィルター条件をすべてクリア
   */
  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setDateRange({ start: '', end: '' });
    // フィルタークリア時は1ページ目に戻す
    setCurrentPage(1);
  };

  /**
   * 検索キーワード変更処理
   */
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // 検索条件変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  /**
   * 日付範囲変更処理
   */
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
    // 日付条件変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  /**
   * ページサイズ変更処理
   */
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    setEntriesPerPage(newSize);
    // ページサイズ変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  /**
   * ページ変更処理
   * スクロール位置を維持するロジックを含む
   */
  const handlePageChange = (page: number) => {
    // 現在のスクロール位置を記録
    const currentScrollPosition = window.scrollY;
    
    // ページネーションのみ更新
    setCurrentPage(page);
    
    // UIの更新後にスクロール位置を維持するための処理
    // requestAnimationFrameを使用してDOM更新後に実行
    requestAnimationFrame(() => {
      // ページネーションボタン周辺の位置を維持
      window.scrollTo({
        top: currentScrollPosition,
        behavior: 'auto' // 'smooth'ではなく'auto'にすることでジャンプを防止
      });
    });
  };

  /**
   * 編集モーダルを開く処理
   */
  const openEditModal = (entry: ExtendedDiaryEntry) => {
    // 日付フォーマット
    const entryDate = new Date(entry.created_at);
    const year = entryDate.getFullYear();
    const month = (entryDate.getMonth() + 1).toString().padStart(2, '0');
    const day = entryDate.getDate().toString().padStart(2, '0');
    const hours = entryDate.getHours().toString().padStart(2, '0');
    const minutes = entryDate.getMinutes().toString().padStart(2, '0');
    
    const formattedDate = `${year}年${month}月${day}日`;
    const formattedTime = `${hours}:${minutes}`;
    
    // EditDiaryModalに渡すデータ形式に変換
    const activities = [];
    if (entry.line1) activities.push(entry.line1);
    if (entry.line2) activities.push(entry.line2);
    if (entry.line3) activities.push(entry.line3);
    
    setEditEntry({
      time: formattedTime,
      tags: entry.tags || [],
      activities,
      created_at: entry.created_at,
      entry_id: entry.entry_id,
      parrots: entry.parrots || []
    });
    
    setEditDate(formattedDate);
    setIsModalOpen(true);
  };
  
  /**
   * モーダルを閉じる処理
   */
  const closeModal = () => {
    setIsModalOpen(false);
    setEditEntry(null);
    setEditDate(null);
  };
  
  /**
   * 編集保存完了後の処理
   */
  const handleSaveComplete = () => {
    closeModal();
    // データを再取得
    if (user) {
      // フルリロード
      fetchDataWithParrots(user.id);
    }
  };

  /**
   * 削除確認モーダルを開く処理
   */
  const openDeleteModal = (entry: ExtendedDiaryEntry) => {
    setEntryToDelete(entry);
    setIsDeleteModalOpen(true);
  };

  /**
   * 削除確認モーダルを閉じる処理
   */
  const closeDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setEntryToDelete(null);
  };

  /**
   * エントリー削除処理
   */
  const handleDeleteEntry = async () => {
    if (!entryToDelete || !user) return;
    
    try {
      setError(null); // エラー表示をクリア
      
      // Supabaseサービスを使って日記データを削除
      await diaryService.deleteEntry(entryToDelete.entry_id);
      
      // UI上から削除したエントリーを除外
      setDiaryEntries(diaryEntries.filter(entry => entry.entry_id !== entryToDelete.entry_id));
      
      // モーダルを閉じる
      closeDeleteModal();
      
      // 最後のエントリーが削除された場合、前のページに戻る
      const newTotalPages = Math.ceil((filteredEntries.length - 1) / entriesPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      }
    } catch (error) {
      console.error('エントリーの削除に失敗しました:', error);
      setError('エントリーの削除中にエラーが発生しました。再度お試しください。');
      // エラー時にモーダルを閉じない（ユーザーに再試行の機会を与える）
    }
  };
  
  /**
   * ダッシュボードに戻るボタンのクリックハンドラ
   */
  const handleBackToDashboard = () => {
    try {
      // ダッシュボードへのナビゲーション
      window.location.href = '/dashboard';
    } catch (err) {
      console.error('ダッシュボードへの遷移エラー:', err);
      // エラー時もシンプルにリダイレクト
      window.location.href = '/dashboard';
    }
  };

  /**
   * エクスポート機能のメインハンドラ
   */
  const handleExport = (format: 'txt' | 'csv') => {
    // フィルタリングされたエントリーを使用
    const entriesToExport = filteredEntries;
      
    if (format === 'csv') {
      exportAsCSV(entriesToExport);
    } else {
      exportAsTXT(entriesToExport);
    }
  };

  /**
   * CSV形式でエクスポート
   */
  const exportAsCSV = (entries: ExtendedDiaryEntry[]) => {
    const headers = ['日付', '時間', '1行目', '2行目', '3行目', 'タグ'];
    
    const csvContent = [
      headers.join(','),
      ...entries.map(entry => {
        const date = new Date(entry.created_at);
        const dateStr = `${date.getFullYear()}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}`;
        const timeStr = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
        
        return [
          dateStr,
          timeStr,
          `"${entry.line1.replace(/"/g, '""')}"`, // エスケープ処理
          `"${entry.line2?.replace(/"/g, '""') || ''}"`,
          `"${entry.line3?.replace(/"/g, '""') || ''}"`,
          `"${entry.tags.join(';')}"` // タグはセミコロンで区切る
        ].join(',');
      })
    ].join('\n');

    // ファイルダウンロード
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `日記データ_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * TXT形式でエクスポート
   */
  const exportAsTXT = (entries: ExtendedDiaryEntry[]) => {
    const txtContent = entries.map(entry => {
      const date = new Date(entry.created_at);
      const dateTime = `${date.getFullYear()}年${(date.getMonth() + 1).toString().padStart(2, '0')}月${date.getDate().toString().padStart(2, '0')}日 ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
      
      return `【${dateTime}】
  タグ: #${entry.tags.join(' #')}
  1. ${entry.line1}
  ${entry.line2 ? `2. ${entry.line2}` : ''}
  ${entry.line3 ? `3. ${entry.line3}` : ''}
  ----------------------------------------
  `;
    }).join('\n');

    // ファイルダウンロード
    const blob = new Blob([txtContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `日記データ_${new Date().toISOString().split('T')[0]}.txt`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /**
   * 日付と時間のフォーマット
   * フォーマットを「2025/04/20（日） 19:33」のように変更し、
   * 曜日に色付けするためにspanタグを使用
   */
  const formatDateTime = (dateTimeStr: string) => {
    const d = new Date(dateTimeStr);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekday = weekDays[d.getDay()];
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    // 曜日のクラス名を決定（日曜は赤、土曜は青）
    const weekdayClass = d.getDay() === 0 ? styles.sundayText : 
                        d.getDay() === 6 ? styles.saturdayText : '';
    
    // JSXで返す
    return (
      <>
        {year}/{month}/{day}（<span className={weekdayClass}>{weekday}</span>） {hours}:{minutes}
      </>
    );
  };

  /**
   * 検索条件に基づくエントリーのフィルタリング
   */
  const filteredEntries = diaryEntries.filter((entry) => {
    // 検索キーワードにマッチするか
    const entryContent = `${entry.line1} ${entry.line2 || ''} ${entry.line3 || ''}`;
    const matchesSearch =
      searchTerm === '' ||
      entryContent.toLowerCase().includes(searchTerm.toLowerCase());
    
    // 選択されたタグにすべてマッチするか
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => entry.tags.includes(tag));
    
    // 日付範囲にマッチするか
    const entryDate = new Date(entry.created_at);
    const afterStart = !dateRange.start || entryDate >= new Date(dateRange.start);
    const beforeEnd = !dateRange.end || entryDate <= new Date(dateRange.end + 'T23:59:59'); // 終了日の終わりまで含める
    
    return matchesSearch && matchesTags && afterStart && beforeEnd;
  });

  /**
   * ページネーションのためのデータ計算
   */
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

  /**
   * ページネーションボタンのレンダリング
   */
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5; // 表示するページボタンの最大数
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 表示ページ数を調整
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    // 「最初」のページへのボタン
    pageNumbers.push(
      <button 
        key="first"
        className={`${styles.paginationButton} ${currentPage === 1 ? styles.disabled : ''}`}
        onClick={() => handlePageChange(1)}
        disabled={currentPage === 1}
      >
        最初
      </button>
    );
    
    // 「前へ」ボタン
    pageNumbers.push(
      <button
        key="prev"
        className={`${styles.paginationButton} ${styles.paginationArrow} ${currentPage === 1 ? styles.disabled : ''}`}
        onClick={() => currentPage > 1 ? handlePageChange(currentPage - 1) : null}
        disabled={currentPage === 1}
      >
        <ChevronLeft size={16} />
      </button>
    );
    
    // ページ番号ボタン
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(
        <button
          key={i}
          onClick={() => handlePageChange(i)}
          className={`${styles.paginationButton} ${
            currentPage === i ? styles.paginationButtonActive : ''
          }`}
          aria-current={currentPage === i ? "page" : undefined}
        >
          {i}
        </button>
      );
    }
    
    // 「次へ」ボタン
    pageNumbers.push(
      <button
        key="next"
        className={`${styles.paginationButton} ${styles.paginationArrow} ${currentPage === totalPages ? styles.disabled : ''}`}
        onClick={() => currentPage < totalPages ? handlePageChange(currentPage + 1) : null}
        disabled={currentPage === totalPages}
      >
        <ChevronRight size={16} />
      </button>
    );
    
    // 「最後」のページへのボタン
    pageNumbers.push(
      <button 
        key="last"
        className={`${styles.paginationButton} ${currentPage === totalPages ? styles.disabled : ''}`}
        onClick={() => handlePageChange(totalPages)}
        disabled={currentPage === totalPages}
      >
        最後
      </button>
    );
    
    return pageNumbers;
  };
  
  /**
   * 表示するタグの制限（「すべて表示」が選択されていない場合は10件まで）
   */
  const displayTags = showAllTags ? allTags : allTags.slice(0, 10);

  /**
   * アクティブなフィルターの数をカウント（バッジ表示用）
   */
  const activeFilterCount = 
    (searchTerm ? 1 : 0) + 
    selectedTags.length + 
    (dateRange.start ? 1 : 0) + 
    (dateRange.end ? 1 : 0);

  useEffect(() => {
    const handleResize = () => {
      const newSize = window.innerWidth >= 1024 ? 6 : 3;
      if (newSize !== entriesPerPage) {
        setEntriesPerPage(newSize);
        // ページ番号も調整して表示件数の変更によるページずれを防止
        const newTotalPages = Math.ceil(filteredEntries.length / newSize);
        if (currentPage > newTotalPages) {
          setCurrentPage(Math.max(1, newTotalPages));
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [entriesPerPage, currentPage, filteredEntries.length]);

  // ページサイズオプションの修正
  const getPageSizeOptions = () => {
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      return [6, 12, 18, 24, 48]; // PC用（2列×3行の倍数）
    }
    return [3, 5, 10, 20, 50]; // モバイル用
  };

  const [pageSizeOptions] = useState(getPageSizeOptions());

  // preloadDataモードの場合は何も表示しない（先読み用）
  if (preloadData) {
    return null;
  }
  
  return (
    <>
      {/* 全画面背景 */}
      <div className={styles.pageBackground} diary-page></div>
      
      <div className={styles.container}>
        {/* ヘッダー部分 */}
        <div className={styles.titleSection}>
          <h1 className={styles.title}>3行日記を振り返る</h1>
          
          {/* ダッシュボードに戻るボタン */}
          <button
            onClick={handleBackToDashboard}
            className={styles.backToDashboardButton}
          >
            ダッシュボードに戻る
          </button>
        </div>
        
        {/* 検索バー */}
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="キーワードで検索..."
            value={searchTerm}
            onChange={handleSearchChange}
            className={styles.searchInput}
          />
          <Search className={styles.searchIcon} size={20} />
        </div>

        {/* フィルターボタンとパロットトグルを同じ行に */}
        <div className={styles.filterRow}>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={styles.filterButton}
          >
            <FilterIcon size={16} />
            <span>フィルター</span>
            {activeFilterCount > 0 && (
              <span className={styles.filterBadge}>{activeFilterCount}</span>
            )}
            <svg className={styles.arrowIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 9l6 6 6-6" />
            </svg>
          </button>
          
          {/* パロット表示トグルを右端に配置 */}
          <div className={styles.parrotToggle}>
            <label className={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={showParrots}
                onChange={handleParrotToggle}
                className={styles.toggleInput}
              />
              <span className={styles.toggleSwitch}></span>
              パロットを表示
            </label>
          </div>
        </div>

        {/* フィルターパネル */}
        {showFilters && (
          <div className={styles.filterPanel}>
            {/* 期間指定 */}
            <div className={styles.filterSection}>
              <div className={styles.filterHeader}>
                <Calendar size={16} className={styles.filterIcon} />
                <span className={styles.filterLabel}>期間</span>
              </div>
              <div className={styles.dateRangeContainer}>
                <input
                  type="date"
                  value={dateRange.start}
                  onChange={(e) => handleDateRangeChange('start', e.target.value)}
                  className={styles.dateInput}
                />
                <span className={styles.dateSeparator}>～</span>
                <input
                  type="date"
                  value={dateRange.end}
                  onChange={(e) => handleDateRangeChange('end', e.target.value)}
                  className={styles.dateInput}
                />
              </div>
            </div>

            {/* タグフィルター */}
            <div className={styles.filterSection}>
              <div className={styles.filterHeader}>
                <FilterIcon size={16} className={styles.filterIcon} />
                <span className={styles.filterLabel}>タグで絞り込み</span>
              </div>
              <div className={styles.tagsContainer}>
                <div className={styles.tagsList}>
                  {displayTags.map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => handleTagToggle(tag.name)}
                      className={`${styles.tagButton} ${
                        selectedTags.includes(tag.name) ? styles.tagButtonSelected : ''
                      }`}
                    >
                      {tag.name} {tag.count}
                    </button>
                  ))}
                </div>
                {allTags.length > 10 && (
                  <button
                    onClick={() => setShowAllTags(!showAllTags)}
                    className={styles.showMoreButton}
                  >
                    {showAllTags ? '表示を減らす' : `他${allTags.length - 10}件のタグを表示`}
                  </button>
                )}
              </div>
            </div>

            {/* フィルタークリアボタン */}
            {activeFilterCount > 0 && (
              <button 
                onClick={handleClearFilters}
                className={styles.clearFiltersButton}
              >
                フィルターをクリア
              </button>
            )}
          </div>
        )}

        {/* 検索結果カウントとページサイズ設定 */}
        <div className={styles.resultControlRow}>
          <div className={styles.resultCount}>
            {filteredEntries.length}件の記録が見つかりました
          </div>

          <div className={styles.pageSizeSelector}>
            <span>表示件数: </span>
            <select
              value={entriesPerPage}
              onChange={handlePageSizeChange}
              className={styles.pageSizeSelect}
            >
              {pageSizeOptions.map(size => (
                <option key={size} value={size}>
                  {size}件
                </option>
              ))}
            </select>
          </div>

          {/* エクスポートボタン */}
          <div className={styles.exportButtons}>
            <button 
              onClick={() => handleExport('txt')} 
              className={styles.exportButton}
            >
              📄 TXTで出力
            </button>
            <button 
              onClick={() => handleExport('csv')} 
              className={styles.exportButton}
            >
              📊 CSVで出力
            </button>
          </div>
        </div>

        {/* 上部ページネーション */}
        {filteredEntries.length > 0 && (
          <div className={styles.pagination}>
            {renderPageNumbers()}
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className={styles.errorMessage}>
            {error}
          </div>
        )}

        {/* ローディング状態と日記エントリー表示 */}
        {isLoading && diaryEntries.length === 0 ? (
          <div className={styles.loading}>データを読み込み中...</div>
        ) : (
          <>
            {/* 日記エントリー - 常に縦1列のリスト表示 */}
            <div ref={entriesContainerRef} className={styles.entriesContainer}>
              <div className={styles.entriesGrid}>
                {currentEntries.length > 0 ? (
                  currentEntries.map((entry) => (
                    <div key={entry.entry_id} className={styles.entryCard}>
                      {/* 日時とタグ */}
                      <div className={styles.entryHeader}>
                      <span className={styles.entryDate}>
                        {formatDateTime(entry.created_at)}
                      </span>
                        <div className={styles.entryTags}>
                          {entry.tags.map((tag, tagIndex) => (
                            <span 
                              key={tagIndex} 
                              className={styles.entryTag}
                              onClick={() => handleTagToggle(tag)}
                            >
                              #{tag}
                            </span>
                          ))}
                          {/* 編集ボタン */}
                          <button 
                            onClick={() => openEditModal(entry)}
                            className={styles.editButton}
                          >
                            <Edit2 size={14} />
                            編集
                          </button>
                          {/* 削除ボタン */}
                          <button 
                            onClick={() => openDeleteModal(entry)}
                            className={styles.deleteButton}
                          >
                            <Trash2 size={14} />
                            削除
                          </button>
                        </div>
                      </div>

                      {/* 日記内容 */}
                      <div className={styles.entryContent}>
                        <p>{entry.line1}</p>
                        {entry.line2 && <p>{entry.line2}</p>}
                        {entry.line3 && <p>{entry.line3}</p>}
                        
                        {/* パロットGIFの表示 */}
                        {showParrots && (
                          <div className={styles.parrotSection}>
                            <div className={styles.parrotSlotContainer}>
                              {/* 最大5つの枠を常に表示 */}
                              {Array(MAX_PARROTS).fill(null).map((_, index) => (
                                <div key={index} className={styles.parrotSlot}>
                                  {entry.parrots && entry.parrots[index] ? (
                                    <div className={styles.parrotContainer}>
                                      <Image 
                                        src={entry.parrots[index]}
                                        alt={`Parrot ${index + 1}`}
                                        width={32}
                                        height={32}
                                        className={styles.parrotGif}
                                      />
                                    </div>
                                  ) : (
                                    <div className={styles.emptyParrotSlot} />
                                  )}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className={styles.noResults}>
                    検索条件に一致する日記が見つかりませんでした
                  </div>
                )}
              </div>
            </div>
            
            {/* 下部ページネーション */}
            {filteredEntries.length > 0 && (
              <div className={styles.pagination}>
                {renderPageNumbers()}
              </div>
            )}
          </>
        )}
        
        {/* 編集モーダル */}
        {isModalOpen && editEntry && (
          <EditDiaryModal
            isOpen={isModalOpen}
            onClose={closeModal}
            entry={editEntry}
            date={editDate}
            onSave={handleSaveComplete}
          />
        )}

        {/* 削除確認モーダル */}
        {isDeleteModalOpen && entryToDelete && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContainer}>
              <h2 className={styles.modalTitle}>日記を削除</h2>
              <p>この日記エントリーを削除してもよろしいですか？</p>
              <p className={styles.warningText}>この操作は取り消せません。</p>
              <div className={styles.modalButtonContainer}>
                <button 
                  onClick={closeDeleteModal}
                  className={styles.cancelButton}
                >
                  キャンセル
                </button>
                <button 
                  onClick={handleDeleteEntry}
                  className={styles.deleteConfirmButton}
                >
                  削除する
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
});

// 表示名をセット
DiarySearch.displayName = 'DiarySearch';

export default DiarySearch;
