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
  id: number;
  name: string;
  category_id: number; 
  rarity_id: number;
  description: string | null;
  image_url: string;
}

export type UserParrot = {
  user_id: number;
  parrot_id: number;
  obtained_at: string;
  obtain_count: number;
}