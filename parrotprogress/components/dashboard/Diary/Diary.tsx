import { useAuth } from '@/lib/AuthContext'; // 認証コンテキストのインポート
import React, { useState, useEffect } from 'react';
import { Edit2, Edit3, Search, Plus, Calendar, Clock, Hash, X } from 'lucide-react';
import { supabase } from '@/lib/supabase'; // Supabaseクライアントのインポート
import styles from './Diary.module.css';

//#region 型定義
// 3行日記エントリーの型定義
type DiaryEntryType = {
  entry_id: number;
  user_id: string; // 文字列型に変更（Supabase Auth IDは文字列）
  recorded_at: string;
  session_id?: number | null;
  type_id: number; // 1: regular（通常）, 2: pomodoro（ポモドーロ） など
  line1: string | null;
  line2: string | null;
  line3: string | null;
  created_at: string;
  updated_at: string;
  tags?: string[]; // フロントエンド用のタグ情報
  pomodoroType?: string; // ポモドーロ情報（あれば）
  duration?: number; // ポモドーロの長さ（あれば）
};

// ユーザー情報の型定義
type UserType = {
  id: string;
  email?: string;
  user_metadata?: any;
};

// ダイアログの状態を管理する型
type DiaryModalState = {
  isOpen: boolean;
  mode: 'edit' | 'add'; // 編集モードか追加モードか
  entry: DiaryEntryType | null;
};

