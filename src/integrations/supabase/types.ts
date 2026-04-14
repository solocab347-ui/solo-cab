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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      api_token_cache: {
        Row: {
          access_token: string
          created_at: string | null
          expires_at: string
          id: string
          updated_at: string | null
        }
        Insert: {
          access_token: string
          created_at?: string | null
          expires_at: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          access_token?: string
          created_at?: string | null
          expires_at?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      assistant_requests: {
        Row: {
          admin_id: string | null
          admin_response: string | null
          answered_at: string | null
          context: string | null
          created_at: string
          driver_id: string
          id: string
          question: string
          status: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_response?: string | null
          answered_at?: string | null
          context?: string | null
          created_at?: string
          driver_id: string
          id?: string
          question: string
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_response?: string | null
          answered_at?: string | null
          context?: string | null
          created_at?: string
          driver_id?: string
          id?: string
          question?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistant_requests_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistant_requests_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_fix_logs: {
        Row: {
          context: Json | null
          created_at: string | null
          entity_id: string
          entity_type: string
          error_message: string | null
          fix_applied: string
          id: string
          learning_id: string | null
          success: boolean | null
        }
        Insert: {
          context?: Json | null
          created_at?: string | null
          entity_id: string
          entity_type: string
          error_message?: string | null
          fix_applied: string
          id?: string
          learning_id?: string | null
          success?: boolean | null
        }
        Update: {
          context?: Json | null
          created_at?: string | null
          entity_id?: string
          entity_type?: string
          error_message?: string | null
          fix_applied?: string
          id?: string
          learning_id?: string | null
          success?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "auto_fix_logs_learning_id_fkey"
            columns: ["learning_id"]
            isOneToOne: false
            referencedRelation: "error_learnings"
            referencedColumns: ["id"]
          },
        ]
      }
      blocked_ips: {
        Row: {
          block_count: number | null
          blocked_by: string | null
          blocked_until: string | null
          created_at: string
          first_blocked_at: string
          id: string
          ip_address: string
          is_permanent: boolean | null
          last_offense_at: string | null
          notes: string | null
          reason: string
        }
        Insert: {
          block_count?: number | null
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          first_blocked_at?: string
          id?: string
          ip_address: string
          is_permanent?: boolean | null
          last_offense_at?: string | null
          notes?: string | null
          reason: string
        }
        Update: {
          block_count?: number | null
          blocked_by?: string | null
          blocked_until?: string | null
          created_at?: string
          first_blocked_at?: string
          id?: string
          ip_address?: string
          is_permanent?: boolean | null
          last_offense_at?: string | null
          notes?: string | null
          reason?: string
        }
        Relationships: []
      }
      call_sessions: {
        Row: {
          caller_id: string
          caller_type: string
          created_at: string
          ended_at: string | null
          id: string
          receiver_id: string
          receiver_type: string
          ride_id: string
          room_id: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          caller_id: string
          caller_type: string
          created_at?: string
          ended_at?: string | null
          id?: string
          receiver_id: string
          receiver_type: string
          ride_id: string
          room_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          caller_id?: string
          caller_type?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          receiver_id?: string
          receiver_type?: string
          ride_id?: string
          room_id?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          message: string
          promotion_id: string | null
          scheduled_for: string | null
          sent_at: string | null
          sent_count: number | null
          status: string
          target_audience: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          message: string
          promotion_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_audience: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          message?: string
          promotion_id?: string | null
          scheduled_for?: string | null
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          target_audience?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_fees_config: {
        Row: {
          cancellation_fee_amount: number | null
          card_hold_for_new_clients_only: boolean | null
          created_at: string | null
          driver_id: string | null
          fleet_manager_id: string | null
          free_cancellation_hours: number | null
          id: string
          require_card_hold: boolean | null
          updated_at: string | null
        }
        Insert: {
          cancellation_fee_amount?: number | null
          card_hold_for_new_clients_only?: boolean | null
          created_at?: string | null
          driver_id?: string | null
          fleet_manager_id?: string | null
          free_cancellation_hours?: number | null
          id?: string
          require_card_hold?: boolean | null
          updated_at?: string | null
        }
        Update: {
          cancellation_fee_amount?: number | null
          card_hold_for_new_clients_only?: boolean | null
          created_at?: string | null
          driver_id?: string | null
          fleet_manager_id?: string | null
          free_cancellation_hours?: number | null
          id?: string
          require_card_hold?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: true
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cancellation_fees_config_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: true
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_pricing: {
        Row: {
          airport_surcharge: number | null
          base_fare: number | null
          city_name: string
          created_at: string
          driver_id: string | null
          evening_end: string | null
          evening_start: string | null
          evening_surcharge: number | null
          fleet_manager_id: string | null
          hourly_rate: number | null
          id: string
          is_active: boolean | null
          minimum_price: number | null
          off_peak_discount: number | null
          off_peak_enabled: boolean | null
          off_peak_end: string | null
          off_peak_start: string | null
          peak_hours_2_enabled: boolean | null
          peak_hours_2_end: string | null
          peak_hours_2_multiplier: number | null
          peak_hours_2_start: string | null
          peak_hours_3_enabled: boolean | null
          peak_hours_3_end: string | null
          peak_hours_3_multiplier: number | null
          peak_hours_3_start: string | null
          peak_hours_enabled: boolean | null
          peak_hours_end: string | null
          peak_hours_multiplier: number | null
          peak_hours_start: string | null
          per_km_rate: number | null
          pricing_type: string
          priority: number | null
          sectors: string[] | null
          tva_included: boolean | null
          tva_rate: number | null
          updated_at: string
          weekend_surcharge: number | null
        }
        Insert: {
          airport_surcharge?: number | null
          base_fare?: number | null
          city_name: string
          created_at?: string
          driver_id?: string | null
          evening_end?: string | null
          evening_start?: string | null
          evening_surcharge?: number | null
          fleet_manager_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          minimum_price?: number | null
          off_peak_discount?: number | null
          off_peak_enabled?: boolean | null
          off_peak_end?: string | null
          off_peak_start?: string | null
          peak_hours_2_enabled?: boolean | null
          peak_hours_2_end?: string | null
          peak_hours_2_multiplier?: number | null
          peak_hours_2_start?: string | null
          peak_hours_3_enabled?: boolean | null
          peak_hours_3_end?: string | null
          peak_hours_3_multiplier?: number | null
          peak_hours_3_start?: string | null
          peak_hours_enabled?: boolean | null
          peak_hours_end?: string | null
          peak_hours_multiplier?: number | null
          peak_hours_start?: string | null
          per_km_rate?: number | null
          pricing_type?: string
          priority?: number | null
          sectors?: string[] | null
          tva_included?: boolean | null
          tva_rate?: number | null
          updated_at?: string
          weekend_surcharge?: number | null
        }
        Update: {
          airport_surcharge?: number | null
          base_fare?: number | null
          city_name?: string
          created_at?: string
          driver_id?: string | null
          evening_end?: string | null
          evening_start?: string | null
          evening_surcharge?: number | null
          fleet_manager_id?: string | null
          hourly_rate?: number | null
          id?: string
          is_active?: boolean | null
          minimum_price?: number | null
          off_peak_discount?: number | null
          off_peak_enabled?: boolean | null
          off_peak_end?: string | null
          off_peak_start?: string | null
          peak_hours_2_enabled?: boolean | null
          peak_hours_2_end?: string | null
          peak_hours_2_multiplier?: number | null
          peak_hours_2_start?: string | null
          peak_hours_3_enabled?: boolean | null
          peak_hours_3_end?: string | null
          peak_hours_3_multiplier?: number | null
          peak_hours_3_start?: string | null
          peak_hours_enabled?: boolean | null
          peak_hours_end?: string | null
          peak_hours_multiplier?: number | null
          peak_hours_start?: string | null
          per_km_rate?: number | null
          pricing_type?: string
          priority?: number | null
          sectors?: string[] | null
          tva_included?: boolean | null
          tva_rate?: number | null
          updated_at?: string
          weekend_surcharge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_pricing_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_pricing_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "city_pricing_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      city_sectors: {
        Row: {
          city_name: string
          created_at: string
          display_order: number | null
          id: string
          sector_name: string
        }
        Insert: {
          city_name: string
          created_at?: string
          display_order?: number | null
          id?: string
          sector_name: string
        }
        Update: {
          city_name?: string
          created_at?: string
          display_order?: number | null
          id?: string
          sector_name?: string
        }
        Relationships: []
      }
      client_driver_blocks: {
        Row: {
          block_reason: string | null
          blocked_by: string
          client_id: string
          created_at: string
          driver_id: string
          id: string
        }
        Insert: {
          block_reason?: string | null
          blocked_by: string
          client_id: string
          created_at?: string
          driver_id: string
          id?: string
        }
        Update: {
          block_reason?: string | null
          blocked_by?: string
          client_id?: string
          created_at?: string
          driver_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_driver_blocks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_driver_blocks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_first_orders: {
        Row: {
          client_id: string
          commission_reduced: boolean | null
          course_id: string
          created_at: string | null
          discount_applied: number | null
          driver_id: string | null
          fleet_manager_id: string | null
          id: string
          original_commission_percentage: number | null
          reduced_commission_percentage: number | null
        }
        Insert: {
          client_id: string
          commission_reduced?: boolean | null
          course_id: string
          created_at?: string | null
          discount_applied?: number | null
          driver_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          original_commission_percentage?: number | null
          reduced_commission_percentage?: number | null
        }
        Update: {
          client_id?: string
          commission_reduced?: boolean | null
          course_id?: string
          created_at?: string | null
          discount_applied?: number | null
          driver_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          original_commission_percentage?: number | null
          reduced_commission_percentage?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "client_first_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_first_orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_first_orders_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_fraud_flags: {
        Row: {
          client_id: string
          created_at: string
          details: Json | null
          flag_type: string
          id: string
          is_resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          severity: string
        }
        Insert: {
          client_id: string
          created_at?: string
          details?: Json | null
          flag_type: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          details?: Json | null
          flag_type?: string
          id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_fraud_flags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_fraud_flags_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_fraud_flags_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      client_risk_scores: {
        Row: {
          abusive_cancellations: number
          blocked_at: string | null
          blocked_reason: string | null
          client_id: string
          created_at: string
          failed_payments: number
          id: string
          is_blocked: boolean
          last_incident_at: string | null
          last_incident_type: string | null
          no_shows: number
          score: number
          successful_payments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          abusive_cancellations?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          client_id: string
          created_at?: string
          failed_payments?: number
          id?: string
          is_blocked?: boolean
          last_incident_at?: string | null
          last_incident_type?: string | null
          no_shows?: number
          score?: number
          successful_payments?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          abusive_cancellations?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          client_id?: string
          created_at?: string
          failed_payments?: number
          id?: string
          is_blocked?: boolean
          last_incident_at?: string | null
          last_incident_type?: string | null
          no_shows?: number
          score?: number
          successful_payments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_risk_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_risk_scores_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: true
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "client_risk_scores_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          abusive_ratings_count: number | null
          created_at: string
          default_payment_method_id: string | null
          driver_id: string | null
          driver_ids: string[] | null
          favorite_driver_id: string | null
          fleet_manager_id: string | null
          id: string
          is_exclusive: boolean
          preferred_fleet_driver_id: string | null
          qr_code_id: string | null
          reliability_score: number | null
          saved_cards: Json | null
          stripe_customer_id: string | null
          total_ratings_given: number | null
          total_rides: number | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          abusive_ratings_count?: number | null
          created_at?: string
          default_payment_method_id?: string | null
          driver_id?: string | null
          driver_ids?: string[] | null
          favorite_driver_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          is_exclusive?: boolean
          preferred_fleet_driver_id?: string | null
          qr_code_id?: string | null
          reliability_score?: number | null
          saved_cards?: Json | null
          stripe_customer_id?: string | null
          total_ratings_given?: number | null
          total_rides?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          abusive_ratings_count?: number | null
          created_at?: string
          default_payment_method_id?: string | null
          driver_id?: string | null
          driver_ids?: string[] | null
          favorite_driver_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          is_exclusive?: boolean
          preferred_fleet_driver_id?: string | null
          qr_code_id?: string | null
          reliability_score?: number | null
          saved_cards?: Json | null
          stripe_customer_id?: string | null
          total_ratings_given?: number | null
          total_rides?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          accepting_proposals: boolean | null
          address: string
          billing_address: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          department: string | null
          employee_count: number | null
          id: string
          logo_url: string | null
          monthly_budget: number | null
          notes: string | null
          preferred_vehicle_types: string[] | null
          show_phone: boolean | null
          siren: string | null
          siret: string
          status: string
          tva_number: string | null
          updated_at: string
          user_id: string
          visible_to_drivers: boolean | null
        }
        Insert: {
          accepting_proposals?: boolean | null
          address: string
          billing_address?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          department?: string | null
          employee_count?: number | null
          id?: string
          logo_url?: string | null
          monthly_budget?: number | null
          notes?: string | null
          preferred_vehicle_types?: string[] | null
          show_phone?: boolean | null
          siren?: string | null
          siret: string
          status?: string
          tva_number?: string | null
          updated_at?: string
          user_id: string
          visible_to_drivers?: boolean | null
        }
        Update: {
          accepting_proposals?: boolean | null
          address?: string
          billing_address?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          department?: string | null
          employee_count?: number | null
          id?: string
          logo_url?: string | null
          monthly_budget?: number | null
          notes?: string | null
          preferred_vehicle_types?: string[] | null
          show_phone?: boolean | null
          siren?: string | null
          siret?: string
          status?: string
          tva_number?: string | null
          updated_at?: string
          user_id?: string
          visible_to_drivers?: boolean | null
        }
        Relationships: []
      }
      company_admin_invitations: {
        Row: {
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          is_used: boolean
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          is_used?: boolean
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          is_used?: boolean
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_admin_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_administrators: {
        Row: {
          accepted_at: string | null
          admin_type: string
          company_id: string
          created_at: string
          id: string
          invited_at: string | null
          invited_by: string | null
          is_active: boolean
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          admin_type?: string
          company_id: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          admin_type?: string
          company_id?: string
          created_at?: string
          id?: string
          invited_at?: string | null
          invited_by?: string | null
          is_active?: boolean
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_administrators_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_course_quotes: {
        Row: {
          base_price: number
          created_at: string
          distance_km: number | null
          distance_price: number
          driver_id: string
          driver_response_at: string | null
          duration_minutes: number | null
          evening_surcharge: number | null
          id: string
          request_id: string
          selected_at: string | null
          sent_at: string | null
          status: string | null
          time_price: number | null
          total_price: number
          updated_at: string
          weekend_surcharge: number | null
        }
        Insert: {
          base_price?: number
          created_at?: string
          distance_km?: number | null
          distance_price?: number
          driver_id: string
          driver_response_at?: string | null
          duration_minutes?: number | null
          evening_surcharge?: number | null
          id?: string
          request_id: string
          selected_at?: string | null
          sent_at?: string | null
          status?: string | null
          time_price?: number | null
          total_price: number
          updated_at?: string
          weekend_surcharge?: number | null
        }
        Update: {
          base_price?: number
          created_at?: string
          distance_km?: number | null
          distance_price?: number
          driver_id?: string
          driver_response_at?: string | null
          duration_minutes?: number | null
          evening_surcharge?: number | null
          id?: string
          request_id?: string
          selected_at?: string | null
          sent_at?: string | null
          status?: string | null
          time_price?: number | null
          total_price?: number
          updated_at?: string
          weekend_surcharge?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_quotes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_course_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_quotes_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_course_requests_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_course_requests: {
        Row: {
          accepted_at: string | null
          accepted_driver_id: string | null
          company_id: string
          created_at: string
          created_by_user_id: string | null
          destination_address: string
          destination_latitude: number | null
          destination_longitude: number | null
          dispatched_to_fleet_at: string | null
          employee_id: string | null
          final_course_id: string | null
          fleet_agreement_id: string | null
          fleet_dispatched_driver_id: string | null
          guest_employee_email: string | null
          guest_employee_name: string | null
          guest_employee_phone: string | null
          id: string
          is_guest_employee: boolean | null
          notes: string | null
          passengers_count: number | null
          payment_flow: string | null
          payment_method_requested: string | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          quotes_generated_at: string | null
          scheduled_date: string
          sent_to_drivers_at: string | null
          status: string | null
          target_fleet_manager_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_driver_id?: string | null
          company_id: string
          created_at?: string
          created_by_user_id?: string | null
          destination_address: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          dispatched_to_fleet_at?: string | null
          employee_id?: string | null
          final_course_id?: string | null
          fleet_agreement_id?: string | null
          fleet_dispatched_driver_id?: string | null
          guest_employee_email?: string | null
          guest_employee_name?: string | null
          guest_employee_phone?: string | null
          id?: string
          is_guest_employee?: boolean | null
          notes?: string | null
          passengers_count?: number | null
          payment_flow?: string | null
          payment_method_requested?: string | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          quotes_generated_at?: string | null
          scheduled_date: string
          sent_to_drivers_at?: string | null
          status?: string | null
          target_fleet_manager_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_driver_id?: string | null
          company_id?: string
          created_at?: string
          created_by_user_id?: string | null
          destination_address?: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          dispatched_to_fleet_at?: string | null
          employee_id?: string | null
          final_course_id?: string | null
          fleet_agreement_id?: string | null
          fleet_dispatched_driver_id?: string | null
          guest_employee_email?: string | null
          guest_employee_name?: string | null
          guest_employee_phone?: string | null
          id?: string
          is_guest_employee?: boolean | null
          notes?: string | null
          passengers_count?: number | null
          payment_flow?: string | null
          payment_method_requested?: string | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          quotes_generated_at?: string | null
          scheduled_date?: string
          sent_to_drivers_at?: string | null
          status?: string | null
          target_fleet_manager_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_final_course_id_fkey"
            columns: ["final_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_final_course_id_fkey"
            columns: ["final_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_agreement_id_fkey"
            columns: ["fleet_agreement_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_target_fleet_manager_id_fkey"
            columns: ["target_fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_target_fleet_manager_id_fkey"
            columns: ["target_fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_courses: {
        Row: {
          actual_payment_method: string | null
          approved_at: string | null
          approved_by: string | null
          client_confirmed_at: string | null
          client_confirmed_payment_method: string | null
          company_id: string
          course_id: string
          created_at: string | null
          created_by_employee: boolean | null
          employee_id: string | null
          id: string
          invoice_to_company: boolean | null
          payment_declared_at: string | null
          payment_declared_by: string | null
          payment_handled_by: string | null
        }
        Insert: {
          actual_payment_method?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_confirmed_at?: string | null
          client_confirmed_payment_method?: string | null
          company_id: string
          course_id: string
          created_at?: string | null
          created_by_employee?: boolean | null
          employee_id?: string | null
          id?: string
          invoice_to_company?: boolean | null
          payment_declared_at?: string | null
          payment_declared_by?: string | null
          payment_handled_by?: string | null
        }
        Update: {
          actual_payment_method?: string | null
          approved_at?: string | null
          approved_by?: string | null
          client_confirmed_at?: string | null
          client_confirmed_payment_method?: string | null
          company_id?: string
          course_id?: string
          created_at?: string | null
          created_by_employee?: boolean | null
          employee_id?: string | null
          id?: string
          invoice_to_company?: boolean | null
          payment_declared_at?: string | null
          payment_declared_by?: string | null
          payment_handled_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "company_courses_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      company_driver_agreements: {
        Row: {
          accepted_at: string | null
          company_blocked_driver: boolean | null
          company_blocked_driver_at: string | null
          company_confirmed_final_payment: boolean | null
          company_confirmed_final_payment_at: string | null
          company_id: string
          company_signed: boolean | null
          company_signed_at: string | null
          contract_generated_at: string | null
          created_at: string
          created_by_user_id: string | null
          credit_limit: number | null
          discount_percentage: number | null
          driver_blocked_company: boolean | null
          driver_blocked_company_at: string | null
          driver_confirmed_final_payment: boolean | null
          driver_confirmed_final_payment_at: string | null
          driver_id: string
          driver_presentation: string | null
          driver_services_offered: string[] | null
          driver_signed: boolean | null
          driver_signed_at: string | null
          driver_vehicle_info: Json | null
          id: string
          last_payment_date: string | null
          next_payment_due: string | null
          notes: string | null
          outstanding_balance: number | null
          payment_day: number | null
          payment_frequency: string
          payment_methods: string[]
          pending_modification: boolean | null
          pending_modification_at: string | null
          pending_modification_by: string | null
          pending_modification_message: string | null
          pending_new_payment_day: number | null
          pending_new_payment_frequency: string | null
          pending_new_payment_methods: string[] | null
          proposed_by: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          terminated_at: string | null
          termination_pending_payment_validation: boolean | null
          termination_reason: string | null
          termination_requested_at: string | null
          termination_requested_by: string | null
          total_billed: number | null
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_blocked_driver?: boolean | null
          company_blocked_driver_at?: string | null
          company_confirmed_final_payment?: boolean | null
          company_confirmed_final_payment_at?: string | null
          company_id: string
          company_signed?: boolean | null
          company_signed_at?: string | null
          contract_generated_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          credit_limit?: number | null
          discount_percentage?: number | null
          driver_blocked_company?: boolean | null
          driver_blocked_company_at?: string | null
          driver_confirmed_final_payment?: boolean | null
          driver_confirmed_final_payment_at?: string | null
          driver_id: string
          driver_presentation?: string | null
          driver_services_offered?: string[] | null
          driver_signed?: boolean | null
          driver_signed_at?: string | null
          driver_vehicle_info?: Json | null
          id?: string
          last_payment_date?: string | null
          next_payment_due?: string | null
          notes?: string | null
          outstanding_balance?: number | null
          payment_day?: number | null
          payment_frequency?: string
          payment_methods?: string[]
          pending_modification?: boolean | null
          pending_modification_at?: string | null
          pending_modification_by?: string | null
          pending_modification_message?: string | null
          pending_new_payment_day?: number | null
          pending_new_payment_frequency?: string | null
          pending_new_payment_methods?: string[] | null
          proposed_by?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          terminated_at?: string | null
          termination_pending_payment_validation?: boolean | null
          termination_reason?: string | null
          termination_requested_at?: string | null
          termination_requested_by?: string | null
          total_billed?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          company_blocked_driver?: boolean | null
          company_blocked_driver_at?: string | null
          company_confirmed_final_payment?: boolean | null
          company_confirmed_final_payment_at?: string | null
          company_id?: string
          company_signed?: boolean | null
          company_signed_at?: string | null
          contract_generated_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          credit_limit?: number | null
          discount_percentage?: number | null
          driver_blocked_company?: boolean | null
          driver_blocked_company_at?: string | null
          driver_confirmed_final_payment?: boolean | null
          driver_confirmed_final_payment_at?: string | null
          driver_id?: string
          driver_presentation?: string | null
          driver_services_offered?: string[] | null
          driver_signed?: boolean | null
          driver_signed_at?: string | null
          driver_vehicle_info?: Json | null
          id?: string
          last_payment_date?: string | null
          next_payment_due?: string | null
          notes?: string | null
          outstanding_balance?: number | null
          payment_day?: number | null
          payment_frequency?: string
          payment_methods?: string[]
          pending_modification?: boolean | null
          pending_modification_at?: string | null
          pending_modification_by?: string | null
          pending_modification_message?: string | null
          pending_new_payment_day?: number | null
          pending_new_payment_frequency?: string | null
          pending_new_payment_methods?: string[] | null
          proposed_by?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          terminated_at?: string | null
          termination_pending_payment_validation?: boolean | null
          termination_reason?: string | null
          termination_requested_at?: string | null
          termination_requested_by?: string | null
          total_billed?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_driver_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_driver_agreements_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_drivers: {
        Row: {
          company_id: string
          created_at: string
          driver_id: string
          id: string
          status: string
        }
        Insert: {
          company_id: string
          created_at?: string
          driver_id: string
          id?: string
          status?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          driver_id?: string
          id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_drivers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_employee_course_invitations: {
        Row: {
          company_id: string
          course_id: string | null
          created_at: string
          destination_address: string | null
          expires_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string | null
          id: string
          is_used: boolean | null
          last_reminder_sent_at: string | null
          pickup_address: string | null
          request_id: string | null
          scheduled_date: string | null
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          company_id: string
          course_id?: string | null
          created_at?: string
          destination_address?: string | null
          expires_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone?: string | null
          id?: string
          is_used?: boolean | null
          last_reminder_sent_at?: string | null
          pickup_address?: string | null
          request_id?: string | null
          scheduled_date?: string | null
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          company_id?: string
          course_id?: string | null
          created_at?: string
          destination_address?: string | null
          expires_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string | null
          id?: string
          is_used?: boolean | null
          last_reminder_sent_at?: string | null
          pickup_address?: string | null
          request_id?: string | null
          scheduled_date?: string | null
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_employee_course_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_employee_course_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_employee_course_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "company_employee_course_invitations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_course_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_employee_course_invitations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_course_requests_view"
            referencedColumns: ["id"]
          },
        ]
      }
      company_employee_invitations: {
        Row: {
          can_create_courses: boolean | null
          can_invite_drivers: boolean | null
          can_view_invoices: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          employee_name: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          max_monthly_budget: number | null
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          can_create_courses?: boolean | null
          can_invite_drivers?: boolean | null
          can_view_invoices?: boolean | null
          company_id: string
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          employee_name?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          max_monthly_budget?: number | null
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          can_create_courses?: boolean | null
          can_invite_drivers?: boolean | null
          can_view_invoices?: boolean | null
          company_id?: string
          created_at?: string | null
          created_by?: string | null
          department?: string | null
          email?: string | null
          employee_name?: string | null
          expires_at?: string | null
          id?: string
          is_used?: boolean | null
          max_monthly_budget?: number | null
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_employee_invitations_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_employees: {
        Row: {
          avatar_url: string | null
          can_create_courses: boolean | null
          can_invite_drivers: boolean | null
          can_view_all_company_courses: boolean | null
          can_view_invoices: boolean | null
          company_id: string
          created_at: string | null
          current_month_spent: number | null
          department: string | null
          employee_code: string | null
          id: string
          invitation_id: string | null
          is_active: boolean | null
          is_suspended: boolean | null
          job_title: string | null
          joined_at: string | null
          last_activity_at: string | null
          max_monthly_budget: number | null
          max_monthly_courses: number | null
          monthly_courses_count: number | null
          monthly_objective_amount: number | null
          monthly_objective_courses: number | null
          restrictions_notes: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          can_create_courses?: boolean | null
          can_invite_drivers?: boolean | null
          can_view_all_company_courses?: boolean | null
          can_view_invoices?: boolean | null
          company_id: string
          created_at?: string | null
          current_month_spent?: number | null
          department?: string | null
          employee_code?: string | null
          id?: string
          invitation_id?: string | null
          is_active?: boolean | null
          is_suspended?: boolean | null
          job_title?: string | null
          joined_at?: string | null
          last_activity_at?: string | null
          max_monthly_budget?: number | null
          max_monthly_courses?: number | null
          monthly_courses_count?: number | null
          monthly_objective_amount?: number | null
          monthly_objective_courses?: number | null
          restrictions_notes?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          can_create_courses?: boolean | null
          can_invite_drivers?: boolean | null
          can_view_all_company_courses?: boolean | null
          can_view_invoices?: boolean | null
          company_id?: string
          created_at?: string | null
          current_month_spent?: number | null
          department?: string | null
          employee_code?: string | null
          id?: string
          invitation_id?: string | null
          is_active?: boolean | null
          is_suspended?: boolean | null
          job_title?: string | null
          joined_at?: string | null
          last_activity_at?: string | null
          max_monthly_budget?: number | null
          max_monthly_courses?: number | null
          monthly_courses_count?: number | null
          monthly_objective_amount?: number | null
          monthly_objective_courses?: number | null
          restrictions_notes?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_employees_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_employees_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "company_employee_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      company_fleet_agreements: {
        Row: {
          accepted_at: string | null
          company_confirmed_final_payment: boolean | null
          company_confirmed_final_payment_at: string | null
          company_id: string
          company_signed: boolean | null
          company_signed_at: string | null
          created_at: string
          fleet_confirmed_final_payment: boolean | null
          fleet_confirmed_final_payment_at: string | null
          fleet_manager_id: string
          fleet_manager_signed: boolean | null
          fleet_manager_signed_at: string | null
          id: string
          notes: string | null
          payment_day: number | null
          payment_frequency: string | null
          payment_methods: string[] | null
          proposal_message: string | null
          proposed_by: string
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          terminated_at: string | null
          termination_pending_payment_validation: boolean | null
          termination_reason: string | null
          termination_requested_at: string | null
          termination_requested_by: string | null
          total_amount: number | null
          total_courses: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          company_confirmed_final_payment?: boolean | null
          company_confirmed_final_payment_at?: string | null
          company_id: string
          company_signed?: boolean | null
          company_signed_at?: string | null
          created_at?: string
          fleet_confirmed_final_payment?: boolean | null
          fleet_confirmed_final_payment_at?: string | null
          fleet_manager_id: string
          fleet_manager_signed?: boolean | null
          fleet_manager_signed_at?: string | null
          id?: string
          notes?: string | null
          payment_day?: number | null
          payment_frequency?: string | null
          payment_methods?: string[] | null
          proposal_message?: string | null
          proposed_by?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          terminated_at?: string | null
          termination_pending_payment_validation?: boolean | null
          termination_reason?: string | null
          termination_requested_at?: string | null
          termination_requested_by?: string | null
          total_amount?: number | null
          total_courses?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          company_confirmed_final_payment?: boolean | null
          company_confirmed_final_payment_at?: string | null
          company_id?: string
          company_signed?: boolean | null
          company_signed_at?: string | null
          created_at?: string
          fleet_confirmed_final_payment?: boolean | null
          fleet_confirmed_final_payment_at?: string | null
          fleet_manager_id?: string
          fleet_manager_signed?: boolean | null
          fleet_manager_signed_at?: string | null
          id?: string
          notes?: string | null
          payment_day?: number | null
          payment_frequency?: string | null
          payment_methods?: string[] | null
          proposal_message?: string | null
          proposed_by?: string
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          terminated_at?: string | null
          termination_pending_payment_validation?: boolean | null
          termination_reason?: string | null
          termination_requested_at?: string | null
          termination_requested_by?: string | null
          total_amount?: number | null
          total_courses?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_fleet_agreements_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_fleet_agreements_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_fleet_agreements_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_fleet_payments: {
        Row: {
          agreement_id: string
          amount: number
          company_id: string
          course_ids: string[] | null
          courses_count: number | null
          created_at: string
          dispute_created_at: string | null
          dispute_reason: string | null
          dispute_status: string | null
          fleet_manager_id: string
          id: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          received_at: string | null
          received_confirmed_by_user_id: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
        }
        Insert: {
          agreement_id: string
          amount: number
          company_id: string
          course_ids?: string[] | null
          courses_count?: number | null
          created_at?: string
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          fleet_manager_id: string
          id?: string
          notes?: string | null
          payment_method: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          received_at?: string | null
          received_confirmed_by_user_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
        }
        Update: {
          agreement_id?: string
          amount?: number
          company_id?: string
          course_ids?: string[] | null
          courses_count?: number | null
          created_at?: string
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          fleet_manager_id?: string
          id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          received_at?: string | null
          received_confirmed_by_user_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_fleet_payments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_fleet_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_fleet_payments_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_fleet_payments_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payment_documents: {
        Row: {
          document_type: string | null
          document_url: string
          file_name: string | null
          id: string
          payment_id: string
          uploaded_at: string | null
          uploaded_by_user_id: string | null
        }
        Insert: {
          document_type?: string | null
          document_url: string
          file_name?: string | null
          id?: string
          payment_id: string
          uploaded_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Update: {
          document_type?: string | null
          document_url?: string
          file_name?: string | null
          id?: string
          payment_id?: string
          uploaded_at?: string | null
          uploaded_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_payment_documents_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "company_payments"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payment_reminders: {
        Row: {
          agreement_id: string
          amount_due: number
          company_id: string
          created_at: string
          driver_id: string
          email_sent: boolean | null
          id: string
          notification_sent: boolean | null
          period_end: string | null
          period_start: string | null
          reminder_level: number
          sent_at: string
        }
        Insert: {
          agreement_id: string
          amount_due: number
          company_id: string
          created_at?: string
          driver_id: string
          email_sent?: boolean | null
          id?: string
          notification_sent?: boolean | null
          period_end?: string | null
          period_start?: string | null
          reminder_level?: number
          sent_at?: string
        }
        Update: {
          agreement_id?: string
          amount_due?: number
          company_id?: string
          created_at?: string
          driver_id?: string
          email_sent?: boolean | null
          id?: string
          notification_sent?: boolean | null
          period_end?: string | null
          period_start?: string | null
          reminder_level?: number
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_payment_reminders_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "company_driver_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payment_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payment_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_payments: {
        Row: {
          agreement_id: string
          amount: number
          company_id: string
          consolidated_invoice_generated_at: string | null
          consolidated_invoice_number: string | null
          consolidated_invoice_url: string | null
          course_ids: string[] | null
          courses_count: number | null
          created_at: string
          dispute_created_at: string | null
          dispute_reason: string | null
          dispute_status: string | null
          driver_id: string
          id: string
          notes: string | null
          paid_at: string | null
          payment_method: string
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          received_at: string | null
          received_confirmed_by_user_id: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          stripe_invoice_id: string | null
          stripe_payment_id: string | null
        }
        Insert: {
          agreement_id: string
          amount: number
          company_id: string
          consolidated_invoice_generated_at?: string | null
          consolidated_invoice_number?: string | null
          consolidated_invoice_url?: string | null
          course_ids?: string[] | null
          courses_count?: number | null
          created_at?: string
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          driver_id: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          received_at?: string | null
          received_confirmed_by_user_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
        }
        Update: {
          agreement_id?: string
          amount?: number
          company_id?: string
          consolidated_invoice_generated_at?: string | null
          consolidated_invoice_number?: string | null
          consolidated_invoice_url?: string | null
          course_ids?: string[] | null
          courses_count?: number | null
          created_at?: string
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          driver_id?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          payment_method?: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          received_at?: string | null
          received_confirmed_by_user_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_payments_agreement_id_fkey"
            columns: ["agreement_id"]
            isOneToOne: false
            referencedRelation: "company_driver_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_qr_codes: {
        Row: {
          code: string
          company_id: string
          created_at: string
          id: string
          is_active: boolean | null
          qr_code_image: string | null
          scans_count: number | null
          updated_at: string
        }
        Insert: {
          code?: string
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          qr_code_image?: string | null
          scans_count?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          qr_code_image?: string | null
          scans_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_qr_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      congress_invitations: {
        Row: {
          created_at: string
          created_by: string | null
          current_uses: number
          discount_percentage: number | null
          id: string
          is_active: boolean
          max_uses: number
          monthly_price: number | null
          name: string
          slug: string
          trial_days: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_percentage?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number
          monthly_price?: number | null
          name: string
          slug: string
          trial_days?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          current_uses?: number
          discount_percentage?: number | null
          id?: string
          is_active?: boolean
          max_uses?: number
          monthly_price?: number | null
          name?: string
          slug?: string
          trial_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      congress_registrations: {
        Row: {
          driver_id: string
          id: string
          invitation_id: string
          nfc_tag_number: string | null
          notes: string | null
          registered_at: string
          subscription_started_at: string | null
          subscription_status: string | null
          user_id: string
        }
        Insert: {
          driver_id: string
          id?: string
          invitation_id: string
          nfc_tag_number?: string | null
          notes?: string | null
          registered_at?: string
          subscription_started_at?: string | null
          subscription_status?: string | null
          user_id: string
        }
        Update: {
          driver_id?: string
          id?: string
          invitation_id?: string
          nfc_tag_number?: string | null
          notes?: string | null
          registered_at?: string
          subscription_started_at?: string | null
          subscription_status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congress_registrations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "congress_registrations_invitation_id_fkey"
            columns: ["invitation_id"]
            isOneToOne: false
            referencedRelation: "congress_invitations"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id: string
          participant_2_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_1_id?: string
          participant_2_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_participant_1_id_fkey"
            columns: ["participant_1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_participant_2_id_fkey"
            columns: ["participant_2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_driver_exclusions: {
        Row: {
          course_id: string
          driver_id: string
          excluded_at: string
          exclusion_reason: string
          id: string
        }
        Insert: {
          course_id: string
          driver_id: string
          excluded_at?: string
          exclusion_reason: string
          id?: string
        }
        Update: {
          course_id?: string
          driver_id?: string
          excluded_at?: string
          exclusion_reason?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_driver_exclusions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_driver_exclusions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_escalations: {
        Row: {
          company_request_id: string | null
          course_id: string
          created_at: string | null
          driver_id: string | null
          escalation_level: number | null
          escalation_reason: string
          fleet_manager_id: string | null
          id: string
          resolution_notes: string | null
          resolution_status: string | null
          resolved_at: string | null
          resolved_by: string | null
          suggested_actions: Json | null
          updated_at: string | null
        }
        Insert: {
          company_request_id?: string | null
          course_id: string
          created_at?: string | null
          driver_id?: string | null
          escalation_level?: number | null
          escalation_reason: string
          fleet_manager_id?: string | null
          id?: string
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_actions?: Json | null
          updated_at?: string | null
        }
        Update: {
          company_request_id?: string | null
          course_id?: string
          created_at?: string | null
          driver_id?: string | null
          escalation_level?: number | null
          escalation_reason?: string
          fleet_manager_id?: string | null
          id?: string
          resolution_notes?: string | null
          resolution_status?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          suggested_actions?: Json | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "course_escalations_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_course_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_course_requests_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_escalations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_invitations: {
        Row: {
          client_id: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          destination_address: string
          distance_km: number | null
          driver_id: string
          duration_minutes: number | null
          estimated_price: number
          expires_at: string
          id: string
          pickup_address: string
          price_details: Json | null
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          completed_at?: string | null
          course_id: string
          created_at?: string
          destination_address: string
          distance_km?: number | null
          driver_id: string
          duration_minutes?: number | null
          estimated_price: number
          expires_at?: string
          id?: string
          pickup_address: string
          price_details?: Json | null
          status?: string
          token?: string
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          completed_at?: string | null
          course_id?: string
          created_at?: string
          destination_address?: string
          distance_km?: number | null
          driver_id?: string
          duration_minutes?: number | null
          estimated_price?: number
          expires_at?: string
          id?: string
          pickup_address?: string
          price_details?: Json | null
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "course_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_invitations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_queue: {
        Row: {
          actual_gap_minutes: number | null
          auto_check_enabled: boolean | null
          buffer_minutes_needed: number | null
          conflict_reason: string
          conflicting_course_id: string | null
          course_id: string
          created_at: string
          driver_id: string
          expires_at: string | null
          id: string
          last_retry_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          priority: number | null
          resolved_action: string | null
          resolved_at: string | null
          retry_count: number | null
          retry_interval_minutes: number | null
          shared_to_driver_id: string | null
          source_id: string | null
          source_type: string
          status: string
          updated_at: string
        }
        Insert: {
          actual_gap_minutes?: number | null
          auto_check_enabled?: boolean | null
          buffer_minutes_needed?: number | null
          conflict_reason?: string
          conflicting_course_id?: string | null
          course_id: string
          created_at?: string
          driver_id: string
          expires_at?: string | null
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          priority?: number | null
          resolved_action?: string | null
          resolved_at?: string | null
          retry_count?: number | null
          retry_interval_minutes?: number | null
          shared_to_driver_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Update: {
          actual_gap_minutes?: number | null
          auto_check_enabled?: boolean | null
          buffer_minutes_needed?: number | null
          conflict_reason?: string
          conflicting_course_id?: string | null
          course_id?: string
          created_at?: string
          driver_id?: string
          expires_at?: string | null
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          priority?: number | null
          resolved_action?: string | null
          resolved_at?: string | null
          retry_count?: number | null
          retry_interval_minutes?: number | null
          shared_to_driver_id?: string | null
          source_id?: string | null
          source_type?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_queue_conflicting_course_id_fkey"
            columns: ["conflicting_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_queue_conflicting_course_id_fkey"
            columns: ["conflicting_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_queue_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_queue_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_driver"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_ratings: {
        Row: {
          adjusted_rating: number | null
          admin_override: boolean | null
          admin_override_by: string | null
          admin_override_reason: string | null
          ai_analysis: Json | null
          ai_decision: string | null
          ai_justification: string | null
          client_id: string
          client_response_deadline: string | null
          course_id: string
          created_at: string
          driver_id: string
          driver_response: string | null
          driver_response_at: string | null
          id: string
          rating: number
          reason: string | null
          reason_detail: string | null
          status: string
          updated_at: string
        }
        Insert: {
          adjusted_rating?: number | null
          admin_override?: boolean | null
          admin_override_by?: string | null
          admin_override_reason?: string | null
          ai_analysis?: Json | null
          ai_decision?: string | null
          ai_justification?: string | null
          client_id: string
          client_response_deadline?: string | null
          course_id: string
          created_at?: string
          driver_id: string
          driver_response?: string | null
          driver_response_at?: string | null
          id?: string
          rating: number
          reason?: string | null
          reason_detail?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          adjusted_rating?: number | null
          admin_override?: boolean | null
          admin_override_by?: string | null
          admin_override_reason?: string | null
          ai_analysis?: Json | null
          ai_decision?: string | null
          ai_justification?: string | null
          client_id?: string
          client_response_deadline?: string | null
          course_id?: string
          created_at?: string
          driver_id?: string
          driver_response?: string | null
          driver_response_at?: string | null
          id?: string
          rating?: number
          reason?: string | null
          reason_detail?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_ratings_admin_override_by_fkey"
            columns: ["admin_override_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          auto_dispatch_enabled: boolean | null
          bank_imprint_at: string | null
          cancellation_by: string | null
          cancellation_fee_amount: number | null
          cancellation_fee_charged: boolean | null
          cancellation_fee_charged_at: string | null
          cancellation_fee_stripe_id: string | null
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          card_hold_amount: number | null
          card_hold_confirmed_at: string | null
          card_hold_status: string | null
          client_id: string | null
          client_payment_confirmation: string | null
          client_payment_confirmation_at: string | null
          client_payment_confirmation_token: string | null
          client_rating: number | null
          company_payment_status: string | null
          course_finalized_by_driver_at: string | null
          course_number: string | null
          course_started_at: string | null
          created_at: string
          created_by_user_id: string | null
          deposit_amount: number | null
          deposit_paid: boolean | null
          deposit_paid_at: string | null
          deposit_percentage: number | null
          deposit_required: boolean | null
          deposit_status: string | null
          deposit_stripe_payment_intent_id: string | null
          destination_address: string
          destination_latitude: number | null
          destination_longitude: number | null
          discount_amount: number | null
          dispatch_round: number | null
          distance_km: number | null
          driver_declared_payment_at: string | null
          driver_declared_payment_received: boolean | null
          driver_id: string | null
          driver_ids: string[] | null
          duration_minutes: number | null
          employee_declared_paid_at: string | null
          final_payment_amount: number | null
          final_payment_at: string | null
          final_payment_intent_id: string | null
          final_payment_status: string | null
          final_payment_stripe_id: string | null
          fleet_manager_id: string | null
          fleet_manager_name: string | null
          guest_email: string | null
          guest_estimated_price: number | null
          guest_name: string | null
          guest_notified_at: string | null
          guest_phone: string | null
          guest_tracking_token: string | null
          hours_before_cancellation: number | null
          id: string
          is_guest_booking: boolean | null
          is_out_of_schedule: boolean | null
          last_dispatched_at: string | null
          last_payment_error: string | null
          net_amount_to_driver: number | null
          notes: string | null
          origin_type: string
          out_of_schedule_action: string | null
          passengers_count: number
          payment_captured_at: string | null
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_method: string | null
          payment_method_requested: string | null
          payment_method_used: string | null
          payment_retry_count: number | null
          payment_status: string | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          promo_code: string | null
          scheduled_date: string
          solocab_fee_amount: number | null
          status: Database["public"]["Enums"]["course_status"]
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_fee_amount: number | null
          stripe_hold_payment_intent_id: string | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          stripe_setup_intent_id: string | null
          total_fees_amount: number | null
          updated_at: string
        }
        Insert: {
          auto_dispatch_enabled?: boolean | null
          bank_imprint_at?: string | null
          cancellation_by?: string | null
          cancellation_fee_amount?: number | null
          cancellation_fee_charged?: boolean | null
          cancellation_fee_charged_at?: string | null
          cancellation_fee_stripe_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_hold_amount?: number | null
          card_hold_confirmed_at?: string | null
          card_hold_status?: string | null
          client_id?: string | null
          client_payment_confirmation?: string | null
          client_payment_confirmation_at?: string | null
          client_payment_confirmation_token?: string | null
          client_rating?: number | null
          company_payment_status?: string | null
          course_finalized_by_driver_at?: string | null
          course_number?: string | null
          course_started_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_percentage?: number | null
          deposit_required?: boolean | null
          deposit_status?: string | null
          deposit_stripe_payment_intent_id?: string | null
          destination_address: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          discount_amount?: number | null
          dispatch_round?: number | null
          distance_km?: number | null
          driver_declared_payment_at?: string | null
          driver_declared_payment_received?: boolean | null
          driver_id?: string | null
          driver_ids?: string[] | null
          duration_minutes?: number | null
          employee_declared_paid_at?: string | null
          final_payment_amount?: number | null
          final_payment_at?: string | null
          final_payment_intent_id?: string | null
          final_payment_status?: string | null
          final_payment_stripe_id?: string | null
          fleet_manager_id?: string | null
          fleet_manager_name?: string | null
          guest_email?: string | null
          guest_estimated_price?: number | null
          guest_name?: string | null
          guest_notified_at?: string | null
          guest_phone?: string | null
          guest_tracking_token?: string | null
          hours_before_cancellation?: number | null
          id?: string
          is_guest_booking?: boolean | null
          is_out_of_schedule?: boolean | null
          last_dispatched_at?: string | null
          last_payment_error?: string | null
          net_amount_to_driver?: number | null
          notes?: string | null
          origin_type?: string
          out_of_schedule_action?: string | null
          passengers_count?: number
          payment_captured_at?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          payment_method_requested?: string | null
          payment_method_used?: string | null
          payment_retry_count?: number | null
          payment_status?: string | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          promo_code?: string | null
          scheduled_date: string
          solocab_fee_amount?: number | null
          status?: Database["public"]["Enums"]["course_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_fee_amount?: number | null
          stripe_hold_payment_intent_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id?: string | null
          total_fees_amount?: number | null
          updated_at?: string
        }
        Update: {
          auto_dispatch_enabled?: boolean | null
          bank_imprint_at?: string | null
          cancellation_by?: string | null
          cancellation_fee_amount?: number | null
          cancellation_fee_charged?: boolean | null
          cancellation_fee_charged_at?: string | null
          cancellation_fee_stripe_id?: string | null
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          card_hold_amount?: number | null
          card_hold_confirmed_at?: string | null
          card_hold_status?: string | null
          client_id?: string | null
          client_payment_confirmation?: string | null
          client_payment_confirmation_at?: string | null
          client_payment_confirmation_token?: string | null
          client_rating?: number | null
          company_payment_status?: string | null
          course_finalized_by_driver_at?: string | null
          course_number?: string | null
          course_started_at?: string | null
          created_at?: string
          created_by_user_id?: string | null
          deposit_amount?: number | null
          deposit_paid?: boolean | null
          deposit_paid_at?: string | null
          deposit_percentage?: number | null
          deposit_required?: boolean | null
          deposit_status?: string | null
          deposit_stripe_payment_intent_id?: string | null
          destination_address?: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          discount_amount?: number | null
          dispatch_round?: number | null
          distance_km?: number | null
          driver_declared_payment_at?: string | null
          driver_declared_payment_received?: boolean | null
          driver_id?: string | null
          driver_ids?: string[] | null
          duration_minutes?: number | null
          employee_declared_paid_at?: string | null
          final_payment_amount?: number | null
          final_payment_at?: string | null
          final_payment_intent_id?: string | null
          final_payment_status?: string | null
          final_payment_stripe_id?: string | null
          fleet_manager_id?: string | null
          fleet_manager_name?: string | null
          guest_email?: string | null
          guest_estimated_price?: number | null
          guest_name?: string | null
          guest_notified_at?: string | null
          guest_phone?: string | null
          guest_tracking_token?: string | null
          hours_before_cancellation?: number | null
          id?: string
          is_guest_booking?: boolean | null
          is_out_of_schedule?: boolean | null
          last_dispatched_at?: string | null
          last_payment_error?: string | null
          net_amount_to_driver?: number | null
          notes?: string | null
          origin_type?: string
          out_of_schedule_action?: string | null
          passengers_count?: number
          payment_captured_at?: string | null
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method?: string | null
          payment_method_requested?: string | null
          payment_method_used?: string | null
          payment_retry_count?: number | null
          payment_status?: string | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          promo_code?: string | null
          scheduled_date?: string
          solocab_fee_amount?: number | null
          status?: Database["public"]["Enums"]["course_status"]
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_fee_amount?: number | null
          stripe_hold_payment_intent_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_setup_intent_id?: string | null
          total_fees_amount?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "courses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      deposit_transactions: {
        Row: {
          amount: number
          captured_at: string | null
          client_id: string | null
          course_id: string | null
          created_at: string
          driver_id: string | null
          forfeited_at: string | null
          id: string
          paid_at: string | null
          percentage: number
          refund_reason: string | null
          refunded_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          captured_at?: string | null
          client_id?: string | null
          course_id?: string | null
          created_at?: string
          driver_id?: string | null
          forfeited_at?: string | null
          id?: string
          paid_at?: string | null
          percentage: number
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          captured_at?: string | null
          client_id?: string | null
          course_id?: string | null
          created_at?: string
          driver_id?: string | null
          forfeited_at?: string | null
          id?: string
          paid_at?: string | null
          percentage?: number
          refund_reason?: string | null
          refunded_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "deposit_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "deposit_transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deposit_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      detected_errors: {
        Row: {
          created_at: string | null
          detected_at: string | null
          detected_by: string | null
          driver_id: string | null
          entity_id: string
          entity_type: string
          error_context: Json | null
          fix_details: Json | null
          fix_solution_id: string | null
          fixed_at: string | null
          id: string
          pattern_id: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          detected_at?: string | null
          detected_by?: string | null
          driver_id?: string | null
          entity_id: string
          entity_type: string
          error_context?: Json | null
          fix_details?: Json | null
          fix_solution_id?: string | null
          fixed_at?: string | null
          id?: string
          pattern_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          detected_at?: string | null
          detected_by?: string | null
          driver_id?: string | null
          entity_id?: string
          entity_type?: string
          error_context?: Json | null
          fix_details?: Json | null
          fix_solution_id?: string | null
          fixed_at?: string | null
          id?: string
          pattern_id?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "detected_errors_fix_solution_id_fkey"
            columns: ["fix_solution_id"]
            isOneToOne: false
            referencedRelation: "error_solutions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "detected_errors_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_learning_metrics"
            referencedColumns: ["pattern_id"]
          },
          {
            foreignKeyName: "detected_errors_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      devis: {
        Row: {
          accepted_at: string | null
          airport_fee: number | null
          amount: number
          base_price: number
          city_pricing_name: string | null
          client_id: string | null
          company_employee_id: string | null
          company_id: string | null
          course_id: string
          created_at: string
          deposit_amount: number | null
          deposit_percentage: number | null
          deposit_required: boolean | null
          discount_amount: number
          distance_km: number | null
          distance_price: number
          driver_id: string
          estimated_net_to_driver: number | null
          estimated_stripe_fee: number | null
          evening_surcharge_amount: number | null
          guest_client_email: string | null
          guest_client_name: string | null
          guest_client_phone: string | null
          id: string
          is_custom_price: boolean | null
          is_stripe_payment: boolean | null
          notes: string | null
          origin_type: string
          peak_hours_surcharge_amount: number | null
          pricing_source: string | null
          promo_code: string | null
          quote_number: string | null
          quote_token: string | null
          solocab_fee_amount: number | null
          status: Database["public"]["Enums"]["devis_status"]
          stripe_checkout_session_id: string | null
          time_price: number | null
          tva_amount: number | null
          tva_rate: number | null
          updated_at: string
          valid_until: string
          weekend_surcharge_amount: number | null
        }
        Insert: {
          accepted_at?: string | null
          airport_fee?: number | null
          amount: number
          base_price: number
          city_pricing_name?: string | null
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id: string
          created_at?: string
          deposit_amount?: number | null
          deposit_percentage?: number | null
          deposit_required?: boolean | null
          discount_amount?: number
          distance_km?: number | null
          distance_price: number
          driver_id: string
          estimated_net_to_driver?: number | null
          estimated_stripe_fee?: number | null
          evening_surcharge_amount?: number | null
          guest_client_email?: string | null
          guest_client_name?: string | null
          guest_client_phone?: string | null
          id?: string
          is_custom_price?: boolean | null
          is_stripe_payment?: boolean | null
          notes?: string | null
          origin_type?: string
          peak_hours_surcharge_amount?: number | null
          pricing_source?: string | null
          promo_code?: string | null
          quote_number?: string | null
          quote_token?: string | null
          solocab_fee_amount?: number | null
          status?: Database["public"]["Enums"]["devis_status"]
          stripe_checkout_session_id?: string | null
          time_price?: number | null
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string
          valid_until: string
          weekend_surcharge_amount?: number | null
        }
        Update: {
          accepted_at?: string | null
          airport_fee?: number | null
          amount?: number
          base_price?: number
          city_pricing_name?: string | null
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_percentage?: number | null
          deposit_required?: boolean | null
          discount_amount?: number
          distance_km?: number | null
          distance_price?: number
          driver_id?: string
          estimated_net_to_driver?: number | null
          estimated_stripe_fee?: number | null
          evening_surcharge_amount?: number | null
          guest_client_email?: string | null
          guest_client_name?: string | null
          guest_client_phone?: string | null
          id?: string
          is_custom_price?: boolean | null
          is_stripe_payment?: boolean | null
          notes?: string | null
          origin_type?: string
          peak_hours_surcharge_amount?: number | null
          pricing_source?: string | null
          promo_code?: string | null
          quote_number?: string | null
          quote_token?: string | null
          solocab_fee_amount?: number | null
          status?: Database["public"]["Enums"]["devis_status"]
          stripe_checkout_session_id?: string | null
          time_price?: number | null
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string
          valid_until?: string
          weekend_surcharge_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "devis_company_employee_id_fkey"
            columns: ["company_employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "devis_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          course_id: string
          created_at: string
          description: string
          id: string
          reason: string
          reported_against_user_id: string
          reported_by_user_id: string
          reporter_type: string
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          course_id: string
          created_at?: string
          description: string
          id?: string
          reason: string
          reported_against_user_id: string
          reported_by_user_id: string
          reporter_type: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          course_id?: string
          created_at?: string
          description?: string
          id?: string
          reason?: string
          reported_against_user_id?: string
          reported_by_user_id?: string
          reporter_type?: string
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
        ]
      }
      document_reminders: {
        Row: {
          created_at: string
          document_type: string
          driver_id: string
          id: string
          read_at: string | null
          reminder_message: string | null
          sent_at: string
          sent_by: string | null
          vehicle_id: string | null
        }
        Insert: {
          created_at?: string
          document_type: string
          driver_id: string
          id?: string
          read_at?: string | null
          reminder_message?: string | null
          sent_at?: string
          sent_by?: string | null
          vehicle_id?: string | null
        }
        Update: {
          created_at?: string
          document_type?: string
          driver_id?: string
          id?: string
          read_at?: string | null
          reminder_message?: string | null
          sent_at?: string
          sent_by?: string | null
          vehicle_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reminders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reminders_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_reminders_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "driver_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      document_types: {
        Row: {
          allows_multiple_files: boolean
          can_be_updated_after_validation: boolean
          created_at: string
          description: string | null
          display_order: number
          id: string
          is_required: boolean
          label: string
        }
        Insert: {
          allows_multiple_files?: boolean
          can_be_updated_after_validation?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id: string
          is_required?: boolean
          label: string
        }
        Update: {
          allows_multiple_files?: boolean
          can_be_updated_after_validation?: boolean
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          is_required?: boolean
          label?: string
        }
        Relationships: []
      }
      driver_availability_slots: {
        Row: {
          created_at: string | null
          day_of_week: number | null
          driver_id: string
          end_time: string
          id: string
          is_available: boolean | null
          notes: string | null
          slot_type: string | null
          specific_date: string | null
          start_time: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          day_of_week?: number | null
          driver_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          slot_type?: string | null
          specific_date?: string | null
          start_time: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          day_of_week?: number | null
          driver_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          notes?: string | null
          slot_type?: string | null
          specific_date?: string | null
          start_time?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_availability_slots_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_balance_pending: {
        Row: {
          course_id: string | null
          created_at: string | null
          driver_id: string
          gross_amount: number
          id: string
          net_amount: number
          payment_type: string
          settled_at: string | null
          settlement_id: string | null
          solocab_fee: number
          source_payment_id: string | null
          status: string
          stripe_fee: number
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          driver_id: string
          gross_amount?: number
          id?: string
          net_amount?: number
          payment_type?: string
          settled_at?: string | null
          settlement_id?: string | null
          solocab_fee?: number
          source_payment_id?: string | null
          status?: string
          stripe_fee?: number
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          driver_id?: string
          gross_amount?: number
          id?: string
          net_amount?: number
          payment_type?: string
          settled_at?: string | null
          settlement_id?: string | null
          solocab_fee?: number
          source_payment_id?: string | null
          status?: string
          stripe_fee?: number
        }
        Relationships: [
          {
            foreignKeyName: "driver_balance_pending_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "weekly_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_balance_pending_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_coaching_messages: {
        Row: {
          content: string
          created_at: string
          driver_id: string
          id: string
          is_read: boolean | null
          message_type: string
          related_kpi: string | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string
          driver_id: string
          id?: string
          is_read?: boolean | null
          message_type: string
          related_kpi?: string | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string
          driver_id?: string
          id?: string
          is_read?: boolean | null
          message_type?: string
          related_kpi?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_coaching_messages_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_daily_entries: {
        Row: {
          courses_count: number | null
          created_at: string
          driver_id: string
          entry_date: string
          hours_worked: number | null
          id: string
          is_solocab: boolean | null
          km_driven: number | null
          new_clients_count: number | null
          notes: string | null
          platform_id: string | null
          revenue: number | null
          updated_at: string
        }
        Insert: {
          courses_count?: number | null
          created_at?: string
          driver_id: string
          entry_date?: string
          hours_worked?: number | null
          id?: string
          is_solocab?: boolean | null
          km_driven?: number | null
          new_clients_count?: number | null
          notes?: string | null
          platform_id?: string | null
          revenue?: number | null
          updated_at?: string
        }
        Update: {
          courses_count?: number | null
          created_at?: string
          driver_id?: string
          entry_date?: string
          hours_worked?: number | null
          id?: string
          is_solocab?: boolean | null
          km_driven?: number | null
          new_clients_count?: number | null
          notes?: string | null
          platform_id?: string | null
          revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_daily_entries_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_daily_entries_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "driver_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_documents: {
        Row: {
          can_be_updated: boolean
          created_at: string
          document_type: string
          driver_id: string
          expires_at: string | null
          file_name: string
          file_url: string
          id: string
          is_locked: boolean
          rejected_at: string | null
          rejected_by: string | null
          rejection_reason: string | null
          status: string
          updated_at: string
          uploaded_at: string
          validated_at: string | null
          validated_by: string | null
        }
        Insert: {
          can_be_updated?: boolean
          created_at?: string
          document_type: string
          driver_id: string
          expires_at?: string | null
          file_name: string
          file_url: string
          id?: string
          is_locked?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Update: {
          can_be_updated?: boolean
          created_at?: string
          document_type?: string
          driver_id?: string
          expires_at?: string | null
          file_name?: string
          file_url?: string
          id?: string
          is_locked?: boolean
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          uploaded_at?: string
          validated_at?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_favorites: {
        Row: {
          created_at: string
          driver_id: string
          favorite_driver_id: string
          id: string
          notes: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          favorite_driver_id: string
          id?: string
          notes?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          favorite_driver_id?: string
          id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_favorites_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_feedback: {
        Row: {
          admin_id: string | null
          admin_response: string | null
          ai_analysis: string | null
          ai_suggestion: string | null
          created_at: string
          description: string
          driver_id: string
          id: string
          priority: string | null
          resolved_at: string | null
          status: string
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_response?: string | null
          ai_analysis?: string | null
          ai_suggestion?: string | null
          created_at?: string
          description: string
          driver_id: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_response?: string | null
          ai_analysis?: string | null
          ai_suggestion?: string | null
          created_at?: string
          description?: string
          driver_id?: string
          id?: string
          priority?: string | null
          resolved_at?: string | null
          status?: string
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_feedback_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_feedback_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_fees_ledger: {
        Row: {
          amount_cents: number
          collected_at: string | null
          collection_method: string | null
          course_id: string | null
          created_at: string
          description: string | null
          driver_id: string
          fee_type: string
          id: string
          status: string
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          collected_at?: string | null
          collection_method?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          driver_id: string
          fee_type?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          collected_at?: string | null
          collection_method?: string | null
          course_id?: string | null
          created_at?: string
          description?: string | null
          driver_id?: string
          fee_type?: string
          id?: string
          status?: string
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_fees_ledger_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_fees_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_objectives: {
        Row: {
          courses_target: number | null
          created_at: string
          driver_id: string
          hours_target: number | null
          id: string
          is_active: boolean | null
          km_target: number | null
          new_clients_target: number | null
          period_type: string
          rating_target: number | null
          revenue_target: number | null
          updated_at: string
        }
        Insert: {
          courses_target?: number | null
          created_at?: string
          driver_id: string
          hours_target?: number | null
          id?: string
          is_active?: boolean | null
          km_target?: number | null
          new_clients_target?: number | null
          period_type: string
          rating_target?: number | null
          revenue_target?: number | null
          updated_at?: string
        }
        Update: {
          courses_target?: number | null
          created_at?: string
          driver_id?: string
          hours_target?: number | null
          id?: string
          is_active?: boolean | null
          km_target?: number | null
          new_clients_target?: number | null
          period_type?: string
          rating_target?: number | null
          revenue_target?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_objectives_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_partnerships: {
        Row: {
          accepted_at: string | null
          blocked_at: string | null
          blocked_by_admin_id: string | null
          blocked_reason: string | null
          both_drivers_stripe_ready: boolean | null
          commission_percentage: number | null
          contract_document_url: string | null
          contract_generated_at: string | null
          created_at: string | null
          custom_payment_days: number | null
          driver_a_id: string
          driver_a_signed: boolean | null
          driver_a_signed_at: string | null
          driver_b_id: string
          driver_b_signed: boolean | null
          driver_b_signed_at: string | null
          id: string
          last_payment_date: string | null
          payment_day: number | null
          payment_methods: string[] | null
          payment_schedule: string | null
          pending_modification: boolean | null
          pending_modification_at: string | null
          pending_modification_by: string | null
          pending_modification_message: string | null
          pending_new_commission: number | null
          pending_new_payment_schedule: string | null
          proposal_message: string | null
          proposed_by: string
          sharing_blocked: boolean | null
          status: string | null
          stripe_connect_required: boolean | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          blocked_at?: string | null
          blocked_by_admin_id?: string | null
          blocked_reason?: string | null
          both_drivers_stripe_ready?: boolean | null
          commission_percentage?: number | null
          contract_document_url?: string | null
          contract_generated_at?: string | null
          created_at?: string | null
          custom_payment_days?: number | null
          driver_a_id: string
          driver_a_signed?: boolean | null
          driver_a_signed_at?: string | null
          driver_b_id: string
          driver_b_signed?: boolean | null
          driver_b_signed_at?: string | null
          id?: string
          last_payment_date?: string | null
          payment_day?: number | null
          payment_methods?: string[] | null
          payment_schedule?: string | null
          pending_modification?: boolean | null
          pending_modification_at?: string | null
          pending_modification_by?: string | null
          pending_modification_message?: string | null
          pending_new_commission?: number | null
          pending_new_payment_schedule?: string | null
          proposal_message?: string | null
          proposed_by: string
          sharing_blocked?: boolean | null
          status?: string | null
          stripe_connect_required?: boolean | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          blocked_at?: string | null
          blocked_by_admin_id?: string | null
          blocked_reason?: string | null
          both_drivers_stripe_ready?: boolean | null
          commission_percentage?: number | null
          contract_document_url?: string | null
          contract_generated_at?: string | null
          created_at?: string | null
          custom_payment_days?: number | null
          driver_a_id?: string
          driver_a_signed?: boolean | null
          driver_a_signed_at?: string | null
          driver_b_id?: string
          driver_b_signed?: boolean | null
          driver_b_signed_at?: string | null
          id?: string
          last_payment_date?: string | null
          payment_day?: number | null
          payment_methods?: string[] | null
          payment_schedule?: string | null
          pending_modification?: boolean | null
          pending_modification_at?: string | null
          pending_modification_by?: string | null
          pending_modification_message?: string | null
          pending_new_commission?: number | null
          pending_new_payment_schedule?: string | null
          proposal_message?: string | null
          proposed_by?: string
          sharing_blocked?: boolean | null
          status?: string | null
          stripe_connect_required?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_partnerships_blocked_by_admin_id_fkey"
            columns: ["blocked_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_proposed_by_fkey"
            columns: ["proposed_by"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_platforms: {
        Row: {
          created_at: string
          display_order: number | null
          driver_id: string
          id: string
          is_active: boolean | null
          platform_icon: string | null
          platform_name: string
        }
        Insert: {
          created_at?: string
          display_order?: number | null
          driver_id: string
          id?: string
          is_active?: boolean | null
          platform_icon?: string | null
          platform_name: string
        }
        Update: {
          created_at?: string
          display_order?: number | null
          driver_id?: string
          id?: string
          is_active?: boolean | null
          platform_icon?: string | null
          platform_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_platforms_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_schedules: {
        Row: {
          blocked_by_course_id: string | null
          blocked_reason: string | null
          created_at: string
          date: string
          driver_id: string
          end_time: string
          id: string
          is_available: boolean | null
          start_time: string
          updated_at: string
        }
        Insert: {
          blocked_by_course_id?: string | null
          blocked_reason?: string | null
          created_at?: string
          date: string
          driver_id: string
          end_time: string
          id?: string
          is_available?: boolean | null
          start_time: string
          updated_at?: string
        }
        Update: {
          blocked_by_course_id?: string | null
          blocked_reason?: string | null
          created_at?: string
          date?: string
          driver_id?: string
          end_time?: string
          id?: string
          is_available?: boolean | null
          start_time?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_schedules_blocked_by_course_id_fkey"
            columns: ["blocked_by_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_schedules_blocked_by_course_id_fkey"
            columns: ["blocked_by_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          driver_id: string
          id: string
          plan: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          driver_id: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          driver_id?: string
          id?: string
          plan?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_subscriptions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicle_documents: {
        Row: {
          created_at: string
          document_name: string | null
          document_type: string
          document_url: string | null
          driver_id: string
          id: string
          rejection_reason: string | null
          status: string | null
          updated_at: string
          uploaded_at: string | null
          validated_at: string | null
          validated_by: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          document_name?: string | null
          document_type: string
          document_url?: string | null
          driver_id: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
          uploaded_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          document_name?: string | null
          document_type?: string
          document_url?: string | null
          driver_id?: string
          id?: string
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
          uploaded_at?: string | null
          validated_at?: string | null
          validated_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "driver_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_vehicles: {
        Row: {
          brand: string
          category: string
          color: string | null
          created_at: string
          custom_base_fare: number | null
          custom_hourly_rate: number | null
          custom_minimum_price: number | null
          custom_per_km_rate: number | null
          documents_validated: boolean | null
          driver_id: string
          equipment: string[] | null
          id: string
          is_active: boolean | null
          is_favorite: boolean | null
          max_passengers: number | null
          model: string
          photos: string[] | null
          plate: string | null
          updated_at: string
          year: number | null
        }
        Insert: {
          brand: string
          category?: string
          color?: string | null
          created_at?: string
          custom_base_fare?: number | null
          custom_hourly_rate?: number | null
          custom_minimum_price?: number | null
          custom_per_km_rate?: number | null
          documents_validated?: boolean | null
          driver_id: string
          equipment?: string[] | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          max_passengers?: number | null
          model: string
          photos?: string[] | null
          plate?: string | null
          updated_at?: string
          year?: number | null
        }
        Update: {
          brand?: string
          category?: string
          color?: string | null
          created_at?: string
          custom_base_fare?: number | null
          custom_hourly_rate?: number | null
          custom_minimum_price?: number | null
          custom_per_km_rate?: number | null
          documents_validated?: boolean | null
          driver_id?: string
          equipment?: string[] | null
          id?: string
          is_active?: boolean | null
          is_favorite?: boolean | null
          max_passengers?: number | null
          model?: string
          photos?: string[] | null
          plate?: string | null
          updated_at?: string
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_vehicles_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_video_views: {
        Row: {
          completed: boolean | null
          driver_id: string
          id: string
          video_id: string
          watch_percentage: number | null
          watched_at: string | null
        }
        Insert: {
          completed?: boolean | null
          driver_id: string
          id?: string
          video_id: string
          watch_percentage?: number | null
          watched_at?: string | null
        }
        Update: {
          completed?: boolean | null
          driver_id?: string
          id?: string
          video_id?: string
          watch_percentage?: number | null
          watched_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_video_views_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_video_views_video_id_fkey"
            columns: ["video_id"]
            isOneToOne: false
            referencedRelation: "training_videos"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_weekly_balances: {
        Row: {
          created_at: string
          driver_id: string
          id: string
          net_amount: number | null
          settlement_id: string
          shared_courses_as_receiver: number | null
          shared_courses_as_sender: number | null
          standard_courses_count: number | null
          stripe_transfer_id: string | null
          total_commissions_earned: number | null
          total_solocab_fees: number | null
          transfer_error: string | null
          transfer_executed_at: string | null
          transfer_status: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          id?: string
          net_amount?: number | null
          settlement_id: string
          shared_courses_as_receiver?: number | null
          shared_courses_as_sender?: number | null
          standard_courses_count?: number | null
          stripe_transfer_id?: string | null
          total_commissions_earned?: number | null
          total_solocab_fees?: number | null
          transfer_error?: string | null
          transfer_executed_at?: string | null
          transfer_status?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          id?: string
          net_amount?: number | null
          settlement_id?: string
          shared_courses_as_receiver?: number | null
          shared_courses_as_sender?: number | null
          standard_courses_count?: number | null
          stripe_transfer_id?: string | null
          total_commissions_earned?: number | null
          total_solocab_fees?: number | null
          transfer_error?: string | null
          transfer_executed_at?: string | null
          transfer_status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_weekly_balances_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "weekly_settlements"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_work_schedule: {
        Row: {
          created_at: string
          day_of_week: number
          driver_id: string
          end_time: string | null
          id: string
          is_working_day: boolean | null
          start_time: string | null
          target_hours: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          driver_id: string
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          target_hours?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          driver_id?: string
          end_time?: string | null
          id?: string
          is_working_day?: boolean | null
          start_time?: string | null
          target_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedule_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_work_schedules: {
        Row: {
          break_end: string | null
          break_start: string | null
          created_at: string
          day_of_week: number
          driver_id: string
          end_time: string | null
          id: string
          is_working_day: boolean
          notes: string | null
          start_time: string | null
          target_clients: number | null
          target_courses: number | null
          target_hours: number | null
          target_revenue: number | null
          updated_at: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week: number
          driver_id: string
          end_time?: string | null
          id?: string
          is_working_day?: boolean
          notes?: string | null
          start_time?: string | null
          target_clients?: number | null
          target_courses?: number | null
          target_hours?: number | null
          target_revenue?: number | null
          updated_at?: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          created_at?: string
          day_of_week?: number
          driver_id?: string
          end_time?: string | null
          id?: string
          is_working_day?: boolean
          notes?: string | null
          start_time?: string | null
          target_clients?: number | null
          target_courses?: number | null
          target_hours?: number | null
          target_revenue?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_work_schedules_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          accept_future_bookings: boolean | null
          accepted_payment_methods: string[] | null
          ai_coaching_recommendations: string | null
          airport_surcharge: number | null
          auto_accept_from_partners: boolean | null
          base_fare: number | null
          base_rate: number | null
          billing_type: string | null
          bio: string | null
          can_create_courses: boolean | null
          can_manage_clients: boolean | null
          card_photo_url: string | null
          company_address: string | null
          company_name: string | null
          contact_email: string | null
          contact_phone: string | null
          course_counter: number | null
          created_at: string
          current_latitude: number | null
          current_longitude: number | null
          default_payment_method: string | null
          deposit_enabled: boolean | null
          deposit_percentage: number | null
          deposit_refund_policy: string | null
          deposit_required_for: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          disputed_ratings_won: number | null
          documents: Json | null
          documents_access_blocked: boolean | null
          documents_access_blocked_at: string | null
          documents_deadline: string | null
          documents_status: string | null
          documents_submitted_at: string | null
          documents_validated_at: string | null
          driver_code: string | null
          driver_status: string
          equipment_received_at: string | null
          evening_surcharge: number | null
          fees_balance_cents: number
          fleet_documents_deadline: string | null
          fleet_documents_status: string | null
          fleet_documents_submitted_at: string | null
          fleet_manager_id: string | null
          free_access_duration_days: number | null
          free_access_end_date: string | null
          free_access_granted: boolean | null
          free_access_start_date: string | null
          free_access_type: string | null
          gallery_photos: string[] | null
          has_nfc_plate: boolean | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          hourly_rate: number | null
          id: string
          invoice_counter: number | null
          is_available_now: boolean | null
          is_demo_account: boolean | null
          is_fleet_driver: boolean | null
          is_legacy_stripe: boolean | null
          is_pioneer: boolean | null
          last_location_update: string | null
          last_seen_at: string | null
          legacy_stripe_customer_id: string | null
          legacy_trial_end_date: string | null
          license_number: string
          max_daily_courses: number | null
          max_passengers: number
          migrated_at: string | null
          migration_required: boolean | null
          minimum_price: number | null
          nfc_plate_order_id: string | null
          nfc_plate_ordered_at: string | null
          nfc_tag_number: string | null
          objectives_completed: boolean | null
          objectives_data: Json | null
          onboarding_billing_completed: boolean | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_documents_completed: boolean | null
          onboarding_nfc_completed: boolean | null
          onboarding_objectives_completed: boolean | null
          onboarding_profile_completed: boolean | null
          onboarding_settings_completed: boolean | null
          onboarding_step: string | null
          partner_course_counter: number | null
          partner_invoice_counter: number | null
          partner_order_counter: number | null
          partnerships_suspended: boolean | null
          partnerships_suspended_at: string | null
          partnerships_suspended_reason: string | null
          payment_config_updated_at: string | null
          payment_failed_at: string | null
          payment_failed_reason: string | null
          pending_plate_type: string | null
          pending_subscription_type: string | null
          pending_wants_plate: boolean | null
          per_km_rate: number | null
          pioneer_since: string | null
          preferred_zones: string[] | null
          public_profile_enabled: boolean | null
          quote_counter: number | null
          rating: number | null
          registration_data: Json | null
          registration_step: number | null
          reliability_score: number | null
          reservation_counter: number | null
          service_description: string | null
          services_offered: string[] | null
          sharing_available: boolean | null
          sharing_available_since: string | null
          sharing_number: number | null
          shipping_address: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          show_email: boolean | null
          show_payment_methods_publicly: boolean | null
          show_phone: boolean | null
          show_phone_for_sharing: boolean | null
          show_pricing_partners: boolean | null
          show_rating_for_sharing: boolean | null
          show_rating_partners: boolean | null
          show_rating_public: boolean | null
          show_rides_for_sharing: boolean | null
          siren: string | null
          siret: string | null
          smart_buffer_enabled: boolean | null
          smart_buffer_fallback_action: string | null
          smart_buffer_min_minutes: number | null
          status: Database["public"]["Enums"]["driver_status"]
          stripe_checkout_session_id: string | null
          stripe_connect_account_id: string | null
          stripe_connect_charges_enabled: boolean | null
          stripe_connect_created_at: string | null
          stripe_connect_details_submitted: boolean | null
          stripe_connect_onboarding_completed: boolean | null
          stripe_connect_payouts_enabled: boolean | null
          stripe_connect_status: string | null
          stripe_connect_updated_at: string | null
          stripe_customer_id: string | null
          stripe_subscription_paused: boolean | null
          stripe_subscription_paused_at: string | null
          subscription_cancel_at: string | null
          subscription_cancel_at_period_end: boolean | null
          subscription_end_date: string | null
          subscription_paid: boolean | null
          subscription_status: string | null
          subscription_stripe_id: string | null
          subscription_tier: string
          total_ratings_received: number | null
          total_rides: number | null
          tpe_received_at: string | null
          trial_activated_at: string | null
          trial_cancelled: boolean | null
          trial_end_date: string | null
          trial_ready_to_start: boolean | null
          trial_start_date: string | null
          trial_started_at: string | null
          trial_status: string | null
          tva_included: boolean
          tva_number: string | null
          tva_rate: number | null
          updated_at: string
          user_id: string
          validation_date: string | null
          vehicle_brand: string | null
          vehicle_category: string[] | null
          vehicle_color: string | null
          vehicle_equipment: string[] | null
          vehicle_model: string
          vehicle_photos: string[] | null
          vehicle_plate: string | null
          vehicle_seats: number | null
          vehicle_year: number | null
          visible_to_companies: boolean | null
          visible_to_drivers: boolean | null
          visible_to_fleet_managers: boolean | null
          wants_tpe_affiliate: boolean | null
          weekend_surcharge: number | null
          welcome_video_watched: boolean | null
          welcome_video_watched_at: string | null
          wizard_current_step: number | null
          working_sectors: string[] | null
        }
        Insert: {
          accept_future_bookings?: boolean | null
          accepted_payment_methods?: string[] | null
          ai_coaching_recommendations?: string | null
          airport_surcharge?: number | null
          auto_accept_from_partners?: boolean | null
          base_fare?: number | null
          base_rate?: number | null
          billing_type?: string | null
          bio?: string | null
          can_create_courses?: boolean | null
          can_manage_clients?: boolean | null
          card_photo_url?: string | null
          company_address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          course_counter?: number | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          default_payment_method?: string | null
          deposit_enabled?: boolean | null
          deposit_percentage?: number | null
          deposit_refund_policy?: string | null
          deposit_required_for?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          disputed_ratings_won?: number | null
          documents?: Json | null
          documents_access_blocked?: boolean | null
          documents_access_blocked_at?: string | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          documents_validated_at?: string | null
          driver_code?: string | null
          driver_status?: string
          equipment_received_at?: string | null
          evening_surcharge?: number | null
          fees_balance_cents?: number
          fleet_documents_deadline?: string | null
          fleet_documents_status?: string | null
          fleet_documents_submitted_at?: string | null
          fleet_manager_id?: string | null
          free_access_duration_days?: number | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          gallery_photos?: string[] | null
          has_nfc_plate?: boolean | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          invoice_counter?: number | null
          is_available_now?: boolean | null
          is_demo_account?: boolean | null
          is_fleet_driver?: boolean | null
          is_legacy_stripe?: boolean | null
          is_pioneer?: boolean | null
          last_location_update?: string | null
          last_seen_at?: string | null
          legacy_stripe_customer_id?: string | null
          legacy_trial_end_date?: string | null
          license_number: string
          max_daily_courses?: number | null
          max_passengers?: number
          migrated_at?: string | null
          migration_required?: boolean | null
          minimum_price?: number | null
          nfc_plate_order_id?: string | null
          nfc_plate_ordered_at?: string | null
          nfc_tag_number?: string | null
          objectives_completed?: boolean | null
          objectives_data?: Json | null
          onboarding_billing_completed?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_documents_completed?: boolean | null
          onboarding_nfc_completed?: boolean | null
          onboarding_objectives_completed?: boolean | null
          onboarding_profile_completed?: boolean | null
          onboarding_settings_completed?: boolean | null
          onboarding_step?: string | null
          partner_course_counter?: number | null
          partner_invoice_counter?: number | null
          partner_order_counter?: number | null
          partnerships_suspended?: boolean | null
          partnerships_suspended_at?: string | null
          partnerships_suspended_reason?: string | null
          payment_config_updated_at?: string | null
          payment_failed_at?: string | null
          payment_failed_reason?: string | null
          pending_plate_type?: string | null
          pending_subscription_type?: string | null
          pending_wants_plate?: boolean | null
          per_km_rate?: number | null
          pioneer_since?: string | null
          preferred_zones?: string[] | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          registration_data?: Json | null
          registration_step?: number | null
          reliability_score?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          sharing_available?: boolean | null
          sharing_available_since?: string | null
          sharing_number?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          show_email?: boolean | null
          show_payment_methods_publicly?: boolean | null
          show_phone?: boolean | null
          show_phone_for_sharing?: boolean | null
          show_pricing_partners?: boolean | null
          show_rating_for_sharing?: boolean | null
          show_rating_partners?: boolean | null
          show_rating_public?: boolean | null
          show_rides_for_sharing?: boolean | null
          siren?: string | null
          siret?: string | null
          smart_buffer_enabled?: boolean | null
          smart_buffer_fallback_action?: string | null
          smart_buffer_min_minutes?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          stripe_checkout_session_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_created_at?: string | null
          stripe_connect_details_submitted?: boolean | null
          stripe_connect_onboarding_completed?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_status?: string | null
          stripe_connect_updated_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_paused?: boolean | null
          stripe_subscription_paused_at?: string | null
          subscription_cancel_at?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          subscription_tier?: string
          total_ratings_received?: number | null
          total_rides?: number | null
          tpe_received_at?: string | null
          trial_activated_at?: string | null
          trial_cancelled?: boolean | null
          trial_end_date?: string | null
          trial_ready_to_start?: boolean | null
          trial_start_date?: string | null
          trial_started_at?: string | null
          trial_status?: string | null
          tva_included?: boolean
          tva_number?: string | null
          tva_rate?: number | null
          updated_at?: string
          user_id: string
          validation_date?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model: string
          vehicle_photos?: string[] | null
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_year?: number | null
          visible_to_companies?: boolean | null
          visible_to_drivers?: boolean | null
          visible_to_fleet_managers?: boolean | null
          wants_tpe_affiliate?: boolean | null
          weekend_surcharge?: number | null
          welcome_video_watched?: boolean | null
          welcome_video_watched_at?: string | null
          wizard_current_step?: number | null
          working_sectors?: string[] | null
        }
        Update: {
          accept_future_bookings?: boolean | null
          accepted_payment_methods?: string[] | null
          ai_coaching_recommendations?: string | null
          airport_surcharge?: number | null
          auto_accept_from_partners?: boolean | null
          base_fare?: number | null
          base_rate?: number | null
          billing_type?: string | null
          bio?: string | null
          can_create_courses?: boolean | null
          can_manage_clients?: boolean | null
          card_photo_url?: string | null
          company_address?: string | null
          company_name?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          course_counter?: number | null
          created_at?: string
          current_latitude?: number | null
          current_longitude?: number | null
          default_payment_method?: string | null
          deposit_enabled?: boolean | null
          deposit_percentage?: number | null
          deposit_refund_policy?: string | null
          deposit_required_for?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          disputed_ratings_won?: number | null
          documents?: Json | null
          documents_access_blocked?: boolean | null
          documents_access_blocked_at?: string | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          documents_validated_at?: string | null
          driver_code?: string | null
          driver_status?: string
          equipment_received_at?: string | null
          evening_surcharge?: number | null
          fees_balance_cents?: number
          fleet_documents_deadline?: string | null
          fleet_documents_status?: string | null
          fleet_documents_submitted_at?: string | null
          fleet_manager_id?: string | null
          free_access_duration_days?: number | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          gallery_photos?: string[] | null
          has_nfc_plate?: boolean | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          invoice_counter?: number | null
          is_available_now?: boolean | null
          is_demo_account?: boolean | null
          is_fleet_driver?: boolean | null
          is_legacy_stripe?: boolean | null
          is_pioneer?: boolean | null
          last_location_update?: string | null
          last_seen_at?: string | null
          legacy_stripe_customer_id?: string | null
          legacy_trial_end_date?: string | null
          license_number?: string
          max_daily_courses?: number | null
          max_passengers?: number
          migrated_at?: string | null
          migration_required?: boolean | null
          minimum_price?: number | null
          nfc_plate_order_id?: string | null
          nfc_plate_ordered_at?: string | null
          nfc_tag_number?: string | null
          objectives_completed?: boolean | null
          objectives_data?: Json | null
          onboarding_billing_completed?: boolean | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_documents_completed?: boolean | null
          onboarding_nfc_completed?: boolean | null
          onboarding_objectives_completed?: boolean | null
          onboarding_profile_completed?: boolean | null
          onboarding_settings_completed?: boolean | null
          onboarding_step?: string | null
          partner_course_counter?: number | null
          partner_invoice_counter?: number | null
          partner_order_counter?: number | null
          partnerships_suspended?: boolean | null
          partnerships_suspended_at?: string | null
          partnerships_suspended_reason?: string | null
          payment_config_updated_at?: string | null
          payment_failed_at?: string | null
          payment_failed_reason?: string | null
          pending_plate_type?: string | null
          pending_subscription_type?: string | null
          pending_wants_plate?: boolean | null
          per_km_rate?: number | null
          pioneer_since?: string | null
          preferred_zones?: string[] | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          registration_data?: Json | null
          registration_step?: number | null
          reliability_score?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          sharing_available?: boolean | null
          sharing_available_since?: string | null
          sharing_number?: number | null
          shipping_address?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          show_email?: boolean | null
          show_payment_methods_publicly?: boolean | null
          show_phone?: boolean | null
          show_phone_for_sharing?: boolean | null
          show_pricing_partners?: boolean | null
          show_rating_for_sharing?: boolean | null
          show_rating_partners?: boolean | null
          show_rating_public?: boolean | null
          show_rides_for_sharing?: boolean | null
          siren?: string | null
          siret?: string | null
          smart_buffer_enabled?: boolean | null
          smart_buffer_fallback_action?: string | null
          smart_buffer_min_minutes?: number | null
          status?: Database["public"]["Enums"]["driver_status"]
          stripe_checkout_session_id?: string | null
          stripe_connect_account_id?: string | null
          stripe_connect_charges_enabled?: boolean | null
          stripe_connect_created_at?: string | null
          stripe_connect_details_submitted?: boolean | null
          stripe_connect_onboarding_completed?: boolean | null
          stripe_connect_payouts_enabled?: boolean | null
          stripe_connect_status?: string | null
          stripe_connect_updated_at?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_paused?: boolean | null
          stripe_subscription_paused_at?: string | null
          subscription_cancel_at?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          subscription_tier?: string
          total_ratings_received?: number | null
          total_rides?: number | null
          tpe_received_at?: string | null
          trial_activated_at?: string | null
          trial_cancelled?: boolean | null
          trial_end_date?: string | null
          trial_ready_to_start?: boolean | null
          trial_start_date?: string | null
          trial_started_at?: string | null
          trial_status?: string | null
          tva_included?: boolean
          tva_number?: string | null
          tva_rate?: number | null
          updated_at?: string
          user_id?: string
          validation_date?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string
          vehicle_photos?: string[] | null
          vehicle_plate?: string | null
          vehicle_seats?: number | null
          vehicle_year?: number | null
          visible_to_companies?: boolean | null
          visible_to_drivers?: boolean | null
          visible_to_fleet_managers?: boolean | null
          wants_tpe_affiliate?: boolean | null
          weekend_surcharge?: number | null
          welcome_video_watched?: boolean | null
          welcome_video_watched_at?: string | null
          wizard_current_step?: number | null
          working_sectors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_nfc_plate_order_id_fkey"
            columns: ["nfc_plate_order_id"]
            isOneToOne: false
            referencedRelation: "nfc_plate_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_history: {
        Row: {
          content: string
          created_by: string | null
          id: string
          recipient_ids: string[] | null
          recipient_type: string
          recipients_count: number
          sent_at: string | null
          subject: string
        }
        Insert: {
          content: string
          created_by?: string | null
          id?: string
          recipient_ids?: string[] | null
          recipient_type: string
          recipients_count?: number
          sent_at?: string | null
          subject: string
        }
        Update: {
          content?: string
          created_by?: string | null
          id?: string
          recipient_ids?: string[] | null
          recipient_type?: string
          recipients_count?: number
          sent_at?: string | null
          subject?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          content: string
          created_at: string | null
          id: string
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      employee_role_upgrade_requests: {
        Row: {
          company_id: string
          created_at: string
          employee_id: string
          id: string
          request_message: string | null
          responded_at: string | null
          responded_by: string | null
          response_message: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          employee_id: string
          id?: string
          request_message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          employee_id?: string
          id?: string
          request_message?: string | null
          responded_at?: string | null
          responded_by?: string | null
          response_message?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_role_upgrade_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_role_upgrade_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      entity_dependencies: {
        Row: {
          auto_create: boolean | null
          auto_create_solution_id: string | null
          child_entity: string
          condition: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          parent_entity: string
          relationship_type: string
        }
        Insert: {
          auto_create?: boolean | null
          auto_create_solution_id?: string | null
          child_entity: string
          condition?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_entity: string
          relationship_type: string
        }
        Update: {
          auto_create?: boolean | null
          auto_create_solution_id?: string | null
          child_entity?: string
          condition?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          parent_entity?: string
          relationship_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "entity_dependencies_auto_create_solution_id_fkey"
            columns: ["auto_create_solution_id"]
            isOneToOne: false
            referencedRelation: "error_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      error_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          alert_type: string
          auto_resolved: boolean | null
          context: Json | null
          created_at: string | null
          first_occurrence_at: string | null
          id: string
          last_occurrence_at: string | null
          message: string
          occurrences_count: number | null
          pattern_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type: string
          auto_resolved?: boolean | null
          context?: Json | null
          created_at?: string | null
          first_occurrence_at?: string | null
          id?: string
          last_occurrence_at?: string | null
          message: string
          occurrences_count?: number | null
          pattern_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          alert_type?: string
          auto_resolved?: boolean | null
          context?: Json | null
          created_at?: string | null
          first_occurrence_at?: string | null
          id?: string
          last_occurrence_at?: string | null
          message?: string
          occurrences_count?: number | null
          pattern_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "error_alerts_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_learning_metrics"
            referencedColumns: ["pattern_id"]
          },
          {
            foreignKeyName: "error_alerts_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      error_learning_rules: {
        Row: {
          action_config: Json | null
          action_type: string
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          priority: number | null
          rule_code: string
          rule_name: string
          success_rate: number | null
          times_triggered: number | null
          trigger_condition: Json
          updated_at: string | null
        }
        Insert: {
          action_config?: Json | null
          action_type: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          priority?: number | null
          rule_code: string
          rule_name: string
          success_rate?: number | null
          times_triggered?: number | null
          trigger_condition: Json
          updated_at?: string | null
        }
        Update: {
          action_config?: Json | null
          action_type?: string
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          priority?: number | null
          rule_code?: string
          rule_name?: string
          success_rate?: number | null
          times_triggered?: number | null
          trigger_condition?: Json
          updated_at?: string | null
        }
        Relationships: []
      }
      error_learnings: {
        Row: {
          auto_fix_enabled: boolean | null
          auto_fix_function: string | null
          created_at: string | null
          description: string
          error_pattern: string
          error_type: string
          first_detected_at: string | null
          fix_failure_count: number | null
          fix_success_count: number | null
          id: string
          is_active: boolean | null
          last_occurrence_at: string | null
          occurrences: number | null
          updated_at: string | null
        }
        Insert: {
          auto_fix_enabled?: boolean | null
          auto_fix_function?: string | null
          created_at?: string | null
          description: string
          error_pattern: string
          error_type: string
          first_detected_at?: string | null
          fix_failure_count?: number | null
          fix_success_count?: number | null
          id?: string
          is_active?: boolean | null
          last_occurrence_at?: string | null
          occurrences?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_fix_enabled?: boolean | null
          auto_fix_function?: string | null
          created_at?: string | null
          description?: string
          error_pattern?: string
          error_type?: string
          first_detected_at?: string | null
          fix_failure_count?: number | null
          fix_success_count?: number | null
          id?: string
          is_active?: boolean | null
          last_occurrence_at?: string | null
          occurrences?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      error_occurrences: {
        Row: {
          browser_info: Json | null
          context: Json | null
          entity_id: string | null
          entity_type: string | null
          error_fingerprint: string
          error_message: string | null
          error_stack: string | null
          fix_attempted_at: string | null
          fix_duration_ms: number | null
          fix_successful: boolean | null
          id: string
          occurred_at: string | null
          pattern_id: string | null
          solution_id: string | null
          user_id: string | null
          was_auto_fixed: boolean | null
        }
        Insert: {
          browser_info?: Json | null
          context?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          error_fingerprint: string
          error_message?: string | null
          error_stack?: string | null
          fix_attempted_at?: string | null
          fix_duration_ms?: number | null
          fix_successful?: boolean | null
          id?: string
          occurred_at?: string | null
          pattern_id?: string | null
          solution_id?: string | null
          user_id?: string | null
          was_auto_fixed?: boolean | null
        }
        Update: {
          browser_info?: Json | null
          context?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          error_fingerprint?: string
          error_message?: string | null
          error_stack?: string | null
          fix_attempted_at?: string | null
          fix_duration_ms?: number | null
          fix_successful?: boolean | null
          id?: string
          occurred_at?: string | null
          pattern_id?: string | null
          solution_id?: string | null
          user_id?: string | null
          was_auto_fixed?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "error_occurrences_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_learning_metrics"
            referencedColumns: ["pattern_id"]
          },
          {
            foreignKeyName: "error_occurrences_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "error_occurrences_solution_id_fkey"
            columns: ["solution_id"]
            isOneToOne: false
            referencedRelation: "error_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      error_patterns: {
        Row: {
          auto_escalate_threshold: number | null
          auto_fix_enabled: boolean | null
          consecutive_failures: number | null
          context_keys: string[] | null
          cooldown_until: string | null
          created_at: string | null
          description: string | null
          detection_query: string | null
          entity_type: string
          fingerprint: string | null
          id: string
          is_active: boolean | null
          last_auto_fix_at: string | null
          last_occurrence_at: string | null
          learning_confidence: number | null
          occurrences_count: number | null
          pattern_code: string
          pattern_name: string
          severity: string | null
          updated_at: string | null
        }
        Insert: {
          auto_escalate_threshold?: number | null
          auto_fix_enabled?: boolean | null
          consecutive_failures?: number | null
          context_keys?: string[] | null
          cooldown_until?: string | null
          created_at?: string | null
          description?: string | null
          detection_query?: string | null
          entity_type: string
          fingerprint?: string | null
          id?: string
          is_active?: boolean | null
          last_auto_fix_at?: string | null
          last_occurrence_at?: string | null
          learning_confidence?: number | null
          occurrences_count?: number | null
          pattern_code: string
          pattern_name: string
          severity?: string | null
          updated_at?: string | null
        }
        Update: {
          auto_escalate_threshold?: number | null
          auto_fix_enabled?: boolean | null
          consecutive_failures?: number | null
          context_keys?: string[] | null
          cooldown_until?: string | null
          created_at?: string | null
          description?: string | null
          detection_query?: string | null
          entity_type?: string
          fingerprint?: string | null
          id?: string
          is_active?: boolean | null
          last_auto_fix_at?: string | null
          last_occurrence_at?: string | null
          learning_confidence?: number | null
          occurrences_count?: number | null
          pattern_code?: string
          pattern_name?: string
          severity?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      error_reports: {
        Row: {
          additional_context: Json | null
          admin_notes: string | null
          browser_info: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          page_route: string | null
          page_url: string | null
          resolved_at: string | null
          resolved_by: string | null
          screen_size: string | null
          status: string | null
          updated_at: string
          user_agent: string | null
          user_email: string | null
          user_id: string | null
          user_name: string | null
          user_role: string | null
        }
        Insert: {
          additional_context?: Json | null
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          page_route?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screen_size?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Update: {
          additional_context?: Json | null
          admin_notes?: string | null
          browser_info?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          page_route?: string | null
          page_url?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          screen_size?: string | null
          status?: string | null
          updated_at?: string
          user_agent?: string | null
          user_email?: string | null
          user_id?: string | null
          user_name?: string | null
          user_role?: string | null
        }
        Relationships: []
      }
      error_solutions: {
        Row: {
          avg_fix_duration_ms: number | null
          conditions: Json | null
          created_at: string | null
          description: string | null
          failed_fixes: number | null
          fix_function: string | null
          fix_query: string | null
          id: string
          is_active: boolean | null
          last_failure_at: string | null
          last_success_at: string | null
          pattern_id: string | null
          priority: number | null
          requires_validation: boolean | null
          rollback_query: string | null
          solution_code: string
          solution_name: string
          success_rate: number | null
          successful_fixes: number | null
          total_attempts: number | null
          updated_at: string | null
          validation_query: string | null
        }
        Insert: {
          avg_fix_duration_ms?: number | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          failed_fixes?: number | null
          fix_function?: string | null
          fix_query?: string | null
          id?: string
          is_active?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          pattern_id?: string | null
          priority?: number | null
          requires_validation?: boolean | null
          rollback_query?: string | null
          solution_code: string
          solution_name: string
          success_rate?: number | null
          successful_fixes?: number | null
          total_attempts?: number | null
          updated_at?: string | null
          validation_query?: string | null
        }
        Update: {
          avg_fix_duration_ms?: number | null
          conditions?: Json | null
          created_at?: string | null
          description?: string | null
          failed_fixes?: number | null
          fix_function?: string | null
          fix_query?: string | null
          id?: string
          is_active?: boolean | null
          last_failure_at?: string | null
          last_success_at?: string | null
          pattern_id?: string | null
          priority?: number | null
          requires_validation?: boolean | null
          rollback_query?: string | null
          solution_code?: string
          solution_name?: string
          success_rate?: number | null
          successful_fixes?: number | null
          total_attempts?: number | null
          updated_at?: string | null
          validation_query?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "error_solutions_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_learning_metrics"
            referencedColumns: ["pattern_id"]
          },
          {
            foreignKeyName: "error_solutions_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_report_reminders: {
        Row: {
          expense_report_id: string
          id: string
          message: string | null
          read_at: string | null
          read_by_user_id: string | null
          sent_at: string
          sent_by_user_id: string
        }
        Insert: {
          expense_report_id: string
          id?: string
          message?: string | null
          read_at?: string | null
          read_by_user_id?: string | null
          sent_at?: string
          sent_by_user_id: string
        }
        Update: {
          expense_report_id?: string
          id?: string
          message?: string | null
          read_at?: string | null
          read_by_user_id?: string | null
          sent_at?: string
          sent_by_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expense_report_reminders_expense_report_id_fkey"
            columns: ["expense_report_id"]
            isOneToOne: false
            referencedRelation: "expense_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_reports: {
        Row: {
          amount: number
          company_id: string
          course_id: string | null
          created_at: string | null
          description: string | null
          employee_id: string
          facture_id: string | null
          id: string
          last_reminder_at: string | null
          notes: string | null
          payment_method: string
          receipt_url: string | null
          reimbursed_at: string | null
          reimbursement_method: string | null
          reimbursement_month: string | null
          reimbursement_notes: string | null
          rejection_reason: string | null
          reminder_count: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          employee_id: string
          facture_id?: string | null
          id?: string
          last_reminder_at?: string | null
          notes?: string | null
          payment_method: string
          receipt_url?: string | null
          reimbursed_at?: string | null
          reimbursement_method?: string | null
          reimbursement_month?: string | null
          reimbursement_notes?: string | null
          rejection_reason?: string | null
          reminder_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          employee_id?: string
          facture_id?: string | null
          id?: string
          last_reminder_at?: string | null
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          reimbursed_at?: string | null
          reimbursement_method?: string | null
          reimbursement_month?: string | null
          reimbursement_notes?: string | null
          rejection_reason?: string | null
          reminder_count?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expense_reports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "expense_reports_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_reports_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          airport_fee: number | null
          amount: number
          base_price: number | null
          cancellation_fee_amount: number | null
          cancellation_fee_charged: boolean | null
          cancelled_at: string | null
          city_pricing_name: string | null
          client_id: string | null
          company_employee_id: string | null
          company_id: string | null
          course_id: string
          created_at: string
          deposit_amount: number | null
          deposit_status: string | null
          devis_id: string | null
          discount_amount: number
          distance_km: number | null
          distance_price: number | null
          driver_id: string
          evening_surcharge_amount: number | null
          final_payment_amount: number | null
          id: string
          invoice_number: string
          invoice_number_generated: string | null
          is_stripe_payment: boolean | null
          net_amount_to_driver: number | null
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          peak_hours_surcharge_amount: number | null
          pricing_source: string | null
          promo_code: string | null
          solocab_fee_amount: number | null
          stripe_fee_amount: number | null
          stripe_payment_id: string | null
          time_price: number | null
          total_fees_amount: number | null
          tva_amount: number | null
          tva_rate: number | null
          updated_at: string
          weekend_surcharge_amount: number | null
        }
        Insert: {
          airport_fee?: number | null
          amount: number
          base_price?: number | null
          cancellation_fee_amount?: number | null
          cancellation_fee_charged?: boolean | null
          cancelled_at?: string | null
          city_pricing_name?: string | null
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id: string
          created_at?: string
          deposit_amount?: number | null
          deposit_status?: string | null
          devis_id?: string | null
          discount_amount?: number
          distance_km?: number | null
          distance_price?: number | null
          driver_id: string
          evening_surcharge_amount?: number | null
          final_payment_amount?: number | null
          id?: string
          invoice_number: string
          invoice_number_generated?: string | null
          is_stripe_payment?: boolean | null
          net_amount_to_driver?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          peak_hours_surcharge_amount?: number | null
          pricing_source?: string | null
          promo_code?: string | null
          solocab_fee_amount?: number | null
          stripe_fee_amount?: number | null
          stripe_payment_id?: string | null
          time_price?: number | null
          total_fees_amount?: number | null
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string
          weekend_surcharge_amount?: number | null
        }
        Update: {
          airport_fee?: number | null
          amount?: number
          base_price?: number | null
          cancellation_fee_amount?: number | null
          cancellation_fee_charged?: boolean | null
          cancelled_at?: string | null
          city_pricing_name?: string | null
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id?: string
          created_at?: string
          deposit_amount?: number | null
          deposit_status?: string | null
          devis_id?: string | null
          discount_amount?: number
          distance_km?: number | null
          distance_price?: number | null
          driver_id?: string
          evening_surcharge_amount?: number | null
          final_payment_amount?: number | null
          id?: string
          invoice_number?: string
          invoice_number_generated?: string | null
          is_stripe_payment?: boolean | null
          net_amount_to_driver?: number | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          peak_hours_surcharge_amount?: number | null
          pricing_source?: string | null
          promo_code?: string | null
          solocab_fee_amount?: number | null
          stripe_fee_amount?: number | null
          stripe_payment_id?: string | null
          time_price?: number | null
          total_fees_amount?: number | null
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string
          weekend_surcharge_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "factures_company_employee_id_fkey"
            columns: ["company_employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "factures_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: true
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "factures_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feedback_response_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          is_active: boolean | null
          message: string
          title: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          message: string
          title: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          message?: string
          title?: string
        }
        Relationships: []
      }
      fleet_client_invitations: {
        Row: {
          client_id: string | null
          client_name: string
          created_at: string
          email: string | null
          expires_at: string | null
          fleet_manager_id: string
          id: string
          notes: string | null
          phone: string | null
          status: string
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          client_id?: string | null
          client_name: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          fleet_manager_id: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          client_id?: string | null
          client_name?: string
          created_at?: string
          email?: string | null
          expires_at?: string | null
          fleet_manager_id?: string
          id?: string
          notes?: string | null
          phone?: string | null
          status?: string
          token?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_client_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_client_invitations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fleet_client_invitations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_client_invitations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_course_escalations: {
        Row: {
          company_request_id: string | null
          course_id: string | null
          created_at: string
          driver_id: string | null
          escalation_reason: string | null
          escalation_type: string
          fleet_manager_id: string
          id: string
          last_retry_at: string | null
          max_retries: number | null
          next_retry_at: string | null
          original_status: string | null
          reassigned_to_driver_id: string | null
          resolution_action: string | null
          resolved_at: string | null
          resolved_by_user_id: string | null
          retry_count: number | null
          retry_interval_minutes: number | null
          status: string
          updated_at: string
        }
        Insert: {
          company_request_id?: string | null
          course_id?: string | null
          created_at?: string
          driver_id?: string | null
          escalation_reason?: string | null
          escalation_type?: string
          fleet_manager_id: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          original_status?: string | null
          reassigned_to_driver_id?: string | null
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          retry_count?: number | null
          retry_interval_minutes?: number | null
          status?: string
          updated_at?: string
        }
        Update: {
          company_request_id?: string | null
          course_id?: string | null
          created_at?: string
          driver_id?: string | null
          escalation_reason?: string | null
          escalation_type?: string
          fleet_manager_id?: string
          id?: string
          last_retry_at?: string | null
          max_retries?: number | null
          next_retry_at?: string | null
          original_status?: string | null
          reassigned_to_driver_id?: string | null
          resolution_action?: string | null
          resolved_at?: string | null
          resolved_by_user_id?: string | null
          retry_count?: number | null
          retry_interval_minutes?: number | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_course_escalations_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_course_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_course_requests_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_course_escalations_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_dispatch_queue: {
        Row: {
          assigned_at: string | null
          assigned_driver_id: string | null
          client_id: string | null
          course_id: string | null
          course_request_id: string | null
          created_at: string | null
          current_driver_id: string | null
          declined_driver_ids: string[] | null
          destination_address: string
          dispatch_mode: string | null
          fleet_manager_id: string
          id: string
          notes: string | null
          notified_driver_ids: string[] | null
          passengers_count: number | null
          pickup_address: string
          scheduled_date: string
          status: string | null
          timeout_at: string | null
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_driver_id?: string | null
          client_id?: string | null
          course_id?: string | null
          course_request_id?: string | null
          created_at?: string | null
          current_driver_id?: string | null
          declined_driver_ids?: string[] | null
          destination_address: string
          dispatch_mode?: string | null
          fleet_manager_id: string
          id?: string
          notes?: string | null
          notified_driver_ids?: string[] | null
          passengers_count?: number | null
          pickup_address: string
          scheduled_date: string
          status?: string | null
          timeout_at?: string | null
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_driver_id?: string | null
          client_id?: string | null
          course_id?: string | null
          course_request_id?: string | null
          created_at?: string | null
          current_driver_id?: string | null
          declined_driver_ids?: string[] | null
          destination_address?: string
          dispatch_mode?: string | null
          fleet_manager_id?: string
          id?: string
          notes?: string | null
          notified_driver_ids?: string[] | null
          passengers_count?: number | null
          pickup_address?: string
          scheduled_date?: string
          status?: string | null
          timeout_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_course_request_id_fkey"
            columns: ["course_request_id"]
            isOneToOne: false
            referencedRelation: "fleet_manager_course_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_current_driver_id_fkey"
            columns: ["current_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_queue_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_dispatch_responses: {
        Row: {
          decline_reason: string | null
          dispatch_id: string
          driver_id: string
          id: string
          notified_at: string | null
          responded_at: string | null
          response: string | null
        }
        Insert: {
          decline_reason?: string | null
          dispatch_id: string
          driver_id: string
          id?: string
          notified_at?: string | null
          responded_at?: string | null
          response?: string | null
        }
        Update: {
          decline_reason?: string | null
          dispatch_id?: string
          driver_id?: string
          id?: string
          notified_at?: string | null
          responded_at?: string | null
          response?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_dispatch_responses_dispatch_id_fkey"
            columns: ["dispatch_id"]
            isOneToOne: false
            referencedRelation: "fleet_dispatch_queue"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_dispatch_responses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_blocks: {
        Row: {
          block_reason: string | null
          blocked_at: string
          blocked_by: string
          created_at: string
          driver_id: string
          fleet_manager_id: string
          id: string
        }
        Insert: {
          block_reason?: string | null
          blocked_at?: string
          blocked_by: string
          created_at?: string
          driver_id: string
          fleet_manager_id: string
          id?: string
        }
        Update: {
          block_reason?: string | null
          blocked_at?: string
          blocked_by?: string
          created_at?: string
          driver_id?: string
          fleet_manager_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_blocks_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_declined_courses: {
        Row: {
          course_id: string
          created_at: string
          declined_at: string
          declined_by_driver_id: string
          fleet_manager_id: string
          id: string
          reason: string | null
          reassigned_at: string | null
          reassigned_to_driver_id: string | null
          status: string
        }
        Insert: {
          course_id: string
          created_at?: string
          declined_at?: string
          declined_by_driver_id: string
          fleet_manager_id: string
          id?: string
          reason?: string | null
          reassigned_at?: string | null
          reassigned_to_driver_id?: string | null
          status?: string
        }
        Update: {
          course_id?: string
          created_at?: string
          declined_at?: string
          declined_by_driver_id?: string
          fleet_manager_id?: string
          id?: string
          reason?: string | null
          reassigned_at?: string | null
          reassigned_to_driver_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_declined_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_declined_by_driver_id_fkey"
            columns: ["declined_by_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_declined_courses_reassigned_to_driver_id_fkey"
            columns: ["reassigned_to_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_document_validations: {
        Row: {
          created_at: string
          document_name: string | null
          document_type: string
          document_url: string
          driver_id: string
          fleet_manager_id: string
          id: string
          notes: string | null
          original_uploaded_at: string | null
          status: string
          updated_at: string
          validated_at: string
          validated_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          document_name?: string | null
          document_type: string
          document_url: string
          driver_id: string
          fleet_manager_id: string
          id?: string
          notes?: string | null
          original_uploaded_at?: string | null
          status?: string
          updated_at?: string
          validated_at?: string
          validated_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          document_name?: string | null
          document_type?: string
          document_url?: string
          driver_id?: string
          fleet_manager_id?: string
          id?: string
          notes?: string | null
          original_uploaded_at?: string | null
          status?: string
          updated_at?: string
          validated_at?: string
          validated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_document_validations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_documents_archive: {
        Row: {
          archived_at: string | null
          created_at: string | null
          document_key: string
          document_label: string
          document_url: string
          driver_id: string
          fleet_manager_id: string
          id: string
          status: string | null
          uploaded_at: string
          validated_at: string | null
          validated_by_user_id: string | null
        }
        Insert: {
          archived_at?: string | null
          created_at?: string | null
          document_key: string
          document_label: string
          document_url: string
          driver_id: string
          fleet_manager_id: string
          id?: string
          status?: string | null
          uploaded_at: string
          validated_at?: string | null
          validated_by_user_id?: string | null
        }
        Update: {
          archived_at?: string | null
          created_at?: string | null
          document_key?: string
          document_label?: string
          document_url?: string
          driver_id?: string
          fleet_manager_id?: string
          id?: string
          status?: string | null
          uploaded_at?: string
          validated_at?: string | null
          validated_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_documents_archive_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_indirect_payments: {
        Row: {
          amount_to_pay_driver: number
          commission_amount: number
          confirmed_at: string | null
          confirmed_by_user_id: string | null
          contract_id: string
          course_ids: string[] | null
          courses_count: number | null
          created_at: string
          dispute_created_at: string | null
          dispute_reason: string | null
          dispute_resolution: string | null
          dispute_resolved_at: string | null
          driver_id: string
          fleet_manager_id: string
          id: string
          notes: string | null
          payment_method: string | null
          payment_proof_url: string | null
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string
          total_collected: number
          updated_at: string
        }
        Insert: {
          amount_to_pay_driver: number
          commission_amount?: number
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          contract_id: string
          course_ids?: string[] | null
          courses_count?: number | null
          created_at?: string
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          driver_id: string
          fleet_manager_id: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          total_collected: number
          updated_at?: string
        }
        Update: {
          amount_to_pay_driver?: number
          commission_amount?: number
          confirmed_at?: string | null
          confirmed_by_user_id?: string | null
          contract_id?: string
          course_ids?: string[] | null
          courses_count?: number | null
          created_at?: string
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_resolution?: string | null
          dispute_resolved_at?: string | null
          driver_id?: string
          fleet_manager_id?: string
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string
          total_collected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_indirect_payments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "fleet_indirect_payment_contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_indirect_payments_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_invitations: {
        Row: {
          commission_accepted: boolean | null
          commission_accepted_at: string | null
          commission_percentage: number | null
          created_at: string
          driver_cost: number | null
          driver_type: string
          email: string | null
          expires_at: string | null
          fleet_manager_id: string
          id: string
          is_paid: boolean | null
          token: string
          used: boolean | null
          used_at: string | null
          used_by_driver_id: string | null
        }
        Insert: {
          commission_accepted?: boolean | null
          commission_accepted_at?: string | null
          commission_percentage?: number | null
          created_at?: string
          driver_cost?: number | null
          driver_type?: string
          email?: string | null
          expires_at?: string | null
          fleet_manager_id: string
          id?: string
          is_paid?: boolean | null
          token: string
          used?: boolean | null
          used_at?: string | null
          used_by_driver_id?: string | null
        }
        Update: {
          commission_accepted?: boolean | null
          commission_accepted_at?: string | null
          commission_percentage?: number | null
          created_at?: string
          driver_cost?: number | null
          driver_type?: string
          email?: string | null
          expires_at?: string | null
          fleet_manager_id?: string
          id?: string
          is_paid?: boolean | null
          token?: string
          used?: boolean | null
          used_at?: string | null
          used_by_driver_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_invitations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_driver_partnerships: {
        Row: {
          accepted_at: string | null
          commission_fixed_amount: number | null
          commission_percentage: number
          commission_type: string
          contract_signed: boolean | null
          created_at: string
          default_equipment_type: string | null
          driver_confirmed_final_payment: boolean | null
          driver_confirmed_final_payment_at: string | null
          driver_id: string
          driver_signed: boolean | null
          driver_signed_at: string | null
          fleet_manager_confirmed_final_payment: boolean | null
          fleet_manager_confirmed_final_payment_at: string | null
          fleet_manager_id: string
          fleet_manager_signed: boolean | null
          fleet_manager_signed_at: string | null
          id: string
          initiated_by: string
          last_modified_at: string | null
          last_payment_date: string | null
          next_payment_date: string | null
          partnership_suspended: boolean | null
          payment_reminder_sent_at: string | null
          payment_schedule: string | null
          pending_modification: boolean | null
          pending_modification_at: string | null
          pending_modification_by: string | null
          pending_modification_reason: string | null
          pending_new_commission: number | null
          pending_new_commission_fixed_amount: number | null
          pending_new_commission_type: string | null
          pending_new_payment_schedule: string | null
          proposal_message: string | null
          proposed_at: string | null
          rejected_at: string | null
          rejection_reason: string | null
          status: string
          suspended_at: string | null
          suspension_reason: string | null
          terminated_at: string | null
          termination_pending_payment_validation: boolean | null
          termination_reason: string | null
          termination_requested_at: string | null
          termination_requested_by: string | null
          total_owed: number | null
          total_paid: number | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          commission_fixed_amount?: number | null
          commission_percentage?: number
          commission_type?: string
          contract_signed?: boolean | null
          created_at?: string
          default_equipment_type?: string | null
          driver_confirmed_final_payment?: boolean | null
          driver_confirmed_final_payment_at?: string | null
          driver_id: string
          driver_signed?: boolean | null
          driver_signed_at?: string | null
          fleet_manager_confirmed_final_payment?: boolean | null
          fleet_manager_confirmed_final_payment_at?: string | null
          fleet_manager_id: string
          fleet_manager_signed?: boolean | null
          fleet_manager_signed_at?: string | null
          id?: string
          initiated_by: string
          last_modified_at?: string | null
          last_payment_date?: string | null
          next_payment_date?: string | null
          partnership_suspended?: boolean | null
          payment_reminder_sent_at?: string | null
          payment_schedule?: string | null
          pending_modification?: boolean | null
          pending_modification_at?: string | null
          pending_modification_by?: string | null
          pending_modification_reason?: string | null
          pending_new_commission?: number | null
          pending_new_commission_fixed_amount?: number | null
          pending_new_commission_type?: string | null
          pending_new_payment_schedule?: string | null
          proposal_message?: string | null
          proposed_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          terminated_at?: string | null
          termination_pending_payment_validation?: boolean | null
          termination_reason?: string | null
          termination_requested_at?: string | null
          termination_requested_by?: string | null
          total_owed?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          commission_fixed_amount?: number | null
          commission_percentage?: number
          commission_type?: string
          contract_signed?: boolean | null
          created_at?: string
          default_equipment_type?: string | null
          driver_confirmed_final_payment?: boolean | null
          driver_confirmed_final_payment_at?: string | null
          driver_id?: string
          driver_signed?: boolean | null
          driver_signed_at?: string | null
          fleet_manager_confirmed_final_payment?: boolean | null
          fleet_manager_confirmed_final_payment_at?: string | null
          fleet_manager_id?: string
          fleet_manager_signed?: boolean | null
          fleet_manager_signed_at?: string | null
          id?: string
          initiated_by?: string
          last_modified_at?: string | null
          last_payment_date?: string | null
          next_payment_date?: string | null
          partnership_suspended?: boolean | null
          payment_reminder_sent_at?: string | null
          payment_schedule?: string | null
          pending_modification?: boolean | null
          pending_modification_at?: string | null
          pending_modification_by?: string | null
          pending_modification_reason?: string | null
          pending_new_commission?: number | null
          pending_new_commission_fixed_amount?: number | null
          pending_new_commission_type?: string | null
          pending_new_payment_schedule?: string | null
          proposal_message?: string | null
          proposed_at?: string | null
          rejected_at?: string | null
          rejection_reason?: string | null
          status?: string
          suspended_at?: string | null
          suspension_reason?: string | null
          terminated_at?: string | null
          termination_pending_payment_validation?: boolean | null
          termination_reason?: string | null
          termination_requested_at?: string | null
          termination_requested_by?: string | null
          total_owed?: number | null
          total_paid?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_driver_partnerships_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_indirect_payment_contracts: {
        Row: {
          clauses: Json | null
          commission_percentage: number
          contract_signed: boolean | null
          contract_signed_at: string | null
          contract_type: string
          created_at: string
          current_balance_owed_to_driver: number | null
          driver_id: string
          driver_signed: boolean | null
          driver_signed_at: string | null
          fleet_manager_id: string
          fleet_manager_signed: boolean | null
          fleet_manager_signed_at: string | null
          id: string
          last_settlement_date: string | null
          notes: string | null
          partnership_id: string
          payment_day: number | null
          payment_frequency: string
          status: string
          total_collected_by_fleet: number | null
          total_paid_to_driver: number | null
          updated_at: string
        }
        Insert: {
          clauses?: Json | null
          commission_percentage?: number
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_type?: string
          created_at?: string
          current_balance_owed_to_driver?: number | null
          driver_id: string
          driver_signed?: boolean | null
          driver_signed_at?: string | null
          fleet_manager_id: string
          fleet_manager_signed?: boolean | null
          fleet_manager_signed_at?: string | null
          id?: string
          last_settlement_date?: string | null
          notes?: string | null
          partnership_id: string
          payment_day?: number | null
          payment_frequency?: string
          status?: string
          total_collected_by_fleet?: number | null
          total_paid_to_driver?: number | null
          updated_at?: string
        }
        Update: {
          clauses?: Json | null
          commission_percentage?: number
          contract_signed?: boolean | null
          contract_signed_at?: string | null
          contract_type?: string
          created_at?: string
          current_balance_owed_to_driver?: number | null
          driver_id?: string
          driver_signed?: boolean | null
          driver_signed_at?: string | null
          fleet_manager_id?: string
          fleet_manager_signed?: boolean | null
          fleet_manager_signed_at?: string | null
          id?: string
          last_settlement_date?: string | null
          notes?: string | null
          partnership_id?: string
          payment_day?: number | null
          payment_frequency?: string
          status?: string
          total_collected_by_fleet?: number | null
          total_paid_to_driver?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_indirect_payment_contracts_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "fleet_driver_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_manager_clients: {
        Row: {
          client_id: string
          created_at: string
          fleet_manager_id: string
          id: string
          registered_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          fleet_manager_id: string
          id?: string
          registered_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          fleet_manager_id?: string
          id?: string
          registered_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_manager_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_clients_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fleet_manager_clients_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_clients_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_manager_course_requests: {
        Row: {
          assigned_driver_id: string | null
          client_id: string
          course_id: string | null
          created_at: string
          created_by_fleet_manager: boolean
          destination_address: string
          fleet_manager_id: string
          id: string
          notes: string | null
          pickup_address: string
          scheduled_date: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_driver_id?: string | null
          client_id: string
          course_id?: string | null
          created_at?: string
          created_by_fleet_manager?: boolean
          destination_address: string
          fleet_manager_id: string
          id?: string
          notes?: string | null
          pickup_address: string
          scheduled_date: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_driver_id?: string | null
          client_id?: string
          course_id?: string | null
          created_at?: string
          created_by_fleet_manager?: boolean
          destination_address?: string
          fleet_manager_id?: string
          id?: string
          notes?: string | null
          pickup_address?: string
          scheduled_date?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_assigned_driver_id_fkey"
            columns: ["assigned_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_course_requests_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_manager_drivers: {
        Row: {
          accept_auto_courses: boolean | null
          commission_percentage: number | null
          commission_type: string | null
          created_at: string
          documents_rejection_reason: string | null
          driver_id: string
          fleet_manager_id: string
          id: string
          is_salaried: boolean | null
          joined_at: string
          last_payment_date: string | null
          payment_agreement_signed: boolean | null
          payment_agreement_signed_at: string | null
          payment_schedule: string | null
          rejected_documents: Json | null
          removed_at: string | null
          removed_by_manager: boolean | null
          removed_reason: string | null
          status: string
          storefront_display_order: number | null
          temporary_access_expires_at: string | null
          temporary_access_granted: boolean | null
          temporary_access_granted_at: string | null
          temporary_access_reason: string | null
          total_owed: number | null
          visible_in_storefront: boolean | null
        }
        Insert: {
          accept_auto_courses?: boolean | null
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string
          documents_rejection_reason?: string | null
          driver_id: string
          fleet_manager_id: string
          id?: string
          is_salaried?: boolean | null
          joined_at?: string
          last_payment_date?: string | null
          payment_agreement_signed?: boolean | null
          payment_agreement_signed_at?: string | null
          payment_schedule?: string | null
          rejected_documents?: Json | null
          removed_at?: string | null
          removed_by_manager?: boolean | null
          removed_reason?: string | null
          status?: string
          storefront_display_order?: number | null
          temporary_access_expires_at?: string | null
          temporary_access_granted?: boolean | null
          temporary_access_granted_at?: string | null
          temporary_access_reason?: string | null
          total_owed?: number | null
          visible_in_storefront?: boolean | null
        }
        Update: {
          accept_auto_courses?: boolean | null
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string
          documents_rejection_reason?: string | null
          driver_id?: string
          fleet_manager_id?: string
          id?: string
          is_salaried?: boolean | null
          joined_at?: string
          last_payment_date?: string | null
          payment_agreement_signed?: boolean | null
          payment_agreement_signed_at?: string | null
          payment_schedule?: string | null
          rejected_documents?: Json | null
          removed_at?: string | null
          removed_by_manager?: boolean | null
          removed_reason?: string | null
          status?: string
          storefront_display_order?: number | null
          temporary_access_expires_at?: string | null
          temporary_access_granted?: boolean | null
          temporary_access_granted_at?: string | null
          temporary_access_reason?: string | null
          total_owed?: number | null
          visible_in_storefront?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_drivers_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_manager_invitations: {
        Row: {
          created_at: string
          email: string | null
          expires_at: string | null
          fleet_manager_id: string
          id: string
          token: string
          used: boolean | null
          used_at: string | null
          used_by_driver_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          expires_at?: string | null
          fleet_manager_id: string
          id?: string
          token: string
          used?: boolean | null
          used_at?: string | null
          used_by_driver_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          expires_at?: string | null
          fleet_manager_id?: string
          id?: string
          token?: string
          used?: boolean | null
          used_at?: string | null
          used_by_driver_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_manager_invitations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_invitations_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_manager_qr_codes: {
        Row: {
          code: string
          created_at: string
          fleet_manager_id: string
          id: string
          is_active: boolean | null
          qr_code_image: string | null
          scans_count: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          fleet_manager_id: string
          id?: string
          is_active?: boolean | null
          qr_code_image?: string | null
          scans_count?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          fleet_manager_id?: string
          id?: string
          is_active?: boolean | null
          qr_code_image?: string | null
          scans_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_manager_qr_codes_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: true
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_manager_qr_codes_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: true
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_managers: {
        Row: {
          address: string
          airport_surcharge: number | null
          assignment_mode: string | null
          auto_dispatch_enabled: boolean | null
          auto_validate_courses: boolean | null
          base_fare: number | null
          base_subscription_cost: number | null
          billing_history: Json | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          course_buffer_minutes: number | null
          created_at: string
          default_commission_percentage: number | null
          default_partnership_commission: number | null
          default_partnership_commission_fixed_amount: number | null
          default_partnership_commission_type: string
          default_payment_schedule: string | null
          description: string | null
          dispatch_driver_priority: string | null
          dispatch_notification_mode: string | null
          dispatch_priority: string | null
          dispatch_timeout_minutes: number | null
          documents: Json | null
          documents_access_blocked: boolean | null
          documents_access_blocked_at: string | null
          documents_deadline: string | null
          documents_status: string | null
          documents_submitted_at: string | null
          driver_profile_description: string | null
          evening_surcharge: number | null
          extra_drivers_count: number | null
          favorite_driver_priority: boolean | null
          first_order_commission_reduction: number | null
          first_order_discount_fixed: number | null
          first_order_discount_percentage: number | null
          free_access_end_date: string | null
          free_access_granted: boolean | null
          free_access_start_date: string | null
          free_access_type: string | null
          hourly_rate: number | null
          id: string
          logo_url: string | null
          max_free_drivers: number | null
          minimum_price: number | null
          monthly_extra_driver_cost: number | null
          next_billing_date: string | null
          partnership_terms: string | null
          per_km_rate: number | null
          qr_code_id: string | null
          services_offered: string[] | null
          show_address: boolean | null
          show_client_count_public: boolean | null
          show_contact_name: boolean | null
          show_driver_count_public: boolean | null
          show_drivers_in_public_storefront: boolean | null
          show_email: boolean | null
          show_phone: boolean | null
          siren: string | null
          siret: string
          smart_buffer_enabled: boolean | null
          smart_buffer_fallback_action: string | null
          smart_buffer_min_minutes: number | null
          status: string
          stripe_customer_id: string | null
          stripe_subscription_paused: boolean | null
          stripe_subscription_paused_at: string | null
          subscription_cancel_at: string | null
          subscription_cancel_at_period_end: boolean | null
          subscription_end_date: string | null
          subscription_paid: boolean | null
          subscription_status: string | null
          subscription_stripe_id: string | null
          total_clients: number | null
          total_drivers: number | null
          trial_cancelled: boolean | null
          trial_ends_at: string | null
          trial_started_at: string | null
          tva_included: boolean | null
          tva_number: string | null
          tva_rate: number | null
          updated_at: string
          user_id: string
          visible_to_companies: boolean | null
          visible_to_drivers: boolean | null
          weekend_surcharge: number | null
        }
        Insert: {
          address: string
          airport_surcharge?: number | null
          assignment_mode?: string | null
          auto_dispatch_enabled?: boolean | null
          auto_validate_courses?: boolean | null
          base_fare?: number | null
          base_subscription_cost?: number | null
          billing_history?: Json | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          course_buffer_minutes?: number | null
          created_at?: string
          default_commission_percentage?: number | null
          default_partnership_commission?: number | null
          default_partnership_commission_fixed_amount?: number | null
          default_partnership_commission_type?: string
          default_payment_schedule?: string | null
          description?: string | null
          dispatch_driver_priority?: string | null
          dispatch_notification_mode?: string | null
          dispatch_priority?: string | null
          dispatch_timeout_minutes?: number | null
          documents?: Json | null
          documents_access_blocked?: boolean | null
          documents_access_blocked_at?: string | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          driver_profile_description?: string | null
          evening_surcharge?: number | null
          extra_drivers_count?: number | null
          favorite_driver_priority?: boolean | null
          first_order_commission_reduction?: number | null
          first_order_discount_fixed?: number | null
          first_order_discount_percentage?: number | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          hourly_rate?: number | null
          id?: string
          logo_url?: string | null
          max_free_drivers?: number | null
          minimum_price?: number | null
          monthly_extra_driver_cost?: number | null
          next_billing_date?: string | null
          partnership_terms?: string | null
          per_km_rate?: number | null
          qr_code_id?: string | null
          services_offered?: string[] | null
          show_address?: boolean | null
          show_client_count_public?: boolean | null
          show_contact_name?: boolean | null
          show_driver_count_public?: boolean | null
          show_drivers_in_public_storefront?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          siren?: string | null
          siret: string
          smart_buffer_enabled?: boolean | null
          smart_buffer_fallback_action?: string | null
          smart_buffer_min_minutes?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_paused?: boolean | null
          stripe_subscription_paused_at?: string | null
          subscription_cancel_at?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_clients?: number | null
          total_drivers?: number | null
          trial_cancelled?: boolean | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          tva_included?: boolean | null
          tva_number?: string | null
          tva_rate?: number | null
          updated_at?: string
          user_id: string
          visible_to_companies?: boolean | null
          visible_to_drivers?: boolean | null
          weekend_surcharge?: number | null
        }
        Update: {
          address?: string
          airport_surcharge?: number | null
          assignment_mode?: string | null
          auto_dispatch_enabled?: boolean | null
          auto_validate_courses?: boolean | null
          base_fare?: number | null
          base_subscription_cost?: number | null
          billing_history?: Json | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          course_buffer_minutes?: number | null
          created_at?: string
          default_commission_percentage?: number | null
          default_partnership_commission?: number | null
          default_partnership_commission_fixed_amount?: number | null
          default_partnership_commission_type?: string
          default_payment_schedule?: string | null
          description?: string | null
          dispatch_driver_priority?: string | null
          dispatch_notification_mode?: string | null
          dispatch_priority?: string | null
          dispatch_timeout_minutes?: number | null
          documents?: Json | null
          documents_access_blocked?: boolean | null
          documents_access_blocked_at?: string | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          driver_profile_description?: string | null
          evening_surcharge?: number | null
          extra_drivers_count?: number | null
          favorite_driver_priority?: boolean | null
          first_order_commission_reduction?: number | null
          first_order_discount_fixed?: number | null
          first_order_discount_percentage?: number | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          hourly_rate?: number | null
          id?: string
          logo_url?: string | null
          max_free_drivers?: number | null
          minimum_price?: number | null
          monthly_extra_driver_cost?: number | null
          next_billing_date?: string | null
          partnership_terms?: string | null
          per_km_rate?: number | null
          qr_code_id?: string | null
          services_offered?: string[] | null
          show_address?: boolean | null
          show_client_count_public?: boolean | null
          show_contact_name?: boolean | null
          show_driver_count_public?: boolean | null
          show_drivers_in_public_storefront?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          siren?: string | null
          siret?: string
          smart_buffer_enabled?: boolean | null
          smart_buffer_fallback_action?: string | null
          smart_buffer_min_minutes?: number | null
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_paused?: boolean | null
          stripe_subscription_paused_at?: string | null
          subscription_cancel_at?: string | null
          subscription_cancel_at_period_end?: boolean | null
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_clients?: number | null
          total_drivers?: number | null
          trial_cancelled?: boolean | null
          trial_ends_at?: string | null
          trial_started_at?: string | null
          tva_included?: boolean | null
          tva_number?: string | null
          tva_rate?: number | null
          updated_at?: string
          user_id?: string
          visible_to_companies?: boolean | null
          visible_to_drivers?: boolean | null
          weekend_surcharge?: number | null
        }
        Relationships: []
      }
      fleet_partner_courses: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          cancelled_reason: string | null
          claimed_at: string | null
          claimed_by: string | null
          commission_amount: number | null
          commission_percentage: number | null
          company_id: string | null
          company_payment_status: string | null
          company_pays_fleet_amount: number | null
          company_request_id: string | null
          completed_at: string | null
          course_amount: number | null
          course_id: string
          created_at: string
          decline_reason: string | null
          declined_at: string | null
          driver_commission_paid_at: string | null
          driver_commission_paid_to_fleet: boolean | null
          driver_commission_to_fleet: number | null
          driver_course_number: string | null
          driver_id: string
          driver_notified_at: string | null
          earnings_for_driver: number | null
          equipment_type: string | null
          fleet_manager_id: string
          fleet_notified_at: string | null
          fleet_payment_to_driver_status: string | null
          fleet_pays_driver_amount: number | null
          fleet_to_driver_payment_confirmed: boolean | null
          fleet_to_driver_payment_confirmed_at: string | null
          fleet_to_driver_payment_pending: number | null
          fleet_to_driver_payment_sent: boolean | null
          fleet_to_driver_payment_sent_at: string | null
          id: string
          partner_reference_number: string | null
          partnership_id: string
          payment_declared_at: string | null
          payment_declared_by_driver: boolean | null
          payment_handled_by: string | null
          payment_method_used: string | null
          payment_notes: string | null
          payment_settled: boolean | null
          payment_settled_at: string | null
          payment_source: string | null
          pool_group_id: string | null
          sharing_mode: string | null
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          commission_amount?: number | null
          commission_percentage?: number | null
          company_id?: string | null
          company_payment_status?: string | null
          company_pays_fleet_amount?: number | null
          company_request_id?: string | null
          completed_at?: string | null
          course_amount?: number | null
          course_id: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          driver_commission_paid_at?: string | null
          driver_commission_paid_to_fleet?: boolean | null
          driver_commission_to_fleet?: number | null
          driver_course_number?: string | null
          driver_id: string
          driver_notified_at?: string | null
          earnings_for_driver?: number | null
          equipment_type?: string | null
          fleet_manager_id: string
          fleet_notified_at?: string | null
          fleet_payment_to_driver_status?: string | null
          fleet_pays_driver_amount?: number | null
          fleet_to_driver_payment_confirmed?: boolean | null
          fleet_to_driver_payment_confirmed_at?: string | null
          fleet_to_driver_payment_pending?: number | null
          fleet_to_driver_payment_sent?: boolean | null
          fleet_to_driver_payment_sent_at?: string | null
          id?: string
          partner_reference_number?: string | null
          partnership_id: string
          payment_declared_at?: string | null
          payment_declared_by_driver?: boolean | null
          payment_handled_by?: string | null
          payment_method_used?: string | null
          payment_notes?: string | null
          payment_settled?: boolean | null
          payment_settled_at?: string | null
          payment_source?: string | null
          pool_group_id?: string | null
          sharing_mode?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_reason?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          commission_amount?: number | null
          commission_percentage?: number | null
          company_id?: string | null
          company_payment_status?: string | null
          company_pays_fleet_amount?: number | null
          company_request_id?: string | null
          completed_at?: string | null
          course_amount?: number | null
          course_id?: string
          created_at?: string
          decline_reason?: string | null
          declined_at?: string | null
          driver_commission_paid_at?: string | null
          driver_commission_paid_to_fleet?: boolean | null
          driver_commission_to_fleet?: number | null
          driver_course_number?: string | null
          driver_id?: string
          driver_notified_at?: string | null
          earnings_for_driver?: number | null
          equipment_type?: string | null
          fleet_manager_id?: string
          fleet_notified_at?: string | null
          fleet_payment_to_driver_status?: string | null
          fleet_pays_driver_amount?: number | null
          fleet_to_driver_payment_confirmed?: boolean | null
          fleet_to_driver_payment_confirmed_at?: string | null
          fleet_to_driver_payment_pending?: number | null
          fleet_to_driver_payment_sent?: boolean | null
          fleet_to_driver_payment_sent_at?: string | null
          id?: string
          partner_reference_number?: string | null
          partnership_id?: string
          payment_declared_at?: string | null
          payment_declared_by_driver?: boolean | null
          payment_handled_by?: string | null
          payment_method_used?: string | null
          payment_notes?: string | null
          payment_settled?: boolean | null
          payment_settled_at?: string | null
          payment_source?: string | null
          pool_group_id?: string | null
          sharing_mode?: string | null
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_partner_courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_course_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_course_requests_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "fleet_driver_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_partnership_payments: {
        Row: {
          amount: number
          courses_count: number | null
          created_at: string | null
          dispute_created_at: string | null
          dispute_reason: string | null
          dispute_status: string | null
          driver_id: string
          fleet_manager_id: string
          id: string
          notes: string | null
          partnership_id: string
          payment_method: string
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          received_at: string | null
          received_confirmed_by_user_id: string | null
          sent_at: string | null
          sent_by_user_id: string | null
          status: string | null
        }
        Insert: {
          amount: number
          courses_count?: number | null
          created_at?: string | null
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          driver_id: string
          fleet_manager_id: string
          id?: string
          notes?: string | null
          partnership_id: string
          payment_method: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          received_at?: string | null
          received_confirmed_by_user_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
        }
        Update: {
          amount?: number
          courses_count?: number | null
          created_at?: string | null
          dispute_created_at?: string | null
          dispute_reason?: string | null
          dispute_status?: string | null
          driver_id?: string
          fleet_manager_id?: string
          id?: string
          notes?: string | null
          partnership_id?: string
          payment_method?: string
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          received_at?: string | null
          received_confirmed_by_user_id?: string | null
          sent_at?: string | null
          sent_by_user_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partnership_payments_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "fleet_driver_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_promotions: {
        Row: {
          active: boolean | null
          code: string
          created_at: string | null
          current_uses: number | null
          description: string | null
          fleet_manager_id: string
          for_new_clients_only: boolean | null
          id: string
          max_uses: number | null
          min_amount: number | null
          type: string
          updated_at: string | null
          valid_until: string | null
          value: number
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          fleet_manager_id: string
          for_new_clients_only?: boolean | null
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          type: string
          updated_at?: string | null
          valid_until?: string | null
          value: number
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string | null
          current_uses?: number | null
          description?: string | null
          fleet_manager_id?: string
          for_new_clients_only?: boolean | null
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          type?: string
          updated_at?: string | null
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "fleet_promotions_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_promotions_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_required_documents: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          document_key: string
          fleet_manager_id: string
          id: string
          is_required: boolean | null
          label: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          document_key: string
          fleet_manager_id: string
          id?: string
          is_required?: boolean | null
          label: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          document_key?: string
          fleet_manager_id?: string
          id?: string
          is_required?: boolean | null
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fleet_required_documents_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_required_documents_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geocoding_cache: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string
          query_hash: string
          query_text: string
          query_type: string
          result: Json
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          query_hash: string
          query_text: string
          query_type?: string
          result: Json
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string
          query_hash?: string
          query_text?: string
          query_type?: string
          result?: Json
        }
        Relationships: []
      }
      guest_registration_tokens: {
        Row: {
          course_id: string | null
          created_at: string
          destination_address: string | null
          driver_id: string
          estimated_price: number | null
          expires_at: string
          guest_email: string | null
          guest_name: string
          guest_phone: string
          id: string
          is_used: boolean | null
          pickup_address: string | null
          scheduled_date: string | null
          token: string
          updated_at: string
          used_at: string | null
          used_by_user_id: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          destination_address?: string | null
          driver_id: string
          estimated_price?: number | null
          expires_at?: string
          guest_email?: string | null
          guest_name: string
          guest_phone: string
          id?: string
          is_used?: boolean | null
          pickup_address?: string | null
          scheduled_date?: string | null
          token?: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string
          destination_address?: string | null
          driver_id?: string
          estimated_price?: number | null
          expires_at?: string
          guest_email?: string | null
          guest_name?: string
          guest_phone?: string
          id?: string
          is_used?: boolean | null
          pickup_address?: string | null
          scheduled_date?: string | null
          token?: string
          updated_at?: string
          used_at?: string | null
          used_by_user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "guest_registration_tokens_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "guest_registration_tokens_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      health_checks: {
        Row: {
          check_name: string
          check_type: string
          created_at: string | null
          id: string
          interval_minutes: number | null
          is_enabled: boolean | null
          last_issues_fixed: number | null
          last_issues_found: number | null
          last_run_at: string | null
          next_run_at: string | null
          total_fixes: number | null
          total_runs: number | null
        }
        Insert: {
          check_name: string
          check_type: string
          created_at?: string | null
          id?: string
          interval_minutes?: number | null
          is_enabled?: boolean | null
          last_issues_fixed?: number | null
          last_issues_found?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          total_fixes?: number | null
          total_runs?: number | null
        }
        Update: {
          check_name?: string
          check_type?: string
          created_at?: string | null
          id?: string
          interval_minutes?: number | null
          is_enabled?: boolean | null
          last_issues_fixed?: number | null
          last_issues_found?: number | null
          last_run_at?: string | null
          next_run_at?: string | null
          total_fixes?: number | null
          total_runs?: number | null
        }
        Relationships: []
      }
      invitation_tokens: {
        Row: {
          created_at: string
          created_by_admin_id: string | null
          email: string | null
          expires_at: string | null
          id: string
          skip_documents: boolean
          token: string
          used: boolean
          used_at: string | null
          used_by_driver_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_admin_id?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          skip_documents?: boolean
          token: string
          used?: boolean
          used_at?: string | null
          used_by_driver_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_admin_id?: string | null
          email?: string | null
          expires_at?: string | null
          id?: string
          skip_documents?: boolean
          token?: string
          used?: boolean
          used_at?: string | null
          used_by_driver_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invitation_tokens_created_by_admin_id_fkey"
            columns: ["created_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitation_tokens_used_by_driver_id_fkey"
            columns: ["used_by_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      manual_fixes: {
        Row: {
          created_at: string | null
          error_occurrence_id: string | null
          fix_code: string | null
          fix_description: string
          fix_steps: Json | null
          fixed_by: string | null
          id: string
          pattern_id: string | null
          should_auto_fix: boolean | null
          was_successful: boolean | null
        }
        Insert: {
          created_at?: string | null
          error_occurrence_id?: string | null
          fix_code?: string | null
          fix_description: string
          fix_steps?: Json | null
          fixed_by?: string | null
          id?: string
          pattern_id?: string | null
          should_auto_fix?: boolean | null
          was_successful?: boolean | null
        }
        Update: {
          created_at?: string | null
          error_occurrence_id?: string | null
          fix_code?: string | null
          fix_description?: string
          fix_steps?: Json | null
          fixed_by?: string | null
          id?: string
          pattern_id?: string | null
          should_auto_fix?: boolean | null
          was_successful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "manual_fixes_error_occurrence_id_fkey"
            columns: ["error_occurrence_id"]
            isOneToOne: false
            referencedRelation: "error_occurrences"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manual_fixes_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_learning_metrics"
            referencedColumns: ["pattern_id"]
          },
          {
            foreignKeyName: "manual_fixes_pattern_id_fkey"
            columns: ["pattern_id"]
            isOneToOne: false
            referencedRelation: "error_patterns"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean | null
          sender_id: string
          updated_at: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id: string
          updated_at?: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean | null
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_plate_orders: {
        Row: {
          amount: number
          created_at: string
          delivered_at: string | null
          delivery_status: string
          driver_id: string | null
          email: string
          estimated_delivery_date: string | null
          first_name: string
          id: string
          last_name: string
          notes: string | null
          order_number: string
          payment_status: string
          phone: string | null
          plate_type: string | null
          qr_code_link: string | null
          shipped_at: string | null
          shipping_address: string
          shipping_city: string
          shipping_country: string
          shipping_postal_code: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          tracking_number: string | null
          tracking_token: string | null
          updated_at: string
          user_id: string | null
          with_subscription: boolean | null
        }
        Insert: {
          amount?: number
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          driver_id?: string | null
          email: string
          estimated_delivery_date?: string | null
          first_name: string
          id?: string
          last_name: string
          notes?: string | null
          order_number: string
          payment_status?: string
          phone?: string | null
          plate_type?: string | null
          qr_code_link?: string | null
          shipped_at?: string | null
          shipping_address: string
          shipping_city: string
          shipping_country?: string
          shipping_postal_code: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          tracking_number?: string | null
          tracking_token?: string | null
          updated_at?: string
          user_id?: string | null
          with_subscription?: boolean | null
        }
        Update: {
          amount?: number
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string
          driver_id?: string | null
          email?: string
          estimated_delivery_date?: string | null
          first_name?: string
          id?: string
          last_name?: string
          notes?: string | null
          order_number?: string
          payment_status?: string
          phone?: string | null
          plate_type?: string | null
          qr_code_link?: string | null
          shipped_at?: string | null
          shipping_address?: string
          shipping_city?: string
          shipping_country?: string
          shipping_postal_code?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          tracking_number?: string | null
          tracking_token?: string | null
          updated_at?: string
          user_id?: string | null
          with_subscription?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_plate_orders_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          created_at: string | null
          email_enabled: boolean | null
          id: string
          notify_course_accepted: boolean | null
          notify_new_course: boolean | null
          notify_new_devis: boolean | null
          notify_new_facture: boolean | null
          notify_new_message: boolean | null
          push_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notify_course_accepted?: boolean | null
          notify_new_course?: boolean | null
          notify_new_devis?: boolean | null
          notify_new_facture?: boolean | null
          notify_new_message?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_enabled?: boolean | null
          id?: string
          notify_course_accepted?: boolean | null
          notify_new_course?: boolean | null
          notify_new_devis?: boolean | null
          notify_new_facture?: boolean | null
          notify_new_message?: boolean | null
          push_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          category: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          push_sent: boolean | null
          push_sent_at: string | null
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          push_sent?: boolean | null
          push_sent_at?: string | null
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          push_sent?: boolean | null
          push_sent_at?: string | null
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      out_of_schedule_alerts: {
        Row: {
          action: string | null
          course_id: string
          course_time: string
          created_at: string | null
          day_of_week: number
          driver_end_time: string
          driver_id: string
          driver_start_time: string
          id: string
          notified_at: string | null
          resolved_at: string | null
          scheduled_date: string
        }
        Insert: {
          action?: string | null
          course_id: string
          course_time: string
          created_at?: string | null
          day_of_week: number
          driver_end_time: string
          driver_id: string
          driver_start_time: string
          id?: string
          notified_at?: string | null
          resolved_at?: string | null
          scheduled_date: string
        }
        Update: {
          action?: string | null
          course_id?: string
          course_time?: string
          created_at?: string | null
          day_of_week?: number
          driver_end_time?: string
          driver_id?: string
          driver_start_time?: string
          id?: string
          notified_at?: string | null
          resolved_at?: string | null
          scheduled_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "out_of_schedule_alerts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "out_of_schedule_alerts_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
        ]
      }
      partner_course_pool: {
        Row: {
          claimed_at: string | null
          claimed_by_driver_id: string | null
          commission_percentage: number
          course_amount: number
          course_id: string
          created_at: string
          estimated_commission: number
          expires_at: string
          id: string
          message: string | null
          partnership_ids: string[] | null
          pickup_city: string | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          pickup_sectors: string[] | null
          sender_driver_id: string
          sharing_scope: string
          solocab_fee_cents: number
          status: string
          target_driver_ids: string[] | null
          updated_at: string
        }
        Insert: {
          claimed_at?: string | null
          claimed_by_driver_id?: string | null
          commission_percentage?: number
          course_amount?: number
          course_id: string
          created_at?: string
          estimated_commission?: number
          expires_at: string
          id?: string
          message?: string | null
          partnership_ids?: string[] | null
          pickup_city?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_sectors?: string[] | null
          sender_driver_id: string
          sharing_scope?: string
          solocab_fee_cents?: number
          status?: string
          target_driver_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          claimed_at?: string | null
          claimed_by_driver_id?: string | null
          commission_percentage?: number
          course_amount?: number
          course_id?: string
          created_at?: string
          estimated_commission?: number
          expires_at?: string
          id?: string
          message?: string | null
          partnership_ids?: string[] | null
          pickup_city?: string | null
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          pickup_sectors?: string[] | null
          sender_driver_id?: string
          sharing_scope?: string
          solocab_fee_cents?: number
          status?: string
          target_driver_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_claimed_by_driver_id_fkey"
            columns: ["claimed_by_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_invoices: {
        Row: {
          billing_period_end: string | null
          billing_period_start: string | null
          commission_amount: number
          commission_percentage: number
          course_amount: number
          created_at: string
          driver_id: string
          id: string
          invoice_amount: number
          invoice_number: string
          invoice_type: string
          is_overdue: boolean | null
          last_reminder_sent_at: string | null
          order_document_id: string
          paid_at: string | null
          partnership_id: string
          payment_confirmed_by: string | null
          payment_due_date: string | null
          payment_notes: string | null
          payment_proof_url: string | null
          payment_schedule: string | null
          payment_sent_at: string | null
          payment_sent_by: string | null
          payment_status: string
          received_confirmed_at: string | null
          received_confirmed_by: string | null
          reminder_count: number | null
          shared_course_id: string
          tva_amount: number | null
          tva_rate: number | null
          updated_at: string
        }
        Insert: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          commission_amount: number
          commission_percentage: number
          course_amount: number
          created_at?: string
          driver_id: string
          id?: string
          invoice_amount: number
          invoice_number: string
          invoice_type: string
          is_overdue?: boolean | null
          last_reminder_sent_at?: string | null
          order_document_id: string
          paid_at?: string | null
          partnership_id: string
          payment_confirmed_by?: string | null
          payment_due_date?: string | null
          payment_notes?: string | null
          payment_proof_url?: string | null
          payment_schedule?: string | null
          payment_sent_at?: string | null
          payment_sent_by?: string | null
          payment_status?: string
          received_confirmed_at?: string | null
          received_confirmed_by?: string | null
          reminder_count?: number | null
          shared_course_id: string
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string
        }
        Update: {
          billing_period_end?: string | null
          billing_period_start?: string | null
          commission_amount?: number
          commission_percentage?: number
          course_amount?: number
          created_at?: string
          driver_id?: string
          id?: string
          invoice_amount?: number
          invoice_number?: string
          invoice_type?: string
          is_overdue?: boolean | null
          last_reminder_sent_at?: string | null
          order_document_id?: string
          paid_at?: string | null
          partnership_id?: string
          payment_confirmed_by?: string | null
          payment_due_date?: string | null
          payment_notes?: string | null
          payment_proof_url?: string | null
          payment_schedule?: string | null
          payment_sent_at?: string | null
          payment_sent_by?: string | null
          payment_status?: string
          received_confirmed_at?: string | null
          received_confirmed_by?: string | null
          reminder_count?: number | null
          shared_course_id?: string
          tva_amount?: number | null
          tva_rate?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_order_document_id_fkey"
            columns: ["order_document_id"]
            isOneToOne: false
            referencedRelation: "partner_order_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnership_balances"
            referencedColumns: ["partnership_id"]
          },
          {
            foreignKeyName: "partner_invoices_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_invoices_shared_course_id_fkey"
            columns: ["shared_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["shared_course_id"]
          },
          {
            foreignKeyName: "partner_invoices_shared_course_id_fkey"
            columns: ["shared_course_id"]
            isOneToOne: false
            referencedRelation: "shared_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_order_documents: {
        Row: {
          commission_amount: number
          commission_percentage: number
          completed_at: string | null
          course_amount: number
          course_id: string
          created_at: string
          destination_address: string
          distance_km: number | null
          document_number: string
          id: string
          paid_at: string | null
          passengers_count: number | null
          payment_confirmed_by: string | null
          payment_method_used: string | null
          payment_notes: string | null
          pickup_address: string
          receiver_driver_id: string
          receiver_earnings: number
          scheduled_date: string
          sender_driver_id: string
          shared_course_id: string
          status: string
          updated_at: string
        }
        Insert: {
          commission_amount: number
          commission_percentage: number
          completed_at?: string | null
          course_amount: number
          course_id: string
          created_at?: string
          destination_address: string
          distance_km?: number | null
          document_number: string
          id?: string
          paid_at?: string | null
          passengers_count?: number | null
          payment_confirmed_by?: string | null
          payment_method_used?: string | null
          payment_notes?: string | null
          pickup_address: string
          receiver_driver_id: string
          receiver_earnings: number
          scheduled_date: string
          sender_driver_id: string
          shared_course_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_percentage?: number
          completed_at?: string | null
          course_amount?: number
          course_id?: string
          created_at?: string
          destination_address?: string
          distance_km?: number | null
          document_number?: string
          id?: string
          paid_at?: string | null
          passengers_count?: number | null
          payment_confirmed_by?: string | null
          payment_method_used?: string | null
          payment_notes?: string | null
          pickup_address?: string
          receiver_driver_id?: string
          receiver_earnings?: number
          scheduled_date?: string
          sender_driver_id?: string
          shared_course_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_order_documents_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_payment_confirmed_by_fkey"
            columns: ["payment_confirmed_by"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_order_documents_shared_course_id_fkey"
            columns: ["shared_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["shared_course_id"]
          },
          {
            foreignKeyName: "partner_order_documents_shared_course_id_fkey"
            columns: ["shared_course_id"]
            isOneToOne: false
            referencedRelation: "shared_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_payments: {
        Row: {
          amount: number
          confirmed_at: string | null
          created_at: string
          dispute_reason: string | null
          disputed_at: string | null
          id: string
          notes: string | null
          partnership_id: string
          payer_driver_id: string
          payment_method: string | null
          payment_reference: string | null
          period_end: string | null
          period_start: string | null
          proof_url: string | null
          receiver_driver_id: string
          sent_at: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          confirmed_at?: string | null
          created_at?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          notes?: string | null
          partnership_id: string
          payer_driver_id: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          proof_url?: string | null
          receiver_driver_id: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          confirmed_at?: string | null
          created_at?: string
          dispute_reason?: string | null
          disputed_at?: string | null
          id?: string
          notes?: string | null
          partnership_id?: string
          payer_driver_id?: string
          payment_method?: string | null
          payment_reference?: string | null
          period_end?: string | null
          period_start?: string | null
          proof_url?: string | null
          receiver_driver_id?: string
          sent_at?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_payments_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnership_balances"
            referencedColumns: ["partnership_id"]
          },
          {
            foreignKeyName: "partner_payments_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_balances: {
        Row: {
          created_at: string
          driver_a_id: string
          driver_b_id: string
          id: string
          last_settlement_amount: number | null
          last_settlement_at: string | null
          net_balance: number
          partnership_id: string
          total_a_owes_b: number | null
          total_b_owes_a: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          driver_a_id: string
          driver_b_id: string
          id?: string
          last_settlement_amount?: number | null
          last_settlement_at?: string | null
          net_balance?: number
          partnership_id: string
          total_a_owes_b?: number | null
          total_b_owes_a?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          driver_a_id?: string
          driver_b_id?: string
          id?: string
          last_settlement_amount?: number | null
          last_settlement_at?: string | null
          net_balance?: number
          partnership_id?: string
          total_a_owes_b?: number | null
          total_b_owes_a?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_balances_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: true
            referencedRelation: "driver_partnership_balances"
            referencedColumns: ["partnership_id"]
          },
          {
            foreignKeyName: "partnership_balances_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: true
            referencedRelation: "driver_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_course_commissions: {
        Row: {
          commission_amount: number
          commission_percentage: number
          course_amount: number
          course_id: string
          created_at: string
          due_date: string | null
          id: string
          paid_at: string | null
          partnership_id: string
          payment_status: string
        }
        Insert: {
          commission_amount: number
          commission_percentage: number
          course_amount: number
          course_id: string
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          partnership_id: string
          payment_status?: string
        }
        Update: {
          commission_amount?: number
          commission_percentage?: number
          course_amount?: number
          course_id?: string
          created_at?: string
          due_date?: string | null
          id?: string
          paid_at?: string | null
          partnership_id?: string
          payment_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_course_commissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_course_commissions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "partnership_course_commissions_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "fleet_driver_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_disputes: {
        Row: {
          admin_id: string | null
          admin_notes: string | null
          amount_owed: number | null
          created_at: string
          description: string | null
          id: string
          partnership_id: string
          reason: string
          reported_driver_id: string
          reporter_driver_id: string
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_id?: string | null
          admin_notes?: string | null
          amount_owed?: number | null
          created_at?: string
          description?: string | null
          id?: string
          partnership_id: string
          reason: string
          reported_driver_id: string
          reporter_driver_id: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_id?: string | null
          admin_notes?: string | null
          amount_owed?: number | null
          created_at?: string
          description?: string | null
          id?: string
          partnership_id?: string
          reason?: string
          reported_driver_id?: string
          reporter_driver_id?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partnership_disputes_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnership_balances"
            referencedColumns: ["partnership_id"]
          },
          {
            foreignKeyName: "partnership_disputes_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reported_driver_id_fkey"
            columns: ["reported_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_disputes_reporter_driver_id_fkey"
            columns: ["reporter_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      partnership_settlements: {
        Row: {
          amount: number
          balance_id: string | null
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          initiated_at: string
          partnership_id: string
          payer_driver_id: string
          receiver_driver_id: string
          status: string
          stripe_transfer_id: string | null
        }
        Insert: {
          amount: number
          balance_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_at?: string
          partnership_id: string
          payer_driver_id: string
          receiver_driver_id: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Update: {
          amount?: number
          balance_id?: string | null
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          initiated_at?: string
          partnership_id?: string
          payer_driver_id?: string
          receiver_driver_id?: string
          status?: string
          stripe_transfer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partnership_settlements_balance_id_fkey"
            columns: ["balance_id"]
            isOneToOne: false
            referencedRelation: "partnership_balances"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnership_balances"
            referencedColumns: ["partnership_id"]
          },
          {
            foreignKeyName: "partnership_settlements_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_payer_driver_id_fkey"
            columns: ["payer_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partnership_settlements_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_confirmation_reminders: {
        Row: {
          company_id: string | null
          course_id: string
          created_at: string
          employee_id: string | null
          guest_email: string | null
          guest_name: string | null
          id: string
          invitation_token: string | null
          sent_at: string
          sent_by: string
        }
        Insert: {
          company_id?: string | null
          course_id: string
          created_at?: string
          employee_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          invitation_token?: string | null
          sent_at?: string
          sent_by: string
        }
        Update: {
          company_id?: string | null
          course_id?: string
          created_at?: string
          employee_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          id?: string
          invitation_token?: string | null
          sent_at?: string
          sent_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_confirmation_reminders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmation_reminders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_confirmation_reminders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "payment_confirmation_reminders_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          application_fee_amount: number | null
          authorized_at: string | null
          canceled_at: string | null
          capture_method: string | null
          captured_amount: number | null
          captured_at: string | null
          client_id: string | null
          course_id: string | null
          created_at: string
          currency: string | null
          devis_id: string | null
          driver_id: string | null
          failed_at: string | null
          failure_code: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          last_error: string | null
          metadata: Json | null
          net_to_driver: number | null
          payment_method: string | null
          payment_type: string
          refunded_amount: number | null
          refunded_at: string | null
          retry_count: number | null
          status: string
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_fee_amount: number | null
          stripe_payment_intent_id: string | null
          stripe_payment_method_id: string | null
          stripe_refund_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
        }
        Insert: {
          amount?: number
          application_fee_amount?: number | null
          authorized_at?: string | null
          canceled_at?: string | null
          capture_method?: string | null
          captured_amount?: number | null
          captured_at?: string | null
          client_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string | null
          devis_id?: string | null
          driver_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json | null
          net_to_driver?: number | null
          payment_method?: string | null
          payment_type?: string
          refunded_amount?: number | null
          refunded_at?: string | null
          retry_count?: number | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          application_fee_amount?: number | null
          authorized_at?: string | null
          canceled_at?: string | null
          capture_method?: string | null
          captured_amount?: number | null
          captured_at?: string | null
          client_id?: string | null
          course_id?: string | null
          created_at?: string
          currency?: string | null
          devis_id?: string | null
          driver_id?: string | null
          failed_at?: string | null
          failure_code?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          last_error?: string | null
          metadata?: Json | null
          net_to_driver?: number | null
          payment_method?: string | null
          payment_type?: string
          refunded_amount?: number | null
          refunded_at?: string | null
          retry_count?: number | null
          status?: string
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          stripe_payment_method_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "payments_devis_id_fkey"
            columns: ["devis_id"]
            isOneToOne: false
            referencedRelation: "devis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      podcast_segments: {
        Row: {
          created_at: string
          driver_id: string
          episode_id: string
          file_size: number | null
          id: string
          storage_path: string
        }
        Insert: {
          created_at?: string
          driver_id: string
          episode_id: string
          file_size?: number | null
          id?: string
          storage_path: string
        }
        Update: {
          created_at?: string
          driver_id?: string
          episode_id?: string
          file_size?: number | null
          id?: string
          storage_path?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string | null
          preferred_language: string | null
          profile_photo_url: string | null
          push_enabled: boolean | null
          push_subscription: Json | null
          roles: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name: string
          id: string
          phone?: string | null
          preferred_language?: string | null
          profile_photo_url?: string | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          roles?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string | null
          preferred_language?: string | null
          profile_photo_url?: string | null
          push_enabled?: boolean | null
          push_subscription?: Json | null
          roles?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      promotion_assignments: {
        Row: {
          assigned_at: string
          client_id: string
          id: string
          promotion_id: string
        }
        Insert: {
          assigned_at?: string
          client_id: string
          id?: string
          promotion_id: string
        }
        Update: {
          assigned_at?: string
          client_id?: string
          id?: string
          promotion_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotion_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotion_assignments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "promotion_assignments_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          active: boolean | null
          code: string
          created_at: string
          current_uses: number | null
          description: string | null
          driver_id: string
          id: string
          max_uses: number | null
          min_amount: number | null
          type: string
          updated_at: string
          valid_until: string | null
          value: number
        }
        Insert: {
          active?: boolean | null
          code: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          driver_id: string
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          type: string
          updated_at?: string
          valid_until?: string | null
          value: number
        }
        Update: {
          active?: boolean | null
          code?: string
          created_at?: string
          current_uses?: number | null
          description?: string | null
          driver_id?: string
          id?: string
          max_uses?: number | null
          min_amount?: number | null
          type?: string
          updated_at?: string
          valid_until?: string | null
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promotions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          created_at: string
          device_info: string | null
          endpoint: string
          id: string
          is_active: boolean | null
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          device_info?: string | null
          endpoint: string
          id?: string
          is_active?: boolean | null
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          device_info?: string | null
          endpoint?: string
          id?: string
          is_active?: boolean | null
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      qr_codes: {
        Row: {
          code: string
          created_at: string
          driver_id: string
          id: string
          is_active: boolean
          qr_code_image: string | null
          scans_count: number | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          driver_id: string
          id?: string
          is_active?: boolean
          qr_code_image?: string | null
          scans_count?: number | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          driver_id?: string
          id?: string
          is_active?: boolean
          qr_code_image?: string | null
          scans_count?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "qr_codes_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limit_records: {
        Row: {
          block_until: string | null
          created_at: string
          endpoint: string | null
          id: string
          identifier: string
          is_blocked: boolean | null
          request_count: number | null
          updated_at: string
          window_start: string
        }
        Insert: {
          block_until?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          identifier: string
          is_blocked?: boolean | null
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Update: {
          block_until?: string | null
          created_at?: string
          endpoint?: string | null
          id?: string
          identifier?: string
          is_blocked?: boolean | null
          request_count?: number | null
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      rate_limit_state: {
        Row: {
          api_key: string
          last_request: string | null
          request_count: number | null
          window_start: string | null
        }
        Insert: {
          api_key: string
          last_request?: string | null
          request_count?: number | null
          window_start?: string | null
        }
        Update: {
          api_key?: string
          last_request?: string | null
          request_count?: number | null
          window_start?: string | null
        }
        Relationships: []
      }
      rating_disputes: {
        Row: {
          ai_verdict: string | null
          ai_verdict_detail: string | null
          client_responded_at: string | null
          client_response: string | null
          created_at: string
          dispute_reason: string | null
          id: string
          initiated_by: string
          rating_id: string
          resolution: string | null
          resolved_at: string | null
          updated_at: string
        }
        Insert: {
          ai_verdict?: string | null
          ai_verdict_detail?: string | null
          client_responded_at?: string | null
          client_response?: string | null
          created_at?: string
          dispute_reason?: string | null
          id?: string
          initiated_by: string
          rating_id: string
          resolution?: string | null
          resolved_at?: string | null
          updated_at?: string
        }
        Update: {
          ai_verdict?: string | null
          ai_verdict_detail?: string | null
          client_responded_at?: string | null
          client_response?: string | null
          created_at?: string
          dispute_reason?: string | null
          id?: string
          initiated_by?: string
          rating_id?: string
          resolution?: string | null
          resolved_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rating_disputes_rating_id_fkey"
            columns: ["rating_id"]
            isOneToOne: false
            referencedRelation: "course_ratings"
            referencedColumns: ["id"]
          },
        ]
      }
      reengagement_campaigns: {
        Row: {
          blocked_step: string
          campaign_end_date: string
          campaign_started_at: string
          completed_at: string | null
          created_at: string
          driver_id: string
          email: string
          emails_sent: number
          full_name: string | null
          id: string
          is_active: boolean
          last_email_sent_at: string | null
          next_email_at: string | null
          phone: string | null
          resumed_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_step: string
          campaign_end_date?: string
          campaign_started_at?: string
          completed_at?: string | null
          created_at?: string
          driver_id: string
          email: string
          emails_sent?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_email_sent_at?: string | null
          next_email_at?: string | null
          phone?: string | null
          resumed_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_step?: string
          campaign_end_date?: string
          campaign_started_at?: string
          completed_at?: string | null
          created_at?: string
          driver_id?: string
          email?: string
          emails_sent?: number
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_email_sent_at?: string | null
          next_email_at?: string | null
          phone?: string | null
          resumed_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reengagement_campaigns_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: true
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_messages: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          ride_id: string
          sender_id: string
          sender_type: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          ride_id: string
          sender_id: string
          sender_type: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          ride_id?: string
          sender_id?: string
          sender_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "ride_messages_ride_id_fkey"
            columns: ["ride_id"]
            isOneToOne: false
            referencedRelation: "ride_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      ride_requests: {
        Row: {
          accepted_by_driver_id: string | null
          client_id: string | null
          created_at: string | null
          destination_address: string
          destination_latitude: number | null
          destination_longitude: number | null
          distance_km: number | null
          driver_count: number | null
          estimated_price: number | null
          final_course_id: string | null
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          payment_method: string | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          request_group_id: string | null
          request_type: string
          ride_type: string | null
          scheduled_date: string | null
          search_radius_km: number | null
          selected_driver_id: string | null
          status: string | null
          stripe_customer_id: string | null
          stripe_payment_method_id: string | null
          timeout_at: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_by_driver_id?: string | null
          client_id?: string | null
          created_at?: string | null
          destination_address: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          distance_km?: number | null
          driver_count?: number | null
          estimated_price?: number | null
          final_course_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          payment_method?: string | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          request_group_id?: string | null
          request_type?: string
          ride_type?: string | null
          scheduled_date?: string | null
          search_radius_km?: number | null
          selected_driver_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          timeout_at?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_by_driver_id?: string | null
          client_id?: string | null
          created_at?: string | null
          destination_address?: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          distance_km?: number | null
          driver_count?: number | null
          estimated_price?: number | null
          final_course_id?: string | null
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          payment_method?: string | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          request_group_id?: string | null
          request_type?: string
          ride_type?: string | null
          scheduled_date?: string | null
          search_radius_km?: number | null
          selected_driver_id?: string | null
          status?: string | null
          stripe_customer_id?: string | null
          stripe_payment_method_id?: string | null
          timeout_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_accepted_by_driver_id_fkey"
            columns: ["accepted_by_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "fleet_client_dashboard_view"
            referencedColumns: ["client_id"]
          },
          {
            foreignKeyName: "ride_requests_final_course_id_fkey"
            columns: ["final_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_final_course_id_fkey"
            columns: ["final_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ride_requests_selected_driver_id_fkey"
            columns: ["selected_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_user_deletions: {
        Row: {
          cancelled_at: string | null
          cancelled_by: string | null
          completed_at: string | null
          created_at: string
          deletion_date: string
          deletion_type: string
          driver_id: string | null
          email_notification_sent: boolean | null
          email_sent_at: string | null
          id: string
          reason_custom: string | null
          reason_type: string
          scheduled_at: string
          scheduled_by: string | null
          status: string
          stripe_subscription_cancelled: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          deletion_date: string
          deletion_type: string
          driver_id?: string | null
          email_notification_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          reason_custom?: string | null
          reason_type: string
          scheduled_at?: string
          scheduled_by?: string | null
          status?: string
          stripe_subscription_cancelled?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          cancelled_at?: string | null
          cancelled_by?: string | null
          completed_at?: string | null
          created_at?: string
          deletion_date?: string
          deletion_type?: string
          driver_id?: string | null
          email_notification_sent?: boolean | null
          email_sent_at?: string | null
          id?: string
          reason_custom?: string | null
          reason_type?: string
          scheduled_at?: string
          scheduled_by?: string | null
          status?: string
          stripe_subscription_cancelled?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "scheduled_user_deletions_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scheduled_user_deletions_scheduled_by_fkey"
            columns: ["scheduled_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      security_alerts: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          affected_entity_id: string | null
          affected_entity_type: string | null
          alert_type: string
          created_at: string
          description: string | null
          id: string
          is_acknowledged: boolean | null
          is_resolved: boolean | null
          metadata: Json | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          title: string
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_entity_id?: string | null
          affected_entity_type?: string | null
          alert_type: string
          created_at?: string
          description?: string | null
          id?: string
          is_acknowledged?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title: string
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          affected_entity_id?: string | null
          affected_entity_type?: string | null
          alert_type?: string
          created_at?: string
          description?: string | null
          id?: string
          is_acknowledged?: boolean | null
          is_resolved?: boolean | null
          metadata?: Json | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          title?: string
        }
        Relationships: []
      }
      security_audit_logs: {
        Row: {
          country_code: string | null
          created_at: string
          details: Json | null
          event_type: string
          id: string
          ip_address: string | null
          request_method: string | null
          request_path: string | null
          risk_score: number | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          details?: Json | null
          event_type: string
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          details?: Json | null
          event_type?: string
          id?: string
          ip_address?: string | null
          request_method?: string | null
          request_path?: string | null
          risk_score?: number | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      shared_course_payments: {
        Row: {
          commission_amount: number
          commission_percentage: number
          course_amount: number
          course_id: string
          created_at: string
          error_message: string | null
          id: string
          payment_captured_at: string | null
          platform_fee: number | null
          receiver_driver_id: string
          receiver_payout_amount: number
          sender_commission_amount: number
          sender_driver_id: string
          settled_at: string | null
          settlement_id: string | null
          shared_course_id: string
          status: string
          stripe_checkout_session_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_to_sender_id: string | null
          transfer_completed_at: string | null
          updated_at: string
        }
        Insert: {
          commission_amount: number
          commission_percentage: number
          course_amount: number
          course_id: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_captured_at?: string | null
          platform_fee?: number | null
          receiver_driver_id: string
          receiver_payout_amount: number
          sender_commission_amount: number
          sender_driver_id: string
          settled_at?: string | null
          settlement_id?: string | null
          shared_course_id: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_to_sender_id?: string | null
          transfer_completed_at?: string | null
          updated_at?: string
        }
        Update: {
          commission_amount?: number
          commission_percentage?: number
          course_amount?: number
          course_id?: string
          created_at?: string
          error_message?: string | null
          id?: string
          payment_captured_at?: string | null
          platform_fee?: number | null
          receiver_driver_id?: string
          receiver_payout_amount?: number
          sender_commission_amount?: number
          sender_driver_id?: string
          settled_at?: string | null
          settlement_id?: string | null
          shared_course_id?: string
          status?: string
          stripe_checkout_session_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_to_sender_id?: string | null
          transfer_completed_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shared_course_payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "weekly_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_course_payments_shared_course_id_fkey"
            columns: ["shared_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["shared_course_id"]
          },
          {
            foreignKeyName: "shared_course_payments_shared_course_id_fkey"
            columns: ["shared_course_id"]
            isOneToOne: false
            referencedRelation: "shared_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_courses: {
        Row: {
          accepted_at: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          claimed_at: string | null
          claimed_by: string | null
          client_message: string | null
          client_notified: boolean | null
          client_notified_at: string | null
          client_payment_method: string | null
          commission_amount: number
          commission_percentage: number
          completed_at: string | null
          course_amount: number
          course_id: string
          created_at: string | null
          decline_reason: string | null
          declined_at: string | null
          earnings_for_receiver: number | null
          id: string
          partner_reference_number: string | null
          partnership_id: string | null
          payment_id: string | null
          payment_method_used: string | null
          payment_required: boolean | null
          payment_settled: boolean | null
          payment_settled_at: string | null
          payment_status: string | null
          pool_entry_id: string | null
          pool_group_id: string | null
          receiver_course_number: string | null
          receiver_driver_id: string
          receiver_notified_at: string | null
          sender_driver_id: string
          sender_notified_at: string | null
          sharing_mode: string | null
          sharing_scope: string | null
          solocab_fee_cents: number
          started_at: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          client_message?: string | null
          client_notified?: boolean | null
          client_notified_at?: string | null
          client_payment_method?: string | null
          commission_amount: number
          commission_percentage: number
          completed_at?: string | null
          course_amount: number
          course_id: string
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          earnings_for_receiver?: number | null
          id?: string
          partner_reference_number?: string | null
          partnership_id?: string | null
          payment_id?: string | null
          payment_method_used?: string | null
          payment_required?: boolean | null
          payment_settled?: boolean | null
          payment_settled_at?: string | null
          payment_status?: string | null
          pool_entry_id?: string | null
          pool_group_id?: string | null
          receiver_course_number?: string | null
          receiver_driver_id: string
          receiver_notified_at?: string | null
          sender_driver_id: string
          sender_notified_at?: string | null
          sharing_mode?: string | null
          sharing_scope?: string | null
          solocab_fee_cents?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          claimed_at?: string | null
          claimed_by?: string | null
          client_message?: string | null
          client_notified?: boolean | null
          client_notified_at?: string | null
          client_payment_method?: string | null
          commission_amount?: number
          commission_percentage?: number
          completed_at?: string | null
          course_amount?: number
          course_id?: string
          created_at?: string | null
          decline_reason?: string | null
          declined_at?: string | null
          earnings_for_receiver?: number | null
          id?: string
          partner_reference_number?: string | null
          partnership_id?: string | null
          payment_id?: string | null
          payment_method_used?: string | null
          payment_required?: boolean | null
          payment_settled?: boolean | null
          payment_settled_at?: string | null
          payment_status?: string | null
          pool_entry_id?: string | null
          pool_group_id?: string | null
          receiver_course_number?: string | null
          receiver_driver_id?: string
          receiver_notified_at?: string | null
          sender_driver_id?: string
          sender_notified_at?: string | null
          sharing_mode?: string | null
          sharing_scope?: string | null
          solocab_fee_cents?: number
          started_at?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "shared_courses_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnership_balances"
            referencedColumns: ["partnership_id"]
          },
          {
            foreignKeyName: "shared_courses_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "driver_partnerships"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "shared_course_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_pool_entry_id_fkey"
            columns: ["pool_entry_id"]
            isOneToOne: false
            referencedRelation: "available_partner_courses"
            referencedColumns: ["pool_id"]
          },
          {
            foreignKeyName: "shared_courses_pool_entry_id_fkey"
            columns: ["pool_entry_id"]
            isOneToOne: false
            referencedRelation: "partner_course_pool"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sharing_weekly_reports: {
        Row: {
          created_at: string
          id: string
          report_data: Json | null
          total_commission_cents: number
          total_course_amount_cents: number
          total_shares: number
          total_solocab_fees_cents: number
          week_end: string
          week_start: string
        }
        Insert: {
          created_at?: string
          id?: string
          report_data?: Json | null
          total_commission_cents?: number
          total_course_amount_cents?: number
          total_shares?: number
          total_solocab_fees_cents?: number
          week_end: string
          week_start: string
        }
        Update: {
          created_at?: string
          id?: string
          report_data?: Json | null
          total_commission_cents?: number
          total_course_amount_cents?: number
          total_shares?: number
          total_solocab_fees_cents?: number
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
      social_links: {
        Row: {
          created_at: string
          display_order: number
          id: string
          is_active: boolean
          platform: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          platform: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          display_order?: number
          id?: string
          is_active?: boolean
          platform?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      solo_admin_ledger: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          driver_id: string
          fee_amount: number
          fee_type: string
          id: string
          settled_at: string | null
          settlement_id: string | null
          source_payment_id: string | null
          status: string
          week_start: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id: string
          fee_amount: number
          fee_type?: string
          id?: string
          settled_at?: string | null
          settlement_id?: string | null
          source_payment_id?: string | null
          status?: string
          week_start?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id?: string
          fee_amount?: number
          fee_type?: string
          id?: string
          settled_at?: string | null
          settlement_id?: string | null
          source_payment_id?: string | null
          status?: string
          week_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "solo_admin_ledger_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_settlement_id_fkey"
            columns: ["settlement_id"]
            isOneToOne: false
            referencedRelation: "weekly_settlements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "solo_admin_ledger_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      spatial_ref_sys: {
        Row: {
          auth_name: string | null
          auth_srid: number | null
          proj4text: string | null
          srid: number
          srtext: string | null
        }
        Insert: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid: number
          srtext?: string | null
        }
        Update: {
          auth_name?: string | null
          auth_srid?: number | null
          proj4text?: string | null
          srid?: number
          srtext?: string | null
        }
        Relationships: []
      }
      stripe_transactions: {
        Row: {
          course_id: string | null
          created_at: string | null
          description: string | null
          driver_id: string
          facture_id: string | null
          gross_amount: number
          id: string
          net_amount: number
          payment_method: string | null
          solocab_fee_amount: number | null
          source_payment_id: string | null
          status: string
          stripe_charge_id: string | null
          stripe_fee_amount: number | null
          stripe_payment_intent_id: string | null
          stripe_refund_id: string | null
          stripe_transfer_id: string | null
          transaction_type: string
          updated_at: string | null
        }
        Insert: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id: string
          facture_id?: string | null
          gross_amount: number
          id?: string
          net_amount: number
          payment_method?: string | null
          solocab_fee_amount?: number | null
          source_payment_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          transaction_type: string
          updated_at?: string | null
        }
        Update: {
          course_id?: string | null
          created_at?: string | null
          description?: string | null
          driver_id?: string
          facture_id?: string | null
          gross_amount?: number
          id?: string
          net_amount?: number
          payment_method?: string | null
          solocab_fee_amount?: number | null
          source_payment_id?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_fee_amount?: number | null
          stripe_payment_intent_id?: string | null
          stripe_refund_id?: string | null
          stripe_transfer_id?: string | null
          transaction_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stripe_transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stripe_transactions_source_payment_id_fkey"
            columns: ["source_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      suspicious_fingerprints: {
        Row: {
          associated_ips: string[] | null
          associated_user_ids: string[] | null
          fingerprint_hash: string
          first_seen_at: string
          flags: string[] | null
          id: string
          is_blocked: boolean | null
          language: string | null
          last_seen_at: string | null
          notes: string | null
          platform: string | null
          risk_score: number | null
          screen_resolution: string | null
          timezone: string | null
          user_agent: string | null
        }
        Insert: {
          associated_ips?: string[] | null
          associated_user_ids?: string[] | null
          fingerprint_hash: string
          first_seen_at?: string
          flags?: string[] | null
          id?: string
          is_blocked?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          notes?: string | null
          platform?: string | null
          risk_score?: number | null
          screen_resolution?: string | null
          timezone?: string | null
          user_agent?: string | null
        }
        Update: {
          associated_ips?: string[] | null
          associated_user_ids?: string[] | null
          fingerprint_hash?: string
          first_seen_at?: string
          flags?: string[] | null
          id?: string
          is_blocked?: boolean | null
          language?: string | null
          last_seen_at?: string | null
          notes?: string | null
          platform?: string | null
          risk_score?: number | null
          screen_resolution?: string | null
          timezone?: string | null
          user_agent?: string | null
        }
        Relationships: []
      }
      system_health_metrics: {
        Row: {
          id: string
          metric_data: Json | null
          metric_name: string
          metric_value: number | null
          recorded_at: string | null
        }
        Insert: {
          id?: string
          metric_data?: Json | null
          metric_name: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Update: {
          id?: string
          metric_data?: Json | null
          metric_name?: string
          metric_value?: number | null
          recorded_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          description: string | null
          id: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          id: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          description?: string | null
          id?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      training_videos: {
        Row: {
          category: string
          created_at: string | null
          description: string | null
          display_order: number | null
          duration_seconds: number | null
          id: string
          is_active: boolean | null
          is_mandatory: boolean | null
          thumbnail_url: string | null
          title: string
          updated_at: string | null
          video_url: string
        }
        Insert: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          thumbnail_url?: string | null
          title: string
          updated_at?: string | null
          video_url: string
        }
        Update: {
          category?: string
          created_at?: string | null
          description?: string | null
          display_order?: number | null
          duration_seconds?: number | null
          id?: string
          is_active?: boolean | null
          is_mandatory?: boolean | null
          thumbnail_url?: string | null
          title?: string
          updated_at?: string | null
          video_url?: string
        }
        Relationships: []
      }
      trial_emails: {
        Row: {
          created_at: string
          driver_id: string
          email_type: string
          id: string
          scheduled_for: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          driver_id: string
          email_type: string
          id?: string
          scheduled_for: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          driver_id?: string
          email_type?: string
          id?: string
          scheduled_for?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trial_emails_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      unassigned_fleet_courses: {
        Row: {
          attempts: number | null
          course_id: string
          created_at: string
          fleet_manager_id: string
          id: string
          last_attempt_at: string | null
          reason: string
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          attempts?: number | null
          course_id: string
          created_at?: string
          fleet_manager_id: string
          id?: string
          last_attempt_at?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          attempts?: number | null
          course_id?: string
          created_at?: string
          fleet_manager_id?: string
          id?: string
          last_attempt_at?: string | null
          reason?: string
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "unassigned_fleet_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unassigned_fleet_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "unassigned_fleet_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unassigned_fleet_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unassigned_fleet_courses_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback: {
        Row: {
          browser_info: string | null
          created_at: string
          description: string
          feedback_type: string
          id: string
          page_url: string | null
          priority: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          title: string
          updated_at: string
          user_email: string | null
          user_id: string
          user_name: string | null
          user_type: string
        }
        Insert: {
          browser_info?: string | null
          created_at?: string
          description: string
          feedback_type: string
          id?: string
          page_url?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title: string
          updated_at?: string
          user_email?: string | null
          user_id: string
          user_name?: string | null
          user_type: string
        }
        Update: {
          browser_info?: string | null
          created_at?: string
          description?: string
          feedback_type?: string
          id?: string
          page_url?: string | null
          priority?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_email?: string | null
          user_id?: string
          user_name?: string | null
          user_type?: string
        }
        Relationships: []
      }
      user_feedback_attachments: {
        Row: {
          created_at: string
          feedback_id: string
          file_name: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
        }
        Insert: {
          created_at?: string
          feedback_id: string
          file_name: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
        }
        Update: {
          created_at?: string
          feedback_id?: string
          file_name?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_attachments_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "user_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      user_feedback_responses: {
        Row: {
          admin_id: string
          admin_name: string | null
          created_at: string
          feedback_id: string
          id: string
          is_template: boolean | null
          message: string
        }
        Insert: {
          admin_id: string
          admin_name?: string | null
          created_at?: string
          feedback_id: string
          id?: string
          is_template?: boolean | null
          message: string
        }
        Update: {
          admin_id?: string
          admin_name?: string | null
          created_at?: string
          feedback_id?: string
          id?: string
          is_template?: boolean | null
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_feedback_responses_feedback_id_fkey"
            columns: ["feedback_id"]
            isOneToOne: false
            referencedRelation: "user_feedback"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      validation_rules: {
        Row: {
          auto_fix_solution_id: string | null
          created_at: string | null
          description: string | null
          entity_type: string
          error_message: string
          id: string
          is_active: boolean | null
          is_blocking: boolean | null
          rule_code: string
          rule_name: string
          trigger_event: string
          validation_query: string
        }
        Insert: {
          auto_fix_solution_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_type: string
          error_message: string
          id?: string
          is_active?: boolean | null
          is_blocking?: boolean | null
          rule_code: string
          rule_name: string
          trigger_event: string
          validation_query: string
        }
        Update: {
          auto_fix_solution_id?: string | null
          created_at?: string | null
          description?: string | null
          entity_type?: string
          error_message?: string
          id?: string
          is_active?: boolean | null
          is_blocking?: boolean | null
          rule_code?: string
          rule_name?: string
          trigger_event?: string
          validation_query?: string
        }
        Relationships: [
          {
            foreignKeyName: "validation_rules_auto_fix_solution_id_fkey"
            columns: ["auto_fix_solution_id"]
            isOneToOne: false
            referencedRelation: "error_solutions"
            referencedColumns: ["id"]
          },
        ]
      }
      vehicle_documents: {
        Row: {
          created_at: string
          document_type: string
          document_url: string | null
          driver_id: string
          expires_at: string | null
          file_name: string | null
          id: string
          rejection_reason: string | null
          status: string
          updated_at: string
          validated_at: string | null
          validated_by: string | null
          vehicle_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          document_url?: string | null
          driver_id: string
          expires_at?: string | null
          file_name?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicle_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          document_url?: string | null
          driver_id?: string
          expires_at?: string | null
          file_name?: string | null
          id?: string
          rejection_reason?: string | null
          status?: string
          updated_at?: string
          validated_at?: string | null
          validated_by?: string | null
          vehicle_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vehicle_documents_vehicle_id_fkey"
            columns: ["vehicle_id"]
            isOneToOne: false
            referencedRelation: "driver_vehicles"
            referencedColumns: ["id"]
          },
        ]
      }
      vtc_vehicles: {
        Row: {
          brand: string
          category: string
          created_at: string | null
          id: string
          image_url: string
          model: string
        }
        Insert: {
          brand: string
          category: string
          created_at?: string | null
          id?: string
          image_url: string
          model: string
        }
        Update: {
          brand?: string
          category?: string
          created_at?: string | null
          id?: string
          image_url?: string
          model?: string
        }
        Relationships: []
      }
      weekly_settlements: {
        Row: {
          admin_stripe_transfer_id: string | null
          admin_transfer_status: string | null
          created_at: string
          error_message: string | null
          id: string
          processed_at: string | null
          status: string
          stripe_fees_saved_estimate: number | null
          total_admin_fees_collected: number | null
          total_commission_volume: number | null
          total_platform_fees: number | null
          total_shared_courses: number | null
          total_solocab_standard_fees: number | null
          total_transfer_amount: number | null
          total_transfers_executed: number | null
          updated_at: string
          week_end: string
          week_start: string
        }
        Insert: {
          admin_stripe_transfer_id?: string | null
          admin_transfer_status?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          stripe_fees_saved_estimate?: number | null
          total_admin_fees_collected?: number | null
          total_commission_volume?: number | null
          total_platform_fees?: number | null
          total_shared_courses?: number | null
          total_solocab_standard_fees?: number | null
          total_transfer_amount?: number | null
          total_transfers_executed?: number | null
          updated_at?: string
          week_end: string
          week_start: string
        }
        Update: {
          admin_stripe_transfer_id?: string | null
          admin_transfer_status?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          processed_at?: string | null
          status?: string
          stripe_fees_saved_estimate?: number | null
          total_admin_fees_collected?: number | null
          total_commission_volume?: number | null
          total_platform_fees?: number | null
          total_shared_courses?: number | null
          total_solocab_standard_fees?: number | null
          total_transfer_amount?: number | null
          total_transfers_executed?: number | null
          updated_at?: string
          week_end?: string
          week_start?: string
        }
        Relationships: []
      }
    }
    Views: {
      available_partner_courses: {
        Row: {
          commission_percentage: number | null
          course_amount: number | null
          course_id: string | null
          created_at: string | null
          destination_address: string | null
          distance_km: number | null
          duration_minutes: number | null
          estimated_commission: number | null
          expires_at: string | null
          message: string | null
          passengers_count: number | null
          pickup_address: string | null
          pool_id: string | null
          scheduled_date: string | null
          sender_company: string | null
          sender_driver_id: string | null
          sender_name: string | null
          sender_photo: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_course_pool_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_course_pool_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_fleet_course_requests_view: {
        Row: {
          accepted_at: string | null
          accepted_driver_id: string | null
          company_email: string | null
          company_id: string | null
          company_name: string | null
          created_at: string | null
          created_by_user_id: string | null
          destination_address: string | null
          destination_latitude: number | null
          destination_longitude: number | null
          dispatched_to_fleet_at: string | null
          employee_id: string | null
          final_course_id: string | null
          fleet_agreement_id: string | null
          fleet_dispatched_driver_id: string | null
          fleet_manager_email: string | null
          fleet_manager_name: string | null
          guest_employee_email: string | null
          guest_employee_name: string | null
          guest_employee_phone: string | null
          id: string | null
          is_guest_employee: boolean | null
          notes: string | null
          passengers_count: number | null
          payment_flow: string | null
          payment_frequency: string | null
          payment_method_requested: string | null
          payment_methods: string[] | null
          pickup_address: string | null
          pickup_latitude: number | null
          pickup_longitude: number | null
          quotes_generated_at: string | null
          request_type: string | null
          scheduled_date: string | null
          sent_to_drivers_at: string | null
          status: string | null
          target_fleet_manager_id: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_accepted_driver_id_fkey"
            columns: ["accepted_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "company_employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_final_course_id_fkey"
            columns: ["final_course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_final_course_id_fkey"
            columns: ["final_course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_agreement_id_fkey"
            columns: ["fleet_agreement_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_agreements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_fleet_dispatched_driver_id_fkey"
            columns: ["fleet_dispatched_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_target_fleet_manager_id_fkey"
            columns: ["target_fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_course_requests_target_fleet_manager_id_fkey"
            columns: ["target_fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_data_isolation: {
        Row: {
          driver_id: string | null
          driver_name: string | null
          total_clients: number | null
          total_courses: number | null
          total_devis: number | null
          total_factures: number | null
        }
        Relationships: []
      }
      driver_partner_courses_view: {
        Row: {
          commission_amount: number | null
          course_amount: number | null
          course_id: string | null
          course_status: Database["public"]["Enums"]["course_status"] | null
          destination_address: string | null
          distance_km: number | null
          earnings_for_receiver: number | null
          my_reference: string | null
          original_reference: string | null
          pickup_address: string | null
          receiver_driver_id: string | null
          scheduled_date: string | null
          sender_company: string | null
          sender_driver_id: string | null
          sender_name: string | null
          shared_course_id: string | null
          shared_status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_receiver_driver_id_fkey"
            columns: ["receiver_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shared_courses_sender_driver_id_fkey"
            columns: ["sender_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_partnership_balances: {
        Row: {
          commission_percentage: number | null
          driver_a_id: string | null
          driver_a_owes_b: number | null
          driver_b_id: string | null
          driver_b_owes_a: number | null
          last_payment_date: string | null
          net_balance_a_to_b: number | null
          partnership_id: string | null
          payment_schedule: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_a_id_fkey"
            columns: ["driver_a_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "driver_partnerships_driver_b_id_fkey"
            columns: ["driver_b_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_statistics: {
        Row: {
          accepted_quotes: number | null
          cancelled_courses: number | null
          completed_courses: number | null
          confirmed_courses: number | null
          courses_today: number | null
          driver_id: string | null
          exclusive_clients: number | null
          free_clients: number | null
          in_progress_courses: number | null
          last_updated: string | null
          paid_invoices: number | null
          pending_courses: number | null
          pending_invoices: number | null
          pending_quotes: number | null
          rejected_quotes: number | null
          revenue_this_month: number | null
          revenue_this_week: number | null
          revenue_today: number | null
          total_clients: number | null
          total_courses: number | null
          total_invoices: number | null
          total_quotes: number | null
          total_revenue: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      driver_wallets: {
        Row: {
          driver_id: string | null
          net_earnings: number | null
          paid_out_balance: number | null
          pending_balance: number | null
          total_courses: number | null
          total_revenue: number | null
          total_solocab_fees: number | null
          total_stripe_fees: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers_available_for_sharing: {
        Row: {
          bio: string | null
          card_photo_url: string | null
          company_name: string | null
          created_at: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          full_name: string | null
          gallery_photos: string[] | null
          id: string | null
          is_pioneer: boolean | null
          max_passengers: number | null
          profile_photo_url: string | null
          rating: number | null
          service_description: string | null
          services_offered: string[] | null
          show_email: boolean | null
          show_phone: boolean | null
          status: Database["public"]["Enums"]["driver_status"] | null
          stripe_connect_account_id: string | null
          total_rides: number | null
          user_id: string | null
          vehicle_brand: string | null
          vehicle_category: string[] | null
          vehicle_color: string | null
          vehicle_equipment: string[] | null
          vehicle_model: string | null
          vehicle_photos: string[] | null
          vehicle_year: number | null
          working_sectors: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers_visible_to_companies: {
        Row: {
          bio: string | null
          card_photo_url: string | null
          company_name: string | null
          created_at: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          gallery_photos: string[] | null
          id: string | null
          is_pioneer: boolean | null
          max_passengers: number | null
          rating: number | null
          service_description: string | null
          services_offered: string[] | null
          show_email: boolean | null
          show_phone: boolean | null
          status: Database["public"]["Enums"]["driver_status"] | null
          total_rides: number | null
          user_id: string | null
          vehicle_brand: string | null
          vehicle_category: string[] | null
          vehicle_color: string | null
          vehicle_equipment: string[] | null
          vehicle_model: string | null
          vehicle_photos: string[] | null
          vehicle_year: number | null
          working_sectors: string[] | null
        }
        Insert: {
          bio?: string | null
          card_photo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          is_pioneer?: boolean | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string | null
          vehicle_photos?: string[] | null
          vehicle_year?: number | null
          working_sectors?: string[] | null
        }
        Update: {
          bio?: string | null
          card_photo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          is_pioneer?: boolean | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string | null
          vehicle_photos?: string[] | null
          vehicle_year?: number | null
          working_sectors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers_visible_to_fleet_managers: {
        Row: {
          bio: string | null
          card_photo_url: string | null
          company_name: string | null
          created_at: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          gallery_photos: string[] | null
          id: string | null
          is_pioneer: boolean | null
          max_passengers: number | null
          rating: number | null
          service_description: string | null
          services_offered: string[] | null
          show_email: boolean | null
          show_phone: boolean | null
          status: Database["public"]["Enums"]["driver_status"] | null
          total_rides: number | null
          user_id: string | null
          vehicle_brand: string | null
          vehicle_category: string[] | null
          vehicle_color: string | null
          vehicle_equipment: string[] | null
          vehicle_model: string | null
          vehicle_photos: string[] | null
          vehicle_year: number | null
          working_sectors: string[] | null
        }
        Insert: {
          bio?: string | null
          card_photo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          is_pioneer?: boolean | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string | null
          vehicle_photos?: string[] | null
          vehicle_year?: number | null
          working_sectors?: string[] | null
        }
        Update: {
          bio?: string | null
          card_photo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          is_pioneer?: boolean | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string | null
          vehicle_photos?: string[] | null
          vehicle_year?: number | null
          working_sectors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      error_learning_metrics: {
        Row: {
          auto_fix_enabled: boolean | null
          auto_fixed_count: number | null
          avg_fix_duration_ms: number | null
          consecutive_failures: number | null
          is_active: boolean | null
          last_auto_fix_at: string | null
          learning_confidence: number | null
          manual_fixes_count: number | null
          occurrences_count: number | null
          pattern_code: string | null
          pattern_id: string | null
          pattern_name: string | null
          severity: string | null
          successful_fixes: number | null
        }
        Insert: {
          auto_fix_enabled?: boolean | null
          auto_fixed_count?: never
          avg_fix_duration_ms?: never
          consecutive_failures?: number | null
          is_active?: boolean | null
          last_auto_fix_at?: string | null
          learning_confidence?: number | null
          manual_fixes_count?: never
          occurrences_count?: number | null
          pattern_code?: string | null
          pattern_id?: string | null
          pattern_name?: string | null
          severity?: string | null
          successful_fixes?: never
        }
        Update: {
          auto_fix_enabled?: boolean | null
          auto_fixed_count?: never
          avg_fix_duration_ms?: never
          consecutive_failures?: number | null
          is_active?: boolean | null
          last_auto_fix_at?: string | null
          learning_confidence?: number | null
          manual_fixes_count?: never
          occurrences_count?: number | null
          pattern_code?: string | null
          pattern_id?: string | null
          pattern_name?: string | null
          severity?: string | null
          successful_fixes?: never
        }
        Relationships: []
      }
      fleet_client_dashboard_view: {
        Row: {
          client_email: string | null
          client_id: string | null
          client_name: string | null
          client_phone: string | null
          client_photo: string | null
          created_at: string | null
          favorite_driver_id: string | null
          fleet_manager_email: string | null
          fleet_manager_id: string | null
          fleet_manager_logo: string | null
          fleet_manager_name: string | null
          fleet_manager_phone: string | null
          preferred_fleet_driver_id: string | null
          total_rides: number | null
          total_spent: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_favorite_driver_id_fkey"
            columns: ["favorite_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_preferred_fleet_driver_id_fkey"
            columns: ["preferred_fleet_driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_company_courses_view: {
        Row: {
          commission_amount: number | null
          commission_percentage: number | null
          company_id: string | null
          company_logo: string | null
          company_name: string | null
          company_request_id: string | null
          completed_at: string | null
          course_amount: number | null
          course_id: string | null
          course_status: Database["public"]["Enums"]["course_status"] | null
          created_at: string | null
          destination_address: string | null
          driver_commission_paid_to_fleet: boolean | null
          driver_commission_to_fleet: number | null
          driver_id: string | null
          earnings_for_driver: number | null
          equipment_type: string | null
          fleet_manager_id: string | null
          fleet_to_driver_payment_pending: number | null
          fleet_to_driver_payment_sent: boolean | null
          guest_employee_email: string | null
          guest_employee_name: string | null
          id: string | null
          partnership_id: string | null
          payment_declared_at: string | null
          payment_declared_by_driver: boolean | null
          payment_handled_by: string | null
          payment_method_requested: string | null
          payment_source: string | null
          pickup_address: string | null
          scheduled_date: string | null
          status: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fleet_partner_courses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_course_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_company_request_id_fkey"
            columns: ["company_request_id"]
            isOneToOne: false
            referencedRelation: "company_fleet_course_requests_view"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "driver_partner_courses_view"
            referencedColumns: ["course_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_data_isolation"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_statistics"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "driver_wallets"
            referencedColumns: ["driver_id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_available_for_sharing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "drivers_visible_to_fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "fleet_searchable_drivers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_driver_id_fkey"
            columns: ["driver_id"]
            isOneToOne: false
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "public_fleet_manager_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fleet_partner_courses_partnership_id_fkey"
            columns: ["partnership_id"]
            isOneToOne: false
            referencedRelation: "fleet_driver_partnerships"
            referencedColumns: ["id"]
          },
        ]
      }
      fleet_searchable_drivers: {
        Row: {
          bio: string | null
          card_photo_url: string | null
          company_name: string | null
          created_at: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          full_name: string | null
          gallery_photos: string[] | null
          id: string | null
          is_pioneer: boolean | null
          max_passengers: number | null
          profile_photo_url: string | null
          rating: number | null
          service_description: string | null
          services_offered: string[] | null
          show_email: boolean | null
          show_phone: boolean | null
          status: Database["public"]["Enums"]["driver_status"] | null
          total_rides: number | null
          user_id: string | null
          vehicle_brand: string | null
          vehicle_category: string[] | null
          vehicle_color: string | null
          vehicle_equipment: string[] | null
          vehicle_model: string | null
          vehicle_photos: string[] | null
          vehicle_year: number | null
          working_sectors: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      geography_columns: {
        Row: {
          coord_dimension: number | null
          f_geography_column: unknown
          f_table_catalog: unknown
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Relationships: []
      }
      geometry_columns: {
        Row: {
          coord_dimension: number | null
          f_geometry_column: unknown
          f_table_catalog: string | null
          f_table_name: unknown
          f_table_schema: unknown
          srid: number | null
          type: string | null
        }
        Insert: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Update: {
          coord_dimension?: number | null
          f_geometry_column?: unknown
          f_table_catalog?: string | null
          f_table_name?: unknown
          f_table_schema?: unknown
          srid?: number | null
          type?: string | null
        }
        Relationships: []
      }
      public_driver_profiles: {
        Row: {
          bio: string | null
          card_photo_url: string | null
          company_name: string | null
          created_at: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          gallery_photos: string[] | null
          id: string | null
          is_pioneer: boolean | null
          max_passengers: number | null
          rating: number | null
          service_description: string | null
          services_offered: string[] | null
          show_email: boolean | null
          show_phone: boolean | null
          status: Database["public"]["Enums"]["driver_status"] | null
          total_rides: number | null
          user_id: string | null
          vehicle_brand: string | null
          vehicle_category: string[] | null
          vehicle_color: string | null
          vehicle_equipment: string[] | null
          vehicle_model: string | null
          vehicle_photos: string[] | null
          vehicle_year: number | null
          working_sectors: string[] | null
        }
        Insert: {
          bio?: string | null
          card_photo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          is_pioneer?: boolean | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string | null
          vehicle_photos?: string[] | null
          vehicle_year?: number | null
          working_sectors?: string[] | null
        }
        Update: {
          bio?: string | null
          card_photo_url?: string | null
          company_name?: string | null
          created_at?: string | null
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          is_pioneer?: boolean | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          status?: Database["public"]["Enums"]["driver_status"] | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
          vehicle_category?: string[] | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string | null
          vehicle_photos?: string[] | null
          vehicle_year?: number | null
          working_sectors?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "drivers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      public_fleet_manager_profiles: {
        Row: {
          address: string | null
          company_name: string | null
          description: string | null
          id: string | null
          logo_url: string | null
          status: string | null
          visible_to_drivers: boolean | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
          visible_to_drivers?: boolean | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          description?: string | null
          id?: string | null
          logo_url?: string | null
          status?: string | null
          visible_to_drivers?: boolean | null
        }
        Relationships: []
      }
      qr_codes_public: {
        Row: {
          code: string | null
          id: string | null
          is_active: boolean | null
        }
        Insert: {
          code?: string | null
          id?: string | null
          is_active?: boolean | null
        }
        Update: {
          code?: string | null
          id?: string | null
          is_active?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      _postgis_deprecate: {
        Args: { newname: string; oldname: string; version: string }
        Returns: undefined
      }
      _postgis_index_extent: {
        Args: { col: string; tbl: unknown }
        Returns: unknown
      }
      _postgis_pgsql_version: { Args: never; Returns: string }
      _postgis_scripts_pgsql_version: { Args: never; Returns: string }
      _postgis_selectivity: {
        Args: { att_name: string; geom: unknown; mode?: string; tbl: unknown }
        Returns: number
      }
      _postgis_stats: {
        Args: { ""?: string; att_name: string; tbl: unknown }
        Returns: string
      }
      _st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_crosses: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      _st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      _st_intersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      _st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      _st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      _st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_sortablehash: { Args: { geom: unknown }; Returns: number }
      _st_touches: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      _st_voronoi: {
        Args: {
          clip?: unknown
          g1: unknown
          return_polygons?: boolean
          tolerance?: number
        }
        Returns: unknown
      }
      _st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      accept_devis_safely: {
        Args: { _client_user_id: string; _devis_id: string }
        Returns: {
          course_id: string
          message: string
          success: boolean
        }[]
      }
      accept_fleet_course_safely: {
        Args: { p_course_id: string; p_driver_id: string }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      accept_ride_request: {
        Args: { p_driver_id: string; p_request_id: string }
        Returns: Json
      }
      accept_shared_course: {
        Args: { p_driver_id: string; p_shared_course_id: string }
        Returns: {
          message: string
          shared_course_data: Json
          success: boolean
        }[]
      }
      add_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      addauth: { Args: { "": string }; Returns: boolean }
      addgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              new_dim: number
              new_srid_in: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              schema_name: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              new_dim: number
              new_srid: number
              new_type: string
              table_name: string
              use_typmod?: boolean
            }
            Returns: string
          }
      admin_delete_user_cascade: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      admin_get_all_driver_statistics: {
        Args: never
        Returns: {
          accepted_quotes: number | null
          cancelled_courses: number | null
          completed_courses: number | null
          confirmed_courses: number | null
          courses_today: number | null
          driver_id: string | null
          exclusive_clients: number | null
          free_clients: number | null
          in_progress_courses: number | null
          last_updated: string | null
          paid_invoices: number | null
          pending_courses: number | null
          pending_invoices: number | null
          pending_quotes: number | null
          rejected_quotes: number | null
          revenue_this_month: number | null
          revenue_this_week: number | null
          revenue_today: number | null
          total_clients: number | null
          total_courses: number | null
          total_invoices: number | null
          total_quotes: number | null
          total_revenue: number | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "driver_statistics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      apply_first_order_discount: {
        Args: {
          p_client_id: string
          p_course_id: string
          p_driver_id?: string
          p_fleet_manager_id?: string
          p_original_amount?: number
        }
        Returns: Json
      }
      assign_user_role: {
        Args: {
          p_role: Database["public"]["Enums"]["app_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      atomic_accept_ride_request: {
        Args: { p_driver_id: string; p_ride_request_id: string }
        Returns: Json
      }
      atomic_start_course_finalization: {
        Args: { p_course_id: string; p_driver_user_id: string }
        Returns: Json
      }
      auto_assign_fleet_driver: {
        Args: {
          p_duration_minutes?: number
          p_favorite_driver_id?: string
          p_fleet_manager_id: string
          p_scheduled_date: string
        }
        Returns: string
      }
      auto_calculate_commission: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      auto_create_invoice_for_course: {
        Args: { p_course_id: string }
        Returns: boolean
      }
      auto_create_missing_invoices: { Args: never; Returns: number }
      auto_dispatch_fleet_course: {
        Args: { p_course_id: string }
        Returns: {
          assigned_driver_id: string
          message: string
          success: boolean
        }[]
      }
      auto_fix_all_visibility_issues: {
        Args: never
        Returns: {
          details: Json
          total_issues_fixed: number
          total_issues_found: number
        }[]
      }
      calculate_cancellation_fee: {
        Args: { p_cancelled_by: string; p_course_id: string }
        Returns: Json
      }
      calculate_city_course_price: {
        Args: {
          p_city_pricing_id: string
          p_distance_km: number
          p_duration_minutes: number
          p_scheduled_date?: string
        }
        Returns: {
          base_price: number
          distance_price: number
          off_peak_discount: number
          peak_adjustment: number
          subtotal: number
          surcharge_evening: number
          surcharge_weekend: number
          time_price: number
          total_price: number
          tva_amount: number
        }[]
      }
      calculate_course_price: {
        Args: {
          _destination_address?: string
          _distance_km: number
          _driver_id: string
          _duration_minutes: number
          _pickup_address?: string
          _scheduled_date?: string
          _use_hourly_rate?: boolean
        }
        Returns: {
          airport_fee: number
          base_price: number
          distance_price: number
          peak_hours_surcharge: number
          pricing_source: string
          subtotal: number
          surcharge_evening: number
          surcharge_weekend: number
          time_price: number
          total_price: number
          tva_amount: number
        }[]
      }
      calculate_driver_fleet_commissions: {
        Args: { _driver_id: string }
        Returns: {
          commission_percentage: number
          courses_count: number
          fleet_manager_id: string
          fleet_manager_name: string
          next_due_date: string
          partnership_id: string
          payment_schedule: string
          total_paid: number
          total_pending: number
        }[]
      }
      calculate_fleet_course_price:
        | {
            Args: {
              p_distance_km: number
              p_duration_minutes: number
              p_fleet_manager_id: string
              p_scheduled_date?: string
              p_use_hourly_rate?: boolean
            }
            Returns: {
              base_price: number
              distance_price: number
              subtotal: number
              surcharge_evening: number
              surcharge_weekend: number
              time_price: number
              total_price: number
              tva_amount: number
            }[]
          }
        | {
            Args: {
              p_destination_city?: string
              p_distance_km: number
              p_duration_minutes: number
              p_fleet_manager_id: string
              p_pickup_city?: string
              p_scheduled_date?: string
              p_use_hourly_rate?: boolean
            }
            Returns: {
              base_price: number
              distance_price: number
              peak_hours_surcharge: number
              pricing_source: string
              subtotal: number
              surcharge_evening: number
              surcharge_weekend: number
              time_price: number
              total_price: number
              tva_amount: number
            }[]
          }
      calculate_fleet_monthly_billing: {
        Args: { _fleet_manager_id: string }
        Returns: {
          base_cost: number
          extra_cost: number
          extra_drivers: number
          total_cost: number
        }[]
      }
      calculate_net_to_driver: {
        Args: {
          gross_amount: number
          solocab_fee?: number
          stripe_fee?: number
        }
        Returns: number
      }
      calculate_payment_due_date: {
        Args: { created_at: string; payment_schedule: string }
        Returns: string
      }
      calculate_sharing_commission: {
        Args: { course_amount_cents: number }
        Returns: {
          commission_cents: number
          commission_percentage: number
          receiver_cents: number
          solocab_fee_cents: number
        }[]
      }
      calculate_stripe_fee: { Args: { amount_eur: number }; Returns: number }
      can_access_ride_chat: { Args: { p_ride_id: string }; Returns: boolean }
      can_add_free_driver: {
        Args: { _fleet_manager_id: string }
        Returns: boolean
      }
      can_confirm_payment_by_schedule: {
        Args: { p_billing_period_end: string; p_payment_schedule: string }
        Returns: boolean
      }
      can_share_courses: { Args: { _driver_id: string }; Returns: boolean }
      cancel_shared_course: {
        Args: { p_driver_id: string; p_shared_course_id: string }
        Returns: Json
      }
      check_and_block_expired_documents: { Args: never; Returns: undefined }
      check_company_payment_reminders: { Args: never; Returns: undefined }
      check_course_buffer_conflict: {
        Args: {
          p_course_id: string
          p_driver_id: string
          p_duration_minutes?: number
          p_scheduled_date: string
        }
        Returns: {
          actual_gap: number
          buffer_needed: number
          conflict_type: string
          conflicting_course_id: string
          has_conflict: boolean
        }[]
      }
      check_driver_availability: {
        Args: {
          p_driver_id: string
          p_duration_minutes?: number
          p_scheduled_date: string
        }
        Returns: boolean
      }
      check_driver_smart_availability: {
        Args: {
          p_driver_id: string
          p_duration_minutes?: number
          p_pickup_lat?: number
          p_pickup_lon?: number
          p_scheduled_date: string
        }
        Returns: Json
      }
      check_expired_free_access: { Args: never; Returns: undefined }
      check_vehicle_documents_status: {
        Args: { _vehicle_id: string }
        Returns: boolean
      }
      claim_company_course_quote: {
        Args: { p_driver_id: string; p_quote_id: string }
        Returns: Json
      }
      claim_pool_course: {
        Args: { p_claimer_driver_id: string; p_shared_course_id: string }
        Returns: Json
      }
      claim_pooled_course: {
        Args: { _claimer_driver_id: string; _pool_id: string }
        Returns: {
          message: string
          pool_entry_id: string
          success: boolean
        }[]
      }
      cleanup_geocoding_cache: { Args: never; Returns: undefined }
      cleanup_old_security_logs: { Args: never; Returns: undefined }
      create_client_via_qr: {
        Args: { _qr_code_id: string; _user_id: string }
        Returns: string
      }
      create_driver_account: {
        Args: {
          _license_number: string
          _max_passengers?: number
          _user_id: string
          _vehicle_model: string
        }
        Returns: string
      }
      create_driver_profile: {
        Args: {
          p_license_number?: string
          p_status?: string
          p_user_id: string
          p_vehicle_brand?: string
          p_vehicle_color?: string
          p_vehicle_model?: string
          p_vehicle_year?: number
        }
        Returns: string
      }
      create_expense_report_for_course: {
        Args: { p_amount: number; p_course_id: string; p_employee_id: string }
        Returns: string
      }
      create_notification: {
        Args: {
          p_link?: string
          p_message: string
          p_title: string
          p_type: string
          p_user_id: string
        }
        Returns: undefined
      }
      create_notification_with_push: {
        Args: {
          p_category?: string
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
          p_user_id: string
        }
        Returns: string
      }
      create_notifications_batch: {
        Args: {
          p_category?: string
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
          p_user_ids: string[]
        }
        Returns: string[]
      }
      create_security_alert: {
        Args: {
          p_affected_entity_id?: string
          p_affected_entity_type?: string
          p_alert_type: string
          p_description?: string
          p_metadata?: Json
          p_severity: string
          p_title: string
        }
        Returns: string
      }
      declare_fleet_course_payment_on_site: {
        Args: { p_course_id: string; p_payment_method?: string }
        Returns: Json
      }
      decline_shared_course: {
        Args: {
          p_driver_id: string
          p_reason?: string
          p_shared_course_id: string
        }
        Returns: {
          message: string
          success: boolean
        }[]
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      detect_and_fix_data_issues: {
        Args: never
        Returns: {
          entity_id: string
          entity_type: string
          fix_applied: string
          fix_success: boolean
          issue_description: string
          issue_type: string
        }[]
      }
      detect_and_fix_errors: {
        Args: never
        Returns: {
          entities_fixed: number
          entities_found: number
          errors_logged: number
          pattern_code: string
        }[]
      }
      detect_city_from_address: { Args: { p_address: string }; Returns: string }
      detect_paris_address: { Args: { p_address: string }; Returns: string }
      diagnose_and_fix_visibility_issues: {
        Args: never
        Returns: {
          details: string
          driver_id: string
          driver_name: string
          issue_type: string
          was_fixed: boolean
        }[]
      }
      disablelongtransactions: { Args: never; Returns: string }
      dispatch_company_course_to_fleet: {
        Args: { p_company_request_id: string; p_fleet_manager_id: string }
        Returns: Json
      }
      driver_confirm_fleet_payment: {
        Args: { p_payment_id: string }
        Returns: Json
      }
      driver_has_full_access: {
        Args: { driver_id_param: string }
        Returns: boolean
      }
      driver_should_be_visible: {
        Args: {
          p_created_at: string
          p_fleet_manager_id: string
          p_free_access_end_date: string
          p_free_access_granted: boolean
          p_is_fleet_driver: boolean
          p_is_pioneer: boolean
          p_status: Database["public"]["Enums"]["driver_status"]
          p_subscription_paid: boolean
          p_subscription_status: string
        }
        Returns: boolean
      }
      dropgeometrycolumn:
        | {
            Args: {
              catalog_name: string
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | {
            Args: {
              column_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { column_name: string; table_name: string }; Returns: string }
      dropgeometrytable:
        | {
            Args: {
              catalog_name: string
              schema_name: string
              table_name: string
            }
            Returns: string
          }
        | { Args: { schema_name: string; table_name: string }; Returns: string }
        | { Args: { table_name: string }; Returns: string }
      enablelongtransactions: { Args: never; Returns: string }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      ensure_driver_profile_visibility: {
        Args: { target_driver_id?: string }
        Returns: {
          action_taken: string
          driver_id: string
          driver_name: string
          issue_found: string
        }[]
      }
      equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      expire_timed_out_ride_requests: { Args: never; Returns: number }
      find_available_fleet_driver:
        | {
            Args: {
              p_duration_minutes?: number
              p_excluded_driver_id?: string
              p_fleet_manager_id: string
              p_scheduled_date: string
            }
            Returns: string
          }
        | {
            Args: {
              p_course_id?: string
              p_duration_minutes?: number
              p_excluded_driver_id?: string
              p_fleet_manager_id: string
              p_scheduled_date: string
            }
            Returns: string
          }
      find_driver_by_code: {
        Args: { _code: string }
        Returns: {
          company_name: string
          driver_code: string
          full_name: string
          id: string
          profile_photo_url: string
          rating: number
          total_rides: number
        }[]
      }
      find_driver_by_sharing_number: {
        Args: { _number: string }
        Returns: {
          company_name: string
          formatted_sharing_number: string
          full_name: string
          id: string
          phone: string
          profile_photo_url: string
          rating: number
          sharing_number: number
          total_rides: number
        }[]
      }
      find_nearby_available_drivers:
        | {
            Args: {
              p_exclude_driver_ids?: string[]
              p_limit?: number
              p_pickup_lat: number
              p_pickup_lon: number
              p_radius_km?: number
              p_scheduled_date?: string
            }
            Returns: {
              company_name: string
              distance_km: number
              driver_id: string
              user_id: string
            }[]
          }
        | {
            Args: {
              p_exclude_driver_ids: string[]
              p_limit?: number
              p_pickup_lat: number
              p_pickup_lon: number
              p_radius_km: number
            }
            Returns: {
              company_name: string
              distance_km: number
              driver_id: string
              user_id: string
            }[]
          }
      find_nearby_drivers: {
        Args: {
          p_latitude: number
          p_limit?: number
          p_longitude: number
          p_max_radius_km?: number
          p_mode?: string
        }
        Returns: {
          accepted_payment_methods: string[]
          base_fare: number
          company_name: string
          display_name: string
          distance_meters: number
          driver_id: string
          is_live_location: boolean
          latitude: number
          longitude: number
          minimum_price: number
          per_km_rate: number
          profile_photo_url: string
          search_radius_used: number
          stripe_connect_charges_enabled: boolean
          vehicle_brand: string
          vehicle_color: string
          vehicle_model: string
        }[]
      }
      find_nearest_available_fleet_driver:
        | {
            Args: {
              p_course_id?: string
              p_duration_minutes?: number
              p_excluded_driver_id?: string
              p_fleet_manager_id: string
              p_pickup_latitude: number
              p_pickup_longitude: number
              p_scheduled_date: string
            }
            Returns: string
          }
        | {
            Args: {
              p_duration_minutes?: number
              p_favorite_driver_id?: string
              p_fleet_manager_id: string
              p_pickup_latitude?: number
              p_pickup_longitude?: number
              p_scheduled_date: string
            }
            Returns: string
          }
        | {
            Args: {
              p_duration_minutes?: number
              p_excluded_driver_id?: string
              p_fleet_manager_id: string
              p_pickup_latitude: number
              p_pickup_longitude: number
              p_scheduled_date: string
            }
            Returns: string
          }
      find_nearest_available_fleet_partner:
        | {
            Args: {
              p_course_id?: string
              p_duration_minutes?: number
              p_favorite_driver_id?: string
              p_fleet_manager_id: string
              p_pickup_latitude: number
              p_pickup_longitude: number
              p_scheduled_date: string
            }
            Returns: string
          }
        | {
            Args: {
              p_duration_minutes?: number
              p_favorite_driver_id?: string
              p_fleet_manager_id: string
              p_pickup_latitude?: number
              p_pickup_longitude?: number
              p_scheduled_date: string
            }
            Returns: string
          }
      fleet_receive_company_payment: {
        Args: {
          p_amount: number
          p_course_id: string
          p_payment_method?: string
        }
        Returns: Json
      }
      fleet_send_payment_to_driver: {
        Args: {
          p_amount: number
          p_contract_id: string
          p_course_ids: string[]
          p_payment_method: string
          p_payment_reference?: string
          p_period_end?: string
          p_period_start?: string
        }
        Returns: Json
      }
      format_sharing_number: { Args: { _number: number }; Returns: string }
      generate_course_number: { Args: { _driver_id: string }; Returns: string }
      generate_invoice_number: { Args: { _driver_id: string }; Returns: string }
      generate_partner_reference_number: {
        Args: { _driver_id: string }
        Returns: string
      }
      generate_periodic_payment_summaries: { Args: never; Returns: undefined }
      generate_quote_number: { Args: { _driver_id: string }; Returns: string }
      generate_reservation_number: {
        Args: { _driver_id: string }
        Returns: string
      }
      geometry: { Args: { "": string }; Returns: unknown }
      geometry_above: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_below: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_cmp: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_contained_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_contains_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_distance_box: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_distance_centroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      geometry_eq: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_ge: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_gt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_le: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_left: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_lt: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overabove: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overbelow: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overlaps_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overleft: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_overright: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_right: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_same_3d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geometry_within: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      geomfromewkt: { Args: { "": string }; Returns: unknown }
      get_admin_company_id: { Args: { _user_id: string }; Returns: string }
      get_admin_drivers_finance: {
        Args: { p_period_end?: string; p_week_start?: string }
        Returns: {
          company_name: string
          courses_count: number
          driver_id: string
          driver_name: string
          gross_total: number
          net_total: number
          payment_status: string
          pending_balance: number
          solocab_fees: number
          stripe_account_id: string
          stripe_active: boolean
        }[]
      }
      get_admin_drivers_progression: {
        Args: never
        Returns: {
          base_fare: number
          billing_type: string
          company_address: string
          company_name: string
          created_at: string
          documents_status: string
          email: string
          free_access_granted: boolean
          full_name: string
          has_nfc_plate: boolean
          hourly_rate: number
          id: string
          max_passengers: number
          nfc_plate_ordered_at: string
          objectives_completed: boolean
          onboarding_objectives_completed: boolean
          onboarding_step: string
          per_km_rate: number
          phone: string
          profile_photo_url: string
          registration_step: number
          service_description: string
          siret: string
          status: string
          stripe_connect_status: string
          subscription_paid: boolean
          subscription_status: string
          tpe_received_at: string
          trial_ready_to_start: boolean
          trial_started_at: string
          user_id: string
          vehicle_brand: string
          vehicle_color: string
          vehicle_model: string
          vehicle_plate: string
          wants_tpe_affiliate: boolean
          working_sectors: string[]
        }[]
      }
      get_admin_drivers_with_stats: {
        Args: never
        Returns: {
          base_fare: number
          billing_type: string
          company_name: string
          created_at: string
          documents_status: string
          email: string
          first_client_at: string
          first_course_at: string
          first_scan_at: string
          free_access_granted: boolean
          full_name: string
          has_nfc_plate: boolean
          id: string
          last_activity: string
          last_seen_at: string
          nfc_plate_ordered_at: string
          objectives_completed: boolean
          onboarding_completed: boolean
          onboarding_documents_completed: boolean
          onboarding_objectives_completed: boolean
          onboarding_profile_completed: boolean
          onboarding_settings_completed: boolean
          onboarding_step: string
          per_km_rate: number
          phone: string
          profile_photo_url: string
          siret: string
          status: string
          stripe_connect_status: string
          subscription_paid: boolean
          subscription_status: string
          total_clients: number
          total_courses: number
          total_scans: number
          trial_started_at: string
          trial_status: string
          user_id: string
          vehicle_brand: string
          vehicle_plate: string
        }[]
      }
      get_admin_finance_stats: {
        Args: { p_end?: string; p_start?: string }
        Returns: Json
      }
      get_admin_payment_audit: {
        Args: { p_limit?: number; p_offset?: number }
        Returns: {
          client_name: string
          course_date: string
          course_id: string
          course_number: string
          driver_name: string
          gross_amount: number
          net_amount: number
          payment_method: string
          payment_status: string
          solocab_fee: number
          stripe_pi_id: string
          stripe_transfer_id: string
        }[]
      }
      get_all_partnership_disputes: {
        Args: never
        Returns: {
          admin_id: string | null
          admin_notes: string | null
          amount_owed: number | null
          created_at: string
          description: string | null
          id: string
          partnership_id: string
          reason: string
          reported_driver_id: string
          reporter_driver_id: string
          resolution: string | null
          resolved_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "partnership_disputes"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_applicable_pricing: {
        Args: {
          p_destination_address?: string
          p_driver_id: string
          p_pickup_address?: string
        }
        Returns: {
          city_name: string
          city_pricing_id: string
          pricing_type: string
        }[]
      }
      get_available_fleet_drivers_for_course: {
        Args: {
          p_duration_minutes?: number
          p_fleet_manager_id: string
          p_scheduled_date: string
        }
        Returns: {
          driver_id: string
          driver_name: string
          is_available: boolean
          rating: number
        }[]
      }
      get_city_pricing: {
        Args: {
          p_city_name?: string
          p_driver_id?: string
          p_fleet_manager_id?: string
          p_sector?: string
        }
        Returns: {
          base_fare: number
          city_name: string
          evening_surcharge: number
          hourly_rate: number
          id: string
          minimum_price: number
          off_peak_discount: number
          off_peak_enabled: boolean
          off_peak_end: string
          off_peak_start: string
          peak_hours_enabled: boolean
          peak_hours_end: string
          peak_hours_multiplier: number
          peak_hours_start: string
          per_km_rate: number
          pricing_type: string
          sectors: string[]
          tva_included: boolean
          tva_rate: number
          weekend_surcharge: number
        }[]
      }
      get_client_id: { Args: { _user_id: string }; Returns: string }
      get_company_course_driver_profile: {
        Args: { driver_user_id: string }
        Returns: {
          email: string
          full_name: string
          phone: string
          profile_photo_url: string
        }[]
      }
      get_company_employee_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          can_create_courses: boolean | null
          can_invite_drivers: boolean | null
          can_view_invoices: boolean | null
          company_id: string
          created_at: string | null
          created_by: string | null
          department: string | null
          email: string | null
          employee_name: string | null
          expires_at: string | null
          id: string
          is_used: boolean | null
          max_monthly_budget: number | null
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "company_employee_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_company_id: { Args: { _user_id: string }; Returns: string }
      get_company_id_for_user: { Args: { user_id: string }; Returns: string }
      get_course_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          client_id: string | null
          completed_at: string | null
          course_id: string
          created_at: string
          destination_address: string
          distance_km: number | null
          driver_id: string
          duration_minutes: number | null
          estimated_price: number
          expires_at: string
          id: string
          pickup_address: string
          price_details: Json | null
          status: string
          token: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "course_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_course_partner_info: {
        Args: { p_client_user_id: string; p_course_id: string }
        Returns: {
          partner_company: string
          partner_driver_id: string
          partner_name: string
          partner_phone: string
          partner_photo: string
          partner_rating: number
          partner_total_rides: number
          partner_vehicle_color: string
          partner_vehicle_model: string
          shared_course_id: string
          shared_status: string
          show_phone: boolean
          show_rating: boolean
        }[]
      }
      get_course_sharing_status: {
        Args: { p_course_id: string; p_driver_id: string }
        Returns: Json
      }
      get_course_tva_rate: {
        Args: { p_is_hourly_rate?: boolean }
        Returns: number
      }
      get_current_driver_id: { Args: never; Returns: string }
      get_daily_stats: { Args: never; Returns: Json }
      get_driver_clients_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_courses_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_dashboard_stats: {
        Args: { p_driver_id: string }
        Returns: Json
      }
      get_driver_id: { Args: { _user_id: string }; Returns: string }
      get_driver_quote_request_ids: {
        Args: { _driver_id: string }
        Returns: string[]
      }
      get_driver_revenue_details: {
        Args: { p_driver_id: string; p_period: string }
        Returns: Json
      }
      get_driver_solocab_day_stats: {
        Args: { p_day: string; p_driver_id: string }
        Returns: {
          courses_count: number
          hours_worked: number
          km_driven: number
          new_clients_count: number
          revenue: number
        }[]
      }
      get_drivers_with_full_access: {
        Args: { limit_count?: number; visibility_field?: string }
        Returns: {
          bio: string
          card_photo_url: string
          company_name: string
          created_at: string
          display_company_name: boolean
          display_driver_name: boolean
          gallery_photos: string[]
          id: string
          is_pioneer: boolean
          max_passengers: number
          rating: number
          service_description: string
          services_offered: string[]
          show_email: boolean
          show_phone: boolean
          status: string
          total_rides: number
          user_id: string
          vehicle_brand: string
          vehicle_category: string[]
          vehicle_color: string
          vehicle_equipment: string[]
          vehicle_model: string
          vehicle_photos: string[]
          vehicle_year: number
          working_sectors: string[]
        }[]
      }
      get_employee_company_id: { Args: { p_user_id: string }; Returns: string }
      get_employee_profile_for_course: {
        Args: { p_employee_id: string }
        Returns: {
          employee_id: string
          full_name: string
          phone: string
        }[]
      }
      get_fleet_client_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          client_id: string | null
          client_name: string
          created_at: string
          email: string | null
          expires_at: string | null
          fleet_manager_id: string
          id: string
          notes: string | null
          phone: string | null
          status: string
          token: string
          used_at: string | null
          used_by_user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fleet_client_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_fleet_driver_count: {
        Args: { _fleet_manager_id: string }
        Returns: number
      }
      get_fleet_driver_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          commission_accepted: boolean | null
          commission_accepted_at: string | null
          commission_percentage: number | null
          created_at: string
          driver_cost: number | null
          driver_type: string
          email: string | null
          expires_at: string | null
          fleet_manager_id: string
          id: string
          is_paid: boolean | null
          token: string
          used: boolean | null
          used_at: string | null
          used_by_driver_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fleet_driver_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_fleet_manager_id: { Args: { _user_id: string }; Returns: string }
      get_fleet_manager_invitation_by_token: {
        Args: { p_token: string }
        Returns: {
          created_at: string
          email: string | null
          expires_at: string | null
          fleet_manager_id: string
          id: string
          token: string
          used: boolean | null
          used_at: string | null
          used_by_driver_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "fleet_manager_invitations"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_guest_booking_by_token: {
        Args: { _token: string }
        Returns: {
          client_rating: number
          created_at: string
          destination_address: string
          destination_latitude: number
          destination_longitude: number
          devis_amount: number
          distance_km: number
          driver_avatar: string
          driver_company: string
          driver_heading: number
          driver_latitude: number
          driver_longitude: number
          driver_name: string
          driver_phone: string
          duration_minutes: number
          final_payment_amount: number
          guest_estimated_price: number
          guest_name: string
          id: string
          is_shared_course: boolean
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          quote_number: string
          scheduled_date: string
          shared_drivers: Json
          status: string
        }[]
      }
      get_guest_course_by_token: {
        Args: { p_token: string }
        Returns: {
          course_number: string
          created_at: string
          destination_address: string
          destination_latitude: number
          destination_longitude: number
          driver_id: string
          driver_name: string
          driver_phone: string
          driver_photo_url: string
          estimated_distance_km: number
          final_payment_amount: number
          guest_name: string
          guest_phone: string
          guest_tracking_token: string
          id: string
          is_guest_booking: boolean
          payment_method: string
          pickup_address: string
          pickup_latitude: number
          pickup_longitude: number
          scheduled_date: string
          status: string
          updated_at: string
          vehicle_brand: string
          vehicle_color: string
          vehicle_model: string
          vehicle_plate: string
        }[]
      }
      get_guest_course_payment_info: {
        Args: { _token: string }
        Returns: {
          driver_id: string
          facture_payment_status: string
          payment_status: string
        }[]
      }
      get_guest_tracking_token: {
        Args: { _course_id: string }
        Returns: string
      }
      get_my_driver_statistics: {
        Args: never
        Returns: {
          accepted_quotes: number | null
          cancelled_courses: number | null
          completed_courses: number | null
          confirmed_courses: number | null
          courses_today: number | null
          driver_id: string | null
          exclusive_clients: number | null
          free_clients: number | null
          in_progress_courses: number | null
          last_updated: string | null
          paid_invoices: number | null
          pending_courses: number | null
          pending_invoices: number | null
          pending_quotes: number | null
          rejected_quotes: number | null
          revenue_this_month: number | null
          revenue_this_week: number | null
          revenue_today: number | null
          total_clients: number | null
          total_courses: number | null
          total_invoices: number | null
          total_quotes: number | null
          total_revenue: number | null
          user_id: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "driver_statistics"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      get_or_create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_partnership_balance: {
        Args: { _driver_id: string; _partnership_id: string }
        Returns: {
          courses_received: number
          courses_sent: number
          last_settlement_date: string
          net_balance: number
          total_received_amount: number
          total_received_commission: number
          total_sent_amount: number
          total_sent_commission: number
        }[]
      }
      get_platform_stats: { Args: never; Returns: Json }
      get_public_driver_profile: {
        Args: { driver_id_param: string }
        Returns: {
          bio: string
          company_name: string
          created_at: string
          display_company_name: boolean
          display_driver_name: boolean
          gallery_photos: string[]
          id: string
          max_passengers: number
          rating: number
          service_description: string
          services_offered: string[]
          total_rides: number
          updated_at: string
          user_id: string
          vehicle_brand: string
          vehicle_color: string
          vehicle_equipment: string[]
          vehicle_model: string
          vehicle_photos: string[]
          vehicle_year: number
          working_sectors: string[]
        }[]
      }
      get_public_driver_profile_by_id: {
        Args: { driver_id_param: string }
        Returns: {
          base_rate: number
          bio: string
          card_photo_url: string
          company_name: string
          contact_email: string
          contact_phone: string
          created_at: string
          display_company_name: boolean
          display_driver_name: boolean
          gallery_photos: string[]
          id: string
          is_pioneer: boolean
          max_passengers: number
          per_km_rate: number
          profile_email: string
          profile_full_name: string
          profile_phone: string
          profile_photo_url: string
          rating: number
          service_description: string
          services_offered: string[]
          show_email: boolean
          show_phone: boolean
          show_rating_public: boolean
          status: Database["public"]["Enums"]["driver_status"]
          total_rides: number
          user_id: string
          vehicle_brand: string
          vehicle_category: string[]
          vehicle_color: string
          vehicle_equipment: string[]
          vehicle_model: string
          vehicle_photos: string[]
          vehicle_year: number
          working_sectors: string[]
        }[]
      }
      get_public_profile_info: {
        Args: { user_id_param: string }
        Returns: {
          email: string
          full_name: string
          id: string
          phone: string
          profile_photo_url: string
        }[]
      }
      get_ride_request_id_for_guest: {
        Args: { _token: string }
        Returns: string
      }
      get_safe_public_driver_data: {
        Args: { driver_id_param: string }
        Returns: {
          bio: string
          card_photo_url: string
          company_name: string
          display_company_name: boolean
          display_driver_name: boolean
          gallery_photos: string[]
          id: string
          max_passengers: number
          rating: number
          service_description: string
          services_offered: string[]
          show_email: boolean
          show_phone: boolean
          total_rides: number
          user_id: string
          vehicle_brand: string
          vehicle_color: string
          vehicle_equipment: string[]
          vehicle_model: string
          vehicle_photos: string[]
          vehicle_year: number
          working_sectors: string[]
        }[]
      }
      get_shared_course_client_info: {
        Args: { p_receiver_driver_id: string; p_shared_course_id: string }
        Returns: {
          client_name: string
          client_phone: string
          client_photo: string
        }[]
      }
      get_system_health_report: { Args: never; Returns: Json }
      get_user_client_id_secure: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_company_id_secure: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_driver_id_secure: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_employee_id: { Args: { _user_id: string }; Returns: string }
      get_user_fleet_manager_id_secure: {
        Args: { user_uuid: string }
        Returns: string
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: { Args: { _user_id: string }; Returns: string[] }
      get_visible_fleet_managers: {
        Args: never
        Returns: {
          address: string
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string
          default_partnership_commission: number
          description: string
          driver_profile_description: string
          id: string
          logo_url: string
          partnership_terms: string
          services_offered: string[]
          show_address: boolean
          show_client_count_public: boolean
          show_contact_name: boolean
          show_driver_count_public: boolean
          show_email: boolean
          show_phone: boolean
          total_clients: number
          total_drivers: number
        }[]
      }
      gettransactionid: { Args: never; Returns: unknown }
      guest_submit_rating: {
        Args: {
          _rating: number
          _reason?: string
          _reason_detail?: string
          _token: string
        }
        Returns: boolean
      }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      has_role_secure: {
        Args: { role_name: string; user_uuid: string }
        Returns: boolean
      }
      increment_driver_fees_balance: {
        Args: { p_amount: number; p_driver_id: string }
        Returns: undefined
      }
      is_airport_address: { Args: { address: string }; Returns: boolean }
      is_company_admin: {
        Args: { _company_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_admin_for_employees: {
        Args: { p_company_id: string }
        Returns: boolean
      }
      is_company_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_company_employee: { Args: { p_company_id: string }; Returns: boolean }
      is_company_employee_of_driver: {
        Args: { p_driver_id: string; p_user_id: string }
        Returns: boolean
      }
      is_course_shared_locked: { Args: { p_course_id: string }; Returns: Json }
      is_driver_assigned_to_course: {
        Args: { _course_id: string; _user_id: string }
        Returns: boolean
      }
      is_first_order: {
        Args: {
          p_client_id: string
          p_driver_id?: string
          p_fleet_manager_id?: string
        }
        Returns: boolean
      }
      is_fleet_course_shared_locked: {
        Args: { p_course_id: string }
        Returns: Json
      }
      is_fleet_driver_blocked: {
        Args: { p_driver_id: string; p_fleet_manager_id: string }
        Returns: boolean
      }
      is_ip_blocked: { Args: { check_ip: string }; Returns: boolean }
      is_valid_employee_invitation: {
        Args: { p_company_id: string; p_invitation_id: string }
        Returns: boolean
      }
      learn_from_manual_fix: {
        Args: {
          p_fix_code?: string
          p_fix_description: string
          p_fix_steps?: Json
          p_fixed_by?: string
          p_pattern_id: string
          p_should_auto_fix?: boolean
        }
        Returns: string
      }
      log_error_with_learning: {
        Args: {
          p_browser_info?: Json
          p_context?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_error_message: string
          p_error_stack?: string
          p_user_id?: string
        }
        Returns: Json
      }
      log_fix_result: {
        Args: {
          p_duration_ms?: number
          p_occurrence_id: string
          p_solution_id: string
          p_was_successful: boolean
        }
        Returns: boolean
      }
      longtransactionsenabled: { Args: never; Returns: boolean }
      mark_commission_paid: {
        Args: { _commission_ids: string[] }
        Returns: undefined
      }
      mark_fleet_partner_commission_paid: {
        Args: { p_fleet_partner_course_ids: string[] }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      notify_all_admins: {
        Args: {
          p_category?: string
          p_link?: string
          p_message: string
          p_title: string
          p_type?: string
        }
        Returns: undefined
      }
      notify_overdue_company_payments: { Args: never; Returns: undefined }
      populate_geometry_columns:
        | { Args: { tbl_oid: unknown; use_typmod?: boolean }; Returns: number }
        | { Args: { use_typmod?: boolean }; Returns: string }
      postgis_constraint_dims: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_srid: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: number
      }
      postgis_constraint_type: {
        Args: { geomcolumn: string; geomschema: string; geomtable: string }
        Returns: string
      }
      postgis_extensions_upgrade: { Args: never; Returns: string }
      postgis_full_version: { Args: never; Returns: string }
      postgis_geos_version: { Args: never; Returns: string }
      postgis_lib_build_date: { Args: never; Returns: string }
      postgis_lib_revision: { Args: never; Returns: string }
      postgis_lib_version: { Args: never; Returns: string }
      postgis_libjson_version: { Args: never; Returns: string }
      postgis_liblwgeom_version: { Args: never; Returns: string }
      postgis_libprotobuf_version: { Args: never; Returns: string }
      postgis_libxml_version: { Args: never; Returns: string }
      postgis_proj_version: { Args: never; Returns: string }
      postgis_scripts_build_date: { Args: never; Returns: string }
      postgis_scripts_installed: { Args: never; Returns: string }
      postgis_scripts_released: { Args: never; Returns: string }
      postgis_svn_version: { Args: never; Returns: string }
      postgis_type_name: {
        Args: {
          coord_dimension: number
          geomname: string
          use_new_name?: boolean
        }
        Returns: string
      }
      postgis_version: { Args: never; Returns: string }
      postgis_wagyu_version: { Args: never; Returns: string }
      process_course_queue_retries: {
        Args: never
        Returns: {
          action_taken: string
          course_id: string
          queue_id: string
        }[]
      }
      process_fleet_escalation_retries: {
        Args: never
        Returns: {
          action_taken: string
          course_id: string
          escalation_id: string
        }[]
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      refresh_driver_statistics: { Args: never; Returns: undefined }
      register_error_pattern: {
        Args: {
          p_description: string
          p_detection_query: string
          p_entity_type: string
          p_fix_function?: string
          p_pattern_code: string
          p_pattern_name: string
          p_severity?: string
        }
        Returns: string
      }
      remove_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      repair_all_missing_factures: {
        Args: { p_driver_id?: string }
        Returns: Json
      }
      repair_driver_counter: {
        Args: { _driver_id: string }
        Returns: {
          message: string
          new_counter: number
          old_counter: number
          success: boolean
        }[]
      }
      repair_missing_facture: { Args: { p_course_id: string }; Returns: Json }
      return_course_to_fleet_manager: {
        Args: { p_course_id: string; p_reason: string }
        Returns: boolean
      }
      run_health_checks: {
        Args: never
        Returns: {
          check_name: string
          issues_fixed: number
          issues_found: number
        }[]
      }
      schedule_trial_emails: {
        Args: { p_driver_id: string; p_trial_start: string }
        Returns: undefined
      }
      search_available_partners: {
        Args: {
          _city?: string
          _department?: string
          _driver_id: string
          _min_rating?: number
        }
        Returns: {
          company_name: string
          display_company_name: boolean
          display_driver_name: boolean
          email: string
          formatted_sharing_number: string
          full_name: string
          id: string
          phone: string
          profile_photo_url: string
          rating: number
          sharing_number: number
          show_email: boolean
          show_phone: boolean
          show_rating_partners: boolean
          total_rides: number
          user_id: string
          vehicle_brand: string
          vehicle_model: string
          working_sectors: string[]
        }[]
      }
      search_drivers_by_location: {
        Args: {
          _address?: string
          _city?: string
          _latitude?: number
          _longitude?: number
          _max_radius_km?: number
        }
        Returns: {
          bio: string
          company_name: string
          display_company_name: boolean
          display_driver_name: boolean
          distance_km: number
          full_name: string
          gallery_photos: string[]
          id: string
          is_pioneer: boolean
          profile_photo_url: string
          rating: number
          service_description: string
          show_rating_public: boolean
          total_rides: number
          user_id: string
          vehicle_brand: string
          vehicle_color: string
          vehicle_model: string
          vehicle_photos: string[]
          vehicle_year: number
          working_sectors: string[]
        }[]
      }
      search_public_drivers: {
        Args: { _search_term?: string; _sector?: string }
        Returns: {
          bio: string
          full_name: string
          id: string
          profile_photo_url: string
          rating: number
          service_description: string
          total_rides: number
          vehicle_model: string
          working_sectors: string[]
        }[]
      }
      send_graduated_payment_reminders: { Args: never; Returns: undefined }
      set_favorite_vehicle: {
        Args: { _driver_id: string; _vehicle_id: string }
        Returns: boolean
      }
      st_3dclosestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3ddistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dintersects: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_3dlongestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmakebox: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_3dmaxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_3dshortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_addpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_angle:
        | { Args: { line1: unknown; line2: unknown }; Returns: number }
        | {
            Args: { pt1: unknown; pt2: unknown; pt3: unknown; pt4?: unknown }
            Returns: number
          }
      st_area:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_asencodedpolyline: {
        Args: { geom: unknown; nprecision?: number }
        Returns: string
      }
      st_asewkt: { Args: { "": string }; Returns: string }
      st_asgeojson:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | {
            Args: {
              geom_column?: string
              maxdecimaldigits?: number
              pretty_bool?: boolean
              r: Record<string, unknown>
            }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_asgml:
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
            }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
        | {
            Args: {
              geog: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown
              id?: string
              maxdecimaldigits?: number
              nprefix?: string
              options?: number
              version: number
            }
            Returns: string
          }
      st_askml:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; nprefix?: string }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_aslatlontext: {
        Args: { geom: unknown; tmpl?: string }
        Returns: string
      }
      st_asmarc21: { Args: { format?: string; geom: unknown }; Returns: string }
      st_asmvtgeom: {
        Args: {
          bounds: unknown
          buffer?: number
          clip_geom?: boolean
          extent?: number
          geom: unknown
        }
        Returns: unknown
      }
      st_assvg:
        | {
            Args: { geog: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | {
            Args: { geom: unknown; maxdecimaldigits?: number; rel?: number }
            Returns: string
          }
        | { Args: { "": string }; Returns: string }
      st_astext: { Args: { "": string }; Returns: string }
      st_astwkb:
        | {
            Args: {
              geom: unknown
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
        | {
            Args: {
              geom: unknown[]
              ids: number[]
              prec?: number
              prec_m?: number
              prec_z?: number
              with_boxes?: boolean
              with_sizes?: boolean
            }
            Returns: string
          }
      st_asx3d: {
        Args: { geom: unknown; maxdecimaldigits?: number; options?: number }
        Returns: string
      }
      st_azimuth:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: number }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_boundingdiagonal: {
        Args: { fits?: boolean; geom: unknown }
        Returns: unknown
      }
      st_buffer:
        | {
            Args: { geom: unknown; options?: string; radius: number }
            Returns: unknown
          }
        | {
            Args: { geom: unknown; quadsegs: number; radius: number }
            Returns: unknown
          }
      st_centroid: { Args: { "": string }; Returns: unknown }
      st_clipbybox2d: {
        Args: { box: unknown; geom: unknown }
        Returns: unknown
      }
      st_closestpoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_collect: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_concavehull: {
        Args: {
          param_allow_holes?: boolean
          param_geom: unknown
          param_pctconvex: number
        }
        Returns: unknown
      }
      st_contains: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_containsproperly: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_coorddim: { Args: { geometry: unknown }; Returns: number }
      st_coveredby:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_covers:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_crosses: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_curvetoline: {
        Args: { flags?: number; geom: unknown; tol?: number; toltype?: number }
        Returns: unknown
      }
      st_delaunaytriangles: {
        Args: { flags?: number; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_difference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_disjoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_distance:
        | {
            Args: { geog1: unknown; geog2: unknown; use_spheroid?: boolean }
            Returns: number
          }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
      st_distancesphere:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: number }
        | {
            Args: { geom1: unknown; geom2: unknown; radius: number }
            Returns: number
          }
      st_distancespheroid: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_dwithin: {
        Args: {
          geog1: unknown
          geog2: unknown
          tolerance: number
          use_spheroid?: boolean
        }
        Returns: boolean
      }
      st_equals: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_expand:
        | { Args: { box: unknown; dx: number; dy: number }; Returns: unknown }
        | {
            Args: { box: unknown; dx: number; dy: number; dz?: number }
            Returns: unknown
          }
        | {
            Args: {
              dm?: number
              dx: number
              dy: number
              dz?: number
              geom: unknown
            }
            Returns: unknown
          }
      st_force3d: { Args: { geom: unknown; zvalue?: number }; Returns: unknown }
      st_force3dm: {
        Args: { geom: unknown; mvalue?: number }
        Returns: unknown
      }
      st_force3dz: {
        Args: { geom: unknown; zvalue?: number }
        Returns: unknown
      }
      st_force4d: {
        Args: { geom: unknown; mvalue?: number; zvalue?: number }
        Returns: unknown
      }
      st_generatepoints:
        | { Args: { area: unknown; npoints: number }; Returns: unknown }
        | {
            Args: { area: unknown; npoints: number; seed: number }
            Returns: unknown
          }
      st_geogfromtext: { Args: { "": string }; Returns: unknown }
      st_geographyfromtext: { Args: { "": string }; Returns: unknown }
      st_geohash:
        | { Args: { geog: unknown; maxchars?: number }; Returns: string }
        | { Args: { geom: unknown; maxchars?: number }; Returns: string }
      st_geomcollfromtext: { Args: { "": string }; Returns: unknown }
      st_geometricmedian: {
        Args: {
          fail_if_not_converged?: boolean
          g: unknown
          max_iter?: number
          tolerance?: number
        }
        Returns: unknown
      }
      st_geometryfromtext: { Args: { "": string }; Returns: unknown }
      st_geomfromewkt: { Args: { "": string }; Returns: unknown }
      st_geomfromgeojson:
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": Json }; Returns: unknown }
        | { Args: { "": string }; Returns: unknown }
      st_geomfromgml: { Args: { "": string }; Returns: unknown }
      st_geomfromkml: { Args: { "": string }; Returns: unknown }
      st_geomfrommarc21: { Args: { marc21xml: string }; Returns: unknown }
      st_geomfromtext: { Args: { "": string }; Returns: unknown }
      st_gmltosql: { Args: { "": string }; Returns: unknown }
      st_hasarc: { Args: { geometry: unknown }; Returns: boolean }
      st_hausdorffdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_hexagon: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_hexagongrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_interpolatepoint: {
        Args: { line: unknown; point: unknown }
        Returns: number
      }
      st_intersection: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_intersects:
        | { Args: { geog1: unknown; geog2: unknown }; Returns: boolean }
        | { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_isvaliddetail: {
        Args: { flags?: number; geom: unknown }
        Returns: Database["public"]["CompositeTypes"]["valid_detail"]
        SetofOptions: {
          from: "*"
          to: "valid_detail"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      st_length:
        | { Args: { geog: unknown; use_spheroid?: boolean }; Returns: number }
        | { Args: { "": string }; Returns: number }
      st_letters: { Args: { font?: Json; letters: string }; Returns: unknown }
      st_linecrossingdirection: {
        Args: { line1: unknown; line2: unknown }
        Returns: number
      }
      st_linefromencodedpolyline: {
        Args: { nprecision?: number; txtin: string }
        Returns: unknown
      }
      st_linefromtext: { Args: { "": string }; Returns: unknown }
      st_linelocatepoint: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_linetocurve: { Args: { geometry: unknown }; Returns: unknown }
      st_locatealong: {
        Args: { geometry: unknown; leftrightoffset?: number; measure: number }
        Returns: unknown
      }
      st_locatebetween: {
        Args: {
          frommeasure: number
          geometry: unknown
          leftrightoffset?: number
          tomeasure: number
        }
        Returns: unknown
      }
      st_locatebetweenelevations: {
        Args: { fromelevation: number; geometry: unknown; toelevation: number }
        Returns: unknown
      }
      st_longestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makebox2d: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makeline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_makevalid: {
        Args: { geom: unknown; params: string }
        Returns: unknown
      }
      st_maxdistance: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: number
      }
      st_minimumboundingcircle: {
        Args: { inputgeom: unknown; segs_per_quarter?: number }
        Returns: unknown
      }
      st_mlinefromtext: { Args: { "": string }; Returns: unknown }
      st_mpointfromtext: { Args: { "": string }; Returns: unknown }
      st_mpolyfromtext: { Args: { "": string }; Returns: unknown }
      st_multilinestringfromtext: { Args: { "": string }; Returns: unknown }
      st_multipointfromtext: { Args: { "": string }; Returns: unknown }
      st_multipolygonfromtext: { Args: { "": string }; Returns: unknown }
      st_node: { Args: { g: unknown }; Returns: unknown }
      st_normalize: { Args: { geom: unknown }; Returns: unknown }
      st_offsetcurve: {
        Args: { distance: number; line: unknown; params?: string }
        Returns: unknown
      }
      st_orderingequals: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_overlaps: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: boolean
      }
      st_perimeter: {
        Args: { geog: unknown; use_spheroid?: boolean }
        Returns: number
      }
      st_pointfromtext: { Args: { "": string }; Returns: unknown }
      st_pointm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
        }
        Returns: unknown
      }
      st_pointz: {
        Args: {
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_pointzm: {
        Args: {
          mcoordinate: number
          srid?: number
          xcoordinate: number
          ycoordinate: number
          zcoordinate: number
        }
        Returns: unknown
      }
      st_polyfromtext: { Args: { "": string }; Returns: unknown }
      st_polygonfromtext: { Args: { "": string }; Returns: unknown }
      st_project: {
        Args: { azimuth: number; distance: number; geog: unknown }
        Returns: unknown
      }
      st_quantizecoordinates: {
        Args: {
          g: unknown
          prec_m?: number
          prec_x: number
          prec_y?: number
          prec_z?: number
        }
        Returns: unknown
      }
      st_reduceprecision: {
        Args: { geom: unknown; gridsize: number }
        Returns: unknown
      }
      st_relate: { Args: { geom1: unknown; geom2: unknown }; Returns: string }
      st_removerepeatedpoints: {
        Args: { geom: unknown; tolerance?: number }
        Returns: unknown
      }
      st_segmentize: {
        Args: { geog: unknown; max_segment_length: number }
        Returns: unknown
      }
      st_setsrid:
        | { Args: { geog: unknown; srid: number }; Returns: unknown }
        | { Args: { geom: unknown; srid: number }; Returns: unknown }
      st_sharedpaths: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_shortestline: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_simplifypolygonhull: {
        Args: { geom: unknown; is_outer?: boolean; vertex_fraction: number }
        Returns: unknown
      }
      st_split: { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
      st_square: {
        Args: { cell_i: number; cell_j: number; origin?: unknown; size: number }
        Returns: unknown
      }
      st_squaregrid: {
        Args: { bounds: unknown; size: number }
        Returns: Record<string, unknown>[]
      }
      st_srid:
        | { Args: { geog: unknown }; Returns: number }
        | { Args: { geom: unknown }; Returns: number }
      st_subdivide: {
        Args: { geom: unknown; gridsize?: number; maxvertices?: number }
        Returns: unknown[]
      }
      st_swapordinates: {
        Args: { geom: unknown; ords: unknown }
        Returns: unknown
      }
      st_symdifference: {
        Args: { geom1: unknown; geom2: unknown; gridsize?: number }
        Returns: unknown
      }
      st_symmetricdifference: {
        Args: { geom1: unknown; geom2: unknown }
        Returns: unknown
      }
      st_tileenvelope: {
        Args: {
          bounds?: unknown
          margin?: number
          x: number
          y: number
          zoom: number
        }
        Returns: unknown
      }
      st_touches: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_transform:
        | {
            Args: { from_proj: string; geom: unknown; to_proj: string }
            Returns: unknown
          }
        | {
            Args: { from_proj: string; geom: unknown; to_srid: number }
            Returns: unknown
          }
        | { Args: { geom: unknown; to_proj: string }; Returns: unknown }
      st_triangulatepolygon: { Args: { g1: unknown }; Returns: unknown }
      st_union:
        | { Args: { geom1: unknown; geom2: unknown }; Returns: unknown }
        | {
            Args: { geom1: unknown; geom2: unknown; gridsize: number }
            Returns: unknown
          }
      st_voronoilines: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_voronoipolygons: {
        Args: { extend_to?: unknown; g1: unknown; tolerance?: number }
        Returns: unknown
      }
      st_within: { Args: { geom1: unknown; geom2: unknown }; Returns: boolean }
      st_wkbtosql: { Args: { wkb: string }; Returns: unknown }
      st_wkttosql: { Args: { "": string }; Returns: unknown }
      st_wrapx: {
        Args: { geom: unknown; move: number; wrap: number }
        Returns: unknown
      }
      try_auto_place_queued_courses: {
        Args: never
        Returns: {
          course_id: string
          placed: boolean
          queue_id: string
        }[]
      }
      unlockrows: { Args: { "": string }; Returns: number }
      update_client_risk_score: {
        Args: { p_client_id: string }
        Returns: undefined
      }
      update_devis_tva: { Args: never; Returns: undefined }
      updategeometrysrid: {
        Args: {
          catalogn_name: string
          column_name: string
          new_srid_in: number
          schema_name: string
          table_name: string
        }
        Returns: string
      }
      validate_driver_numbering: {
        Args: { _driver_id: string }
        Returns: {
          is_valid: boolean
          issues: string[]
        }[]
      }
      validate_driver_numbering_integrity: {
        Args: { _driver_id: string }
        Returns: {
          current_counter: number
          found_issues: string[]
          is_valid: boolean
          max_course_num: number
          max_invoice_num: number
          max_quote_num: number
          total_courses: number
          total_devis: number
          total_factures: number
        }[]
      }
      validate_invitation_token: {
        Args: { token_value: string }
        Returns: {
          expires_at: string
          id: string
          skip_documents: boolean
          token: string
          used: boolean
        }[]
      }
      verify_client_driver_association: {
        Args: { _client_id: string; _driver_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver" | "client" | "company" | "fleet_manager"
      course_status:
        | "pending"
        | "accepted"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "expired"
      devis_status: "pending" | "accepted" | "rejected" | "expired"
      driver_status: "pending" | "validated" | "rejected" | "on_hold"
      payment_status: "pending" | "paid" | "failed" | "refunded"
    }
    CompositeTypes: {
      geometry_dump: {
        path: number[] | null
        geom: unknown
      }
      valid_detail: {
        valid: boolean | null
        reason: string | null
        location: unknown
      }
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
      app_role: ["admin", "driver", "client", "company", "fleet_manager"],
      course_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
        "expired",
      ],
      devis_status: ["pending", "accepted", "rejected", "expired"],
      driver_status: ["pending", "validated", "rejected", "on_hold"],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
