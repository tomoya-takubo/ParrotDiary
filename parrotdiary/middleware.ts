// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// 認証不要のパス一覧（パブリックルート）
const publicRoutes = [
  '/login',
  '/signup',
  '/auth/callback',
  '/auth/reset-password',
  // 他の認証不要のパスがあればここに追加
];

export async function middleware(request: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req: request, res });
  
  // セッションを取得
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  
  // 現在のパスがパブリックルートかどうかチェック
  const isPublicRoute = publicRoutes.some(route => 
    pathname === route || pathname.startsWith(route + '/')
  );
  
  // ランディングページ（ホーム）の特別処理
  const isLandingPage = pathname === '/';
  
  // ユーザーが認証されていない場合
  if (!session) {
    // ダッシュボードや他の保護されたルートへのアクセスをブロック
    if (!isPublicRoute && !isLandingPage) {
      return NextResponse.redirect(new URL('/', request.url));
    }
    
    // 認証されていないユーザーがホームページの「はじめる」を押した場合は処理なし
    // （クライアント側でログインモーダルを表示）
    return res;
  }
  
  // ユーザーが認証済みの場合
  if (session) {
    // ログイン済みユーザーがランディングページのボタンを押した場合は
    // そのままダッシュボードにリダイレクト
    if (isLandingPage) {
      // ここは現在の実装どおり
      return res;
    }
    
    // ログイン済みユーザーがログインページなどにアクセスした場合は
    // ダッシュボードにリダイレクト
    if (publicRoutes.some(route => pathname === route)) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return res;
}

// すべてのルートにミドルウェアを適用
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/|images/).*)'],
};