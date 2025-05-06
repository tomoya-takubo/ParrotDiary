//#region インポート
import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ActivityHistory.module.css';
import { createClient } from '@supabase/supabase-js';
import DiaryModal from '@/components/dashboard/modals/DiaryModal';
import { useAuth } from '@/lib/AuthContext';
import EditDiaryModal from '@/components/dashboard/modals/EditDiaryModal';
import { getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector';
//#endregion

//#region 型定義
/**
 * ActivityHistoryコンポーネントのprops
 */
type ActivityHistoryProps = {
  onCellClick?: (date: string) => void;
  width?: string | number;
  isGachaOpen?: boolean;
  onSave?: () => void;
};

/**
 * Supabaseから取得する日記エントリーの型
 */
type DBDiaryEntry = {
  entry_id: number;
  user_id: string;
  recorded_at: string;
  session_id?: number;
  type_id?: number;
  line1: string;
  line2?: string;
  line3?: string;
  created_at: string;
  updated_at: string;
};

/**
 * モーダル表示用の日記エントリーの型
 */
type ModalDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number | string;
  parrots?: string[];
};

/**
 * アクティビティのレベル（0-4）
 */
type ActivityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * カレンダーセルのデータ型
 */
type CellData = {
  date: string;
  day: number;
  month: number;
  year: number;
  level: ActivityLevel;
  count: number;
  isToday: boolean;
  isCurrentMonth: boolean;
};
//#endregion

//#region 定数と初期化
// Supabase クライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);
//#endregion

/**
 * ActivityHistory コンポーネント
 * ユーザーの活動履歴をカレンダー形式で表示する
 */
