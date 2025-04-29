import React, { useState, useEffect, useRef } from 'react';
import { X, Edit3, Hash, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import styles from './EditDiaryModal.module.css';
import { ParrotSelector, saveEntryParrots, getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector';
import { useReward } from '@/lib/RewardContext';

// #region 型定義
/**
 * タグの型定義
 */
type TagType = {
  id: number;
  name: string;
  count: number;
  lastUsed: string;
};

/**
 * 日記エントリーの型定義
 */
type EditDiaryEntryType = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number | string;
  parrots?: string[]; // パロットの配列
};

/**
 * モーダルのプロパティ型定義
 */
type EditDiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entry: EditDiaryEntryType;
  date: string | null;
  onSave: () => void;
};
// #endregion

/**
 * 3行日記の編集・作成を行うモーダルコンポーネント
 */
const EditDiaryModal: React.FC<EditDiaryModalProps> = ({
  isOpen,
  onClose,
  entry,
  date,
  onSave,
}) => {
  const { user } = useAuth();
  const { showReward } = useReward();
  
  // #region 状態管理
  // 行の入力状態
  const [line1, setLine1] = useState(entry.activities[0] || '');
  const [line2, setLine2] = useState(entry.activities.length > 1 ? entry.activities[1] : '');
  const [line3, setLine3] = useState(entry.activities.length > 2 ? entry.activities[2] : '');
  
  // タグ関連の状態
  const [selectedTags, setSelectedTags] = useState<string[]>(entry.tags || []);
  const [currentTag, setCurrentTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  
  // パロット関連の状態
  const [selectedParrots, setSelectedParrots] = useState<string[]>(entry.parrots || []);
  
  // フォーム状態
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // 報酬状態
  const [rewardState] = useState<{
    show: boolean;
    xp: number;
    tickets: number;
    levelUp: boolean;
    newLevel: number | null;
  }>({
    show: false,
    xp: 0,
    tickets: 0,
    levelUp: false,
    newLevel: null
  });
  // #endregion

  // #region 参照
  const line1Ref = useRef<HTMLInputElement>(null);
  const line2Ref = useRef<HTMLInputElement>(null);
  const line3Ref = useRef<HTMLInputElement>(null);
  const tagInputRef = useRef<HTMLInputElement>(null);
  // #endregion

  // よく使うタグ
  const frequentTags = allTags.slice(0, 5);

  // #region 報酬計算関連の関数
  /**
   * 文字数に応じたXP報酬を計算する
   * @param totalChars 合計文字数
   * @returns 獲得XP (最大600)
   */
  const calculateXpReward = (totalChars: number): number => {
    // 1文字 = 2XP、上限300文字で最大600XP
    const xpPerChar = 2;
    const maxXp = 600;
  
    return Math.min(totalChars * xpPerChar, maxXp);
  };
  
  /**
   * 文字数に応じたチケット報酬を計算する
   * @param totalChars 合計文字数
   * @returns 獲得チケット数 (最大5)
   */
  const calculateTicketReward = (totalChars: number): number => {
    // 100文字ごとに1枚、最大5枚
    return Math.min(Math.floor(totalChars / 100), 5);
  };
  
  /**
   * レベルアップの判定を行う
   * @param totalXp 総XP
   * @param currentLevel 現在のレベル
   * @returns レベルアップ情報
   */
  const checkLevelUp = (totalXp: number, currentLevel: number) => {
    // レベルごとの必要XPを計算する関数
    const calculateRequiredXpForLevel = (level: number): number => {
      return Math.floor(1000 * Math.pow(level, 1.5));
    };
    
    // 現在のレベルまでに必要だったXP
    let accumulatedXp = 0;
    for (let i = 1; i < currentLevel; i++) {
      accumulatedXp += calculateRequiredXpForLevel(i);
    }
    
    // 現在のレベルでの経験値
    const currentLevelXp = totalXp - accumulatedXp;
    
    // 次のレベルに必要な経験値
    const nextLevelRequiredXp = calculateRequiredXpForLevel(currentLevel);
    
    // レベルアップするかどうかをチェック
    if (currentLevelXp >= nextLevelRequiredXp) {
      // 新しいレベルを計算
      let newLevel = currentLevel;
      let remainingXp = currentLevelXp;
      
      while (remainingXp >= calculateRequiredXpForLevel(newLevel)) {
        remainingXp -= calculateRequiredXpForLevel(newLevel);
        newLevel++;
      }
      
      return { 
        shouldLevelUp: true, 
        newLevel 
      };
    }
    
    return { 
      shouldLevelUp: false, 
      newLevel: currentLevel 
    };
  };
  // #endregion

  // #region useEffect フック
  /**
   * パロット情報をロード（初期表示時）
   */
  useEffect(() => {
    const loadParrots = async () => {
      if (entry.entry_id && !entry.parrots) {
        try {
          // エントリーIDがあれば、そのエントリーに関連するパロットを取得
          const parrotUrls = await getEntryParrots(entry.entry_id.toString());
          setSelectedParrots(Array.isArray(parrotUrls) ? parrotUrls : []);
        } catch (error) {
          console.error('パロット取得エラー:', error);
        }
      } else if (entry.parrots) {
        // パロット情報が既にある場合はそれを使用
        setSelectedParrots(entry.parrots);
      } else {
        // どちらもない場合は空配列で初期化
        setSelectedParrots([]);
      }
    };

    if (isOpen) {
      loadParrots();
    }
  }, [isOpen, entry]);

  /**
   * 報酬通知状態の変化を監視
   */
  useEffect(() => {
    if (rewardState.show) {
      console.log('報酬通知状態が変化しました:', rewardState);
    }
  }, [rewardState]);

  /**
   * タグ情報の取得
   */
  useEffect(() => {
    const fetchTags = async () => {
      if (!user?.id) return;
  
      const { data, error } = await supabase
        .from('tags')
        .select('tag_id, name, usage_count, last_used_at')
        .eq('created_by', user.id)
        .order('usage_count', { ascending: false })
        .limit(20);

      console.log("取得されたタグ一覧:", data);

      if (error) {
        console.error("タグの取得エラー:", error);
        return;
      }
  
      const converted = (data ?? []).map(tag => ({
        id: tag.tag_id as number,
        name: tag.name as string,
        count: tag.usage_count as number,
        lastUsed: tag.last_used_at as string
      }));
  
      setAllTags(converted);
    };
  
    if (isOpen) {
      fetchTags();
    }
  }, [isOpen, user]);
  // #endregion

  // #region イベントハンドラー
  /**
   * 1行目のEnterキー押下時処理
   */
  const handleLine1KeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (line1.trim()) {
        line2Ref.current?.focus();
      }
    }
  };

  /**
   * 2行目のEnterキー押下時処理
   */
  const handleLine2KeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (line2.trim()) {
        line3Ref.current?.focus();
      }
    }
  };

  /**
   * 3行目のEnterキー押下時処理
   */
  const handleLine3KeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      tagInputRef.current?.focus();
    }
  };
  
  /**
   * モーダル外クリック時の処理
   */
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  /**
   * 2行目の入力変更処理
   */
  const handleLine2Change = (value: string) => {
    if (!line1.trim() && value.trim()) {
      setFormError('1行目が空の場合、2行目に入力できません。');
      return;
    }
    setLine2(value);
    setFormError(null);
  };

  /**
   * 3行目の入力変更処理
   */
  const handleLine3Change = (value: string) => {
    if ((!line1.trim() || !line2.trim()) && value.trim()) {
      setFormError(line1.trim() ? '2行目が空の場合、3行目に入力できません。' : '1行目が空の場合、3行目に入力できません。');
      return;
    }
    setLine3(value);
    setFormError(null);
  };

  /**
   * タグの追加処理
   */
  const handleAddTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setCurrentTag('');
    setShowTagSuggestions(false);
  };

  /**
   * タグの削除処理
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  /**
   * タグ入力処理
   */
  const handleTagInput = (value: string) => {
    setCurrentTag(value);
    setShowTagSuggestions(value.length > 0);
  };

  /**
   * タグ入力欄でのEnterキー押下時処理
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // フォーム送信を防ぐ
      if (currentTag) {
        handleAddTag(currentTag);
      }
    }
  };
  // #endregion

  // #region 入力検証・保存処理
  /**
   * フォーム入力の検証
   * @returns 入力が有効かどうか
   */
  const validateForm = () => {
    // 空白を除去して検証
    const trimmedLine1 = line1.trim();
    const trimmedLine2 = line2.trim();
    const trimmedLine3 = line3.trim();

    // 順序のチェック：line1が空ならline2とline3も空であること
    if (!trimmedLine1) {
      if (trimmedLine2 || trimmedLine3) {
        setFormError('1行目が空の場合、2行目と3行目も入力できません。');
        return false;
      }
    }

    // 順序のチェック：line2が空ならline3も空であること
    if (!trimmedLine2 && trimmedLine3) {
      setFormError('2行目が空の場合、3行目も入力できません。');
      return false;
    }

    // 少なくとも1行は入力されているか
    if (!trimmedLine1 && !trimmedLine2 && !trimmedLine3) {
      setFormError('少なくとも1行は入力してください。');
      return false;
    }

    setFormError(null);
    return true;
  };

  /**
   * 日記の保存処理
   */
  const handleSave = async () => {
    if (!validateForm() || !user?.id) return;
  
    setIsLoading(true);
  
    // 報酬関連の値（初期値）
    let xpAmount = 0;
    let ticketsAmount = 0;
    let shouldLevelUp = false;
    let newLevel: number | null = null;
  
    try {
      // 入力された内容を配列に整理
      const activities: string[] = [];
      if (line1.trim()) activities.push(line1.trim());
      if (line2.trim()) activities.push(line2.trim());
      if (line3.trim()) activities.push(line3.trim());
  
      const isoString = new Date().toISOString(); // UTCのままで保存し、表示時にJST変換
  
      // 保存するエントリーデータの準備
      const entryData = {
        line1: line1.trim() || null,
        line2: line2.trim() || null,
        line3: line3.trim() || null,
        user_id: user.id,
        created_at: isoString,
        updated_at: isoString,
        recorded_at: isoString
      };
  
      // 日付と時間の処理
      if (date && entry.time) {
        try {
          // 日本語形式の日付を正規化
          let normalizedDate = date;
          if (date.includes('年')) {
            const parts = date.match(/(\d+)年(\d+)月(\d+)日/);
            if (parts && parts.length >= 4) {
              const year = parts[1];
              const month = parts[2].padStart(2, '0');
              const day = parts[3].padStart(2, '0');
              normalizedDate = `${year}-${month}-${day}`;
            }
          }
  
          // 時間の正規化
          const formattedTime = entry.time.includes(':') && entry.time.split(':').length === 2
            ? `${entry.time}:00`
            : entry.time;
  
          // 日時文字列の作成と変換
          const dateTimeString = `${normalizedDate}T${formattedTime}`;
          const dateObj = new Date(dateTimeString);
          if (!isNaN(dateObj.getTime())) {
            // 日本時間(+9時間)に調整
            const adjustedTime = new Date(dateObj.getTime() + 9 * 60 * 60 * 1000);
            const iso = adjustedTime.toISOString();
            entryData.created_at = iso;
            entryData.recorded_at = iso;
          } else {
            console.error("無効な日付フォーマット:", dateTimeString);
          }
        } catch (dateError) {
          console.error("日時の変換エラー:", dateError);
        }
      }
  
      // 新規エントリーかどうかの判定
      const isNewEntry = !(entry.activities.some(a => a !== '') && entry.entry_id);
      let entryOperation;
      let entryId: string;
  
      // データベース操作（更新または新規作成）
      if (!isNewEntry && entry.entry_id) {
        // 既存エントリーの更新
        entryId = entry.entry_id.toString();
        entryOperation = supabase
          .from('diary_entries')
          .update({
            line1: entryData.line1,
            line2: entryData.line2,
            line3: entryData.line3,
            updated_at: entryData.updated_at
          })
          .eq('entry_id', entryId);
      } else {
        // 新規エントリーの作成
        entryOperation = supabase
          .from('diary_entries')
          .insert(entryData);
      }
  
      // データベース操作の実行と結果取得
      const { data, error } = await entryOperation.select('entry_id');
      if (error || !data || !data[0]?.entry_id) {
        console.error("DB操作エラー:", error);
        throw new Error('日記エントリーの保存に失敗しました');
      }
  
      // エントリーIDの取得とパロットの保存
      entryId = data[0].entry_id.toString();
      await saveEntryParrots(entryId, user.id, selectedParrots);
  
      // タグの処理
      for (const tagName of selectedTags) {
        try {
          // 既存タグの検索
          const { data: existingTags, error: tagError } = await supabase
            .from('tags')
            .select('tag_id, name, usage_count')
            .eq('name', tagName)
            .maybeSingle();
  
          if (tagError) throw tagError;
  
          let tagId: string = '';
  
          if (existingTags) {
            // 既存タグの更新
            tagId = String(existingTags.tag_id);
            const currentCount = typeof existingTags.usage_count === 'number' ? existingTags.usage_count : 0;
            await supabase.from('tags').update({
              usage_count: currentCount + 1,
              last_used_at: entryData.updated_at
            }).eq('tag_id', tagId);
          } else {
            // 新規タグの作成
            const { data: newTag, error: createError } = await supabase
              .from('tags')
              .insert({
                name: tagName,
                usage_count: 1,
                last_used_at: entryData.updated_at,
                created_at: entryData.updated_at,
                created_by: user.id
              })
              .select('tag_id');
  
            if (createError) throw createError;
            tagId = String(newTag?.[0]?.tag_id || '');
          }
  
          // タグの使用履歴の作成（重複防止）
          if (tagId) {
            const { data: existingHistory } = await supabase
              .from('tag_usage_histories')
              .select('*')
              .eq('tag_id', tagId)
              .eq('entry_id', entryId)
              .eq('user_id', user.id)
              .maybeSingle();
  
            if (!existingHistory) {
              await supabase.from('tag_usage_histories').insert({
                tag_id: tagId,
                user_id: user.id,
                entry_id: entryId,
                used_at: entryData.updated_at
              });
            }
          }
        } catch (tagProcessError) {
          console.error('タグ処理エラー:', tagProcessError);
          continue; // エラーがあっても次のタグ処理を続行
        }
      }
  
      // 報酬付与処理（新規エントリーの場合のみ）
      if (isNewEntry) {
        try {
          // 総文字数の計算
          const totalChars =
            (line1.trim().length || 0) +
            (line2.trim().length || 0) +
            (line3.trim().length || 0);
        
          // 報酬の計算
          xpAmount = calculateXpReward(totalChars);
          ticketsAmount = calculateTicketReward(totalChars);
          
          // ユーザー情報の取得
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('total_xp, level')
            .eq('id', user.id)
            .single();
  
          if (userError) throw userError;
  
          // 新しい総XPとレベルアップ判定
          const newTotalXp = Number(userData?.total_xp ?? 0) + xpAmount;
          const currentLevel = Number(userData?.level ?? 1);
  
          const levelUpResult = checkLevelUp(newTotalXp, currentLevel);
          shouldLevelUp = levelUpResult.shouldLevelUp;
          newLevel = levelUpResult.newLevel;
  
          // ユーザー情報の更新（XP、レベル）
          const { error: xpError } = await supabase.from('users').update({
            total_xp: newTotalXp,
            level: shouldLevelUp ? newLevel : currentLevel,
            updated_at: isoString
          }).eq('id', user.id);
          
          if (xpError) {
            console.error('XP更新失敗:', xpError);
          }

          // 経験値履歴の記録
          await supabase.from('user_experience').insert({
            user_id: user.id,
            xp_amount: xpAmount,
            action_type: '日記作成',
            earned_at: isoString,
          });
  
          // チケット報酬の付与
          if (ticketsAmount > 0) {
            // 既存のチケット情報を取得
            const { data: ticketData } = await supabase
              .from('gacha_tickets')
              .select('ticket_count')
              .eq('user_id', user.id)
              .single();
  
            if (ticketData) {
              // 既存のチケット数を更新
              const { error: updateError } = await supabase.from('gacha_tickets').update({
                ticket_count: (ticketData?.ticket_count as number) + ticketsAmount,
                last_updated: isoString
              }).eq('user_id', user.id);

              if (updateError) {
                console.error('🎫 チケット更新エラー（update）:', updateError);
              }
            } else {
              // 新規にチケット情報を作成
              const { error: insertError } = await supabase.from('gacha_tickets').insert({
                user_id: user.id,
                ticket_count: ticketsAmount,
                last_updated: isoString
              });

              if (insertError) {
                console.error('🎫 チケット挿入エラー（insert）:', insertError);
              }
            }
          }
        } catch (rewardError) {
          console.error('報酬付与エラー:', rewardError);
        }
      }
  
      // 報酬通知（新規エントリーの場合のみ）
      if (isNewEntry) {
        showReward({
          xp: xpAmount,
          tickets: ticketsAmount,
          levelUp: shouldLevelUp,
          newLevel: shouldLevelUp ? newLevel : null
        });
      }
  
      // 保存完了処理
      if (entryId) {
        console.log('✅ 保存完了: entryId =', entryId);
        console.log('✅ 報酬: XP =', xpAmount, 'チケット =', ticketsAmount);
        console.log('✅ onSave 実行直前');

        // DB反映待ち（0.5秒）
        await new Promise(resolve => setTimeout(resolve, 500));

        // 親コンポーネントに保存完了を通知
        onSave?.();
        console.log('✅ onSave 実行後');
        
        // モーダルを閉じる
        onClose();
        console.log('✅ モーダルを閉じました');
      }

    } catch (err) {
      console.error('保存エラー:', err);
      setFormError('日記の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };
  // #endregion

  // モーダルが開いていない場合は何も表示しない
  if (!isOpen) return null;

  // #region モーダルのレンダリング
  return (
    <div 
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContainer}>
        {/* 閉じるボタン */}
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
        
        {/* モーダルヘッダー */}
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {entry.activities.some(a => a !== '') ? '3行日記を編集' : '3行日記を作成'}
          </h2>
        </div>
        
        {/* モーダルコンテンツ */}
        <div className={styles.modalContent}>
          {/* タイムスタンプとエラーメッセージ */}
          <div className={styles.timestampErrorContainer}>
            <div className={styles.entryTimestamp}>
              {date && entry.time 
                ? (() => {
                    // 日付の文字列をDate型に変換
                    const dateStr = date.replace(/年|月|日/g, '/').replace(/(\d+)\/(\d+)\/(\d+)/, '$1/$2/$3');
                    const d = new Date(dateStr);
                    if (!isNaN(d.getTime())) {
                      // 正しい日付なら曜日を取得して表示
                      const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
                      const weekday = weekDays[d.getDay()];
                      const weekdayClass = d.getDay() === 0 ? styles.sundayText : 
                                          d.getDay() === 6 ? styles.saturdayText : '';
                      
                      // 年/月/日（曜）形式で表示
                      const year = d.getFullYear();
                      const month = String(d.getMonth() + 1).padStart(2, '0');
                      const day = String(d.getDate()).padStart(2, '0');
                      
                      return (
                        <>
                          {year}/{month}/{day}（<span className={weekdayClass}>{weekday}</span>） {entry.time} の記録
                        </>
                      );
                    } else {
                      // 日付の変換に失敗した場合は元の形式で表示
                      return `${date} ${entry.time} の記録`;
                    }
                  })()
                : `${new Date().toLocaleString('ja-JP')} の記録`}
              </div>
            {/* エラーメッセージ表示 */}
            {formError && (
              <div className={styles.errorText}>
                {formError}
              </div>
            )}
          </div>

          {/* 1行目入力フィールド */}
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                onKeyPress={handleLine1KeyPress}
                ref={line1Ref}
                className={styles.textInput}
                maxLength={50}
              />
              <span className={styles.charCount}>
                {line1.length}/50
              </span>
            </div>
          </div>

          {/* 2行目入力フィールド */}
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={line2}
                onChange={(e) => handleLine2Change(e.target.value)}
                onKeyPress={handleLine2KeyPress}
                ref={line2Ref}
                className={styles.textInput}
                maxLength={50}
                disabled={!line1.trim()}
              />
              <span className={styles.charCount}>
                {line2.length}/50
              </span>
            </div>
          </div>

          {/* 3行目入力フィールド */}
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={line3}
                onChange={(e) => handleLine3Change(e.target.value)}
                onKeyPress={handleLine3KeyPress}
                ref={line3Ref}
                className={styles.textInput}
                maxLength={50}
                disabled={!line1.trim() || !line2.trim()}
              />
              <span className={styles.charCount}>
                {line3.length}/50
              </span>
            </div>
          </div>

          {/* タグセクション */}
          <div className={styles.tagSection}>
            <label className={styles.inputLabel}>タグ</label>
            
          {/* タグ入力フィールド */}
          <div className={styles.tagInputContainer}>
            <div className={styles.tagInputWrapper}>
              <Hash size={16} className={styles.tagIcon} />
              <input
                type="text"
                value={currentTag}
                onChange={(e) => handleTagInput(e.target.value)}
                onKeyPress={handleKeyPress}
                ref={tagInputRef}
                placeholder="新しいタグを追加"
                className={styles.textInput}
              />
                <button
                  onClick={() => currentTag && handleAddTag(currentTag)}
                  disabled={!currentTag}
                  className={styles.addTagButton}
                  aria-label="タグを追加"
                >
                  <Plus size={16} />
                </button>
              </div>

              {/* タグサジェスト */}
              {showTagSuggestions && (
                <div className={styles.tagSuggestions}>
                  <div className={styles.tagSuggestionsList}>
                    {allTags
                      .filter(tag => 
                        tag.name.toLowerCase().includes(currentTag.toLowerCase()) &&
                        !selectedTags.includes(tag.name)
                      )
                      .sort((a, b) => b.count - a.count)
                      .slice(0, 10)
                      .map(tag => (
                        <button
                          key={tag.id}
                          onClick={() => handleAddTag(tag.name)}
                          className={styles.tagSuggestion}
                        >
                          <span>{tag.name}</span>
                          <span className={styles.tagCount}>{tag.count}回使用</span>
                        </button>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* よく使うタグ */}
            <div className={styles.frequentTagsContainer}>
              <div className={styles.frequentTagsLabel}>よく使うタグ</div>
              <div className={styles.frequentTagsList}>
                {frequentTags
                  .filter(tag => !selectedTags.includes(tag.name))
                  .map(tag => (
                    <button
                      key={tag.id}
                      onClick={() => handleAddTag(tag.name)}
                      className={styles.frequentTag}
                    >
                      <span>#{tag.name}</span>
                      <span className={styles.tagCount}>
                        {tag.count}
                      </span>
                    </button>
                  ))}
              </div>
            </div>

            {/* 選択済みタグ */}
            {selectedTags.length > 0 && (
              <div className={styles.selectedTagsContainer}>
                {selectedTags.map((tag, index) => (
                  <span
                    key={index}
                    className={styles.selectedTag}
                  >
                    #{tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className={styles.removeTagButton}
                      aria-label={`${tag}を削除`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* パロット選択セクション */}
          <div className={styles.modalParrotSection}>            
            {/* パロットセレクターコンポーネント */}
            {user && (
              <ParrotSelector
                userId={user.id}
                selectedParrots={selectedParrots}
                onParrotsChange={setSelectedParrots}
                maxParrots={5}
                compact={window.innerWidth <= 480} // 画面幅に応じてコンパクトモードを切り替え
                forceOpen={true} // 常に開いた状態にする
              />
            )}
          </div>

          {/* 報酬通知 */}
          {rewardState.show && (
            <div className={styles.rewardNotification}>
              {(() => {
                console.log("報酬通知レンダリング中", rewardState);
                return null; // または undefined
              })()}
              <div className={styles.rewardIcon}>🎉</div>
              <div className={styles.rewardContent}>
                <h3>報酬獲得！</h3>
                <p>{rewardState.xp} XP を獲得しました！</p>
                {rewardState.tickets > 0 && (
                  <p>ガチャチケット {rewardState.tickets}枚 を獲得しました！</p>
                )}
                {rewardState.levelUp && (
                  <p className={styles.levelUpText}>
                    レベルアップ！ レベル{rewardState.newLevel}になりました！
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 記録ボタン */}
          <button
            onClick={handleSave}
            className={styles.recordButton}
            disabled={isLoading || (!line1.trim() && !line2.trim() && !line3.trim())}
          >
            <Edit3 size={20} />
            {isLoading ? '更新中...' : '記録する'}
          </button>
        </div>
      </div>
    </div>
  );
  // #endregion
};

export default EditDiaryModal;