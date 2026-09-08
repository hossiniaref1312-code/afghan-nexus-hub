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
      ad_orders: {
        Row: {
          activated_at: string | null
          admin_note: string | null
          amount_afn: number
          created_at: string
          expires_at: string | null
          id: string
          listing_id: string
          method: Database["public"]["Enums"]["ad_payment_method"]
          package_id: string
          payer_phone: string | null
          reference: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["ad_order_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          activated_at?: string | null
          admin_note?: string | null
          amount_afn: number
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_id: string
          method: Database["public"]["Enums"]["ad_payment_method"]
          package_id: string
          payer_phone?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ad_order_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          activated_at?: string | null
          admin_note?: string | null
          amount_afn?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          listing_id?: string
          method?: Database["public"]["Enums"]["ad_payment_method"]
          package_id?: string
          payer_phone?: string | null
          reference?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["ad_order_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ad_orders_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ad_orders_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "ad_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      ad_packages: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          duration_days: number
          id: string
          key: string
          name: string
          price_afn: number
          sort_order: number
          tier: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days: number
          id?: string
          key: string
          name: string
          price_afn: number
          sort_order?: number
          tier?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          duration_days?: number
          id?: string
          key?: string
          name?: string
          price_afn?: number
          sort_order?: number
          tier?: string
        }
        Relationships: []
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string
          listing_id: string
          seller_id: string
          updated_at: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id: string
          seller_id: string
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string
          listing_id?: string
          seller_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_contacts: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          listing_id: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          listing_id: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          listing_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_contacts_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          position: number
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          position?: number
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          area_label: string | null
          attributes: Json
          category: Database["public"]["Enums"]["listing_category"]
          created_at: string
          currency: string
          description: string | null
          featured_until: string | null
          id: string
          is_featured: boolean
          price: number | null
          province: string | null
          purpose: Database["public"]["Enums"]["listing_purpose"]
          status: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at: string
          user_id: string
          view_count: number
        }
        Insert: {
          area_label?: string | null
          attributes?: Json
          category: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          currency?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          price?: number | null
          province?: string | null
          purpose?: Database["public"]["Enums"]["listing_purpose"]
          status?: Database["public"]["Enums"]["listing_status"]
          title: string
          updated_at?: string
          user_id: string
          view_count?: number
        }
        Update: {
          area_label?: string | null
          attributes?: Json
          category?: Database["public"]["Enums"]["listing_category"]
          created_at?: string
          currency?: string
          description?: string | null
          featured_until?: string | null
          id?: string
          is_featured?: boolean
          price?: number | null
          province?: string | null
          purpose?: Database["public"]["Enums"]["listing_purpose"]
          status?: Database["public"]["Enums"]["listing_status"]
          title?: string
          updated_at?: string
          user_id?: string
          view_count?: number
        }
        Relationships: []
      }
      messages: {
        Row: {
          body: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          city: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          phone: string | null
          preferred_language: string
          province: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          preferred_language?: string
          province?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          city?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string
          province?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      reports: {
        Row: {
          created_at: string
          details: string | null
          id: string
          listing_id: string | null
          reason: string
          reported_user_id: string | null
          reporter_id: string
          status: string
        }
        Insert: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason: string
          reported_user_id?: string | null
          reporter_id: string
          status?: string
        }
        Update: {
          created_at?: string
          details?: string | null
          id?: string
          listing_id?: string | null
          reason?: string
          reported_user_id?: string | null
          reporter_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          product_id: string
          quantity: number
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          product_id: string
          quantity?: number
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          product_id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "shop_carts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_cart_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_carts: {
        Row: {
          created_at: string
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shop_categories: {
        Row: {
          created_at: string
          id: string
          name: string
          shop_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          shop_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          shop_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_categories_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_contacts: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          phone: string | null
          shop_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          phone?: string | null
          shop_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          phone?: string | null
          shop_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_contacts_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: true
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          quantity: number
          title: string
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          quantity: number
          title: string
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          quantity?: number
          title?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "shop_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "shop_products"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_orders: {
        Row: {
          buyer_id: string
          buyer_name: string
          buyer_phone: string
          created_at: string
          currency: string
          id: string
          note: string | null
          payment_method: string
          payment_reference: string | null
          ship_address: string | null
          ship_city: string | null
          ship_province: string | null
          shop_id: string
          status: Database["public"]["Enums"]["shop_order_status"]
          total: number
          updated_at: string
        }
        Insert: {
          buyer_id: string
          buyer_name: string
          buyer_phone: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          payment_method: string
          payment_reference?: string | null
          ship_address?: string | null
          ship_city?: string | null
          ship_province?: string | null
          shop_id: string
          status?: Database["public"]["Enums"]["shop_order_status"]
          total: number
          updated_at?: string
        }
        Update: {
          buyer_id?: string
          buyer_name?: string
          buyer_phone?: string
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          payment_method?: string
          payment_reference?: string | null
          ship_address?: string | null
          ship_city?: string | null
          ship_province?: string | null
          shop_id?: string
          status?: Database["public"]["Enums"]["shop_order_status"]
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_orders_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_products: {
        Row: {
          category_id: string | null
          created_at: string
          currency: string
          description: string | null
          id: string
          image_urls: string[]
          price: number
          shop_id: string
          status: Database["public"]["Enums"]["shop_product_status"]
          stock: number
          title: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          price: number
          shop_id: string
          status?: Database["public"]["Enums"]["shop_product_status"]
          stock?: number
          title: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          image_urls?: string[]
          price?: number
          shop_id?: string
          status?: Database["public"]["Enums"]["shop_product_status"]
          stock?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shop_products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "shop_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shop_products_shop_id_fkey"
            columns: ["shop_id"]
            isOneToOne: false
            referencedRelation: "shops"
            referencedColumns: ["id"]
          },
        ]
      }
      shops: {
        Row: {
          banner_url: string | null
          city: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          logo_url: string | null
          name: string
          owner_id: string
          province: string | null
          slug: string
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name: string
          owner_id: string
          province?: string | null
          slug: string
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          city?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          name?: string
          owner_id?: string
          province?: string | null
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      place_order: {
        Args: {
          _buyer_name: string
          _buyer_phone: string
          _note?: string
          _payment_method: string
          _payment_reference?: string
          _ship_address?: string
          _ship_city?: string
          _ship_province?: string
        }
        Returns: string
      }
    }
    Enums: {
      ad_order_status: "pending" | "active" | "rejected" | "expired"
      ad_payment_method:
        | "mpaisa"
        | "myMoney"
        | "hesab_pay"
        | "bank_transfer"
        | "cash"
      app_role: "admin" | "moderator" | "user"
      listing_category:
        | "real_estate"
        | "vehicles"
        | "marketplace"
        | "jobs"
        | "services"
      listing_purpose: "sell" | "rent" | "buy" | "hire" | "offer"
      listing_status: "active" | "sold" | "expired" | "pending" | "rejected"
      shop_order_status:
        | "pending"
        | "confirmed"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
      shop_product_status: "active" | "out_of_stock" | "hidden"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      ad_order_status: ["pending", "active", "rejected", "expired"],
      ad_payment_method: [
        "mpaisa",
        "myMoney",
        "hesab_pay",
        "bank_transfer",
        "cash",
      ],
      app_role: ["admin", "moderator", "user"],
      listing_category: [
        "real_estate",
        "vehicles",
        "marketplace",
        "jobs",
        "services",
      ],
      listing_purpose: ["sell", "rent", "buy", "hire", "offer"],
      listing_status: ["active", "sold", "expired", "pending", "rejected"],
      shop_order_status: [
        "pending",
        "confirmed",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
      ],
      shop_product_status: ["active", "out_of_stock", "hidden"],
    },
  },
} as const
