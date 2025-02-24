import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './ActivityHistory.module.css';

//#region Types
type ActivityHistoryProps = {
  onCellClick: (date: string) => void;
};

// アクティビティセルの状態を追跡するための型
type CellState = {
  active: boolean;  // アクティビティがあるか
  selected: boolean;  // 選択されているか
};
//#endregion

const ActivityHistory: React.FC<ActivityHistoryProps> = ({ onCellClick }) => {
  // 月の配列
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May'];
  // 曜日の配列
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  //#region State
  // 選択されたセルを追跡する状態
  const [selectedCell, setSelectedCell] = useState<string | null>(null);
  
  // セル状態を管理するオブジェクト
  // 本来はAPIから取得したデータに基づいて初期化する
  const [cellStates, setCellStates] = useState<Record<string, CellState>>(() => {
    const initialStates: Record<string, CellState> = {};
    
    // ランダムなアクティビティデータを生成（デモ用）
    months.forEach((_, monthIndex) => {
      Array.from({ length: 7 * 7 }).forEach((_, cellIndex) => {
        const weekIndex = Math.floor(cellIndex / 7);
        const dayIndex = cellIndex % 7;
        const cellId = `${monthIndex}-${weekIndex}-${dayIndex}`;
        
        initialStates[cellId] = {
          active: Math.random() > 0.5,  // ランダムにアクティビティを割り当て
          selected: false
        };
      });
    });
    
    return initialStates;
  });
  //#endregion

  //#region Handlers
  const handleCellClick = (monthIndex: number, dayIndex: number, weekIndex: number) => {
    // セルのID
    const cellId = `${monthIndex}-${weekIndex}-${dayIndex}`;
    
    // 日付を YYYY/MM/DD 形式で生成
    const date = `2024/${monthIndex + 1}/${dayIndex + (weekIndex * 7) + 1}`;
    
    // 選択状態を更新
    setCellStates(prev => {
      const newStates = { ...prev };
      
      // 前回選択されたセルの選択状態を解除
      if (selectedCell && selectedCell !== cellId) {
        newStates[selectedCell].selected = false;
      }
      
      // 現在のセルの選択状態を更新
      newStates[cellId].selected = true;
      
      return newStates;
    });
    
    // 選択されたセルを保存
    setSelectedCell(cellId);
    
    // 親コンポーネントに通知
    onCellClick(date);
  };
  //#endregion

  //#region Cell Rendering
  // セルのクラス名を決定する関数
  const getCellClassName = (cellId: string) => {
    const state = cellStates[cellId];
    if (!state) return styles.inactiveCell;
    
    if (state.active) {
      return state.selected ? styles.activeCellSelected : styles.activeCell;
    } else {
      return state.selected ? styles.inactiveCellSelected : styles.inactiveCell;
    }
  };
  
  // アクティビティセルを生成する関数
  const renderActivityCells = () => {
    return months.map((_, monthIndex) =>
      Array.from({ length: 7 * 7 }).map((_, cellIndex) => {
        const weekIndex = Math.floor(cellIndex / 7);
        const dayIndex = cellIndex % 7;
        const cellId = `${monthIndex}-${weekIndex}-${dayIndex}`;

        return (
          <div
            key={cellId}
            onClick={() => handleCellClick(monthIndex, dayIndex, weekIndex)}
            className={`${styles.cell} ${getCellClassName(cellId)}`}
          />
        );
      })
    ).flat();
  };
  //#endregion

  return (
    <div className={styles.container}>
      {/* ヘッダー */}
      <div className={styles.header}>
        <div className={styles.titleContainer}>
          <div className={styles.iconContainer}>
            <ChevronRight size={24} />
          </div>
          <div className={styles.titleWrapper}>
            <h2 className={styles.title}>活動履歴</h2>
            <p className={styles.subtitle}>学習の記録</p>
          </div>
        </div>
        <div className={styles.navigationButtons}>
          <button className={styles.navButton}>
            <ChevronLeft size={20} />
          </button>
          <button className={styles.navButton}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      {/* カレンダーグリッド */}
      <div className={styles.calendarGrid}>
        {/* 月表示 */}
        <div className={styles.monthsRow}>
          <div className={styles.monthsList}>
            {months.map((month, i) => (
              <span key={i} className={styles.monthLabel}>
                {month}
              </span>
            ))}
          </div>
        </div>

        {/* アクティビティグリッド */}
        <div className={styles.gridContainer}>
          {/* 曜日ラベル */}
          <div className={styles.daysColumn}>
            {days.map(day => (
              <div key={day} className={styles.dayLabel}>
                {day}
              </div>
            ))}
          </div>

          {/* アクティビティセル */}
          <div className={styles.cellsGrid}>
            {renderActivityCells()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityHistory;