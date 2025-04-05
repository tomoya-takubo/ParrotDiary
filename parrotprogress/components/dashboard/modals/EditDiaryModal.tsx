import React, { useState, useEffect } from 'react';
import { X, Edit3, Hash, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import styles from './EditDiaryModal.module.css'; // 専用のスタイルシートを使用
// パロット関連のimport
import { ParrotSelector, saveEntryParrots, getEntryParrots } from '@/components/dashboard/Diary/ParrotSelector';
import { useReward } from '@/lib/RewardContext';

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
  onSave,
}) => {
  const { user } = useAuth();
  
  // 状態管理
  const [line1, setLine1] = useState(entry.activities[0] || '');
  const [line2, setLine2] = useState(entry.activities.length > 1 ? entry.activities[1] : '');
  const [line3, setLine3] = useState(entry.activities.length > 2 ? entry.activities[2] : '');
  const [selectedTags, setSelectedTags] = useState<string[]>(entry.tags || []);
  const [currentTag, setCurrentTag] = useState('');
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [allTags, setAllTags] = useState<TagType[]>([]);
  // パロット関連のstate追加
  const [selectedParrots, setSelectedParrots] = useState<string[]>(entry.parrots || []);

  const { showReward } = useReward();

  // よく使うタグ
  const frequentTags = allTags.slice(0, 5);

  // 報酬状態の管理用（useState定義の近くに追加）
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

  // 書いた行数に応じてXP報酬を計算する関数（関数定義部分に追加）
  const calculateXpReward = (totalChars: number): number => {
    // 1文字 = 2XP、上限300文字で最大600XP
    const xpPerChar = 2;
    const maxXp = 600;
  
    return Math.min(totalChars * xpPerChar, maxXp);
  };
  
  // 書いた行数に応じてチケット報酬を計算する関数（関数定義部分に追加）
  const calculateTicketReward = (totalChars: number): number => {
    // 100文字ごとに1枚、最大5枚
    return Math.min(Math.floor(totalChars), 100);
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
  
    // 🎁 報酬関連の値（初期値）
    let xpAmount = 0;
    let ticketsAmount = 0;
    const shouldLevelUp = false;
    let newLevel: number | null = null;
  
    try {
      const activities: string[] = [];
      if (line1.trim()) activities.push(line1.trim());
      if (line2.trim()) activities.push(line2.trim());
      if (line3.trim()) activities.push(line3.trim());
  
      const now = new Date();
      const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const isoString = jstTime.toISOString();
  
      const entryData = {
        line1: line1.trim() || null,
        line2: line2.trim() || null,
        line3: line3.trim() || null,
        user_id: user.id,
        created_at: isoString,
        updated_at: isoString,
        recorded_at: isoString
      };
  
      if (date && entry.time) {
        try {
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
  
          const formattedTime = entry.time.includes(':') && entry.time.split(':').length === 2
            ? `${entry.time}:00`
            : entry.time;
  
          const dateTimeString = `${normalizedDate}T${formattedTime}`;
          const dateObj = new Date(dateTimeString);
          if (!isNaN(dateObj.getTime())) {
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
  
      const isNewEntry = !(entry.activities.some(a => a !== '') && entry.entry_id);
      let entryOperation;
      let entryId: string;
  
      if (!isNewEntry && entry.entry_id) {
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
        entryOperation = supabase
          .from('diary_entries')
          .insert(entryData);
      }
  
      const { data, error } = await entryOperation.select('entry_id');
      if (error || !data || !data[0]?.entry_id) {
        console.error("DB操作エラー:", error);
        throw new Error('日記エントリーの保存に失敗しました');
      }
  
      entryId = data[0].entry_id.toString();
      await saveEntryParrots(entryId, user.id, selectedParrots);
  
      // タグ処理（省略なし）
  
      for (const tagName of selectedTags) {
        try {
          const { data: existingTags, error: tagError } = await supabase
            .from('tags')
            .select('tag_id, name, usage_count')
            .eq('name', tagName)
            .maybeSingle();
  
          if (tagError) throw tagError;
  
          let tagId: string = '';
  
          if (existingTags) {
            tagId = String(existingTags.tag_id);
            const currentCount = typeof existingTags.usage_count === 'number' ? existingTags.usage_count : 0;
            await supabase.from('tags').update({
              usage_count: currentCount + 1,
              last_used_at: entryData.updated_at
            }).eq('tag_id', tagId);
          } else {
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
          continue;
        }
      }
  
      // 🎁 報酬付与（新規のみ）
      if (isNewEntry) {
        try {
          const totalChars =
          (line1.trim().length || 0) +
          (line2.trim().length || 0) +
          (line3.trim().length || 0);
        
          xpAmount = calculateXpReward(totalChars);
          ticketsAmount = calculateTicketReward(totalChars);
          
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('total_xp, level')
            .eq('id', user.id)
            .single();
  
          if (userError) throw userError;
  
          const newTotalXp = Number(userData?.total_xp ?? 0) + xpAmount;
          const currentLevel = Number(userData?.level ?? 1);
  
          const { shouldLevelUp, newLevel: calculatedLevel } = checkLevelUp(newTotalXp, currentLevel);
          newLevel = calculatedLevel;
  
          await supabase.from('users').update({
            total_xp: newTotalXp,
            level: shouldLevelUp ? newLevel : currentLevel,
            updated_at: isoString
          }).eq('id', user.id);
  
          await supabase.from('user_experience').insert({
            user_id: user.id,
            xp_amount: xpAmount,
            action_type: '日記作成',
            earned_at: isoString,
            created_at: isoString
          });
  
          if (ticketsAmount > 0) {
            const { data: ticketData } = await supabase
              .from('gacha_tickets')
              .select('ticket_count')
              .eq('user_id', user.id)
              .single();
  
            if (ticketData) {
              await supabase.from('gacha_tickets').update({
                ticket_count: (ticketData?.ticket_count as number) + ticketsAmount,
                last_updated: isoString
              }).eq('user_id', user.id);
            } else {
              await supabase.from('gacha_tickets').insert({
                user_id: user.id,
                ticket_count: ticketsAmount,
                last_updated: isoString
              });
            }
  
            const { data: typeData, error: typeError } = await supabase
            .from('acquisition_type_master')
            .select('acquisition_type_id')
            .filter('name', 'eq', '日記作成') // ← .eq() の代わりに .filter() を使う
            .maybeSingle();
          
            if (typeError) {
              console.error('🎫 acquisition_type_master の取得エラー:', typeError);
            }
            
            if (typeData?.acquisition_type_id) {
              await supabase.from('ticket_acquisition_history').insert({
                user_id: user.id,
                ticket_count: ticketsAmount,
                acquired_at: isoString,
                acquisition_type_id: typeData.acquisition_type_id
              });
            }
          }
  
        } catch (rewardError) {
          console.error('報酬付与エラー:', rewardError);
        }
      }
  
      // ✅ 通知は try の外で出す（失敗しても出す）
      if (isNewEntry) {
        showReward({
          xp: xpAmount,
          tickets: ticketsAmount,
          levelUp: shouldLevelUp,
          newLevel: shouldLevelUp ? newLevel : null
        });
      }
  
      // ✅ 完全に成功している場合のみ、更新トリガーを送る
      if (entryId) {
        console.log('✅ 保存完了: entryId =', entryId);
        console.log('✅ 報酬: XP =', xpAmount, 'チケット =', ticketsAmount);
        console.log('✅ onSave 実行直前');

        await new Promise(resolve => setTimeout(resolve, 500)); // ← DB反映待ち

        onSave?.(); // ← ここがちゃんと呼ばれているか見る
        console.log('✅ onSave 実行後');
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
                maxParrots={10}
                compact={false}
                forceOpen={true} // ← 新しく追加するprops
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