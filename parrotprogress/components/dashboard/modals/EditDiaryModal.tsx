import React, { useState } from 'react';
import { X, Edit3, Calendar, Clock, Hash, Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import styles from './EditDiaryModal.module.css'; // 専用のスタイルシートを使用

// ActivityHistoryで使用する日記エントリー型
type ModalDiaryEntry = {
  time: string;
  tags: string[];
  activities: string[];
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
  entry: ModalDiaryEntry;
  date: string | null;
  onSave: () => void;
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
      
      // 更新後のエントリーデータを作成
      const updatedEntry: ModalDiaryEntry = {
        time: entry.time,
        tags: selectedTags,
        activities
      };

      // ここでDBへの保存処理を実装
      // 例: await supabase.from('diary_entries').update({ ... }).eq('id', entryId);
      console.log('保存するデータ:', updatedEntry);

      // 保存完了を親コンポーネントに通知
      onSave();
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
            {date ? `${date}の記録` : '新規記録'}
            {entry.time && ` / ${entry.time}`}
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
                placeholder="1行目: 今日あったことを書きましょう"
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
                placeholder="2行目: 続きを書きましょう"
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
                placeholder="3行目: まとめやポイントを書きましょう"
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

          {/* 記録ボタン */}
          <button
            onClick={handleSave}
            className={styles.recordButton}
            disabled={isLoading || (!line1.trim() && !line2.trim() && !line3.trim())}
          >
            <Edit3 size={20} />
            記録する
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditDiaryModal;