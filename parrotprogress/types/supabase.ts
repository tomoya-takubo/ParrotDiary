// types/supabase.ts
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          password_hash: string
          last_login_at: string | null
          total_xp: number
          level: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string  // UUIDは自動生成されるのでオプショナル
          email: string
          password_hash: string
          last_login_at?: string | null
          total_xp?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          password_hash?: string
          last_login_at?: string | null
          total_xp?: number
          level?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_sessions: {
        Row: {
          id: string
          user_id: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          user_id?: string
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_sessions_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      password_reset_tokens: {
        Row: {
          id: string
          user_id: string
          token: string
          created_at: string
          expires_at: string
        }
        Insert: {
          id?: string
          user_id: string
          token: string
          created_at?: string
          expires_at: string
        }
        Update: {
          id?: string
          user_id?: string
          token?: string
          created_at?: string
          expires_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_tokens_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_streaks: {
        Row: {
          id: string
          user_id: string
          streak_count: number
          last_activity_at: string
        }
        Insert: {
          id?: string
          user_id: string
          streak_count?: number
          last_activity_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          streak_count?: number
          last_activity_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_daily_activities: {
        Row: {
          id: string
          user_id: string
          activity_date: string
          activity_type: string
        }
        Insert: {
          id?: string
          user_id: string
          activity_date: string
          activity_type: string
        }
        Update: {
          id?: string
          user_id?: string
          activity_date?: string
          activity_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_daily_activities_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      user_experience: {
        Row: {
          id: string
          user_id: string
          xp_total: number
          level: number
        }
        Insert: {
          id?: string
          user_id: string
          xp_total?: number
          level?: number
        }
        Update: {
          id?: string
          user_id?: string
          xp_total?: number
          level?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_experience_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      gacha_tickets: {
        Row: {
          user_id: string
          ticket_count: number
          last_updated: string
        }
        Insert: {
          user_id: string
          ticket_count?: number
          last_updated?: string
        }
        Update: {
          user_id?: string
          ticket_count?: number
          last_updated?: string
        }
        Relationships: [
          {
            foreignKeyName: "gacha_tickets_user_id_fkey"
            columns: ["user_id"]
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}