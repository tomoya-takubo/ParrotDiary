import React, { useState, useEffect } from 'react';
import { X, Edit3, Calendar, Clock, Hash, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import styles from './EditDiaryModal.module.css'; // 専用のスタイルシートを使用
import Image from 'next/image'; // Imageコンポーネントをインポート
// パロット関連のimport
import { ParrotSelector, saveEntryParrots, getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector';
import { showReward } from '@/components/dashboard/Diary/RewardNotification';

// ActivityHistoryで使用する日記エントリー型
type ModalDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number; // エントリーIDを追加
  parrots?: string[]; // パロット情報を追加
};

// タグの型定義
type TagType = {
  id: number;
  name: string;
  count: number;
  lastUsed: string;
};

type EditDiaryModalProps = {
  isOpen: boolean;
  onClose: () => void;
  entry: EditDiaryEntryType;
  date: string | null;
  onSave: () => void;
};

type EditDiaryEntryType = {
  time: string;
  tags: string[];
  activities: string[];
  created_at?: string;
  entry_id?: number | string;
  parrots?: string[]; // parrots プロパティを追加
};



const EditDiaryModal: React.FC<EditDiaryModalProps> = ({
  isOpen,
  onClose,
  entry,
  date,
  onSave
}) => {
  const { user } = useAuth();
  
  // サンプルのタグデータ（実際の実装では、これを外部から渡すか、APIから取得する）
  const allTags: TagType[] = [
    { id: 1, name: '英語学習', count: 42, lastUsed: '2024-03-09' },
    { id: 2, name: 'プログラミング', count: 35, lastUsed: '2024-03-09' },
    { id: 3, name: '集中できた', count: 28, lastUsed: '2024-03-09' },
    { id: 4, name: '数学', count: 25, lastUsed: '2024-03-08' },
    { id: 5, name: 'リーディング', count: 20, lastUsed: '2024-03-09' }
  ];

  // よく使うタグ
  const frequentTags = allTags
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
  
  // 状態管理
  const [line1, setLine1] = useState(entry.activities[0] || '');
  const [line2, setLine2] = useState(entry.activities.length > 1 ? entry.activities[1] : '');
  const [line3, setLine3] = useState(entry.activities.length > 2 ? entry.activities[2] : '');
  const [selectedTags, setSelectedTags] = useState<string[]>(entry.tags || []);
  const [currentTag, setCurrentTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  // パロット関連のstate追加
  const [selectedParrots, setSelectedParrots] = useState<string[]>(entry.parrots || []);
  
  // 報酬状態の管理用（useState定義の近くに追加）
  const [rewardState, setRewardState] = useState<{
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

  // 書いた行数に応じてXP報酬を計算する関数（関数定義部分に追加）
  const calculateXpReward = (linesCount: number): number => {
    // 基本XP
    let baseXP = 50;
    
    // 行数に応じたボーナス
    switch (linesCount) {
      case 1:
        return baseXP;
      case 2:
        return baseXP + 25; // 75 XP
      case 3:
        return baseXP + 50; // 100 XP
      default:
        return baseXP;
    }
  };

  // 書いた行数に応じてチケット報酬を計算する関数（関数定義部分に追加）
  const calculateTicketReward = (linesCount: number): number => {
    // 3行書いたら1枚のチケットを付与
    return linesCount === 3 ? 1 : 0;
  };

  // レベルアップをチェックする関数（関数定義部分に追加）
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

  // パロット情報をロード（初期表示時）
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

  useEffect(() => {
    if (rewardState.show) {
      console.log('報酬通知状態が変化しました:', rewardState);
    }
  }, [rewardState]);

  // モーダル外クリックハンドラー
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // 入力検証
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

  // 入力ハンドラー
  const handleLine2Change = (value: string) => {
    if (!line1.trim() && value.trim()) {
      setFormError('1行目が空の場合、2行目に入力できません。');
      return;
    }
    setLine2(value);
    setFormError(null);
  };

  const handleLine3Change = (value: string) => {
    if ((!line1.trim() || !line2.trim()) && value.trim()) {
      setFormError(line1.trim() ? '2行目が空の場合、3行目に入力できません。' : '1行目が空の場合、3行目に入力できません。');
      return;
    }
    setLine3(value);
    setFormError(null);
  };

  // タグ処理
  const handleAddTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setCurrentTag('');
    setShowTagSuggestions(false);
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  const handleTagInput = (value: string) => {
    setCurrentTag(value);
    setShowTagSuggestions(value.length > 0);
  };

  // エンターキーでタグ追加
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // フォーム送信を防ぐ
      if (currentTag) {
        handleAddTag(currentTag);
      }
    }
  };

  // 保存処理
  const handleSave = async () => {
    if (!validateForm() || !user?.id) return;

    setIsLoading(true);
    try {
      // 入力内容を配列に整形（空文字は除外）
      const activities: string[] = [];
      
      if (line1.trim()) activities.push(line1.trim());
      if (line2.trim()) activities.push(line2.trim());
      if (line3.trim()) activities.push(line3.trim());
      
      // 現在時刻を取得し、日本時間に調整
      const now = new Date();
      const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const isoString = jstTime.toISOString();
      
      // 日記エントリーデータの準備
      const entryData = {
        line1: line1.trim() || null,
        line2: line2.trim() || null,
        line3: line3.trim() || null,
        user_id: user.id,
        created_at: isoString,
        updated_at: isoString,
        recorded_at: isoString  // recorded_atカラムを追加
      };

      // 既存エントリの場合はcreated_atのみ保持
      if (date && entry.time) {
        try {
          // 日付が日本語フォーマット（年月日）を含む場合は変換
          let normalizedDate = date;
          if (date.includes('年')) {
            // 例: 2025年3月14日 → 2025-03-14
            const parts = date.match(/(\d+)年(\d+)月(\d+)日/);
            if (parts && parts.length >= 4) {
              const year = parts[1];
              const month = parts[2].padStart(2, '0');
              const day = parts[3].padStart(2, '0');
              normalizedDate = `${year}-${month}-${day}`;
            }
          }
          
          // 時間が HH:MM 形式なら HH:MM:SS に変換
          const formattedTime = entry.time.includes(':') && entry.time.split(':').length === 2
            ? `${entry.time}:00`
            : entry.time;
              
          // ISO 8601 形式の文字列を作成
          const dateTimeString = `${normalizedDate}T${formattedTime}`;
          console.log("Normalized datetime:", dateTimeString);
          
          // 日時を解析して ISOString に変換
          const dateObj = new Date(dateTimeString);
          if (!isNaN(dateObj.getTime())) { // 有効な日付かチェック
            // 既存エントリの編集の場合、created_atは保持し、recorded_atも同じ値に
            // JST (+9時間) を考慮
            const adjustedTime = new Date(dateObj.getTime() + 9 * 60 * 60 * 1000);
            const isoString = adjustedTime.toISOString();
            entryData.created_at = isoString;
            entryData.recorded_at = isoString;
          } else {
            console.error("無効な日付フォーマット:", dateTimeString);
          }
        } catch (dateError) {
          console.error("日時の変換エラー:", dateError);
          // エラー時はデフォルト値のままとする
        }
      }

      // 操作モードを判断（新規追加/更新）
      const isNewEntry = !(entry.activities.some(a => a !== '') && entry.entry_id);
      
      let entryOperation;
      let entryId: string;
      
      if (!isNewEntry && entry.entry_id) {
        // 既存エントリの更新
        console.log("更新モード - 既存エントリの更新", entry.entry_id);
        entryId = entry.entry_id.toString();
        entryOperation = supabase
          .from('diary_entries')
          .update({
            line1: entryData.line1,
            line2: entryData.line2,
            line3: entryData.line3,
            updated_at: entryData.updated_at
            // created_atとrecorded_atは更新しない
          })
          .eq('entry_id', entryId);
      } else {
        // 新規エントリの作成
        console.log("作成モード - 新規エントリ");
        entryOperation = supabase
          .from('diary_entries')
          .insert(entryData);
      }
      
      const { data, error } = await entryOperation.select('entry_id');
      console.log("DB操作結果:", data, error);

      if (error) {
        console.error("DB操作エラー詳細:", error);
        throw error;
      }
      
      // データがないか、entry_idがない場合はエラー
      if (!data || !Array.isArray(data) || data.length === 0 || !data[0].entry_id) {
        console.error('エントリID取得失敗:', data);
        throw new Error('日記エントリーの保存に失敗しました');
      }
      
      // エントリIDを取得（新規作成の場合）
      entryId = data[0].entry_id.toString();
      console.log("取得したエントリID:", entryId);

      // パロット情報の保存
      await saveEntryParrots(entryId, user.id, selectedParrots);
      console.log("パロット情報を保存:", selectedParrots);

      // 2. タグの処理
      for (const tagName of selectedTags) {
        try {
          // タグが存在するか確認
          const { data: existingTags, error: tagError } = await supabase
            .from('tags')
            .select('tag_id, name, usage_count')
            .eq('name', tagName)
            .maybeSingle();

          if (tagError) throw tagError;

          let tagId: string = '';

          if (existingTags) {
            if (typeof existingTags.tag_id === 'string') {
              tagId = existingTags.tag_id;
            } else if (existingTags.tag_id !== null && existingTags.tag_id !== undefined) {
              // nullやundefinedでなければ文字列に変換
              tagId = String(existingTags.tag_id);
            }
            
            // nameusage_countの安全な取り出し
            const currentCount = typeof existingTags.usage_count === 'number' 
              ? existingTags.usage_count 
              : 0;
            
            const { error: updateError } = await supabase
              .from('tags')
              .update({ 
                usage_count: currentCount + 1,
                last_used_at: entryData.updated_at
              })
              .eq('tag_id', tagId);

            if (updateError) throw updateError;
          } else {
            // 新しいタグを作成
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
            
            if (newTag && newTag.length > 0 && newTag[0].tag_id) {
              tagId = String(newTag[0].tag_id);
            } else {
              console.error('新規タグID取得失敗');
              continue; // このタグの処理をスキップ
            }
          }

          // タグの使用履歴を記録
          if (tagId) {
            // 既存履歴を確認
            const { data: existingHistory, error: historyCheckError } = await supabase
              .from('tag_usage_histories')
              .select('*')
              .eq('tag_id', tagId)
              .eq('entry_id', entryId)
              .eq('user_id', user.id)
              .maybeSingle();

            if (historyCheckError) throw historyCheckError;

            // 履歴がなければ新規追加
            if (!existingHistory) {
              const { error: historyError } = await supabase
                .from('tag_usage_histories')
                .insert({
                  tag_id: tagId,
                  user_id: user.id,
                  entry_id: entryId,
                  used_at: entryData.updated_at
                });

              if (historyError) throw historyError;
            }
          }
        } catch (tagProcessError) {
          console.error('タグ処理エラー:', tagProcessError);
          // タグ処理のエラーは無視して次のタグに進む
          continue;
        }
      }

      // 新規作成時のみ報酬付与
      if (isNewEntry) {
        try {
          // 行数に応じた報酬計算
          const xpAmount = calculateXpReward(activities.length);
          const ticketsAmount = calculateTicketReward(activities.length);
          
          console.log(`報酬付与: XP ${xpAmount}, チケット ${ticketsAmount}`);
          
          // 1. ユーザー経験値データの更新
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('total_xp, level')
            .eq('id', user.id)
            .single();
          
          if (userError) {
            console.error('ユーザーデータ取得エラー:', userError);
            throw userError;
          }
          
          // 現在のXPに新しいXPを追加
          const newTotalXp = ((userData?.total_xp as number) || 0) + xpAmount;
          
          // レベル計算
          const currentLevel = userData.level || 1;
          const { shouldLevelUp, newLevel } = checkLevelUp(newTotalXp, currentLevel as number);
          
          // ユーザーデータ更新
          const { error: updateUserError } = await supabase
            .from('users')
            .update({ 
              total_xp: newTotalXp,
              level: shouldLevelUp ? newLevel : currentLevel,
              updated_at: isoString
            })
            .eq('id', user.id);
          
          if (updateUserError) {
            console.error('ユーザーデータ更新エラー:', updateUserError);
            throw updateUserError;
          }
          
          // 2. 経験値獲得履歴を記録
          const { error: experienceError } = await supabase
            .from('user_experience')
            .insert({
              user_id: user.id,
              xp_amount: xpAmount,
              action_type: '日記作成',
              earned_at: isoString,
              created_at: isoString
            });
          
          if (experienceError) {
            console.error('経験値履歴記録エラー:', experienceError);
            throw experienceError;
          }
          
          // 3. ガチャチケット更新
          if (ticketsAmount > 0) {
            // 現在のチケット数を取得
            const { data: ticketData, error: ticketError } = await supabase
              .from('gacha_tickets')
              .select('ticket_count')
              .eq('user_id', user.id)
              .single();
            
            if (ticketError && ticketError.code !== 'PGRST116') {
              console.error('チケットデータ取得エラー:', ticketError);
              throw ticketError;
            }
            
            // チケットデータが存在するかどうかで処理を分岐
            if (ticketData) {
              // 既存のチケット数に新しいチケット数を追加
              const { error: updateTicketError } = await supabase
                .from('gacha_tickets')
                .update({ 
                  ticket_count: (ticketData.ticket_count as number) + ticketsAmount,
                  last_updated: isoString
                })
                .eq('user_id', user.id);
              
              if (updateTicketError) {
                console.error('チケット更新エラー:', updateTicketError);
                throw updateTicketError;
              }
            } else {
              // チケットデータが存在しない場合は新規作成
              const { error: insertTicketError } = await supabase
                .from('gacha_tickets')
                .insert({
                  user_id: user.id,
                  ticket_count: ticketsAmount,
                  last_updated: isoString
                });
              
              if (insertTicketError) {
                console.error('チケット作成エラー:', insertTicketError);
                throw insertTicketError;
              }
            }
            
            // 4. チケット獲得履歴を記録
            const { error: ticketHistoryError } = await supabase
              .from('ticket_acquisition_history')
              .insert({
                user_id: user.id,
                ticket_count: ticketsAmount,
                acquired_at: isoString,
                acquisition_type_id: 1 // 1 = 日記作成 (acquisition_type_masterテーブルに対応)
              });
            
            if (ticketHistoryError) {
              console.error('チケット履歴記録エラー:', ticketHistoryError);
              throw ticketHistoryError;
            }
          }
          
          // 5. 獲得報酬の通知用状態を更新
          setRewardState({
            show: true,
            xp: xpAmount,
            tickets: ticketsAmount,
            levelUp: shouldLevelUp,
            newLevel: shouldLevelUp ? newLevel : null
          });

          // デバッグ用ログを追加
          console.log("報酬通知を表示:", {
            xp: xpAmount,
            tickets: ticketsAmount,
            levelUp: shouldLevelUp,
            newLevel: shouldLevelUp ? newLevel : null
          });

          // 3秒後に通知を非表示にする
          setTimeout(() => {
            setRewardState(prev => ({ ...prev, show: false }));
          }, 30000);
          
          console.log('保存完了:', entryId);
          showReward({
            xp: xpAmount,
            tickets: ticketsAmount,
            levelUp: shouldLevelUp,
            newLevel: shouldLevelUp ? newLevel : null
          });
        } catch (rewardError) {
          console.error('報酬付与エラー:', rewardError);
          // 報酬付与のエラーは記録するが、日記の保存は成功と見なす
        }
      }
    } catch (err) {
      console.error('保存エラー:', err);
      setFormError('日記の保存に失敗しました。もう一度お試しください。');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalOverlay}
      onClick={handleOverlayClick}
    >
      <div className={styles.modalContainer}>
        <button
          onClick={onClose}
          className={styles.closeButton}
          aria-label="閉じる"
        >
          <X size={20} />
        </button>
        
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {entry.activities.some(a => a !== '') ? '3行日記を編集' : '3行日記を作成'}
          </h2>
        </div>
        <div className={styles.modalContent}>
          <div className={styles.entryTimestamp}>
            {date && entry.time 
              ? `${date} ${entry.time} の記録` 
              : `${new Date().toLocaleString('ja-JP')} の記録`}
          </div>          
            {/* エラーメッセージ表示 */}
            {formError && (
              <div className={styles.errorText}>
                {formError}
              </div>
            )}

          {/* 入力フィールド */}
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={line1}
                onChange={(e) => setLine1(e.target.value)}
                className={styles.textInput}
                maxLength={50}
              />
              <span className={styles.charCount}>
                {line1.length}/50
              </span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={line2}
                onChange={(e) => handleLine2Change(e.target.value)}
                className={styles.textInput}
                maxLength={50}
                disabled={!line1.trim()}
              />
              <span className={styles.charCount}>
                {line2.length}/50
              </span>
            </div>
          </div>

          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <input
                type="text"
                value={line3}
                onChange={(e) => handleLine3Change(e.target.value)}
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
                      <span>{tag.name}</span>
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
                    {tag}
                    <button
                      onClick={() => handleRemoveTag(tag)}
                      className={styles.removeTagButton}
                      aria-label={`${tag}を削除`}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* パロット選択セクション */}
          <div className={styles.modalParrotSection}>
            <div className={styles.modalParrotTitle}>パロット</div>
            
            {/* パロットセレクターコンポーネント */}
            {user && (
              <ParrotSelector
                userId={user.id}
                selectedParrots={selectedParrots}
                onParrotsChange={setSelectedParrots}
                maxParrots={1}
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

          {/* 記録ボタン（既存の要素） */}
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
};

export default EditDiaryModal;