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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      assortment_data: {
        Row: {
          category_mix_pct: number | null
          channel: string
          created_at: string
          id: string
          market_share_pct: number | null
          product_id: string
          recommendation: string | null
          revenue: number
          revenue_growth_pct: number | null
          units_sold: number | null
        }
        Insert: {
          category_mix_pct?: number | null
          channel: string
          created_at?: string
          id?: string
          market_share_pct?: number | null
          product_id: string
          recommendation?: string | null
          revenue: number
          revenue_growth_pct?: number | null
          units_sold?: number | null
        }
        Update: {
          category_mix_pct?: number | null
          channel?: string
          created_at?: string
          id?: string
          market_share_pct?: number | null
          product_id?: string
          recommendation?: string | null
          revenue?: number
          revenue_growth_pct?: number | null
          units_sold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assortment_data_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      demand_forecasts: {
        Row: {
          actual_demand: number | null
          created_at: string
          forecast_date: string
          id: string
          is_forecast: boolean
          predicted_demand: number
          product_id: string
          seasonality_index: number | null
          trend_component: number | null
        }
        Insert: {
          actual_demand?: number | null
          created_at?: string
          forecast_date: string
          id?: string
          is_forecast?: boolean
          predicted_demand: number
          product_id: string
          seasonality_index?: number | null
          trend_component?: number | null
        }
        Update: {
          actual_demand?: number | null
          created_at?: string
          forecast_date?: string
          id?: string
          is_forecast?: boolean
          predicted_demand?: number
          product_id?: string
          seasonality_index?: number | null
          trend_component?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "demand_forecasts_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      pricing_records: {
        Row: {
          competitor_price: number | null
          created_at: string
          effective_date: string
          id: string
          margin_pct: number | null
          price: number
          price_index: number | null
          product_id: string
          region: string
          revenue: number | null
          units_sold: number | null
        }
        Insert: {
          competitor_price?: number | null
          created_at?: string
          effective_date: string
          id?: string
          margin_pct?: number | null
          price: number
          price_index?: number | null
          product_id: string
          region?: string
          revenue?: number | null
          units_sold?: number | null
        }
        Update: {
          competitor_price?: number | null
          created_at?: string
          effective_date?: string
          id?: string
          margin_pct?: number | null
          price?: number
          price_index?: number | null
          product_id?: string
          region?: string
          revenue?: number | null
          units_sold?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pricing_records_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string
          channel: string
          competitor_price: number | null
          created_at: string
          current_price: number
          id: string
          margin_pct: number | null
          name: string
          price_elasticity: number | null
          recommended_price: number | null
          region: string
          status: string
          subcategory: string | null
          unit_cost: number
        }
        Insert: {
          category: string
          channel?: string
          competitor_price?: number | null
          created_at?: string
          current_price: number
          id?: string
          margin_pct?: number | null
          name: string
          price_elasticity?: number | null
          recommended_price?: number | null
          region?: string
          status?: string
          subcategory?: string | null
          unit_cost: number
        }
        Update: {
          category?: string
          channel?: string
          competitor_price?: number | null
          created_at?: string
          current_price?: number
          id?: string
          margin_pct?: number | null
          name?: string
          price_elasticity?: number | null
          recommended_price?: number | null
          region?: string
          status?: string
          subcategory?: string | null
          unit_cost?: number
        }
        Relationships: []
      }
      promotions: {
        Row: {
          cannibalization_pct: number | null
          channel: string
          created_at: string
          discount_pct: number
          duration_days: number
          end_date: string
          id: string
          name: string
          product_id: string
          revenue_lift_pct: number | null
          roi: number | null
          start_date: string
          status: string
        }
        Insert: {
          cannibalization_pct?: number | null
          channel?: string
          created_at?: string
          discount_pct: number
          duration_days?: number
          end_date: string
          id?: string
          name: string
          product_id: string
          revenue_lift_pct?: number | null
          roi?: number | null
          start_date: string
          status?: string
        }
        Update: {
          cannibalization_pct?: number | null
          channel?: string
          created_at?: string
          discount_pct?: number
          duration_days?: number
          end_date?: string
          id?: string
          name?: string
          product_id?: string
          revenue_lift_pct?: number | null
          roi?: number | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_authenticated_user: { Args: never; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
