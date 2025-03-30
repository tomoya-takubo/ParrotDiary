import { useAuth } from '@/lib/AuthContext'; // 認証コンテキストのインポート
import { supabase } from '@/lib/supabase'; // Supabaseクライアントのインポート
import { Edit2, Edit3, Hash, Plus, Search, X } from 'lucide-react';
import Image from 'next/image'; // Next.jsのImageコンポーネントをインポート
import { useRouter } from 'next/navigation'; // Next.jsのルーターを使用
import React, { useEffect, useState } from 'react'; // React等インポート
import styles from './Diary.module.css'; // スタイル
import { getEntryParrots, ParrotSelector, saveEntryParrots } from './ParrotSelector'; // 追加

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
  parrots?: string[]; // パロットGIFのパス（将来的にはDBから取得）
};

// ダイアログの状態を管理する型
type DiaryModalState = {
  isOpen: boolean;
  mode: 'edit' | 'add'; // 編集モードか追加モードか
  entry: DiaryEntryType | null;
};

// タグの型定義
type TagType = {
  id: number;
  name: string;
  count: number;
  lastUsed: string;
};
//#endregion

//#region DiaryFormコンポーネント
// 3行日記のフォームコンポーネント（モーダル内で使用）の型定義
interface DiaryFormProps {
  entry: DiaryEntryType;
  selectedTags: string[];
  currentTag: string;
  showTagSuggestions: boolean;
  allTags: TagType[];
  frequentTags: TagType[];
  // パロット関連のプロパティを追加
  selectedParrots: string[];
  onParrotsChange: (parrots: string[]) => void;
  onTagInput: (value: string) => void;
  onAddTag: (tagName: string) => void;
  onRemoveTag: (tagToRemove: string) => void;
  onSave: (line1: string, line2: string, line3: string) => void;
  onCancel: () => void;
}

/**
 * 3行日記のフォームコンポーネント
 * - 3行のテキスト入力
 * - タグの追加と削除機能
 * - 入力検証と保存処理
 */