const ActivityHistory: React.FC<ActivityHistoryProps> = ({ 
  onCellClick, 
  width = '100%',
  isGachaOpen = false,
  onSave,
}) => {
  const { user, session, isLoading: authLoading } = useAuth();
  
  //#region 定数
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const MAX_AUTH_RETRIES = 3;
  const MONTHS_JP = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];
  //#endregion

  //#region refs
  const containerRef = useRef<HTMLDivElement>(null);
  //#endregion

  //#region 状態管理
  // 表示する年月
  const [currentDate, setCurrentDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  
  // エントリーデータ（日付ごと）
  const [entriesByDate, setEntriesByDate] = useState<Record<string, DBDiaryEntry[]>>({});
  // 選択されたセルデータ
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  // カレンダーデータ
  const [calendarData, setCalendarData] = useState<CellData[][]>([]);
  // 日記エントリーデータのロード状態
  const [loading, setLoading] = useState(true);
  // エラー状態
  const [error, setError] = useState<string | null>(null);
  // モーダル表示状態
  const [showModal, setShowModal] = useState(false);
  // モーダル用の日記エントリー
  const [modalEntries, setModalEntries] = useState<ModalDiaryEntry[]>([]);
  // データ更新トリガー
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  // 認証リトライカウント
  const [authRetryCount, setAuthRetryCount] = useState(0);
  // 編集対象のエントリー
  const [editingEntry, setEditingEntry] = useState<ModalDiaryEntry | null>(null);
  // 編集モーダル表示状態
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  //#endregion

  //#region データ操作関数
  /**
   * データを再取得するトリガー関数
   */
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  /**
   * 日付文字列の処理を改善する関数
   * 異なる形式の日付文字列を統一形式に変換する
   */
  const formatDateForComparison = (dateString: string): string => {
    // スペース区切り形式
    if (typeof dateString === 'string' && dateString.includes(' ')) {
      return dateString.split(' ')[0];
    }
    // T区切り形式（ISO形式）
    else if (typeof dateString === 'string' && dateString.includes('T')) {
      return dateString.split('T')[0];
    }
    return dateString;
  };

  /**
   * 日付文字列をYYYY-MM-DD形式に変換
   */
  const formatDateString = (date: Date): string => {
    // クライアントのローカルタイムゾーンで日付部分だけを取得
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
    
  /**
   * 日付を表示形式に変換（例: 2024年3月15日）
   */
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };

  /**
   * 表示形式の日付から内部形式への変換（例: 2024年3月15日 → 2024-03-15）
   */
  const parseDisplayDate = (displayDate: string): string | null => {
    try {
      const matches = displayDate.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
      if (!matches) return null;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const [_, year, month, day] = matches;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    } catch (e) {
      console.error('日付変換エラー:', e);
      return null;
    }
  };

  /**
   * DBデータをモーダル表示用データに変換
   * 日記エントリーからモーダル表示用のフォーマットに変換し、タグとパロット情報も取得する
   */
  const convertToModalEntry = async (dbEntry: DBDiaryEntry): Promise<ModalDiaryEntry> => {
    const recordedTime = new Date(dbEntry.recorded_at);
    const hours = String(recordedTime.getHours()).padStart(2, '0');
    const minutes = String(recordedTime.getMinutes()).padStart(2, '0');
    const timeStr = `${hours}:${minutes}`;
      
    const activities = [dbEntry.line1];
    if (dbEntry.line2) activities.push(dbEntry.line2);
    if (dbEntry.line3) activities.push(dbEntry.line3);

    let tags: string[] = [];

    try {
      // タグ使用履歴を取得
      const { data: tagUsages } = await supabase
        .from('tag_usage_histories')
        .select('tag_id')
        .eq('entry_id', dbEntry.entry_id);

      const tagIds = tagUsages?.map(t => t.tag_id).filter(Boolean);
      if (tagIds && tagIds.length > 0) {
        // タグ名を取得
        const { data: tagNames } = await supabase
          .from('tags')
          .select('name')
          .in('tag_id', tagIds);
        tags = tagNames?.map(t => t.name) || [];
      }
    } catch (error) {
      console.error('タグ取得エラー:', error);
    }

    // パロット情報を取得
    let parrots: string[] = [];
    try {
      if (dbEntry.entry_id) {
        const entryId = String(dbEntry.entry_id);
        const parrotUrls = await getEntryParrots(entryId);
        if (Array.isArray(parrotUrls) && parrotUrls.length > 0) {
          parrots = parrotUrls;
        }
      }
    } catch (error) {
      console.error('パロット取得エラー:', error);
    }

    return {
      time: timeStr,
      tags: tags.length > 0 ? tags : ['3行日記'], // タグがないときのフォールバック
      activities,
      created_at: dbEntry.created_at,
      entry_id: dbEntry.entry_id,
      parrots // パロット情報を追加
    };
  };

  /**
   * 月を変更する関数
   */
  const changeMonth = (increment: number) => {
    setCurrentDate(prevDate => {
      const newDate = new Date(prevDate);
      newDate.setMonth(newDate.getMonth() + increment);
      return newDate;
    });
  };
  //#endregion

  //#region データ取得とカレンダー生成
  /**
   * 認証状態とトリガーに基づいてデータを取得するuseEffect
   */
  useEffect(() => {
    const fetchDiaryEntries = async () => {
      try {
        if (authLoading) {
          setLoading(true);
          return;
        }
        
        setLoading(true);
        
        if (!user?.id || !session?.access_token) {
          console.log('認証情報を待機中またはログインしていません');
          setEntriesByDate({});
          setLoading(false);
          return;
        }
          
        const userId = user.id;
        console.log('認証されたユーザーID:', userId);

        // 日付範囲の設定
        const today = new Date();
        const sixMonthsAgo = new Date(today);
        sixMonthsAgo.setMonth(today.getMonth() - 6);
        
        console.log(`ユーザーID ${userId} の活動履歴を取得中...`);
        
        // ユーザー固有のデータを取得
        const { data, error } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('user_id', userId)
          .gte('recorded_at', formatDateString(sixMonthsAgo) + ' 00:00:00')
          .lte('recorded_at', formatDateString(today) + ' 23:59:59')
          .order('recorded_at', { ascending: false });

        // デバッグ出力
        console.log('取得したデータ:', data);
        console.log('今日の日付:', formatDateString(today));
      
        // エラー処理
        if (error) {
          console.error('データ取得エラー:', error);
          setError(`データの取得に失敗しました: ${error.message}`);
          setEntriesByDate({});
          setLoading(false);
          return;
        }
        
        console.log('取得した活動履歴:', data?.length || 0, '件');
        
        // エントリーを日付ごとにグループ化
        const entriesByDate: Record<string, DBDiaryEntry[]> = {};
        data?.forEach((entry) => {
          const date = formatDateForComparison(entry.recorded_at);
          
          if (!entriesByDate[date]) {
            entriesByDate[date] = [];
          }
          entriesByDate[date].push(entry as DBDiaryEntry);
        });
        
        setEntriesByDate(entriesByDate);
        setError(null);

      } catch (err) {
        console.error('日記エントリー取得中のエラー:', err);
        setError(`予期せぬエラーが発生しました: ${(err as Error).message}`);
        setEntriesByDate({});
      } finally {
        setLoading(false);
      }
    };
    
    if (!authLoading || user?.id) {
      fetchDiaryEntries();
    }
  }, [user, session, authLoading, refreshTrigger]);

  /**
   * カレンダーグリッドの生成（月間カレンダー形式）
   */
  const generateCalendarGrid = () => {
    const today = new Date();
    const todayStr = formatDateString(today);
    
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // 月の最初の日の曜日を取得（0: 日曜日, 1: 月曜日, ...）
    const firstDayOfMonth = new Date(year, month, 1);
    const firstDayOfWeek = firstDayOfMonth.getDay();
    
    // 月の最終日を取得
    const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
    
    // 前月の日数を取得（前月の表示用）
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    // カレンダーの行数を計算（最大6週間）
    const rowCount = Math.ceil((firstDayOfWeek + lastDayOfMonth) / 7);
    
    // カレンダーグリッドを初期化
    const grid: CellData[][] = Array(rowCount).fill(null).map(() => Array(7).fill(null));
    
    // 日付の設定
    let day = 1;
    let nextMonthFlag = false;
    
    for (let row = 0; row < rowCount; row++) {
      for (let col = 0; col < 7; col++) {
        // グリッドの開始位置を計算
        if (row === 0 && col < firstDayOfWeek) {
          // 前月の日付
          const prevMonthDay = prevMonthLastDay - (firstDayOfWeek - col - 1);
          const prevMonth = month === 0 ? 11 : month - 1;
          const prevYear = month === 0 ? year - 1 : year;
          const dateObj = new Date(prevYear, prevMonth, prevMonthDay);
          const dateStr = formatDateString(dateObj);
          
          const entries = entriesByDate[dateStr] || [];
          grid[row][col] = {
            date: dateStr,
            day: prevMonthDay,
            month: prevMonth,
            year: prevYear,
            level: Math.min(entries.length, 4) as ActivityLevel,
            count: entries.length,
            isToday: dateStr === todayStr,
            isCurrentMonth: false
          };
        } else if (day <= lastDayOfMonth && !nextMonthFlag) {
          // 当月の日付
          const dateObj = new Date(year, month, day);
          const dateStr = formatDateString(dateObj);
          
          const entries = entriesByDate[dateStr] || [];
          grid[row][col] = {
            date: dateStr,
            day: day,
            month: month,
            year: year,
            level: Math.min(entries.length, 4) as ActivityLevel,
            count: entries.length,
            isToday: dateStr === todayStr,
            isCurrentMonth: true
          };
          
          day++;
          
          // 月末に達したら次月フラグをオン
          if (day > lastDayOfMonth) {
            nextMonthFlag = true;
            day = 1;
          }
        } else {
          // 次月の日付
          const nextMonth = month === 11 ? 0 : month + 1;
          const nextYear = month === 11 ? year + 1 : year;
          const dateObj = new Date(nextYear, nextMonth, day);
          const dateStr = formatDateString(dateObj);
          
          const entries = entriesByDate[dateStr] || [];
          grid[row][col] = {
            date: dateStr,
            day: day,
            month: nextMonth,
            year: nextYear,
            level: Math.min(entries.length, 4) as ActivityLevel,
            count: entries.length,
            isToday: dateStr === todayStr,
            isCurrentMonth: false
          };
          
          day++;
        }
      }
    }
    
    setCalendarData(grid);
  };

  /**
   * カレンダーグリッド生成のトリガーuseEffect
   */
  useEffect(() => {
    if (!loading || Object.keys(entriesByDate).length >= 0) {
      generateCalendarGrid();
    }
  }, [currentDate, entriesByDate, loading]);

  /**
   * 認証リトライを処理するuseEffect
   */
  useEffect(() => {
    if (authLoading && authRetryCount < MAX_AUTH_RETRIES) {
      const timer = setTimeout(() => {
        console.log(`認証リトライ ${authRetryCount + 1}/${MAX_AUTH_RETRIES}`);
        setAuthRetryCount(prev => prev + 1);
        setRefreshTrigger(prev => prev + 1);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, authRetryCount]);
  //#endregion

  //#region イベントハンドラー
  /**
   * セルクリックのハンドラー
   * カレンダーのセルがクリックされたときの処理
   */
  const handleCellClick = async (cell: CellData) => {
    if (isGachaOpen) return;
  
    setSelectedDate(cell.date);
  
    if (onCellClick) {
      onCellClick(cell.date);
    }
  
    const entries = entriesByDate[cell.date] || [];
    
    if (entries.length === 0) {
      setModalEntries([]);
      setShowModal(true); // 空の場合はすぐに表示
    } else {
      try {
        console.log("パロット情報取得開始:", entries.length, "件のエントリー");
        
        // モーダルエントリーに変換（パロット情報も取得）
        const modalData = await Promise.all(entries.map(convertToModalEntry));
        
        // デバッグのためにパロット情報の確認
        modalData.forEach((entry, index) => {
          console.log(`エントリー ${index} のパロット情報:`, entry.parrots);
        });
        
        setModalEntries(modalData);
        setShowModal(true);
      } catch (error) {
        console.error("エントリー変換中にエラーが発生しました:", error);
        // エラー時も何かしらの結果を表示する
        setModalEntries([]); 
        setShowModal(true);
      }
    }
  };

  /**
   * モーダルを閉じるハンドラー
   */
  const handleCloseModal = () => {
    setShowModal(false);
  };

  /**
   * エントリー編集ハンドラー
   */
  const handleEditEntry = (entry: ModalDiaryEntry) => {
    // entry_id が string 型の場合は number に変換
    const convertedEntry = {
      ...entry,
      entry_id: entry.entry_id !== undefined ? 
        (typeof entry.entry_id === 'string' ? parseInt(entry.entry_id, 10) : entry.entry_id) : 
        undefined
    };
    
    setEditingEntry(convertedEntry);
    setIsEditModalOpen(true);
    setShowModal(false); // DiaryModalを閉じる
  };
  
  /**
   * 編集モーダルを閉じるハンドラー
   */
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEntry(null);
  };

  /**
   * 編集完了後のハンドラー
   */
  const handleEditComplete = () => {
    setIsEditModalOpen(false);
    setEditingEntry(null);
    refreshData(); // 自分自身のカレンダー再取得
    onSave?.(); // page.tsx に通知して refreshKey を増やす
  };

  /**
   * 日記モーダルの日付変更ハンドラー
   */
  const handleDateChange = async (newDisplayDate: string) => {
    console.log('日付変更:', newDisplayDate);
    const newDateString = parseDisplayDate(newDisplayDate);
    
    if (newDateString) {
      try {
        setSelectedDate(newDateString);
        
        // 新しい日付のデータを取得
        const entries = entriesByDate[newDateString] || [];
        
        // データ変換処理
        let modalData: ModalDiaryEntry[] = [];
        if (entries.length > 0) {
          modalData = await Promise.all(entries.map(convertToModalEntry));
        }
        
        // 処理完了後にモーダルエントリーを更新
        setModalEntries(modalData);
      } catch (error) {
        console.error("エントリー変換中にエラーが発生しました:", error);
        setModalEntries([]);
      }
    }
  };
  //#endregion

  //#region レンダリング
  return (
    <div className={`${styles.container} ${isGachaOpen ? styles.gachaOpen : ''}`} style={{ width }} ref={containerRef}>
      {/* カレンダーカード */}
      <div className={styles.calendarCard}>
        {/* カードヘッダー（タイトルとナビゲーションボタン） */}
        <div className={styles.cardHeader}>
          <h2 className={styles.title}>
            活動記録 - {currentDate.getFullYear()}年{MONTHS_JP[currentDate.getMonth()]}
          </h2>
          <div className={styles.navigationButtons}>
            <button 
              className={styles.navButton} 
              onClick={() => changeMonth(-1)}
              aria-label="前月"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              className={styles.navButton} 
              onClick={() => changeMonth(1)}
              aria-label="翌月"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {(authLoading || loading) ? (
          <div className={styles.loading}>データを読み込み中...</div>
        ) : error && error !== 'この機能を利用するにはログインが必要です' ? (
          <div className={styles.error}>エラー: {error}</div>
        ) : (
          <div className={styles.calendarContent}>
            {/* 月間カレンダー */}
            <div className={styles.monthlyCalendar}>
              {/* 曜日ヘッダー */}
              <div className={styles.weekdayHeader}>
                {WEEKDAYS.map(weekday => (
                  <div key={weekday} className={styles.weekdayHeaderCell}>
                    {weekday}
                  </div>
                ))}
              </div>
              
              {/* カレンダー本体 */}
              <div className={styles.monthlyGrid}>
                {calendarData.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className={styles.weekRow}>
                    {week.map((cell, dayIndex) => (
                      <div 
                        key={`day-${weekIndex}-${dayIndex}`} 
                        className={`
                          ${styles.dayCell}
                          ${cell ? styles[`level${cell.level}`] : ''}
                          ${cell && !cell.isCurrentMonth ? styles.otherMonth : ''}
                          ${cell && cell.isToday ? styles.today : ''}
                        `}
                        onClick={() => cell && handleCellClick(cell)}
                      >
                        {cell && (
                          <>
                            <div className={styles.dayCellContent}>
                              <span className={styles.dayNumber}>{cell.day}</span>
                              {cell.count > 0 && (
                                <span 
                                  className={styles.activityCount}
                                  title={`${cell.count}件のアクティビティ`}
                                >
                                  {cell.count}
                                </span>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
            
            {/* レベル説明 */}
            <div className={styles.levelLegend}>
              <span className={styles.legendText}>少ない</span>
              <div className={`${styles.legendCell} ${styles.level0}`} />
              <div className={`${styles.legendCell} ${styles.level1}`} />
              <div className={`${styles.legendCell} ${styles.level2}`} />
              <div className={`${styles.legendCell} ${styles.level3}`} />
              <div className={`${styles.legendCell} ${styles.level4}`} />
              <span className={styles.legendText}>多い</span>
            </div>
          </div>
        )}
      </div>
      
      {/* 日記モーダル */}
      <DiaryModal 
        isOpen={showModal}
        onClose={handleCloseModal}
        date={selectedDate ? formatDisplayDate(selectedDate) : null}
        entries={modalEntries}
        onDataUpdated={refreshData}
        isToday={selectedDate === formatDateString(new Date())}
        onEditEntry={handleEditEntry}
        onDateChange={handleDateChange}
      />
      
      {/* 編集モーダル */}
      {isEditModalOpen && editingEntry && (
        <EditDiaryModal
          isOpen={isEditModalOpen}
          onClose={handleCloseEditModal}
          entry={editingEntry}
          date={selectedDate ? formatDisplayDate(selectedDate) : null}
          onSave={handleEditComplete}
        />
      )}
    </div>
  );
  //#endregion
};

export default ActivityHistory;