# ParrotDiary API仕様書

## 概要

ParrotDiaryは、Supabase（PostgreSQL）をバックエンドとするNext.js 15アプリケーションです。認証にはSupabase Auth、データベース操作にはSupabase Clientを使用しています。

## 目次

1. [API エンドポイント](#api-エンドポイント)
2. [データベース構造](#データベース構造)
3. [認証システム](#認証システム)
4. [データベース関数](#データベース関数)
5. [ユーティリティ関数](#ユーティリティ関数)
6. [エラーハンドリング](#エラーハンドリング)

---

## API エンドポイント

### 1. GET /api/parrots

パブリックディレクトリからパロット画像を取得します。

**エンドポイント**: `GET /api/parrots`

**レスポンス**:
```json
{
  "parrots": [
    {
      "src": "/images/parrots/parrot1.gif",
      "alt": "PartyParrot 1"
    },
    {
      "src": "/images/parrots/parrot2.gif", 
      "alt": "PartyParrot 2"
    }
  ]
}
```

**実装詳細**:
- ファイルシステムスキャンでGIFファイルを再帰的に検索
- 画像ファイルの存在確認とメタデータ取得
- レスポンスキャッシュなし（動的コンテンツ）

---

### 2. GET /app/auth/callback

OAuth認証コールバックを処理します。

**エンドポイント**: `GET /app/auth/callback`

**クエリパラメータ**:
- `code`: 認証コード（Supabase Auth提供）
- `state`: CSRF保護用状態パラメータ

**処理フロー**:
1. 認証コードをセッションに交換
2. ユーザー情報の取得・検証
3. ダッシュボードへのリダイレクト

**エラーレスポンス**:
```json
{
  "error": "Authentication failed",
  "message": "Invalid authorization code"
}
```

---

## データベース構造

### テーブル一覧

| テーブル名 | 説明 |
|-----------|------|
| `users` | ユーザーアカウント情報 |
| `diary_entries` | 日記エントリー |
| `diary_parrot_icons` | 日記とパロットの関連 |
| `gacha_history` | ガチャ履歴 |
| `gacha_tickets` | ガチャチケット |
| `parrots` | パロットマスターデータ |
| `rarity` | レアリティ分類 |
| `tag_usage_histories` | タグ使用履歴 |
| `tags` | タグマスターデータ |
| `user_experience` | ユーザーXP管理 |
| `user_parrots` | ユーザー所有パロット |
| `user_parrots_tags` | ユーザーパロットタグ |
| `user_streaks` | ログイン連続記録 |

### 主要テーブル詳細

#### users テーブル
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### diary_entries テーブル
```sql
CREATE TABLE diary_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    title TEXT NOT NULL,
    content_line1 TEXT,
    content_line2 TEXT,
    content_line3 TEXT,
    entry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### parrots テーブル
```sql
CREATE TABLE parrots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    image_url TEXT NOT NULL,
    rarity_id UUID REFERENCES rarity(id),
    display_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

---

## 認証システム

### Supabase Auth統合

ParrotDiaryは、Supabase Authを使用した包括的な認証システムを提供します。

#### 認証フロー

1. **サインアップ**
   ```typescript
   const { data, error } = await supabase.auth.signUp({
     email: email,
     password: password,
     options: {
       data: {
         name: name
       }
     }
   });
   ```

2. **サインイン**
   ```typescript
   const { data, error } = await supabase.auth.signInWithPassword({
     email: email,
     password: password
   });
   ```

3. **パスワードリセット**
   ```typescript
   const { error } = await supabase.auth.resetPasswordForEmail(email, {
     redirectTo: `${window.location.origin}/auth/reset-password`
   });
   ```

#### セッション管理

- **セッション永続化**: ローカルストレージを使用
- **自動更新**: トークンの自動リフレッシュ
- **セッション状態**: リアルタイムでの状態監視

#### ルート保護

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // パブリックルート
  const publicRoutes = ['/', '/login', '/signup', '/auth'];
  
  // 認証が必要なルート
  const protectedRoutes = ['/dashboard', '/collection', '/diary'];
  
  // 認証状態に基づくリダイレクト処理
}
```

---

## データベース関数

### DiaryService

#### getUserDiaryEntries
```typescript
async function getUserDiaryEntries(userId: string, limit: number = 10): Promise<DiaryEntry[]>
```

**説明**: ユーザーの日記エントリーを取得（タグ付き）

**クエリ例**:
```sql
SELECT 
    de.*,
    array_agg(t.name) as tags
FROM diary_entries de
LEFT JOIN tag_usage_histories tuh ON de.id = tuh.entry_id
LEFT JOIN tags t ON tuh.tag_id = t.id
WHERE de.user_id = $1
GROUP BY de.id
ORDER BY de.entry_date DESC
LIMIT $2;
```

#### getUserTags
```typescript
async function getUserTags(userId: string): Promise<TagWithCount[]>
```

**説明**: ユーザーのタグ使用統計を取得

**戻り値**:
```typescript
interface TagWithCount {
  id: string;
  name: string;
  count: number;
}
```

#### deleteEntry
```typescript
async function deleteEntry(entryId: string): Promise<void>
```

**説明**: 日記エントリーと関連データを削除

**処理内容**:
1. パロットアイコンの削除
2. タグ使用履歴の削除
3. エントリー本体の削除

---

### Streak管理

#### updateLoginStreak
```typescript
async function updateLoginStreak(userId: string): Promise<StreakData>
```

**説明**: ログイン連続記録を更新

**ロジック**:
1. 最終ログイン日の確認
2. 連続日数の計算
3. 最高記録の更新

#### getStreakData
```typescript
async function getStreakData(userId: string): Promise<StreakData>
```

**説明**: 現在の連続記録データを取得

**戻り値**:
```typescript
interface StreakData {
  currentStreak: number;
  maxStreak: number;
  lastLoginDate: string;
  level: number;
  rank: string;
}
```

---

## ユーティリティ関数

### 日付処理

#### formatDateToJST
```typescript
function formatDateToJST(date: Date): string
```

**説明**: 日付をJST形式（YYYY-MM-DD）に変換

**実装**:
```typescript
function formatDateToJST(date: Date): string {
  const utcDate = new Date(date.getTime() + (date.getTimezoneOffset() * 60000));
  const jstDate = new Date(utcDate.getTime() + (9 * 60 * 60 * 1000));
  return jstDate.toISOString().split('T')[0];
}
```

### バリデーション

#### validatePasswordStrength
```typescript
function validatePasswordStrength(password: string): ValidationResult
```

**バリデーション条件**:
- 8文字以上
- 英大文字を含む
- 英小文字を含む
- 数字を含む

#### validateEmailFormat
```typescript
function validateEmailFormat(email: string): boolean
```

**バリデーション**:
- RFC 5322準拠の正規表現
- 長さ制限（320文字以下）

---

## エラーハンドリング

### 標準エラー形式

```typescript
interface APIError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}
```

### エラーカテゴリ

#### 認証エラー
```typescript
{
  error: "AUTH_ERROR",
  message: "Invalid credentials",
  code: "INVALID_LOGIN"
}
```

#### データベースエラー
```typescript
{
  error: "DATABASE_ERROR", 
  message: "Failed to insert diary entry",
  code: "CONSTRAINT_VIOLATION"
}
```

#### バリデーションエラー
```typescript
{
  error: "VALIDATION_ERROR",
  message: "Invalid email format",
  code: "INVALID_EMAIL"
}
```

---

## セキュリティ

### Row Level Security (RLS)

全テーブルでRLSを有効化し、ユーザー固有データへのアクセスを制限：

```sql
-- 日記エントリーのRLS例
CREATE POLICY "Users can view their own diary entries" ON diary_entries
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own diary entries" ON diary_entries
FOR INSERT WITH CHECK (auth.uid() = user_id);
```

### データ暗号化

- **保存時暗号化**: Supabaseによる自動暗号化
- **転送時暗号化**: HTTPS/TLS 1.3
- **認証トークン**: JWT形式でセキュア

---

## パフォーマンス

### インデックス戦略

```sql
-- 頻繁に使用されるクエリ用のインデックス
CREATE INDEX idx_diary_entries_user_date ON diary_entries(user_id, entry_date DESC);
CREATE INDEX idx_user_parrots_user_obtained ON user_parrots(user_id, obtained_at DESC);
CREATE INDEX idx_tag_usage_entry_id ON tag_usage_histories(entry_id);
```

### クエリ最適化

- **複合インデックス**: 複数カラムでの検索最適化
- **部分インデックス**: 条件付きインデックス
- **クエリプランナー**: PostgreSQLの最適化機能活用

---

## 使用例

### 日記エントリーの作成

```typescript
// 日記エントリーの作成
const createDiaryEntry = async (entry: DiaryEntryInput) => {
  const { data, error } = await supabase
    .from('diary_entries')
    .insert({
      user_id: entry.userId,
      title: entry.title,
      content_line1: entry.contentLine1,
      content_line2: entry.contentLine2,
      content_line3: entry.contentLine3,
      entry_date: entry.date
    })
    .select()
    .single();
    
  if (error) {
    throw new Error(`Failed to create diary entry: ${error.message}`);
  }
  
  return data;
};
```

### パロットコレクションの取得

```typescript
// ユーザーのパロットコレクション取得
const getUserParrots = async (userId: string) => {
  const { data, error } = await supabase
    .from('parrots')
    .select(`
      *,
      rarity:rarity_id(*),
      user_parrots!inner(
        obtained_at,
        user_id
      )
    `)
    .eq('user_parrots.user_id', userId)
    .order('display_order');
    
  if (error) {
    throw new Error(`Failed to fetch user parrots: ${error.message}`);
  }
  
  return data;
};
```

---

## 環境変数

### 必須環境変数

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 開発環境用

```env
NODE_ENV=development
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## API制限事項

### レート制限

- **認証API**: 10req/min per IP
- **データベースAPI**: 100req/min per user
- **ファイルアップロード**: 5MB/file, 10files/min

### データサイズ制限

- **日記エントリー**: 各行500文字まで
- **タグ名**: 50文字まで
- **ユーザー名**: 100文字まで

---

この仕様書は、ParrotDiaryの技術的実装を理解し、保守・拡張作業を行うための包括的なリファレンスとして作成されています。