const DiaryForm: React.FC<DiaryFormProps> = ({
  entry,
  selectedTags,
  currentTag,
  showTagSuggestions,
  allTags,
  frequentTags,
  // パロット関連のプロパティ
  selectedParrots,
  onParrotsChange,
  // 他のプロパティ
  onTagInput,
  onAddTag,
  onRemoveTag,
  onSave,
}) => {
  const { user: authUser } = useAuth();
  const [line1, setLine1] = useState(entry.line1 || '');
  const [line2, setLine2] = useState(entry.line2 || '');
  const [line3, setLine3] = useState(entry.line3 || '');
  const [formError, setFormError] = useState<string | null>(null);
  /**
   * 入力検証を行う関数
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
   * フォームの送信処理
   */
  const handleSubmit = () => {
    if (validateForm()) {
      onSave(line1, line2, line3);
    }
  };

  /**
   * 2行目の入力フィールドの変更ハンドラ
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
   * 3行目の入力フィールドの変更ハンドラ
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
   * エンターキーでタグ追加
   */
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault(); // フォーム送信を防ぐ
      if (currentTag) {
        onAddTag(currentTag);
      }
    }
  };

  return (
    <div className={styles.formContainer}>
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
              onChange={(e) => onTagInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="新しいタグを追加"
              className={styles.textInput}
            />
            <button
              onClick={() => currentTag && onAddTag(currentTag)}
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
                      onClick={() => onAddTag(tag.name)}
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
                  onClick={() => onAddTag(tag.name)}
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
                  onClick={() => onRemoveTag(tag)}
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

      {/* パロット選択セクション（拡張版） */}
      <div className={styles.modalParrotSection}>
        <div className={styles.modalParrotTitle}>パロット</div>
        
        {/* ParrotSelector コンポーネントを使用 */}
        {authUser && (
          <ParrotSelector
            userId={authUser.id}
            selectedParrots={selectedParrots}
            onParrotsChange={onParrotsChange}
            maxParrots={1}
          />
        )}
      </div>

      {/* 記録ボタン */}
      <button
        onClick={handleSubmit}
        className={styles.recordButton}
        disabled={!line1.trim() && !line2.trim() && !line3.trim()}
      >
        <Edit3 size={20} />
        記録する
      </button>
    </div>
  );
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
  const [modalState, setModalState] = useState<DiaryModalState>({
    isOpen: false,
    mode: 'edit',
    entry: null
  });
  const [currentTag, setCurrentTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);
  // パロット関連のstate追加
  const [selectedParrots, setSelectedParrots] = useState<string[]>([]);

  const [reloadTrigger] = useState(0);

  // タグリストのデータ - allTags 定義を追加
  const allTags: TagType[] = [
    { id: 1, name: '英語学習', count: 42, lastUsed: '2024-03-09' },
    { id: 2, name: 'プログラミング', count: 35, lastUsed: '2024-03-09' },
    { id: 3, name: '集中できた', count: 28, lastUsed: '2024-03-09' },
    { id: 4, name: '数学', count: 25, lastUsed: '2024-03-08' },
    { id: 5, name: 'リーディング', count: 20, lastUsed: '2024-03-09' }
  ];

  // よく使うタグ - frequentTags 定義を追加
  const frequentTags = allTags
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

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
              // パロット情報取得（新規追加）
              let parrots: string[] = [];

              try {
                // 型キャストに関する警告を避けるための修正
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
                      tags = tagData.map(tag => tag.name as string).filter(Boolean);                    }
                  }
                }
              } catch (err) {
                console.error('パロット取得エラー:', err);
              }
              // 日記エントリーとタグを結合し、仮のパロットパスを追加
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

    // 編集モーダルを開く - パロット情報も読み込む
    const openEditModal = (entry: DiaryEntryType) => {
      setModalState({
        isOpen: true,
        mode: 'edit',
        entry
      });
      
      if (entry.tags) {
        setSelectedTags(entry.tags);
      } else {
        setSelectedTags([]);
      }
      
      if (entry.parrots) {
        setSelectedParrots(entry.parrots);
      } else {
        setSelectedParrots([]);
      }
    };
    
    // モーダルを閉じる
    const closeModal = () => {
      setModalState(prev => ({ ...prev, isOpen: false }));
      setCurrentTag('');
      setShowTagSuggestions(false);
      // パロット選択状態をリセット
      setSelectedParrots([]);
    };
  
  // エントリー更新時にパロット情報も保存
  const updateDiaryEntry = async (
    entryId: number, 
    line1: string, 
    line2: string, 
    line3: string
  ): Promise<boolean> => {
    if (!authUser) return false;  // 早期リターンで安全に
    
    try {
      const { data: entryData, error: entryError } = await supabase
        .from('diary_entries')
        .select('user_id, created_at, recorded_at')
        .eq('entry_id', entryId)
        .single();

      if (entryError) throw entryError;

      if (entryData.user_id !== authUser?.id) {
        return false;
      }

      // 現在時刻を取得し、日本時間に調整
      const now = new Date();
      const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const isoString = jstTime.toISOString();

      // 更新データ（created_atは変更せず、updated_atのみ更新）
      const updateData = {
        line1: line1 || null,
        line2: line2 || null,
        line3: line3 || null,
        updated_at: isoString
      };

      const { data, error } = await supabase
        .from('diary_entries')
        .update(updateData)
        .eq('entry_id', entryId)
        .select();

      if (error) throw error;

      // パロット情報を保存
      await saveEntryParrots(entryId, authUser.id, selectedParrots);

      // 画面の日記データを更新
      if (data && data.length > 0) {
        const updatedEntry = {
          ...data[0],
          tags: selectedTags,
          parrots: selectedParrots,
        } as DiaryEntryType;
        
        // タグの処理
        if (selectedTags.length > 0) {
          // タグごとに処理
          for (const tagName of selectedTags) {
            try {
              // タグが存在するか確認
              const { data: existingTags, error: tagError } = await supabase
                .from('tags')
                .select('tag_id, nameusage_count')
                .eq('name', tagName)
                .maybeSingle();

              if (tagError) throw tagError;

              let tagId;
              
              if (existingTags && existingTags.tag_id) {
                // 既存のタグ - 使用回数を更新
                tagId = existingTags.tag_id;
                // nameusage_countがnullや数値でない場合は0として扱う
                const currentCount = typeof existingTags.nameusage_count === 'number' ? 
                  existingTags.nameusage_count : 0;
                
                const { error: updateError } = await supabase
                  .from('tags')
                  .update({ 
                    nameusage_count: currentCount + 1,
                    last_used_at: isoString
                  })
                  .eq('tag_id', tagId);

                if (updateError) throw updateError;
              } else {
                // 新しいタグを作成
                const { data: newTag, error: createError } = await supabase
                  .from('tags')
                  .insert({
                    name: tagName,
                    nameusage_count: 1,
                    last_used_at: isoString,
                    created_at: isoString,
                    created_by: authUser?.id
                  })
                  .select('tag_id');

                if (createError) throw createError;
                
                if (!newTag || !Array.isArray(newTag) || newTag.length === 0 || !newTag[0].tag_id) {
                  console.error('新規タグID取得失敗');
                  continue;
                }
                
                tagId = newTag?.[0]?.tag_id || '';
              }

              // タグの使用履歴を確認（既に存在するか）
              const { data: existingHistory, error: historyCheckError } = await supabase
                .from('tag_usage_histories')
                .select('*')
                .eq('tag_id', tagId)
                .eq('entry_id', entryId)
                .eq('user_id', authUser?.id)
                .maybeSingle();

              if (historyCheckError) throw historyCheckError;

              // 履歴がなければ新規追加
              if (!existingHistory) {
                const { error: historyError } = await supabase
                  .from('tag_usage_histories')
                  .insert({
                    tag_id: tagId,
                    user_id: authUser?.id,
                    entry_id: entryId,
                    used_at: isoString
                  });

                if (historyError) throw historyError;
              }
            } catch (tagError) {
              console.error('タグ処理エラー:', tagError);
            }
          }
        }

        setDiaryEntries(prev => 
          prev.map(entry => entry.entry_id === entryId ? updatedEntry : entry)
        );
        return true;
      }

      return false;
    } catch (err) {
      console.error('日記の更新エラー:', err);
      return false;
    }
  };

  // 新規エントリー作成関数
  const createDiaryEntry = async (line1: string, line2: string, line3: string) => {
    if (!authUser) {
      console.log('ユーザーが認証されていません');
      return false;
    }

    console.log("authUser.id:", authUser.id, "Type:", typeof authUser.id);

    try {
      // 現在時刻を取得し、日本時間に調整
      const now = new Date();
      const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
      const isoString = jstTime.toISOString();
      
      // 新規エントリーデータを作成（タイムゾーン調整済み）
      const newEntry = {
        user_id: authUser.id,
        recorded_at: isoString,  // 日本時間で記録
        created_at: isoString,   // 日本時間で記録
        updated_at: isoString,   // 日本時間で記録
        line1: line1 || null,
        line2: line2 || null,
        line3: line3 || null,
      };

      console.log("送信データ:", newEntry);

      const { data, error } = await supabase
        .from('diary_entries')
        .insert([newEntry])
        .select();

      if (error) throw error;

      console.log("日記エントリーの作成結果:", data); // 追加

      if (data && data.length > 0 && data[0].entry_id) {
        console.log("エントリー作成成功:", data[0].entry_id);
        console.log("保存するパロット:", selectedParrots);
        // パロット情報を保存
        const saveResult = await saveEntryParrots(data[0].entry_id as string, authUser.id, selectedParrots);
        console.log("パロット保存結果:", saveResult);
      
        // タグの処理（selectedTagsがある場合）
        if (selectedTags.length > 0 && data[0].entry_id) {
          // タグごとに処理
          for (const tagName of selectedTags) {
            try {
              // タグが存在するか確認
              const { data: existingTags, error: tagError } = await supabase
                .from('tags')
                .select('tag_id, nameusage_count')
                .eq('name', tagName)
                .maybeSingle();

              if (tagError) throw tagError;

              let tagId;
              
              if (existingTags && existingTags.tag_id) {
                // 既存のタグ - 使用回数を更新
                tagId = existingTags.tag_id;
                // nameusage_countがnullや数値でない場合は0として扱う
                const currentCount = typeof existingTags.nameusage_count === 'number' ? 
                  existingTags.nameusage_count : 0;
                
                const { error: updateError } = await supabase
                  .from('tags')
                  .update({ 
                    nameusage_count: currentCount + 1,
                    last_used_at: isoString
                  })
                  .eq('tag_id', tagId);

                if (updateError) throw updateError;
              } else {
                // 新しいタグを作成
                const { data: newTag, error: createError } = await supabase
                  .from('tags')
                  .insert({
                    name: tagName,
                    nameusage_count: 1,
                    last_used_at: isoString,
                    created_at: isoString,
                    created_by: authUser.id
                  })
                  .select('tag_id');

                if (createError) throw createError;
                
                if (!newTag || !Array.isArray(newTag) || newTag.length === 0 || !newTag[0].tag_id) {
                  console.error('新規タグID取得失敗');
                  continue;
                }
                
                tagId = newTag?.[0]?.tag_id || '';
              }

              // タグの使用履歴を記録
              const { error: historyError } = await supabase
                .from('tag_usage_histories')
                .insert({
                  tag_id: tagId,
                  user_id: authUser.id,
                  entry_id: data[0].entry_id,
                  used_at: isoString
                });

              if (historyError) throw historyError;
            } catch (tagError) {
              console.error('タグ処理エラー:', tagError);
            }
          }
        }
        
        // 画面の日記データを更新
        const newEntryWithTagsAndParrots = {
          ...data[0],
          tags: selectedTags,
          parrots: selectedParrots
        } as DiaryEntryType;
        
        setDiaryEntries(prev => [newEntryWithTagsAndParrots, ...prev]);
        return true;
      }
    } catch (err) {
      console.error('日記の作成エラー:', err);
      return false;
    }
  };

  /**
   * 新規作成モーダルを開く
   */
  const openAddModal = () => {
    if (!authUser?.id) {
      console.log('未認証状態でのモーダルオープン試行 - User:', authUser);
      return;
    }
    
    // 現在時刻を取得し、日本時間に調整
    const now = new Date();
    const jstTime = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const isoString = jstTime.toISOString();
    
    const newEntry: DiaryEntryType = {
      entry_id: -1,
      user_id: authUser.id,
      recorded_at: isoString,  // 日本時間で記録
      line1: '',
      line2: '',
      line3: '',
      created_at: isoString,   // 日本時間で記録
      updated_at: isoString    // 日本時間で記録
    };
    
    console.log('新規日記モーダルを開く:', newEntry);
    
    setModalState({
      isOpen: true,
      mode: 'add',
      entry: newEntry
    });
    
    setSelectedTags([]);
    setSelectedParrots([]);
  };

  /**
   * モーダルを閉じる
   */
  // const closeModal = () => {
  //   setModalState(prev => ({ ...prev, isOpen: false }));
  //   setCurrentTag('');
  //   setShowTagSuggestions(false);
  // };

  /**
   * 日記の保存処理
   */
  const handleSaveDiary = async (line1: string, line2: string, line3: string) => {
    if (!modalState.entry) return false;

    if ((!line1 && (line2 || line3)) || (!line2 && line3)) {
      return false;
    }

    if (!line1 && !line2 && !line3) {
      return false;
    }

    if (modalState.mode === 'edit') {
      return await updateDiaryEntry(modalState.entry.entry_id, line1, line2, line3);
    } else {
      return await createDiaryEntry(
        line1, 
        line2, 
        line3, 
      );
    }

  };

  /**
   * タグを追加する
   */
  const handleAddTag = (tagName: string) => {
    if (!selectedTags.includes(tagName)) {
      setSelectedTags([...selectedTags, tagName]);
    }
    setCurrentTag('');
    setShowTagSuggestions(false);
  };

  /**
   * タグを削除する
   */
  const handleRemoveTag = (tagToRemove: string) => {
    setSelectedTags(selectedTags.filter(tag => tag !== tagToRemove));
  };

  /**
   * 表示するエントリーをフィルタリングする
   */
  const getFilteredEntries = () => {
    // タブによるフィルタリングを削除し、単純に最新の3件を返す
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

      {/* 日記エントリー - タブ切り替え部分を削除 */}
      <div>
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
      </div>
            
      {/* 編集/作成モーダル - ポモドーロ関連表示を削除 */}
      {modalState.isOpen && modalState.entry && (
        <div 
          className={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeModal();
            }
          }}
        >
          <div className={styles.modalContainer}>
            <button
              onClick={closeModal}
              className={styles.closeButton}
              aria-label="閉じる"
            >
              <X size={20} />
            </button>
            
            <div className={styles.modalHeader}>
              <h2 className={styles.modalTitle}>
                {modalState.mode === 'edit' ? '3行日記を編集' : '3行日記を作成'}
              </h2>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.entryTimestamp}>
                {new Date(modalState.entry.recorded_at).toLocaleString('ja-JP')} の記録
              </div>
              
              {/* 3行日記フォームコンポーネント */}
              <DiaryForm 
                entry={modalState.entry}
                selectedTags={selectedTags}
                currentTag={currentTag}
                showTagSuggestions={showTagSuggestions}
                allTags={allTags}
                frequentTags={frequentTags}
                selectedParrots={selectedParrots} // 追加
                onParrotsChange={setSelectedParrots} // 追加
                onTagInput={(value: string) => {
                  setCurrentTag(value);
                  setShowTagSuggestions(value.length > 0);
                }}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onSave={async (line1: string, line2: string, line3: string) => {
                  const success = await handleSaveDiary(line1, line2, line3);
                  if (success) {
                    closeModal();
                  }
                }}
                onCancel={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Diary;