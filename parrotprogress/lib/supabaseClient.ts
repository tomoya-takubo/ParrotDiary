import { createClient } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

// 環境変数からSupabaseの設定を取得
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

// Supabaseクライアントを作成
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
