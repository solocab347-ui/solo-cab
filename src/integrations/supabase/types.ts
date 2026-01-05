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
      city_pricing: {
        Row: {
          airport_surcharge: number | null
          base_fare: number | null
          city_name: string
          created_at: string
          driver_id: string | null
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
            foreignKeyName: "client_first_orders_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
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
        ]
      }
      clients: {
        Row: {
          created_at: string
          driver_id: string | null
          driver_ids: string[] | null
          favorite_driver_id: string | null
          fleet_manager_id: string | null
          id: string
          is_exclusive: boolean
          qr_code_id: string | null
          total_rides: number | null
          total_spent: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          driver_id?: string | null
          driver_ids?: string[] | null
          favorite_driver_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          is_exclusive?: boolean
          qr_code_id?: string | null
          total_rides?: number | null
          total_spent?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          driver_id?: string | null
          driver_ids?: string[] | null
          favorite_driver_id?: string | null
          fleet_manager_id?: string | null
          id?: string
          is_exclusive?: boolean
          qr_code_id?: string | null
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
            foreignKeyName: "clients_qr_code_id_fkey"
            columns: ["qr_code_id"]
            isOneToOne: false
            referencedRelation: "qr_codes"
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
          employee_id: string | null
          final_course_id: string | null
          guest_employee_email: string | null
          guest_employee_name: string | null
          guest_employee_phone: string | null
          id: string
          is_guest_employee: boolean | null
          notes: string | null
          passengers_count: number | null
          payment_method_requested: string | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          quotes_generated_at: string | null
          scheduled_date: string
          sent_to_drivers_at: string | null
          status: string | null
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
          employee_id?: string | null
          final_course_id?: string | null
          guest_employee_email?: string | null
          guest_employee_name?: string | null
          guest_employee_phone?: string | null
          id?: string
          is_guest_employee?: boolean | null
          notes?: string | null
          passengers_count?: number | null
          payment_method_requested?: string | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          quotes_generated_at?: string | null
          scheduled_date: string
          sent_to_drivers_at?: string | null
          status?: string | null
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
          employee_id?: string | null
          final_course_id?: string | null
          guest_employee_email?: string | null
          guest_employee_name?: string | null
          guest_employee_phone?: string | null
          id?: string
          is_guest_employee?: boolean | null
          notes?: string | null
          passengers_count?: number | null
          payment_method_requested?: string | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          quotes_generated_at?: string | null
          scheduled_date?: string
          sent_to_drivers_at?: string | null
          status?: string | null
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
        ]
      }
      company_courses: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          company_id: string
          course_id: string
          created_at: string | null
          created_by_employee: boolean | null
          employee_id: string | null
          id: string
          invoice_to_company: boolean | null
          payment_handled_by: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          company_id: string
          course_id: string
          created_at?: string | null
          created_by_employee?: boolean | null
          employee_id?: string | null
          id?: string
          invoice_to_company?: boolean | null
          payment_handled_by?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          company_id?: string
          course_id?: string
          created_at?: string | null
          created_by_employee?: boolean | null
          employee_id?: string | null
          id?: string
          invoice_to_company?: boolean | null
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
            foreignKeyName: "company_employee_course_invitations_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "company_course_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      company_employee_invitations: {
        Row: {
          can_create_courses: boolean | null
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
          can_create_courses: boolean | null
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
          can_create_courses?: boolean | null
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
          can_create_courses?: boolean | null
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
            foreignKeyName: "course_invitations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
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
      courses: {
        Row: {
          client_id: string | null
          client_rating: number | null
          course_number: string | null
          created_at: string
          created_by_user_id: string | null
          destination_address: string
          destination_latitude: number | null
          destination_longitude: number | null
          discount_amount: number | null
          distance_km: number | null
          driver_id: string | null
          driver_ids: string[] | null
          duration_minutes: number | null
          guest_email: string | null
          guest_estimated_price: number | null
          guest_name: string | null
          guest_notified_at: string | null
          guest_phone: string | null
          guest_tracking_token: string | null
          id: string
          is_guest_booking: boolean | null
          notes: string | null
          passengers_count: number
          payment_confirmed_at: string | null
          payment_confirmed_by: string | null
          payment_method_requested: string | null
          payment_method_used: string | null
          pickup_address: string
          pickup_latitude: number | null
          pickup_longitude: number | null
          promo_code: string | null
          scheduled_date: string
          status: Database["public"]["Enums"]["course_status"]
          updated_at: string
        }
        Insert: {
          client_id?: string | null
          client_rating?: number | null
          course_number?: string | null
          created_at?: string
          created_by_user_id?: string | null
          destination_address: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          discount_amount?: number | null
          distance_km?: number | null
          driver_id?: string | null
          driver_ids?: string[] | null
          duration_minutes?: number | null
          guest_email?: string | null
          guest_estimated_price?: number | null
          guest_name?: string | null
          guest_notified_at?: string | null
          guest_phone?: string | null
          guest_tracking_token?: string | null
          id?: string
          is_guest_booking?: boolean | null
          notes?: string | null
          passengers_count?: number
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method_requested?: string | null
          payment_method_used?: string | null
          pickup_address: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          promo_code?: string | null
          scheduled_date: string
          status?: Database["public"]["Enums"]["course_status"]
          updated_at?: string
        }
        Update: {
          client_id?: string | null
          client_rating?: number | null
          course_number?: string | null
          created_at?: string
          created_by_user_id?: string | null
          destination_address?: string
          destination_latitude?: number | null
          destination_longitude?: number | null
          discount_amount?: number | null
          distance_km?: number | null
          driver_id?: string | null
          driver_ids?: string[] | null
          duration_minutes?: number | null
          guest_email?: string | null
          guest_estimated_price?: number | null
          guest_name?: string | null
          guest_notified_at?: string | null
          guest_phone?: string | null
          guest_tracking_token?: string | null
          id?: string
          is_guest_booking?: boolean | null
          notes?: string | null
          passengers_count?: number
          payment_confirmed_at?: string | null
          payment_confirmed_by?: string | null
          payment_method_requested?: string | null
          payment_method_used?: string | null
          pickup_address?: string
          pickup_latitude?: number | null
          pickup_longitude?: number | null
          promo_code?: string | null
          scheduled_date?: string
          status?: Database["public"]["Enums"]["course_status"]
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
        ]
      }
      devis: {
        Row: {
          accepted_at: string | null
          amount: number
          base_price: number
          client_id: string | null
          company_employee_id: string | null
          company_id: string | null
          course_id: string
          created_at: string
          discount_amount: number
          distance_price: number
          driver_id: string
          evening_surcharge_amount: number | null
          id: string
          notes: string | null
          promo_code: string | null
          quote_number: string | null
          status: Database["public"]["Enums"]["devis_status"]
          time_price: number | null
          updated_at: string
          valid_until: string
          weekend_surcharge_amount: number | null
        }
        Insert: {
          accepted_at?: string | null
          amount: number
          base_price: number
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id: string
          created_at?: string
          discount_amount?: number
          distance_price: number
          driver_id: string
          evening_surcharge_amount?: number | null
          id?: string
          notes?: string | null
          promo_code?: string | null
          quote_number?: string | null
          status?: Database["public"]["Enums"]["devis_status"]
          time_price?: number | null
          updated_at?: string
          valid_until: string
          weekend_surcharge_amount?: number | null
        }
        Update: {
          accepted_at?: string | null
          amount?: number
          base_price?: number
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id?: string
          created_at?: string
          discount_amount?: number
          distance_price?: number
          driver_id?: string
          evening_surcharge_amount?: number | null
          id?: string
          notes?: string | null
          promo_code?: string | null
          quote_number?: string | null
          status?: Database["public"]["Enums"]["devis_status"]
          time_price?: number | null
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
      driver_partnerships: {
        Row: {
          accepted_at: string | null
          blocked_at: string | null
          blocked_by_admin_id: string | null
          blocked_reason: string | null
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
          updated_at: string | null
        }
        Insert: {
          accepted_at?: string | null
          blocked_at?: string | null
          blocked_by_admin_id?: string | null
          blocked_reason?: string | null
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
          updated_at?: string | null
        }
        Update: {
          accepted_at?: string | null
          blocked_at?: string | null
          blocked_by_admin_id?: string | null
          blocked_reason?: string | null
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
      drivers: {
        Row: {
          airport_surcharge: number | null
          base_fare: number | null
          base_rate: number | null
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
          display_company_name: boolean | null
          display_driver_name: boolean | null
          documents: Json | null
          documents_deadline: string | null
          documents_status: string | null
          documents_submitted_at: string | null
          driver_code: string | null
          evening_surcharge: number | null
          fleet_documents_deadline: string | null
          fleet_documents_status: string | null
          fleet_documents_submitted_at: string | null
          fleet_manager_id: string | null
          free_access_end_date: string | null
          free_access_granted: boolean | null
          free_access_start_date: string | null
          free_access_type: string | null
          gallery_photos: string[] | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          hourly_rate: number | null
          id: string
          invoice_counter: number | null
          is_demo_account: boolean | null
          is_fleet_driver: boolean | null
          license_number: string
          max_passengers: number
          minimum_price: number | null
          partner_invoice_counter: number | null
          partner_order_counter: number | null
          partnerships_suspended: boolean | null
          partnerships_suspended_at: string | null
          partnerships_suspended_reason: string | null
          per_km_rate: number | null
          public_profile_enabled: boolean | null
          quote_counter: number | null
          rating: number | null
          registration_data: Json | null
          registration_step: number | null
          reservation_counter: number | null
          service_description: string | null
          services_offered: string[] | null
          sharing_available: boolean | null
          sharing_available_since: string | null
          sharing_number: number | null
          show_email: boolean | null
          show_phone: boolean | null
          show_phone_for_sharing: boolean | null
          show_pricing_partners: boolean | null
          show_rating_for_sharing: boolean | null
          show_rating_partners: boolean | null
          show_rating_public: boolean | null
          show_rides_for_sharing: boolean | null
          siren: string | null
          siret: string | null
          status: Database["public"]["Enums"]["driver_status"]
          subscription_end_date: string | null
          subscription_paid: boolean | null
          subscription_status: string | null
          subscription_stripe_id: string | null
          total_rides: number | null
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
          vehicle_year: number | null
          visible_to_companies: boolean | null
          visible_to_drivers: boolean | null
          visible_to_fleet_managers: boolean | null
          weekend_surcharge: number | null
          working_sectors: string[] | null
        }
        Insert: {
          airport_surcharge?: number | null
          base_fare?: number | null
          base_rate?: number | null
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
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          documents?: Json | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          driver_code?: string | null
          evening_surcharge?: number | null
          fleet_documents_deadline?: string | null
          fleet_documents_status?: string | null
          fleet_documents_submitted_at?: string | null
          fleet_manager_id?: string | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          gallery_photos?: string[] | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          invoice_counter?: number | null
          is_demo_account?: boolean | null
          is_fleet_driver?: boolean | null
          license_number: string
          max_passengers?: number
          minimum_price?: number | null
          partner_invoice_counter?: number | null
          partner_order_counter?: number | null
          partnerships_suspended?: boolean | null
          partnerships_suspended_at?: string | null
          partnerships_suspended_reason?: string | null
          per_km_rate?: number | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          registration_data?: Json | null
          registration_step?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          sharing_available?: boolean | null
          sharing_available_since?: string | null
          sharing_number?: number | null
          show_email?: boolean | null
          show_phone?: boolean | null
          show_phone_for_sharing?: boolean | null
          show_pricing_partners?: boolean | null
          show_rating_for_sharing?: boolean | null
          show_rating_partners?: boolean | null
          show_rating_public?: boolean | null
          show_rides_for_sharing?: boolean | null
          siren?: string | null
          siret?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_rides?: number | null
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
          vehicle_year?: number | null
          visible_to_companies?: boolean | null
          visible_to_drivers?: boolean | null
          visible_to_fleet_managers?: boolean | null
          weekend_surcharge?: number | null
          working_sectors?: string[] | null
        }
        Update: {
          airport_surcharge?: number | null
          base_fare?: number | null
          base_rate?: number | null
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
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          documents?: Json | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          driver_code?: string | null
          evening_surcharge?: number | null
          fleet_documents_deadline?: string | null
          fleet_documents_status?: string | null
          fleet_documents_submitted_at?: string | null
          fleet_manager_id?: string | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          gallery_photos?: string[] | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          invoice_counter?: number | null
          is_demo_account?: boolean | null
          is_fleet_driver?: boolean | null
          license_number?: string
          max_passengers?: number
          minimum_price?: number | null
          partner_invoice_counter?: number | null
          partner_order_counter?: number | null
          partnerships_suspended?: boolean | null
          partnerships_suspended_at?: string | null
          partnerships_suspended_reason?: string | null
          per_km_rate?: number | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          registration_data?: Json | null
          registration_step?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          sharing_available?: boolean | null
          sharing_available_since?: string | null
          sharing_number?: number | null
          show_email?: boolean | null
          show_phone?: boolean | null
          show_phone_for_sharing?: boolean | null
          show_pricing_partners?: boolean | null
          show_rating_for_sharing?: boolean | null
          show_rating_partners?: boolean | null
          show_rating_public?: boolean | null
          show_rides_for_sharing?: boolean | null
          siren?: string | null
          siret?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_rides?: number | null
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
          vehicle_year?: number | null
          visible_to_companies?: boolean | null
          visible_to_drivers?: boolean | null
          visible_to_fleet_managers?: boolean | null
          weekend_surcharge?: number | null
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
      expense_reports: {
        Row: {
          amount: number
          company_id: string
          course_id: string
          created_at: string | null
          description: string | null
          employee_id: string
          facture_id: string | null
          id: string
          notes: string | null
          payment_method: string
          receipt_url: string | null
          reimbursed_at: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
        }
        Insert: {
          amount: number
          company_id: string
          course_id: string
          created_at?: string | null
          description?: string | null
          employee_id: string
          facture_id?: string | null
          id?: string
          notes?: string | null
          payment_method: string
          receipt_url?: string | null
          reimbursed_at?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          company_id?: string
          course_id?: string
          created_at?: string | null
          description?: string | null
          employee_id?: string
          facture_id?: string | null
          id?: string
          notes?: string | null
          payment_method?: string
          receipt_url?: string | null
          reimbursed_at?: string | null
          rejection_reason?: string | null
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
          amount: number
          client_id: string | null
          company_employee_id: string | null
          company_id: string | null
          course_id: string
          created_at: string
          devis_id: string | null
          discount_amount: number
          driver_id: string
          id: string
          invoice_number: string
          invoice_number_generated: string | null
          paid_at: string | null
          payment_method: string | null
          payment_status: Database["public"]["Enums"]["payment_status"]
          promo_code: string | null
          stripe_payment_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id: string
          created_at?: string
          devis_id?: string | null
          discount_amount?: number
          driver_id: string
          id?: string
          invoice_number: string
          invoice_number_generated?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promo_code?: string | null
          stripe_payment_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          client_id?: string | null
          company_employee_id?: string | null
          company_id?: string | null
          course_id?: string
          created_at?: string
          devis_id?: string | null
          discount_amount?: number
          driver_id?: string
          id?: string
          invoice_number?: string
          invoice_number_generated?: string | null
          paid_at?: string | null
          payment_method?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"]
          promo_code?: string | null
          stripe_payment_id?: string | null
          updated_at?: string
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
            foreignKeyName: "fleet_client_invitations_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
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
            foreignKeyName: "fleet_manager_clients_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
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
          dispatch_priority: string | null
          documents: Json | null
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
          subscription_end_date: string | null
          subscription_paid: boolean | null
          subscription_status: string | null
          subscription_stripe_id: string | null
          total_clients: number | null
          total_drivers: number | null
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
          dispatch_priority?: string | null
          documents?: Json | null
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
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_clients?: number | null
          total_drivers?: number | null
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
          dispatch_priority?: string | null
          documents?: Json | null
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
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_clients?: number | null
          total_drivers?: number | null
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
        ]
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
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          title: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          title: string
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
          partnership_ids: string[]
          sender_driver_id: string
          status: string
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
          partnership_ids: string[]
          sender_driver_id: string
          status?: string
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
          partnership_ids?: string[]
          sender_driver_id?: string
          status?: string
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
          partnership_id: string
          payment_method_used: string | null
          payment_settled: boolean | null
          payment_settled_at: string | null
          pool_group_id: string | null
          receiver_driver_id: string
          receiver_notified_at: string | null
          sender_driver_id: string
          sender_notified_at: string | null
          sharing_mode: string | null
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
          partnership_id: string
          payment_method_used?: string | null
          payment_settled?: boolean | null
          payment_settled_at?: string | null
          pool_group_id?: string | null
          receiver_driver_id: string
          receiver_notified_at?: string | null
          sender_driver_id: string
          sender_notified_at?: string | null
          sharing_mode?: string | null
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
          partnership_id?: string
          payment_method_used?: string | null
          payment_settled?: boolean | null
          payment_settled_at?: string | null
          pool_group_id?: string | null
          receiver_driver_id?: string
          receiver_notified_at?: string | null
          sender_driver_id?: string
          sender_notified_at?: string | null
          sharing_mode?: string | null
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
            foreignKeyName: "unassigned_fleet_courses_fleet_manager_id_fkey"
            columns: ["fleet_manager_id"]
            isOneToOne: false
            referencedRelation: "fleet_managers"
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
      drivers_available_for_sharing: {
        Row: {
          company_name: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          profile_photo_url: string | null
          rating: number | null
          sharing_number: number | null
          show_email: boolean | null
          show_phone_for_sharing: boolean | null
          show_rating_partners: boolean | null
          total_rides: number | null
          user_id: string | null
          vehicle_brand: string | null
          vehicle_model: string | null
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
      fleet_searchable_drivers: {
        Row: {
          base_fare: number | null
          bio: string | null
          company_name: string | null
          email: string | null
          full_name: string | null
          gallery_photos: string[] | null
          home_address: string | null
          hourly_rate: number | null
          id: string | null
          per_km_rate: number | null
          phone: string | null
          profile_photo_url: string | null
          rating: number | null
          service_description: string | null
          services_offered: string[] | null
          sharing_number: number | null
          show_email: boolean | null
          show_phone: boolean | null
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
      public_driver_profiles: {
        Row: {
          bio: string | null
          card_photo_url: string | null
          company_name: string | null
          display_company_name: boolean | null
          display_driver_name: boolean | null
          gallery_photos: string[] | null
          id: string | null
          max_passengers: number | null
          rating: number | null
          service_description: string | null
          services_offered: string[] | null
          show_email: boolean | null
          show_phone: boolean | null
          total_rides: number | null
          user_id: string | null
          vehicle_brand: string | null
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
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
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
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          gallery_photos?: string[] | null
          id?: string | null
          max_passengers?: number | null
          rating?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          total_rides?: number | null
          user_id?: string | null
          vehicle_brand?: string | null
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
    }
    Functions: {
      accept_devis_safely: {
        Args: { _client_user_id: string; _devis_id: string }
        Returns: {
          course_id: string
          message: string
          success: boolean
        }[]
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
      auto_assign_fleet_driver: {
        Args: {
          p_duration_minutes?: number
          p_favorite_driver_id?: string
          p_fleet_manager_id: string
          p_scheduled_date: string
        }
        Returns: string
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
      calculate_fleet_course_price: {
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
      calculate_fleet_monthly_billing: {
        Args: { _fleet_manager_id: string }
        Returns: {
          base_cost: number
          extra_cost: number
          extra_drivers: number
          total_cost: number
        }[]
      }
      calculate_payment_due_date: {
        Args: { created_at: string; payment_schedule: string }
        Returns: string
      }
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
      check_company_payment_reminders: { Args: never; Returns: undefined }
      check_driver_availability: {
        Args: {
          p_driver_id: string
          p_duration_minutes?: number
          p_scheduled_date: string
        }
        Returns: boolean
      }
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
      find_available_fleet_driver: {
        Args: {
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
          display_company_name: boolean
          display_driver_name: boolean
          formatted_sharing_number: string
          full_name: string
          id: string
          phone: string
          profile_photo_url: string
          rating: number
          sharing_number: number
          total_rides: number
          user_id: string
        }[]
      }
      find_nearest_available_fleet_driver: {
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
      format_sharing_number: { Args: { _number: number }; Returns: string }
      generate_course_number: { Args: { _driver_id: string }; Returns: string }
      generate_invoice_number: { Args: { _driver_id: string }; Returns: string }
      generate_quote_number: { Args: { _driver_id: string }; Returns: string }
      generate_reservation_number: {
        Args: { _driver_id: string }
        Returns: string
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
      get_company_id: { Args: { _user_id: string }; Returns: string }
      get_course_invitation_by_token: {
        Args: { _token: string }
        Returns: {
          course_id: string
          destination_address: string
          distance_km: number
          driver_company: string
          driver_id: string
          driver_name: string
          driver_photo: string
          duration_minutes: number
          estimated_price: number
          expires_at: string
          id: string
          pickup_address: string
          price_details: Json
          status: string
          token: string
        }[]
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
      get_driver_clients_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_courses_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_id: { Args: { _user_id: string }; Returns: string }
      get_employee_company_id: { Args: { p_user_id: string }; Returns: string }
      get_fleet_driver_count: {
        Args: { _fleet_manager_id: string }
        Returns: number
      }
      get_fleet_manager_id: { Args: { _user_id: string }; Returns: string }
      get_guest_booking_by_token: {
        Args: { _token: string }
        Returns: {
          created_at: string
          destination_address: string
          driver_company: string
          driver_name: string
          driver_phone: string
          guest_estimated_price: number
          guest_name: string
          id: string
          pickup_address: string
          scheduled_date: string
          status: Database["public"]["Enums"]["course_status"]
        }[]
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
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      is_course_shared_locked: { Args: { p_course_id: string }; Returns: Json }
      is_first_order: {
        Args: {
          p_client_id: string
          p_driver_id?: string
          p_fleet_manager_id?: string
        }
        Returns: boolean
      }
      mark_commission_paid: {
        Args: { _commission_ids: string[] }
        Returns: undefined
      }
      notify_overdue_company_payments: { Args: never; Returns: undefined }
      refresh_driver_statistics: { Args: never; Returns: undefined }
      remove_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
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
      set_favorite_vehicle: {
        Args: { _driver_id: string; _vehicle_id: string }
        Returns: boolean
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
      devis_status: "pending" | "accepted" | "rejected" | "expired"
      driver_status: "pending" | "validated" | "rejected" | "on_hold"
      payment_status: "pending" | "paid" | "failed" | "refunded"
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
      app_role: ["admin", "driver", "client", "company", "fleet_manager"],
      course_status: [
        "pending",
        "accepted",
        "in_progress",
        "completed",
        "cancelled",
      ],
      devis_status: ["pending", "accepted", "rejected", "expired"],
      driver_status: ["pending", "validated", "rejected", "on_hold"],
      payment_status: ["pending", "paid", "failed", "refunded"],
    },
  },
} as const
