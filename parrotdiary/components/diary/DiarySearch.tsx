// src/components/diary/DiarySearch.tsx
import React, { useState, useEffect } from 'react';
import { Search, FilterIcon, Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import diaryService, { DiaryEntry, TagWithCount } from '@/services/diaryService';
import styles from './diary.module.css';
import Image from 'next/image';
import EditDiaryModal from '@/components/dashboard/modals/EditDiaryModal';
import { getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector';

// 拡張したDiaryEntryタイプを定義
interface ExtendedDiaryEntry extends DiaryEntry {
  parrots?: string[];
}

// 編集用のエントリータイプ定義
type EditDiaryEntryType = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number | string;
  parrots?: string[];
};

/**
 * 日記検索ページのコンポーネント
 * ログインユーザーの日記を検索・フィルタリングする機能を提供します
 */
const DiarySearch = () => {
  // #region 状態管理
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showAllTags, setShowAllTags] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<ExtendedDiaryEntry[]>([]);
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 編集モーダル用の状態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editEntry, setEditEntry] = useState<EditDiaryEntryType | null>(null);
  const [editDate, setEditDate] = useState<string | null>(null);
  
  // ページネーション用の状態
  const [currentPage, setCurrentPage] = useState(1);
  const [entriesPerPage, setEntriesPerPage] = useState(5);
  const [pageSizeOptions] = useState([5, 10, 20, 50]);

  // DiarySearch.tsx 内に viewMode の状態を追加
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  // #endregion

  // #region データ取得
  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        setIsLoading(true);
        setError(null);
        
        // Supabaseサービスを使って日記データを取得
        const diaryResponse = await diaryService.getUserDiaryEntries(user.id);
        
        // パロット情報を持つ拡張エントリーとして初期化
        const extendedEntries: ExtendedDiaryEntry[] = diaryResponse.map(entry => ({
          ...entry,
          parrots: [] // 初期値として空配列を設定
        }));
        
        // 一時的にエントリーを設定
        setDiaryEntries(extendedEntries);
        
        // タグデータを取得
        const tagsResponse = await diaryService.getUserTags(user.id);
        setAllTags(tagsResponse);
        
        // 各エントリーのパロット情報を取得
        const entriesWithParrots = await Promise.all(
          extendedEntries.map(async (entry) => {
            try {
              // getEntryParrotsが文字列の引数を期待している場合は変換
              const entryId = String(entry.entry_id);
              const parrotUrls = await getEntryParrots(entryId);
              // パロット情報をセット
              return {
                ...entry,
                parrots: Array.isArray(parrotUrls) ? parrotUrls : []
              };
            } catch (err) {
              console.error(`エントリー ${entry.entry_id} のパロット取得エラー:`, err);
              return entry; // エラー時は元のエントリーを返す
            }
          })
        );
        
        // パロット情報を含むエントリーで更新
        setDiaryEntries(entriesWithParrots);
        
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
        setError('データの読み込み中にエラーが発生しました。再度お試しください。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  // 画面サイズに基づいて自動的に表示モードを調整
  useEffect(() => {
    const updateViewMode = () => {
      setViewMode(window.innerWidth >= 768 ? 'grid' : 'list');
    };
    
    window.addEventListener('resize', updateViewMode);
    updateViewMode(); // 初期表示時に実行
    
    return () => window.removeEventListener('resize', updateViewMode);
  }, []);
  // #endregion

  // #region イベントハンドラ
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
    // フィルター変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setDateRange({ start: '', end: '' });
    // フィルタークリア時は1ページ目に戻す
    setCurrentPage(1);
  };

  // 検索キーワード変更時
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    // 検索条件変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  // 日付範囲変更時
  const handleDateRangeChange = (type: 'start' | 'end', value: string) => {
    setDateRange(prev => ({ ...prev, [type]: value }));
    // 日付条件変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  // ページサイズ変更ハンドラ
  const handlePageSizeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSize = parseInt(e.target.value);
    setEntriesPerPage(newSize);
    // ページサイズ変更時は1ページ目に戻す
    setCurrentPage(1);
  };

  // ページ変更ハンドラ
  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // ページトップにスクロール
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // 編集モーダルを開く
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
  
  // モーダルを閉じる
  const closeModal = () => {
    setIsModalOpen(false);
    setEditEntry(null);
    setEditDate(null);
  };
  
  // 編集保存後の処理
  const handleSaveComplete = () => {
    closeModal();
    // データを再取得
    if (user) {
      // フルリロード
      fetchDataWithParrots(user.id);
    }
  };
  
  // パロット情報を含むデータ取得関数
  const fetchDataWithParrots = async (userId: string) => {
    try {
      setIsLoading(true);
      
      // 日記エントリーを取得
      const diaryResponse = await diaryService.getUserDiaryEntries(userId);
      
      // 拡張エントリーとして初期化
      const extendedEntries: ExtendedDiaryEntry[] = diaryResponse.map(entry => ({
        ...entry,
        parrots: [] // 初期値として空配列を設定
      }));
      
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
      
      setDiaryEntries(entriesWithParrots);
    } catch (error) {
      console.error('データの再取得に失敗しました:', error);
      setError('データの更新中にエラーが発生しました。再度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };
  // #endregion

  // #region フィルタリングとフォーマット
  // 日付と時間のフォーマット
  const formatDateTime = (dateTimeStr: string) => {
    const d = new Date(dateTimeStr);
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${weekDays[d.getDay()]}曜日 ${hours}:${minutes}`;
  };

  // フィルタリングされたエントリー
  const filteredEntries = diaryEntries.filter((entry) => {
    const entryContent = `${entry.line1} ${entry.line2 || ''} ${entry.line3 || ''}`;
    const matchesSearch =
      searchTerm === '' ||
      entryContent.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTags =
      selectedTags.length === 0 ||
      selectedTags.every((tag) => entry.tags.includes(tag));
    
    const entryDate = new Date(entry.created_at);
    const afterStart = !dateRange.start || entryDate >= new Date(dateRange.start);
    const beforeEnd = !dateRange.end || entryDate <= new Date(dateRange.end + 'T23:59:59'); // 終了日の終わりまで含める
    
    return matchesSearch && matchesTags && afterStart && beforeEnd;
  });

  // ページネーションのためのデータ計算
  const indexOfLastEntry = currentPage * entriesPerPage;
  const indexOfFirstEntry = indexOfLastEntry - entriesPerPage;
  const currentEntries = filteredEntries.slice(indexOfFirstEntry, indexOfLastEntry);
  const totalPages = Math.ceil(filteredEntries.length / entriesPerPage);

  // ページボタンの生成
  const renderPageNumbers = () => {
    const pageNumbers = [];
    const maxVisiblePages = 5; // 表示するページボタンの最大数
    
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // 表示ページ数を調整（重要：この部分が安定した表示のカギ）
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
        onClick={() => handlePageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`${styles.paginationButton} ${styles.paginationArrow} ${currentPage === 1 ? styles.disabled : ''}`}
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
        >
          {i}
        </button>
      );
    }
    
    // 「次へ」ボタン
    pageNumbers.push(
      <button
        key="next"
        onClick={() => handlePageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`${styles.paginationButton} ${styles.paginationArrow} ${currentPage === totalPages ? styles.disabled : ''}`}
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

  // 表示するタグ
  const displayTags = showAllTags ? allTags : allTags.slice(0, 10);

  // アクティブなフィルターの数をカウント
  const activeFilterCount = 
    (searchTerm ? 1 : 0) + 
    selectedTags.length + 
    (dateRange.start ? 1 : 0) + 
    (dateRange.end ? 1 : 0);
  // #endregion

  return (
    <>
      {/* 全画面背景 */}
      <div className={styles.pageBackground}></div>
      
      <div className={styles.container}>
        <div className={styles.titleSection}>
          <h1 className={styles.title}>3行日記を振り返る</h1>
          
          {/* ダッシュボードに戻るボタン */}
          <button
            onClick={() => window.location.href = '/dashboard'}
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

        {/* フィルターボタン */}
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

        {/* ローディング状態 */}
        {isLoading ? (
          <div className={styles.loading}>データを読み込み中...</div>
        ) : (
          <>
            {/* 日記エントリー */}
            <div className={`${styles.entriesContainer} ${viewMode === 'grid' ? styles.entriesGrid : ''}`}>
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
                        {/* 編集ボタンを追加 */}
                        <button 
                          onClick={() => openEditModal(entry)}
                          className={styles.editButton}
                        >
                          編集
                        </button>
                      </div>
                    </div>

                    {/* 内容 */}
                    <div className={styles.entryContent}>
                      <p>{entry.line1}</p>
                      {entry.line2 && <p>{entry.line2}</p>}
                      {entry.line3 && <p>{entry.line3}</p>}
                      
                      {/* パロットGIFの表示 */}
                      {entry.parrots && entry.parrots.length > 0 && (
                        <div className={styles.parrotBottomRight}>
                          {entry.parrots.map((parrot, index) => (
                            <div key={index} className={styles.parrotContainer}>
                              <Image 
                                src={parrot}
                                alt={`Parrot ${index + 1}`}
                                width={40}
                                height={40}
                                className={styles.parrotGif}
                              />
                            </div>
                          ))}
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
      </div>
    </>
  );
};

export default DiarySearch;