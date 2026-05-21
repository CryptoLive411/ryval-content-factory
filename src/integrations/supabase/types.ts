export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assets: {
        Row: {
          asset_type: string | null
          created_at: string
          description: string | null
          file_name: string
          file_url: string
          id: string
          tags: string[] | null
          user_id: string
        }
        Insert: {
          asset_type?: string | null
          created_at?: string
          description?: string | null
          file_name: string
          file_url: string
          id?: string
          tags?: string[] | null
          user_id: string
        }
        Update: {
          asset_type?: string | null
          created_at?: string
          description?: string | null
          file_name?: string
          file_url?: string
          id?: string
          tags?: string[] | null
          user_id?: string
        }
        Relationships: []
      }
      performance: {
        Row: {
          comments: number
          created_at: string
          id: string
          likes: number
          link_clicks: number
          notes: string | null
          post_id: string
          profile_visits: number
          saves: number
          shares: number
          signups: number
          user_id: string
          views: number
        }
        Insert: {
          comments?: number
          created_at?: string
          id?: string
          likes?: number
          link_clicks?: number
          notes?: string | null
          post_id: string
          profile_visits?: number
          saves?: number
          shares?: number
          signups?: number
          user_id: string
          views?: number
        }
        Update: {
          comments?: number
          created_at?: string
          id?: string
          likes?: number
          link_clicks?: number
          notes?: string | null
          post_id?: string
          profile_visits?: number
          saves?: number
          shares?: number
          signups?: number
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "performance_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      planner_entries: {
        Row: {
          account: Database["public"]["Enums"]["account"] | null
          created_at: string
          id: string
          notes: string | null
          plan_date: string
          plan_time: string | null
          platform: Database["public"]["Enums"]["platform"] | null
          post_id: string | null
          status: Database["public"]["Enums"]["post_status"]
          user_id: string
        }
        Insert: {
          account?: Database["public"]["Enums"]["account"] | null
          created_at?: string
          id?: string
          notes?: string | null
          plan_date: string
          plan_time?: string | null
          platform?: Database["public"]["Enums"]["platform"] | null
          post_id?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          user_id: string
        }
        Update: {
          account?: Database["public"]["Enums"]["account"] | null
          created_at?: string
          id?: string
          notes?: string | null
          plan_date?: string
          plan_time?: string | null
          platform?: Database["public"]["Enums"]["platform"] | null
          post_id?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "planner_entries_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          account: Database["public"]["Enums"]["account"] | null
          app_screen_url: string | null
          asset_id: string | null
          audience: Database["public"]["Enums"]["audience"] | null
          bg_image_url: string | null
          bg_images: string[]
          caption: string | null
          category: Database["public"]["Enums"]["category"] | null
          created_at: string
          cta: string | null
          cta_type: string | null
          hashtags: string | null
          hook: string
          id: string
          is_winner: boolean
          logo_url: string | null
          notes: string | null
          platform: Database["public"]["Enums"]["platform"] | null
          scheduled_date: string | null
          slide_2: string | null
          slide_3: string | null
          slide_4: string | null
          slide_5: string | null
          slide_6: string | null
          status: Database["public"]["Enums"]["post_status"]
          template_id: string | null
          tone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          account?: Database["public"]["Enums"]["account"] | null
          app_screen_url?: string | null
          asset_id?: string | null
          audience?: Database["public"]["Enums"]["audience"] | null
          bg_image_url?: string | null
          bg_images?: string[]
          caption?: string | null
          category?: Database["public"]["Enums"]["category"] | null
          created_at?: string
          cta?: string | null
          cta_type?: string | null
          hashtags?: string | null
          hook?: string
          id?: string
          is_winner?: boolean
          logo_url?: string | null
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform"] | null
          scheduled_date?: string | null
          slide_2?: string | null
          slide_3?: string | null
          slide_4?: string | null
          slide_5?: string | null
          slide_6?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          template_id?: string | null
          tone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          account?: Database["public"]["Enums"]["account"] | null
          app_screen_url?: string | null
          asset_id?: string | null
          audience?: Database["public"]["Enums"]["audience"] | null
          bg_image_url?: string | null
          bg_images?: string[]
          caption?: string | null
          category?: Database["public"]["Enums"]["category"] | null
          created_at?: string
          cta?: string | null
          cta_type?: string | null
          hashtags?: string | null
          hook?: string
          id?: string
          is_winner?: boolean
          logo_url?: string | null
          notes?: string | null
          platform?: Database["public"]["Enums"]["platform"] | null
          scheduled_date?: string | null
          slide_2?: string | null
          slide_3?: string | null
          slide_4?: string | null
          slide_5?: string | null
          slide_6?: string | null
          status?: Database["public"]["Enums"]["post_status"]
          template_id?: string | null
          tone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prompt_templates: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          prompt_text: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          prompt_text: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          prompt_text?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      templates: {
        Row: {
          accent_color: string
          background_style: string
          created_at: string
          cta_style: string
          font_style: string
          id: string
          logo_position: string
          template_name: string
          user_id: string
        }
        Insert: {
          accent_color?: string
          background_style?: string
          created_at?: string
          cta_style?: string
          font_style?: string
          id?: string
          logo_position?: string
          template_name: string
          user_id: string
        }
        Update: {
          accent_color?: string
          background_style?: string
          created_at?: string
          cta_style?: string
          font_style?: string
          id?: string
          logo_position?: string
          template_name?: string
          user_id?: string
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
      account: "ryval_main" | "recruiting_truth" | "global_pathway" | "founder"
      audience:
        | "players"
        | "parents"
        | "coaches"
        | "academies"
        | "international"
      category:
        | "harsh_truths"
        | "highlight_tips"
        | "coach_pov"
        | "parent_education"
        | "international_pathway"
        | "soft_pitch"
        | "launch_countdown"
        | "product_feature"
        | "educational"
        | "pain_point"
      platform: "tiktok" | "instagram" | "youtube_shorts" | "linkedin"
      post_status:
        | "idea"
        | "drafted"
        | "needs_edit"
        | "approved"
        | "designed"
        | "scheduled"
        | "posted"
        | "winner"
        | "reuse_later"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account: ["ryval_main", "recruiting_truth", "global_pathway", "founder"],
      audience: ["players", "parents", "coaches", "academies", "international"],
      category: [
        "harsh_truths",
        "highlight_tips",
        "coach_pov",
        "parent_education",
        "international_pathway",
        "soft_pitch",
        "launch_countdown",
        "product_feature",
        "educational",
        "pain_point",
      ],
      platform: ["tiktok", "instagram", "youtube_shorts", "linkedin"],
      post_status: [
        "idea",
        "drafted",
        "needs_edit",
        "approved",
        "designed",
        "scheduled",
        "posted",
        "winner",
        "reuse_later",
      ],
    },
  },
} as const
