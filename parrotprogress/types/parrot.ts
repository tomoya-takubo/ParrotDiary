// src/types/parrot.ts
export type Rarity = {
  rarity_id: string;
  name: string;
  drop_rate: number;
  display_order: number;
  color_code: string;
}

export type Category = {
  category_id: number;
  code: 'GACHA' | 'ACHIEVEMENT';
  name: string;
  description: string | null;
}

export type Parrot = {
  parrot_id: number;
  name: string;
  rarity_id: number;
  category_id: number;
  description: string | null;
  image_path: string;
}

export type UserParrot = {
  user_id: number;
  parrot_id: number;
  obtained_at: string;
  obtain_count: number;
}