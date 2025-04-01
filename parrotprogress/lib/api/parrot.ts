// src/lib/api/parrot.ts
import { supabase } from '../supabase';
import { UserParrot } from '@/types/parrot';

export const fetchParrotData = async (userId?: string) => {
  // パロット基本データの取得
  const { data: parrots, error: parrotError } = await supabase
    .from('parrots')
    .select(`
      *,
      rarity:rarity_id(*),
      category:category_id(*)
    `);

  if (parrotError) throw parrotError;

  // ユーザーの所持データ取得（ログイン時のみ）
  let userParrots: UserParrot[] = [];
  if (userId) {
    const { data: userParrotData, error: userParrotError } = await supabase
      .from('user_parrots')
      .select('*')
      .eq('user_id', userId);

    if (userParrotError) throw userParrotError;
    userParrots = (userParrotData as unknown as UserParrot[]) || [];
  }

  return { parrots, userParrots };
};

// テストコメント