// データベースから取得したポモドーロセッションタイプを一時的に保存する型
type PomodoroSessionType = {
  session_id: number;
  pomodoro_type: string;
  duration: number;
  started_at: string;
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
  onTagInput,
  onAddTag,
  onRemoveTag,
  onSave,
  onCancel
}) => {
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

  const { user: authUser, isLoading: authLoading } = useAuth();

  // 状態管理
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntryType[]>([]);
  const [pomodoroSessions, setPomodoroSessions] = useState<PomodoroSessionType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pomodoro' | 'regular'>('all');
  const [modalState, setModalState] = useState<DiaryModalState>({
    isOpen: false,
    mode: 'edit',
    entry: null
  });
  const [currentTag, setCurrentTag] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showTagSuggestions, setShowTagSuggestions] = useState(false);


  // タグリストのデータ
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

  // ユーザー情報が変更されたときにデータを取得
  useEffect(() => {
    const handleAuth = async () => {
      // 認証処理中は単に待機
      if (authLoading) {
        setIsLoading(true);
        return;
      }
      
      // 認証済みかどうかに関わらず、エラーメッセージはクリア
      setError(null);
      
      // ログを追加してデバッグを容易に
      console.log('認証状態:', authUser ? '認証済み' : '未認証', 'User ID:', authUser?.id);
      
      if (authUser?.id) { // authUser.id が存在するかを明示的に確認
        setIsLoading(true);
        
      // 日記データの取得部分を修正
      try {
        // 日記データの取得
        const { data: diaryData, error: diaryError } = await supabase
          .from('diary_entries')
          .select('*')
          .eq('user_id', authUser.id)
          .order('recorded_at', { ascending: false });
          
        if (diaryError) throw diaryError;
        
        console.log('取得した日記エントリー:', diaryData?.length || 0);
        
        // データ処理 - 明示的に型アサーションを追加
        const entriesWithTags = diaryData ? diaryData.map((entry: any) => {
          const randomTags = (entry.entry_id || 0) % 2 === 0 
            ? ['英語学習', '集中できた'] 
            : ['プログラミング'];
          
          // 明示的に DiaryEntryType として整形
          return { 
            entry_id: entry.entry_id,
            user_id: entry.user_id,
            recorded_at: entry.recorded_at,
            session_id: entry.session_id,
            type_id: entry.type_id,
            line1: entry.line1,
            line2: entry.line2,
            line3: entry.line3,
            created_at: entry.created_at,
            updated_at: entry.updated_at,
            tags: randomTags
          } as DiaryEntryType;
        }) : [];
        
        setDiaryEntries(entriesWithTags);
        
        // ポモドーロセッションも取得
        const { data: pomodoroData, error: pomodoroError } = await supabase
          .from('pomodoro_sessions')
          .select('*')
          .eq('user_id', authUser.id)
          .order('started_at', { ascending: false });
          
        if (pomodoroError) throw pomodoroError;
        
        // 明示的に型変換
        const typedPomodoroData = pomodoroData ? pomodoroData.map((session: any) => ({
          session_id: session.session_id,
          pomodoro_type: session.pomodoro_type,
          duration: session.duration,
          started_at: session.started_at
        } as PomodoroSessionType)) : [];
        
        setPomodoroSessions(typedPomodoroData);
      } catch (err: any) {
        console.error('データ取得エラー:', err);
        setError('データ取得に失敗しました');
        setDiaryEntries([]);
        setPomodoroSessions([]);
      } finally {
        setIsLoading(false);
      }
      } else {
        // 未認証でも空データでUIを表示
        setDiaryEntries([]);
        setPomodoroSessions([]);
        setIsLoading(false);
      }
    };
    
    handleAuth();
  }, [authUser, authLoading]);

  // エントリー更新関数
  const updateDiaryEntry = async (entryId: number, line1: string, line2: string, line3: string) => {
    try {
      const { data: entryData, error: entryError } = await supabase
        .from('diary_entries')
        .select('user_id')
        .eq('entry_id', entryId)
        .single();

      if (entryError) throw entryError;

      if (entryData.user_id !== authUser?.id) {
        setError('このエントリーを編集する権限がありません。');
        return false;
      }

      // 更新処理...

      return true;
    } catch (err) {
      console.error('日記の更新エラー:', err);
      setError('日記の更新に失敗しました。');
      return false;
    }
  };

  // 新規エントリー作成関数
  const createDiaryEntry = async (line1: string, line2: string, line3: string, typeId: number, sessionId: number | null = null) => {
    if (!authUser) {
      console.log('ユーザーが認証されていません');
      return false;
    }
  
    console.log("authUser.id:", authUser.id, "Type:", typeof authUser.id);
  
    try {
      const newEntry = {
        user_id: authUser.id,
        recorded_at: new Date(new Date().getTime() + 9 * 60 * 60 * 1000).toISOString(),
        session_id: sessionId,
        type_id: typeId,
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
  
      if (data && data.length > 0) {
        // 型アサーションを使用
        const newEntry = {
          ...(data[0] as any),
          tags: selectedTags
        } as DiaryEntryType;
        
        setDiaryEntries(prev => [newEntry, ...prev]);
        return true;
      }
    } catch (err) {
      console.error('日記の作成エラー:', err);
      setError('日記の作成に失敗しました');
      return false;
    }
  };

  /**
   * 日記エントリーを削除する関数
   */
  const deleteDiaryEntry = async (entryId: number) => {
    try {
      const { data: entryData, error: entryError } = await supabase
        .from('diary_entries')
        .select('user_id')
        .eq('entry_id', entryId)
        .single();

      if (entryError) throw entryError;

      if (entryData.user_id !== authUser?.id) {
        setError('このエントリーを削除する権限がありません。');
        return false;
      }

      const { error } = await supabase
        .from('diary_entries')
        .delete()
        .eq('entry_id', entryId);

      if (error) throw error;

      setDiaryEntries(prev => prev.filter(entry => entry.entry_id !== entryId));
      return true;
    } catch (err) {
      console.error('日記の削除エラー:', err);
      setError('日記の削除に失敗しました');
      return false;
    }
  };

  /**
   * 編集モーダルを開く
   */
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
  };

  /**
   * 新規作成モーダルを開く
   */
  const openAddModal = (typeId: number = 1, sessionId: number | null = null) => {
    if (!authUser?.id) {
      console.log('未認証状態でのモーダルオープン試行 - User:', authUser);
      return;
    }
    
    const newEntry: DiaryEntryType = {
      entry_id: -1,
      user_id: authUser.id,
      recorded_at: new Date().toISOString(),
      session_id: sessionId,
      type_id: typeId,
      line1: '',
      line2: '',
      line3: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (sessionId) {
      const session = pomodoroSessions.find(s => s.session_id === sessionId);
      if (session) {
        newEntry.pomodoroType = session.pomodoro_type;
        newEntry.duration = session.duration;
      }
    }
    
    console.log('新規日記モーダルを開く:', newEntry);
    
    setModalState({
      isOpen: true,
      mode: 'add',
      entry: newEntry
    });
    
    setSelectedTags([]);
  };

  /**
   * モーダルを閉じる
   */
  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
    setCurrentTag('');
    setShowTagSuggestions(false);
  };

  /**
   * 日記の保存処理
   */
  const handleSaveDiary = async (line1: string, line2: string, line3: string) => {
    if (!modalState.entry) return false;

    if ((!line1 && (line2 || line3)) || (!line2 && line3)) {
      setError('入力順序に誤りがあります。前の行が空の場合、後の行にも入力できません。');
      return false;
    }

    if (!line1 && !line2 && !line3) {
      setError('少なくとも1行は入力してください。');
      return false;
    }

    if (modalState.mode === 'edit') {
      return await updateDiaryEntry(modalState.entry.entry_id, line1, line2, line3);
    } else {
      return await createDiaryEntry(
        line1, 
        line2, 
        line3, 
        modalState.entry.type_id,
        modalState.entry.session_id
      );
    }
  };

  /**
   * タブを切り替える
   */
  const handleTabChange = (tab: 'all' | 'pomodoro' | 'regular') => {
    setActiveTab(tab);
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
    let filteredEntries;
    
    if (activeTab === 'all') {
      filteredEntries = diaryEntries;
    } else if (activeTab === 'pomodoro') {
      filteredEntries = diaryEntries.filter(entry => entry.type_id === 2 || entry.session_id !== null);
    } else {
      filteredEntries = diaryEntries.filter(entry => entry.type_id === 1 && entry.session_id === null);
    }
    
    return filteredEntries.slice(0, 3);
  };

  /**
   * 日記タイプの表示名を取得する
   */
  const getDiaryTypeName = (typeId: number, sessionId: number | null) => {
    if (typeId === 2 || sessionId !== null) {
      return 'ポモドーロ';
    }
    return '通常';
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
              onClick={() => authUser?.id ? openAddModal(1) : console.log('ログインが必要です')}
              style={!authUser?.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            />
          </span>
          <span title="日記を検索">
            <Search 
              size={20} 
              className={styles.diaryTool} 
              style={!authUser?.id ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
            />
          </span>
        </div>
      </div>      
      {/* ユーザー情報表示 - 条件付きレンダリング */}
      {authUser?.id ? (
      <div className={styles.diarySubtitle}>
        {authUser.email || authUser.user_metadata?.name || 'ログインユーザー'}さんの日記
      </div>
      ) : (
        <div className={styles.diarySubtitle}>
          今日の出来事を3行で記録しましょう
        </div>
      )}      
      {/* 未ログイン時のメッセージは控えめに表示 */}
      {!authUser && !authLoading && (
        <div className={styles.diarySubtitle} style={{ fontSize: '0.8em', color: '#666' }}>
          ※ログインするとデータが保存されます
        </div>
      )}

      {/* タブと日記エントリー */}
      <div>
        {/* タブ切り替え */}
        <div className={styles.tabsList}>
          <button 
            className={`${styles.tabsTrigger} ${activeTab === 'all' ? styles.active : ''}`}
            onClick={() => handleTabChange('all')}
          >
            すべて
          </button>
          <button 
            className={`${styles.tabsTrigger} ${activeTab === 'pomodoro' ? styles.active : ''}`}
            onClick={() => handleTabChange('pomodoro')}
          >
            ポモドーロ
          </button>
          <button 
            className={`${styles.tabsTrigger} ${activeTab === 'regular' ? styles.active : ''}`}
            onClick={() => handleTabChange('regular')}
          >
            通常の記録
          </button>
        </div>

        {/* 日記エントリーリスト */}
        <div className={styles.diaryEntries}>
          {getFilteredEntries().length === 0 ? (
            <div className={styles.emptyEntry}>
              記録がありません
            </div>
          ) : (
            getFilteredEntries().map(entry => (
              <div key={entry.entry_id} className={styles.diaryEntry}>
                <div className={styles.entryHeader}>
                  <div className={styles.entryTimestamp}>
                    記録時刻: {new Date(entry.recorded_at).toLocaleString('ja-JP')}
                    {entry.session_id && entry.pomodoroType && (
                      <span style={{ marginLeft: '8px' }}>
                        {entry.pomodoroType} ({entry.duration}分)
                      </span>
                    )}
                  </div>
                  <div className={styles.entryTags}>
                    <span className={`${styles.recordTypeTag} ${entry.type_id === 2 ? styles.immediateTag : styles.laterTag}`}>
                      {getDiaryTypeName(entry.type_id, entry.session_id ?? null)}
                    </span>
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

      {/* 編集/作成モーダル */}
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
                {modalState.entry.session_id && modalState.entry.pomodoroType && (
                  <span style={{ marginLeft: '8px' }}>
                    {modalState.entry.pomodoroType} ({modalState.entry.duration}分)
                  </span>
                )}
              </div>
              
              {/* 3行日記フォームコンポーネント */}
              <DiaryForm 
                entry={modalState.entry}
                selectedTags={selectedTags}
                currentTag={currentTag}
                showTagSuggestions={showTagSuggestions}
                allTags={allTags}
                frequentTags={frequentTags}
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