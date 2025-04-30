// components/EnvChecker.tsx
'use client';

//#region 型定義
type EnvStatus = {
  name: string;
  value: string | undefined;
};
//#endregion

/**
 * 環境変数チェックコンポーネント
 * 
 * アプリケーションの重要な環境変数が正しく設定されているかを確認し表示するコンポーネント。
 * 開発環境やデバッグ時に、環境変数の設定状態を簡単に確認することができます。
 * 
 * @returns React コンポーネント
 */
export default function EnvChecker() {
  //#region 環境変数の状態確認
  const envVariables: EnvStatus[] = [
    {
      name: 'SUPABASE_URL',
      value: process.env.NEXT_PUBLIC_SUPABASE_URL
    },
    {
      name: 'ANON_KEY',
      value: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    }
  ];
  //#endregion

  //#region ステータス判定ヘルパー関数
  /**
   * 環境変数の設定状態を文字列で返す
   * @param value - 環境変数の値
   * @returns '設定済み' または '未設定'
   */
  const getStatusText = (value: string | undefined): string => {
    return value ? '設定済み' : '未設定';
  };
  //#endregion

  //#region レンダリング
  return (
    <div style={{ 
      padding: '1rem', 
      background: '#f0f0f0', 
      margin: '1rem',
      borderRadius: '4px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
    }}>
      <h3 style={{ marginTop: 0 }}>環境変数チェック</h3>
      {envVariables.map((env, index) => (
        <p key={index}>
          {env.name}: <span style={{ 
            color: env.value ? 'green' : 'red',
            fontWeight: 'bold'
          }}>
            {getStatusText(env.value)}
          </span>
        </p>
      ))}
    </div>
  );
  //#endregion
}