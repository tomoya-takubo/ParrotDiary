import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ActivityHistory.module.css';
import { createClient } from '@supabase/supabase-js';
import DiaryModal from '@/components/dashboard/modals/DiaryModal';
import { useAuth } from '@/lib/AuthContext'; // 認証コンテキストをインポート

//#region 型定義
// モーダルの状態をGachaModalと連動させるためのpropsを追加
type ActivityHistoryProps = {
  onCellClick?: (date: string) => void;
  width?: string | number;
  isGachaOpen?: boolean; // ガチャモーダルが開いているかどうかのフラグ
};

// 日記エントリーの型
type DiaryEntry = {
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

// モーダル表示用の日記エントリー型
type ModalDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
};

// アクティビティレベルの型
type ActivityLevel = 0 | 1 | 2 | 3 | 4;

// #region セルデータの型
type CellData = {
  date: string;
  day: number;
  month: number;
  year: number;
  level: ActivityLevel;
  count: number;
  isToday: boolean;
};
//#endregion

// Supabase クライアントの初期化
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ 
  onCellClick, 
  width = '100%',
  isGachaOpen = false // デフォルトはfalse
}) => {  // 認証コンテキストから情報を取得
  const { user, session, isLoading: authLoading } = useAuth();
  
  //#region 定数
  const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const CELL_WIDTH = 36; // セルの幅
  const CELL_GAP = 8;  // セル間のギャップ
  const TOTAL_CELL_WIDTH = CELL_WIDTH + CELL_GAP; // セル幅 + ギャップ
  const WEEKDAY_LABEL_WIDTH = 50; // 曜日ラベルの幅
  const MAX_AUTH_RETRIES = 3;
  //#endregion

  //#region refs
  const containerRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  //#endregion

  //#region 状態管理
  // 現在のオフセット（何週前を表示するか）
  const [currentOffset, setCurrentOffset] = useState(0);
  // 列数
  const [columnCount, setColumnCount] = useState(20);
  // カレンダーデータ
  const [calendarData, setCalendarData] = useState<{
    rows: Record<string, (CellData | null)[]>;
  }>({
    rows: {}
  });
  // エントリーデータ（日付ごと）
  const [entriesByDate, setEntriesByDate] = useState<Record<string, DiaryEntry[]>>({});
  // 選択されたセルデータ
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
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

  const [authRetryCount, setAuthRetryCount] = useState(0);

  //#endregion

  // データを再取得する関数
  const refreshData = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  //#region レイアウト調整
  // カードの幅に基づいて表示する列数を計算
  useEffect(() => {
    const calculateColumnCount = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.clientWidth;
      // パディングと曜日ラベル幅を考慮して、表示可能な最大の列数を計算
      const availableWidth = containerWidth - WEEKDAY_LABEL_WIDTH - 50; // 50pxはパディングなどの余分なスペース
      const maxColumns = Math.floor(availableWidth / TOTAL_CELL_WIDTH);
      
      setColumnCount(Math.max(10, maxColumns)); // 最低10列は表示
    };
    
    // 初回レンダリング時に計算
    calculateColumnCount();
    
    // ウィンドウサイズ変更時にも再計算
    const handleResize = () => {
      calculateColumnCount();
    };
    
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  //#endregion

  //#region データ取得
  // 日付文字列の処理を改善する関数
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
  
  // 認証状態とトリガーに基づいてデータを取得
  useEffect(() => {
    const fetchDiaryEntries = async () => {
      try {
        // authLoadingの場合は単に戻るだけではなく、ローディング状態を設定
        if (authLoading) {
          setLoading(true);
          return;
        }
        
        setLoading(true);
        
        // ユーザー認証のより堅牢なチェック
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
          .gte('recorded_at', formatDateString(sixMonthsAgo) + ' 00:00:00')  // 時刻部分を追加
          .lte('recorded_at', formatDateString(today) + ' 23:59:59')  // 1日の終わりまで含める
          .order('recorded_at', { ascending: false });

        // デバッグ出力
        console.log('取得したデータ:', data);
        console.log('今日の日付:', formatDateString(today));
      
        // エラー処理
        if (error) {
          console.error('データ取得エラー:', error);
          // エラーを設定するが、「ログインが必要です」エラーは回避
          setError(`データの取得に失敗しました: ${error.message}`);
          // エラーがあっても空のデータを設定して表示を維持
          setEntriesByDate({});
          setLoading(false);
          return;
        }
        
        console.log('取得した活動履歴:', data?.length || 0, '件');
        
        // エントリーを日付ごとにグループ化
        const entriesByDate: Record<string, DiaryEntry[]> = {};
        data?.forEach((entry) => {
          const date = formatDateForComparison(entry.recorded_at);
          
          if (!entriesByDate[date]) {
            entriesByDate[date] = [];
          }
          entriesByDate[date].push(entry as DiaryEntry);
        });
        
        setEntriesByDate(entriesByDate);
        // エラーをクリア
        setError(null);

        console.log('今日の日付（JST）:', formatDateString(today));
        console.log('取得したエントリーの日付一覧:', data?.map(e => formatDateForComparison(e.recorded_at)));
        console.log('タイムゾーン調整後の今日の日付:', formatDateForComparison(new Date().toISOString()));

      } catch (err) {
        console.error('日記エントリー取得中のエラー:', err);
        setError(`予期せぬエラーが発生しました: ${(err as Error).message}`);
        setEntriesByDate({});
        } finally {
        setLoading(false);
      }
    };
    
    // 認証ロード中でない場合「または」有効なユーザーがいる場合のみデータ取得を試みる
    if (!authLoading || user?.id) {
      fetchDiaryEntries();
    }
  }, [user, session, authLoading, refreshTrigger]); // 認証情報が変わるか、リフレッシュトリガーが変わったときに再取得
  //#endregion

  //#region カレンダーグリッド生成
  useEffect(() => {
    // entriesByDateが空でも実行できるように条件を修正
    if ((!loading || Object.keys(entriesByDate).length >= 0) && columnCount > 0) {
      generateCalendarGrid();
    }
  }, [currentOffset, entriesByDate, loading, columnCount]);

  // 認証リトライを処理するuseEffectを追加
  useEffect(() => {
    // コンポーネントマウント後も認証ロード中の場合、リトライを設定
    if (authLoading && authRetryCount < MAX_AUTH_RETRIES) {
      const timer = setTimeout(() => {
        console.log(`認証リトライ ${authRetryCount + 1}/${MAX_AUTH_RETRIES}`);
        setAuthRetryCount(prev => prev + 1);
        setRefreshTrigger(prev => prev + 1);
      }, 2000); // リトライ間隔は2秒
      
      return () => clearTimeout(timer);
    }
  }, [authLoading, authRetryCount]);
    
  // カレンダーグリッドの生成
  const generateCalendarGrid = () => {
    const today = new Date();
    const todayStr = formatDateForComparison(today.toISOString());
    
    // 終了日は今日
    const endDate = new Date(today);
    
    // 開始日の計算
    // 今日が含まれる週の日曜日から始めて、そこから(columnCount-1)週間前に設定
    // さらにオフセットを考慮
    const todayDayOfWeek = today.getDay();
    const startDate = new Date(today);
    // 日曜日まで戻る
    startDate.setDate(today.getDate() - todayDayOfWeek);
    // columnCount-1週間前に戻る
    startDate.setDate(startDate.getDate() - (columnCount - 1) * 7);
    // オフセットを適用
    startDate.setDate(startDate.getDate() - currentOffset * columnCount * 7);
    
    // 曜日ごとの行を初期化
    const rows: Record<string, (CellData | null)[]> = {};
    WEEKDAYS.forEach(day => {
      rows[day] = [];
    });
    
    // 現在の日付
    let currentDate = new Date(startDate);
    
    // columnCount週間分のデータを生成
    let colIndex = 0;
    while (colIndex < columnCount) {
      // 1週間分の日付を処理
      for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
        const date = new Date(currentDate);
        date.setDate(currentDate.getDate() + dayOfWeek);
        
        const dateStr = formatDateString(date);
        const weekday = WEEKDAYS[dayOfWeek];
        
        // 今日より後の日付はnullとして設定
        if (date > endDate) {
          rows[weekday].push(null);
          continue;
        }
        
        const entries = entriesByDate[dateStr] || [];
        rows[weekday].push({
          date: dateStr,
          day: date.getDate(),
          month: date.getMonth(),
          year: date.getFullYear(),
          level: Math.min(entries.length, 4) as ActivityLevel,
          count: entries.length,
          isToday: dateStr === todayStr
        });
      }
      
      // 次の週に進む
      currentDate.setDate(currentDate.getDate() + 7);
      colIndex++;
    }
    
    setCalendarData({ rows });
  };
  //#endregion

  //#region ヘルパー関数
  // 日付文字列をYYYY-MM-DD形式に変換
  const formatDateString = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  // 日付を表示形式に変換（例: 2024年3月15日）
  const formatDisplayDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${year}年${month}月${day}日`;
  };
  
  // アクティビティレベルに応じたクラス名を取得
  const getLevelClassName = (level: ActivityLevel, isToday: boolean): string => {
    if (isToday) {
      return styles.cellToday;
    }
    
    return styles[`level${level}`];
  };
  //#endregion

  //#region イベントハンドラー
  // セルクリックのハンドラー
  const handleCellClick = (cell: CellData) => {

        // ガチャモーダルが開いている場合は処理をスキップ
        if (isGachaOpen) {
          return;
        }
    
    setSelectedDate(cell.date);
    
    // 親コンポーネントに通知
    if (onCellClick) {
      onCellClick(cell.date);
    }
    
    // 選択された日付のエントリーをモーダル用に変換
    const entries = entriesByDate[cell.date] || [];
    
    if (entries.length === 0) {
      console.log('選択された日付のエントリーがありません:', cell.date);
      // エントリーがない場合でも空のモーダルを表示（新規作成用）
      setModalEntries([]);
    } else {
      const modalData: ModalDiaryEntry[] = entries.map(entry => {
        const recordedTime = new Date(entry.recorded_at);
        
        // 時間を整形
        const hours = recordedTime.getHours().toString().padStart(2, '0');
        const minutes = recordedTime.getMinutes().toString().padStart(2, '0');
        const timeStr = `${hours}:${minutes}`;
        
        // 活動内容を配列に変換
        const activities = [entry.line1];
        if (entry.line2) activities.push(entry.line2);
        if (entry.line3) activities.push(entry.line3);
        
        return {
          time: timeStr,
          tags: ['3行日記'], // 仮のタグ
          activities
        };
      });
      
      setModalEntries(modalData);
    }
    
    setShowModal(true);
  };
  
  // ナビゲーションハンドラー
  const handleNavigate = (direction: 'prev' | 'next') => {
    // グリッド単位で移動するようにする
    if (direction === 'prev') {
      setCurrentOffset(prev => prev + 1);
    } else {
      setCurrentOffset(prev => Math.max(0, prev - 1));
    }
  };
  
  // モーダルを閉じるハンドラー
  const handleCloseModal = () => {
    setShowModal(false);
  };
  //#endregion

  return (
    <div className={styles.container} style={{ width }} ref={containerRef}>
      {/* カレンダーカード */}
      <div className={styles.calendarCard}>
        {/* カードヘッダー（タイトルとナビゲーションボタン） */}
        <div className={styles.cardHeader}>
          <h2 className={styles.title}>活動記録</h2>
          <div className={styles.navigationButtons}>
            <button 
              className={styles.navButton} 
              onClick={() => handleNavigate('prev')}
              aria-label="前の期間"
            >
              <ChevronLeft size={20} />
            </button>
            <button 
              className={styles.navButton} 
              onClick={() => handleNavigate('next')}
              disabled={currentOffset === 0}
              aria-label="次の期間"
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
            {/* カレンダーグリッド */}
            <div className={styles.calendarGrid} ref={gridRef}>
              {/* 曜日ラベル */}
              <div className={styles.weekdayLabels}>
                {WEEKDAYS.map(weekday => (
                  <div key={weekday} className={styles.weekdayLabel}>
                    {weekday}
                  </div>
                ))}
              </div>
              
              {/* セルグリッド */}
              <div className={styles.cellsGrid}>
                {WEEKDAYS.map(weekday => (
                  <div key={weekday} className={styles.dayRow}>
                    {calendarData.rows[weekday]?.map((cell, colIndex) => (
                      <div 
                        key={`cell-${weekday}-${colIndex}`} 
                        className={styles.cellWrapper}
                      >
                        {cell && (
                          <button
                            // getLevelClassNameを使わず、直接条件分岐してクラス名を適用
                            className={`
                              ${styles.cell} 
                              ${styles[`level${cell.level}`]}
                            `}
                            onClick={() => handleCellClick(cell)}
                            disabled={isGachaOpen} 
                            aria-label={`${cell.year}年${cell.month + 1}月${cell.day}日 (アクティビティ: ${cell.count}件)`}
                          >
                            {cell.day}
                          </button>
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
        onDataUpdated={refreshData} // データが更新されたときに再取得するためのコールバック
      />
    </div>
  );
};

export default ActivityHistory;