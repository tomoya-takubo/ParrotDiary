// src/components/diary/DiarySearch.tsx
import React, { useState, useEffect } from 'react';
import { Search, FilterIcon, Calendar } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import diaryService, { DiaryEntry, TagWithCount } from '@/services/diaryService';
import styles from './diary.module.css';

/**
 * 日記検索ページのコンポーネント
 * ログインユーザーの日記を検索・フィルタリングする機能を提供します
 */
const DiarySearch = () => {
  // #region 状態管理
  const { user } = useAuth(); // 認証情報を取得
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showAllTags, setShowAllTags] = useState(false);
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>([]);
  const [allTags, setAllTags] = useState<TagWithCount[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setDiaryEntries(diaryResponse);
        
        // タグデータを取得
        const tagsResponse = await diaryService.getUserTags(user.id);
        setAllTags(tagsResponse);
        
      } catch (error) {
        console.error('データの取得に失敗しました:', error);
        setError('データの読み込み中にエラーが発生しました。再度お試しください。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);
  // #endregion

  // #region イベントハンドラ
  const handleTagToggle = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter((t) => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setSelectedTags([]);
    setDateRange({ start: '', end: '' });
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
    const entryContent = `${entry.line1} ${entry.line2} ${entry.line3}`;
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
    <div className={styles.container}>
      <h1 className={styles.title}>3行日記を振り返る</h1>
      
      {/* 検索バー */}
      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="キーワードで検索..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
                onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
                className={styles.dateInput}
              />
              <span className={styles.dateSeparator}>～</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
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

      {/* 検索結果カウント */}
      <div className={styles.resultCount}>
        {filteredEntries.length}件の記録が見つかりました
      </div>

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
        /* 日記エントリー */
        <div className={styles.entriesContainer}>
          {filteredEntries.length > 0 ? (
            filteredEntries.map((entry) => (
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
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* 内容 */}
                <div className={styles.entryContent}>
                  <p>{entry.line1}</p>
                  <p>{entry.line2}</p>
                  <p>{entry.line3}</p>
                </div>
              </div>
            ))
          ) : (
            <div className={styles.noResults}>
              検索条件に一致する日記が見つかりませんでした
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DiarySearch;