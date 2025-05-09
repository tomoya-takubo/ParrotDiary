# ParrotDiary 仕様概要書

## 1. サービス概要

**サービス名**：ParrotDiary（ぱろっとだいありー）\
**ジャンル**：感情日記アプリ × ゲーミフィケーション\
**開発期間**：約3ヶ月（週15時間）\
**デプロイURL**：[https://parrot-diary.vercel.app/](https://parrot-diary.vercel.app/)\
**お試しアカウント**：[test@example.com](mailto\:test@example.com) / パスワード: Testuser01

## 2. コンセプト

**気軽に続ける、“感情日記”という新習慣**

感情の可視化と日々の記録を楽しく継続できるように設計された、全年齢向けの自己理解支援アプリです。

## 3. 解決する課題

- 毎日を振り返りたいけど、日記が続かない
- 書くことに対して心理的ハードルを感じる
- モチベーション維持が難しい

## 4. 提供する主な価値

- 感情のタグ付けによる「自己理解の第一歩」
- ガチャで楽しめる「継続したくなる仕掛け」
- コレクションやヒートマップでの「可視化された達成感」

## 5. 主な機能一覧

- タブレット・スマートフォンからも快適に閲覧・操作可能（レスポンシブ対応）
- ログイン／ログアウト／パスワード再設定
- 3行日記＋感情タグ入力（候補表示あり）
- 日記投稿でガチャチケット取得 → パロットガチャ演出
- 獲得パロットのコレクション表示・日記との紐づけ
- タグによるパロット検索・絞り込み機能
- カレンダー形式の記録可視化（記録密度による濃淡表示）
- 日記の検索・振り返り機能

## 6. 使用技術

- フロントエンド：Next.js / React / TypeScript / Tailwind CSS
- バックエンド（BaaS）：Supabase（PostgreSQLベース）
- デプロイ：Vercel
- UI/UX設計：FigJam / draw\.io
- サポート：ChatGPT, Claude（要件定義・実装補助）

## 7. 非機能要件

- ページロード：2秒以内を目標
- セキュリティ：認証・暗号化・パスワード再設定完備
- モバイル対応：タブレット・スマホでも表示確認済のレスポンシブ対応
- 拡張性：統計表示、公開機能追加も想定
- 保守性：Supabase外部連携を意識した構成

## 8. 開発プロセスと技術的工夫

- **課題管理**：GitHubのIssue機能を活用して、実装中に発生したバグや改善点、追加要望を可視化・管理。優先度や緊急度に応じたタスク管理を行い、進捗を継続的にレビュー。

- **設計**：画面遷移図（FigJam）やER図（draw\.io）を活用し、初期段階から機能同士の関係性を明確化。ユーザーの操作フローとDB構造の整合性を図りました。

- **実装**：SupabaseとNext.jsの非同期処理や認証周りの設計に注力。フォームバリデーションや状態管理など、ユーザー操作のなめらかさを意識して実装しました。

- **改善と検証**：動作検証の中で問題点を発見し、ChatGPTやClaudeを活用して修正方針を整理。問題の切り分け→仮説→修正→再検証のプロセスを意識して開発を進めました。サーバーレスBaaS（Supabase）＋モダンフロント技術を活用した個人開発の実践力

## 9. 技術選択の背景と学び

**Next.js + Supabase**: フルスタック開発を1人で効率的に進めるため

- **学び**: サーバーレスアーキテクチャのトレードオフと最適な設計パターン
- **克服した課題**: 認証フローとデータ整合性の両立、ステート管理の複雑さ
- **今後活かせる知見**: BaaSを活用した迅速な開発手法とセキュアな実装方法

---

## 10. このプロダクトで伝えたいこと

- 「日記＝面倒くさい」という印象を覆すUI/UX設計（ガチャやコレクションの導入）
- 続けることに価値を見出す仕組みと心理的ハードルを下げる工夫（3行＋感情タグ）
- 個人開発ながらもチーム開発を意識した構成設計、バージョン管理、外部ツール活用

---

## 11. 開発ストーリーと得られた学び

- SupabaseのRLSやストレージ機能、BaaSの設計思想に対する理解が深まりました
- ユーザーが「また使いたくなる」ための仕掛けづくりにおいて、視覚化とご褒美の効果の重要性を実感
- AIを活用したプロンプト設計・エラー切り分けにより、問題解決力と学習効率を同時に高める経験が得られました

## 12. 今後の展望

- 統計表示（感情傾向・記録数推移など）
- レスポンシブ完全対応およびアクセシビリティ対応
- 公開・シェア機能（URLでの一部日記共有）
- SupabaseのRLS再導入によるセキュアな運用モデルの確立
- 本プロダクトで得た知見をもとに、教育支援アプリや習慣化ツールへの応用を検討中---

ParrotDiary は、自己理解・継続支援を目的としたユニークな日記アプローチを提案します。
採用・業務への応用可能性などにご興味をお持ちいただけましたら、ぜひご体験・ご連絡ください。
