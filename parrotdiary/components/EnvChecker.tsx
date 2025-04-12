// components/EnvChecker.tsx
'use client';

export default function EnvChecker() {
  return (
    <div style={{ padding: '1rem', background: '#f0f0f0', margin: '1rem' }}>
      <h3>環境変数チェック</h3>
      <p>SUPABASE_URL: {process.env.NEXT_PUBLIC_SUPABASE_URL ? '設定済み' : '未設定'}</p>
      <p>ANON_KEY: {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '設定済み' : '未設定'}</p>
    </div>
  );
}