# 🦜 ぱろっとだいありー

**PartyParrotと一緒に楽しく継続！**

ぱろっとだいありーは、3行日記とPartyParrotガチャを通じて継続習慣を楽しく身に着けるWebアプリケーションです。

## ✨ 主な機能

### 📝 3行日記
- シンプルな3行形式で日記を記録
- 活動履歴カレンダーで過去の記録を確認
- タグ機能で日記を分類・検索
- PartyParrotスタンプで日記をデコレーション

### 🎲 PartyParrotガチャ
- 日記を書いてチケットを獲得
- 様々なレアリティのPartyParrotをコレクション
- 獲得したPartyParrotは日記にスタンプとして使用可能

### 📊 進捗管理
- レベルシステム（経験値とレベルアップ）
- 連続ログイン記録とランクシステム
- 統計情報の可視化

### 🌍 社会貢献
- カカポ（PartyParrotのモデル）保護活動への貢献
- 継続的な活動が環境保護に繋がる仕組み

## 🛠️ 技術スタック

### フロントエンド
- **Next.js 15** - React フレームワーク
- **TypeScript** - 型安全性
- **Tailwind CSS** - スタイリング
- **Lucide React** - アイコン
- **Framer Motion** - アニメーション

### バックエンド
- **Supabase** - データベース・認証
- **PostgreSQL** - データベース
- **Row Level Security** - セキュリティ

### 開発環境
- **ESLint** - コード品質
- **Jest** - テスト
- **Turbopack** - 高速ビルド

## 🚀 開発環境のセットアップ

### 前提条件
- Node.js 18.0.0以上
- npm または yarn
- Supabaseプロジェクト

### 1. リポジトリのクローン
```bash
git clone <repository-url>
cd parrotdiary
```

### 2. 依存関係のインストール
```bash
npm install
# または
yarn install
```

### 3. 環境変数の設定
`.env.local`ファイルを作成し、以下を設定：
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. データベースの設定
1. Supabaseプロジェクトを作成
2. データベーススキーマを設定
3. Row Level Security (RLS) を有効化

### 5. 開発サーバーの起動
```bash
npm run dev
# または
yarn dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリケーションを確認できます。

## 📁 プロジェクト構造

```
parrotdiary/
├── app/                    # Next.js App Router
│   ├── api/               # API ルート
│   ├── auth/              # 認証関連ページ
│   ├── collection/        # コレクション画面
│   ├── dashboard/         # ダッシュボード
│   ├── diary/             # 日記関連ページ
│   ├── globals.css        # グローバルスタイル
│   ├── layout.tsx         # ルートレイアウト
│   └── page.tsx           # ホームページ
├── components/            # Reactコンポーネント
│   ├── dashboard/         # ダッシュボード関連
│   ├── diary/             # 日記関連
│   ├── AuthModal.tsx      # 認証モーダル
│   ├── StartButton.tsx    # スタートボタン
│   └── ...
├── lib/                   # ライブラリ・ユーティリティ
│   ├── AuthContext.tsx    # 認証コンテキスト
│   ├── RewardContext.tsx  # 報酬コンテキスト
│   ├── supabase.ts        # Supabase クライアント
│   └── validation.ts      # バリデーション
├── types/                 # TypeScript型定義
│   ├── index.ts           # 共通型定義
│   ├── parrot.ts          # パロット関連
│   └── supabase.ts        # Supabase型定義
├── styles/                # スタイル
│   └── Home.module.css    # ホーム画面スタイル
└── public/                # 静的ファイル
    └── images/            # 画像ファイル
```

## 🧪 テスト

```bash
# テストの実行
npm run test
# または
yarn test
```

## 🔧 ビルド

```bash
# プロダクションビルド
npm run build
# または
yarn build

# ビルドしたアプリケーションの起動
npm run start
# または
yarn start
```

## 📋 利用可能なスクリプト

- `npm run dev` - 開発サーバー起動（Turbopack使用）
- `npm run build` - プロダクションビルド
- `npm run start` - プロダクションサーバー起動
- `npm run lint` - ESLintによるコード検証
- `npm run test` - Jestによるテスト実行

## 🎯 主要な機能・画面

### 🏠 ホーム画面
- アプリケーションの紹介
- 機能説明
- ログイン・サインアップ

### 📊 ダッシュボード
- ユーザー統計情報
- レベル・経験値表示
- ガチャ機能
- 活動履歴カレンダー

### 📝 日記機能
- 3行日記の作成・編集
- タグ付け機能
- PartyParrotスタンプ
- 検索機能

### 🎁 コレクション
- 獲得したPartyParrotの一覧
- レアリティ別表示
- 完成度統計

## 🔐 セキュリティ

- Supabase Row Level Security (RLS) による認証
- TypeScriptによる型安全性
- 入力値検証
- XSS対策

## 🌐 デプロイ

### Vercel （推奨）
```bash
# Vercel CLIでデプロイ
npx vercel
```

### その他のプラットフォーム
- Netlify
- AWS Amplify
- 任意のNode.js対応ホスティング

## 🤝 コントリビューション

1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/new-feature`)
3. 変更をコミット (`git commit -am 'Add new feature'`)
4. ブランチをプッシュ (`git push origin feature/new-feature`)
5. プルリクエストを作成

## 📄 ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

## 🙏 謝辞

- [PartyParrot](https://cultofthepartyparrot.com/) - 素晴らしいPartyParrotイメージ
- [Supabase](https://supabase.com/) - オープンソースのFirebase代替
- [Next.js](https://nextjs.org/) - React フレームワーク
- [Tailwind CSS](https://tailwindcss.com/) - ユーティリティファーストCSS

## 📞 サポート

問題や質問がある場合は、GitHubのIssuesで報告してください。

---

**PartyParrotと一緒に楽しく継続しましょう！** 🦜✨