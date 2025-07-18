/**
 * 日記関連の型定義
 */

/**
 * モーダルモードの型定義
 */
export type ModalMode = 'signin' | 'signup' | 'reset';

/**
 * フォームフィードバックの型定義
 */
export type FormFeedback = {
  /** フィードバックタイプ */
  type: 'success' | 'error';
  /** メッセージ内容 */
  message: string;
} | null;

/**
 * アニメーション状態の型定義
 */
export type AnimationState = 'initial' | 'spinning' | 'result';

/**
 * アクティビティレベルの型定義
 * 0: アクティビティなし
 * 1-4: アクティビティレベル（低から高）
 */
export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

/**
 * 編集用の日記エントリ型定義
 * モーダルで編集・作成する際の共通データ構造
 */
export type EditDiaryEntryType = {
  /** 時刻（HH:MM形式） */
  time: string;
  /** タグの配列 */
  tags: string[];
  /** 日記の内容（最大3行） */
  activities: string[];
  /** 作成日時 */
  created_at?: string;
  /** エントリーID */
  entry_id?: number | string;
  /** パロットGIF画像のURL配列 */
  parrots?: string[];
};

/**
 * タグの型定義
 */
export type TagType = {
  /** タグID */
  id: number;
  /** タグ名 */
  name: string;
  /** 使用回数 */
  count: number;
  /** 最終使用日時 */
  lastUsed: string;
};

/**
 * データベースから取得した日記エントリの型定義
 */
export type DiaryEntryType = {
  /** エントリーID */
  entry_id: number;
  /** ユーザーID */
  user_id: string;
  /** 記録日時 */
  recorded_at: string;
  /** 1行目 */
  line1: string | null;
  /** 2行目 */
  line2: string | null;
  /** 3行目 */
  line3: string | null;
  /** 作成日時 */
  created_at: string;
  /** 更新日時 */
  updated_at: string;
  /** タグ配列 */
  tags?: string[];
  /** パロット配列 */
  parrots?: string[];
};

/**
 * モーダル状態の型定義
 */
export type ModalState = {
  /** モーダルの表示状態 */
  isOpen: boolean;
  /** 編集対象のエントリー */
  entry: EditDiaryEntryType | null;
  /** 対象日付 */
  date: string | null;
};