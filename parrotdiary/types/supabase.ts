export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      diary_entries: {
        Row: {
          created_at: string
          entry_id: string
          line1: string
          line2: string | null
          line3: string | null
          recorded_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          entry_id?: string
          line1: string
          line2?: string | null
          line3?: string | null
          recorded_at: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          entry_id?: string
          line1?: string
          line2?: string | null
          line3?: string | null
          recorded_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diary_entries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      diary_parrot_icons: {
        Row: {
          created_at: string | null
          entry_id: string
          icon_id: string
          parrot_id: string | null
          position: number | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          entry_id: string
          icon_id?: string
          parrot_id?: string | null
          position?: number | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          entry_id?: string
          icon_id?: string
          parrot_id?: string | null
          position?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diary_parrot_icons_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "diary_parrot_icons_parrot_id_fkey"
            columns: ["parrot_id"]
            isOneToOne: false
            referencedRelation: "parrots"
            referencedColumns: ["parrot_id"]
          },
          {
            foreignKeyName: "diary_parrot_icons_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gacha_history: {
        Row: {
          executed_at: string
          gacha_id: string
          parrot_id: string | null
          user_id: string | null
        }
        Insert: {
          executed_at?: string
          gacha_id?: string
          parrot_id?: string | null
          user_id?: string | null
        }
        Update: {
          executed_at?: string
          gacha_id?: string
          parrot_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "gacha_history_parrot_id_fkey"
            columns: ["parrot_id"]
            isOneToOne: false
            referencedRelation: "parrots"
            referencedColumns: ["parrot_id"]
          },
          {
            foreignKeyName: "last_updated_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      gacha_tickets: {
        Row: {
          last_updated: string
          ticket_count: number
          user_id: string
        }
        Insert: {
          last_updated?: string
          ticket_count?: number
          user_id: string
        }
        Update: {
          last_updated?: string
          ticket_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gacha_tickets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      parrots: {
        Row: {
          description: string | null
          display_order: number | null
          image_url: string
          name: string
          parrot_id: string
          rarity_id: string | null
        }
        Insert: {
          description?: string | null
          display_order?: number | null
          image_url: string
          name: string
          parrot_id?: string
          rarity_id?: string | null
        }
        Update: {
          description?: string | null
          display_order?: number | null
          image_url?: string
          name?: string
          parrot_id?: string
          rarity_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "parrots_rarity_id_fkey"
            columns: ["rarity_id"]
            isOneToOne: false
            referencedRelation: "rarity"
            referencedColumns: ["rarity_id"]
          },
        ]
      }
      rarity: {
        Row: {
          abbreviation: string | null
          display_order: number | null
          name: string
          rarity_id: string
        }
        Insert: {
          abbreviation?: string | null
          display_order?: number | null
          name: string
          rarity_id?: string
        }
        Update: {
          abbreviation?: string | null
          display_order?: number | null
          name?: string
          rarity_id?: string
        }
        Relationships: []
      }
      tag_usage_histories: {
        Row: {
          entry_id: string | null
          history_id: string
          tag_id: string | null
          used_at: string
          user_id: string | null
        }
        Insert: {
          entry_id?: string | null
          history_id?: string
          tag_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Update: {
          entry_id?: string | null
          history_id?: string
          tag_id?: string | null
          used_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tag_usage_histories_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "diary_entries"
            referencedColumns: ["entry_id"]
          },
          {
            foreignKeyName: "tag_usage_histories_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["tag_id"]
          },
          {
            foreignKeyName: "tag_usage_histories_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          created_at: string
          created_by: string | null
          last_used_at: string | null
          name: string
          tag_id: string
          usage_count: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          last_used_at?: string | null
          name: string
          tag_id?: string
          usage_count?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          last_used_at?: string | null
          name?: string
          tag_id?: string
          usage_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "tags_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_experience: {
        Row: {
          action_type: string
          earned_at: string
          id: number
          user_id: string | null
          xp_amount: number
        }
        Insert: {
          action_type: string
          earned_at?: string
          id?: number
          user_id?: string | null
          xp_amount: number
        }
        Update: {
          action_type?: string
          earned_at?: string
          id?: number
          user_id?: string | null
          xp_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "user_experience_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_parrots: {
        Row: {
          obtain_count: number
          obtained_at: string
          parrot_id: string
          user_id: string
        }
        Insert: {
          obtain_count?: number
          obtained_at?: string
          parrot_id: string
          user_id: string
        }
        Update: {
          obtain_count?: number
          obtained_at?: string
          parrot_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_parrots_parrot_id_fkey"
            columns: ["parrot_id"]
            isOneToOne: false
            referencedRelation: "parrots"
            referencedColumns: ["parrot_id"]
          },
          {
            foreignKeyName: "user_parrots_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_parrots_tags: {
        Row: {
          entry_id: string
          executed_at: string
          parrot_id: string
          parrot_tag_name: string
          user_id: string
        }
        Insert: {
          entry_id?: string
          executed_at: string
          parrot_id: string
          parrot_tag_name: string
          user_id: string
        }
        Update: {
          entry_id?: string
          executed_at?: string
          parrot_id?: string
          parrot_tag_name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_parrots_tags_parrot_id_fkey"
            columns: ["parrot_id"]
            isOneToOne: false
            referencedRelation: "parrots"
            referencedColumns: ["parrot_id"]
          },
          {
            foreignKeyName: "user_parrots_tags_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      user_streaks: {
        Row: {
          created_at: string
          id: number
          last_login_date: string
          login_max_streak: number
          login_streak_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: number
          last_login_date: string
          login_max_streak?: number
          login_streak_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: number
          last_login_date?: string
          login_max_streak?: number
          login_streak_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string
          email: string
          id: string
          last_login_at: string | null
          level: number
          password_hash: string
          total_xp: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          last_login_at?: string | null
          level?: number
          password_hash: string
          total_xp?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          last_login_at?: string | null
          level?: number
          password_hash?: string
          total_xp?: number
          updated_at?: string
        }
        Relationships: []
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
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
