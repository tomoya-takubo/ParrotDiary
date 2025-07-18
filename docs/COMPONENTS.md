# ParrotDiary コンポーネント仕様書

## 概要

ParrotDiaryは、Next.js 15 App RouterとTypeScriptを使用したReactアプリケーションです。24個の主要コンポーネントで構成され、認証、日記管理、ガチャシステム、コレクション機能を提供します。

## 目次

1. [コンポーネント階層](#コンポーネント階層)
2. [コンテキストプロバイダー](#コンテキストプロバイダー)
3. [認証コンポーネント](#認証コンポーネント)
4. [ダッシュボードコンポーネント](#ダッシュボードコンポーネント)
5. [モーダルコンポーネント](#モーダルコンポーネント)
6. [ガチャシステム](#ガチャシステム)
7. [コレクション・検索](#コレクション・検索)
8. [型定義](#型定義)
9. [設計パターン](#設計パターン)

---

## コンポーネント階層

```
App
├── AuthProvider (AuthContext)
│   └── RewardProvider (RewardContext)
│       ├── StartButton
│       │   └── AuthModal
│       ├── Dashboard
│       │   ├── Diary
│       │   │   ├── ParrotSelector
│       │   │   └── EditDiaryModal
│       │   ├── ActivityHistory
│       │   │   ├── DiaryModal
│       │   │   └── EditDiaryModal
│       │   ├── GachaAnimation
│       │   └── RewardNotification
│       ├── CollectionPreview
│       │   └── ParrotIcon
│       └── DiarySearch
│           └── EditDiaryModal
```

---

## コンテキストプロバイダー

### AuthContext

**ファイル**: `/parrotdiary/lib/AuthContext.tsx`

**目的**: アプリケーション全体の認証状態管理

#### Props
```typescript
interface AuthProviderProps {
  children: React.ReactNode;
}
```

#### 提供する値
```typescript
interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}
```

#### 使用方法
```typescript
const { session, user, isLoading, signIn, signOut } = useAuth();
```

#### 主要機能
- Supabase認証との統合
- セッション状態の永続化
- 自動トークンリフレッシュ
- ローディング状態管理

---

### RewardContext

**ファイル**: `/parrotdiary/lib/RewardContext.tsx`

**目的**: 報酬通知システムの管理

#### Props
```typescript
interface RewardProviderProps {
  children: React.ReactNode;
}
```

#### 提供する値
```typescript
interface RewardContextType {
  reward: RewardData | null;
  showReward: (rewardData: RewardData) => void;
}

interface RewardData {
  type: 'xp' | 'ticket' | 'levelUp';
  amount: number;
  message: string;
}
```

#### 使用方法
```typescript
const { reward, showReward } = useReward();

// 報酬表示
showReward({
  type: 'xp',
  amount: 10,
  message: '日記を書いてXPを獲得しました！'
});
```

---

## 認証コンポーネント

### StartButton

**ファイル**: `/parrotdiary/components/StartButton.tsx`

**目的**: アプリケーションエントリーポイント

#### Props
```typescript
// Props なし
```

#### 主要機能
- 認証モーダルの表示
- セッションクリア
- モバイル対応タップエリア

#### 使用例
```typescript
<StartButton />
```

---

### AuthModal

**ファイル**: `/parrotdiary/components/AuthModal.tsx`

**目的**: 包括的な認証システム

#### Props
```typescript
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}
```

#### 主要機能
- **マルチモーダル認証**
  - サインイン
  - サインアップ
  - パスワードリセット
- **フォームバリデーション**
- **パスワード強度チェック**
- **アクセシビリティ対応**
  - フォーカストラップ
  - ESCキー対応
  - ARIA属性

#### 使用例
```typescript
<AuthModal 
  isOpen={isAuthModalOpen} 
  onClose={() => setIsAuthModalOpen(false)} 
/>
```

#### バリデーション
```typescript
// パスワード強度チェック
const passwordValidation = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true
};
```

---

## ダッシュボードコンポーネント

### Diary

**ファイル**: `/parrotdiary/components/dashboard/Diary/Diary.tsx`

**目的**: 日記エントリーの表示・管理

#### Props
```typescript
interface DiaryProps {
  onSave?: () => void;
}
```

#### 主要機能
- **レスポンシブ表示**
  - PC: 6エントリー（2×3グリッド）
  - タブレット: 4エントリー（2×2グリッド）
  - スマホ: 3エントリー（1×3グリッド）
- **エントリー編集**
- **パロット表示**
- **タグ管理**

#### 使用例
```typescript
<Diary onSave={handleDiarySave} />
```

#### レスポンシブ設計
```typescript
const getDisplayCount = (screenWidth: number) => {
  if (screenWidth >= 1024) return 6; // PC
  if (screenWidth >= 768) return 4;  // タブレット
  return 3; // スマホ
};
```

---

### ParrotSelector

**ファイル**: `/parrotdiary/components/dashboard/Diary/ParrotSelector.tsx`

**目的**: 日記エントリー用パロット選択

#### Props
```typescript
interface ParrotSelectorProps {
  userId: string;
  selectedParrots: string[];
  onParrotsChange: (parrots: string[]) => void;
  maxParrots?: number;
  compact?: boolean;
  forceOpen?: boolean;
}
```

#### 主要機能
- **データキャッシュ**
  - 5分間のTTL
  - メモリ効率化
- **ページネーション**
  - 8パロット/ページ
  - 無限スクロール対応
- **人気タグフィルタリング**
- **バッチ処理**

#### 使用例
```typescript
<ParrotSelector
  userId={user.id}
  selectedParrots={selectedParrots}
  onParrotsChange={setSelectedParrots}
  maxParrots={5}
  compact={true}
/>
```

#### キャッシュ戦略
```typescript
const parrotCache = new Map<string, {
  data: Parrot[];
  timestamp: number;
  ttl: number;
}>();

const CACHE_TTL = 5 * 60 * 1000; // 5分
```

---

### ActivityHistory

**ファイル**: `/parrotdiary/components/dashboard/ActivityHistory/ActivityHistory.tsx`

**目的**: GitHub風活動カレンダー

#### Props
```typescript
interface ActivityHistoryProps {
  onCellClick?: (date: string) => void;
  width?: string | number;
  isGachaOpen?: boolean;
  onSave?: () => void;
  refreshKey?: number;
}
```

#### 主要機能
- **6ヶ月間の活動視覚化**
- **活動レベル（0-4）**
- **カレンダーナビゲーション**
- **モーダル統合**

#### 使用例
```typescript
<ActivityHistory
  onCellClick={handleCellClick}
  width="100%"
  refreshKey={refreshCounter}
/>
```

#### 活動レベル計算
```typescript
const getActivityLevel = (entryCount: number): number => {
  if (entryCount === 0) return 0;
  if (entryCount <= 1) return 1;
  if (entryCount <= 2) return 2;
  if (entryCount <= 3) return 3;
  return 4;
};
```

---

## モーダルコンポーネント

### EditDiaryModal

**ファイル**: `/parrotdiary/components/dashboard/modals/EditDiaryModal.tsx`

**目的**: 日記エントリー編集インターフェース

#### Props
```typescript
interface EditDiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  entry: EditDiaryEntryType;
  date: string | null;
  onSave: () => void;
}
```

#### 主要機能
- **3行日記入力**
  - 各行500文字制限
  - リアルタイム文字数カウント
- **タグ管理**
  - オートコンプリート
  - 使用頻度順サジェスト
- **パロット選択統合**
- **報酬計算**
- **フォームバリデーション**

#### 使用例
```typescript
<EditDiaryModal
  isOpen={isEditModalOpen}
  onClose={handleCloseEditModal}
  entry={selectedEntry}
  date={selectedDate}
  onSave={handleSaveEntry}
/>
```

#### バリデーション
```typescript
interface ValidationRules {
  title: {
    required: true;
    maxLength: 100;
  };
  contentLine1: {
    maxLength: 500;
  };
  contentLine2: {
    maxLength: 500;
  };
  contentLine3: {
    maxLength: 500;
  };
}
```

---

### DiaryModal

**ファイル**: `/parrotdiary/components/dashboard/modals/DiaryModal.tsx`

**目的**: 特定日の日記エントリー表示

#### Props
```typescript
interface DiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  date: string | null;
  entries: ActivityDiaryEntry[];
  onDataUpdated: () => void;
  isToday: boolean;
  onEditEntry?: (entry: ActivityDiaryEntry) => void;
  onDateChange?: (newDate: string) => void;
}
```

#### 主要機能
- **日付ナビゲーション**
  - 左右矢印キー対応
  - 日付バリデーション
- **エントリー表示**
- **編集統合**
- **キーボードナビゲーション**

#### 使用例
```typescript
<DiaryModal
  isOpen={isDiaryModalOpen}
  onClose={handleCloseDiaryModal}
  date={selectedDate}
  entries={dayEntries}
  onDataUpdated={refreshData}
  isToday={isToday}
  onEditEntry={handleEditEntry}
/>
```

---

## ガチャシステム

### GachaAnimation

**ファイル**: `/parrotdiary/components/dashboard/gacha/GachaAnimation.tsx`

**目的**: 包括的なガチャシステム

#### Props
```typescript
interface GachaAnimationProps {
  isOpen: boolean;
  startGacha: () => void;
  onClose: () => void;
}
```

#### 主要機能
- **マルチガチャ対応**
  - 1回, 10回, 50回引き
  - バッチ処理最適化
- **レアリティシステム**
  - Normal: 70%
  - Rare: 20%
  - Super Rare: 8%
  - Ultra Rare: 2%
- **アニメーション**
  - パーティクルエフェクト
  - カードフリップ演出
- **データベース統合**
  - パロット取得記録
  - 重複チェック
  - 統計更新

#### 使用例
```typescript
<GachaAnimation
  isOpen={isGachaOpen}
  startGacha={handleStartGacha}
  onClose={handleCloseGacha}
/>
```

#### レアリティ確率
```typescript
const rarityProbabilities = {
  normal: 0.70,      // 70%
  rare: 0.20,        // 20%
  superRare: 0.08,   // 8%
  ultraRare: 0.02    // 2%
};
```

#### アニメーション状態
```typescript
type AnimationState = 
  | 'idle'
  | 'spinning'
  | 'revealing'
  | 'complete';
```

---

## コレクション・検索

### CollectionPreview

**ファイル**: `/parrotdiary/components/CollectionPreview/index.tsx`

**目的**: パロットコレクションブラウザ

#### Props
```typescript
// Props なし（内部でユーザー情報取得）
```

#### 主要機能
- **ページネーション**
  - 24アイテム/ページ
  - 無限スクロール対応
- **検索・フィルタリング**
  - 名前検索
  - レアリティフィルタ
  - タグフィルタ
  - 取得状況フィルタ
- **ソート機能**
  - 表示順
  - レアリティ順
  - 取得日順
- **タグ管理**
  - パロット別タグ付け
  - タグ統計表示
- **進捗追跡**
  - 取得率表示
  - レアリティ別統計

#### 使用例
```typescript
<CollectionPreview />
```

#### フィルタリング
```typescript
interface FilterOptions {
  search: string;
  rarity: string[];
  tags: string[];
  obtained: 'all' | 'obtained' | 'not_obtained';
}
```

---

### DiarySearch

**ファイル**: `/parrotdiary/components/diary/DiarySearch.tsx`

**目的**: 高度な日記検索・管理

#### Props
```typescript
interface DiarySearchProps {
  initialUserId?: string;
  onDataLoaded?: () => void;
  preloadData?: boolean;
  initialEntries?: ExtendedDiaryEntry[];
  initialTags?: TagWithCount[];
}
```

#### 主要機能
- **高度検索**
  - キーワード検索
  - タグ検索
  - 日付範囲検索
- **エクスポート機能**
  - CSV形式
  - TXT形式
- **レスポンシブページネーション**
  - PC: 12エントリー/ページ
  - タブレット: 8エントリー/ページ
  - スマホ: 6エントリー/ページ
- **エントリー編集・削除**
- **フィルタ永続化**

#### 使用例
```typescript
<DiarySearch
  initialUserId={user.id}
  onDataLoaded={handleDataLoaded}
  preloadData={true}
/>
```

#### 検索クエリ
```typescript
interface SearchQuery {
  keyword?: string;
  tags?: string[];
  dateFrom?: string;
  dateTo?: string;
  sortBy: 'date' | 'created' | 'updated';
  sortOrder: 'asc' | 'desc';
}
```

---

## 型定義

### 共通型

**ファイル**: `/parrotdiary/types/index.ts`

```typescript
// ガチャ結果
interface GachaResult {
  id: string;
  name: string;
  imageUrl: string;
  rarity: 'normal' | 'rare' | 'super_rare' | 'ultra_rare';
  isNew: boolean;
}

// ユーザー状態
interface UserStatus {
  level: number;
  experience: number;
  tickets: number;
  streak: number;
  totalParrots: number;
}
```

### 日記型

**ファイル**: `/parrotdiary/types/diary.ts`

```typescript
// 日記エントリー
interface DiaryEntry {
  id: string;
  user_id: string;
  title: string;
  content_line1?: string;
  content_line2?: string;
  content_line3?: string;
  entry_date: string;
  created_at: string;
  updated_at: string;
  tags?: string[];
  parrot_icons?: string[];
}

// 編集用エントリー
interface EditDiaryEntryType {
  id?: string;
  title: string;
  content_line1: string;
  content_line2: string;
  content_line3: string;
  entry_date: string;
  tags: string[];
  parrot_icons: string[];
}
```

### 認証型

**ファイル**: `/parrotdiary/types/auth.ts`

```typescript
// 認証フォーム
interface AuthForm {
  email: string;
  password: string;
  name?: string;
}

// バリデーション結果
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}
```

---

## 設計パターン

### 1. コンポーネント設計原則

#### 単一責任原則
各コンポーネントは明確な単一の責任を持つ

```typescript
// ✅ 良い例: 単一責任
const ParrotIcon = ({ imageUrl, name, obtained }) => {
  return (
    <Image
      src={imageUrl}
      alt={name}
      style={{ opacity: obtained ? 1 : 0.3 }}
    />
  );
};

// ❌ 悪い例: 複数責任
const ParrotIconWithModal = ({ imageUrl, name, obtained, onEdit }) => {
  // パロット表示 + モーダル管理 + 編集機能
};
```

#### Props設計
```typescript
// ✅ 良い例: 明確なProps
interface ParrotSelectorProps {
  userId: string;
  selectedParrots: string[];
  onParrotsChange: (parrots: string[]) => void;
  maxParrots?: number;
}

// ❌ 悪い例: 曖昧なProps
interface ParrotSelectorProps {
  data: any;
  config: any;
  callbacks: any;
}
```

### 2. 状態管理パターン

#### コンテキスト使用基準
```typescript
// グローバル状態: Context
const AuthContext = createContext<AuthContextType>();

// ローカル状態: useState
const [isModalOpen, setIsModalOpen] = useState(false);

// 複雑な状態: useReducer
const [gachaState, dispatch] = useReducer(gachaReducer, initialState);
```

### 3. パフォーマンス最適化

#### React.memo使用
```typescript
const ParrotIcon = React.memo(({ imageUrl, name, obtained }) => {
  return (
    <Image
      src={imageUrl}
      alt={name}
      style={{ opacity: obtained ? 1 : 0.3 }}
    />
  );
});
```

#### useCallback使用
```typescript
const handleParrotSelect = useCallback((parrotId: string) => {
  setSelectedParrots(prev => [...prev, parrotId]);
}, []);
```

### 4. エラーハンドリング

#### エラーバウンダリ
```typescript
class ComponentErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <ErrorFallback />;
    }
    return this.props.children;
  }
}
```

#### 非同期エラー処理
```typescript
const fetchData = async () => {
  try {
    const data = await apiCall();
    setData(data);
  } catch (error) {
    setError(error.message);
    console.error('API Error:', error);
  }
};
```

### 5. アクセシビリティ

#### ARIA属性
```typescript
<button
  aria-label="パロット選択"
  aria-expanded={isOpen}
  aria-controls="parrot-list"
  role="button"
  onClick={handleToggle}
>
  選択
</button>
```

#### キーボードナビゲーション
```typescript
const handleKeyDown = (e: KeyboardEvent) => {
  switch (e.key) {
    case 'Escape':
      onClose();
      break;
    case 'ArrowRight':
      nextItem();
      break;
    case 'ArrowLeft':
      prevItem();
      break;
  }
};
```

---

## 保守・拡張ガイドライン

### 1. 新しいコンポーネント作成時

1. **型定義を最初に作成**
2. **Props interfaceを明確に定義**
3. **アクセシビリティを考慮**
4. **エラーハンドリングを実装**
5. **テストケースを作成**

### 2. 既存コンポーネント修正時

1. **型安全性を維持**
2. **Props変更時は破壊的変更を避ける**
3. **パフォーマンスへの影響を確認**
4. **関連コンポーネントの動作確認**

### 3. 技術的負債の管理

1. **定期的なリファクタリング**
2. **未使用コードの削除**
3. **型定義の最適化**
4. **パフォーマンスボトルネックの特定**

---

この仕様書は、ParrotDiaryのコンポーネント設計を理解し、効率的な開発・保守を行うための完全なリファレンスとして作成されています。