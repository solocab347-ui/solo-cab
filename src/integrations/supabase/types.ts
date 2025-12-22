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
          monthly_budget: number | null
          notes: string | null
          preferred_vehicle_types: string[] | null
          siren: string | null
          siret: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
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
          monthly_budget?: number | null
          notes?: string | null
          preferred_vehicle_types?: string[] | null
          siren?: string | null
          siret: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
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
          monthly_budget?: number | null
          notes?: string | null
          preferred_vehicle_types?: string[] | null
          siren?: string | null
          siret?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
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
            referencedRelation: "public_driver_profiles"
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
          client_id: string
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
          client_id: string
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
          client_id?: string
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
          created_at: string | null
          custom_payment_days: number | null
          driver_a_id: string
          driver_b_id: string
          id: string
          last_payment_date: string | null
          payment_day: number | null
          payment_schedule: string | null
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
          created_at?: string | null
          custom_payment_days?: number | null
          driver_a_id: string
          driver_b_id: string
          id?: string
          last_payment_date?: string | null
          payment_day?: number | null
          payment_schedule?: string | null
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
          created_at?: string | null
          custom_payment_days?: number | null
          driver_a_id?: string
          driver_b_id?: string
          id?: string
          last_payment_date?: string | null
          payment_day?: number | null
          payment_schedule?: string | null
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
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      drivers: {
        Row: {
          base_fare: number | null
          base_rate: number | null
          bio: string | null
          can_create_courses: boolean | null
          can_manage_clients: boolean | null
          card_photo_url: string | null
          company_address: string | null
          company_name: string | null
          course_counter: number | null
          created_at: string
          display_company_name: boolean | null
          display_driver_name: boolean | null
          documents: Json | null
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
          per_km_rate: number | null
          public_profile_enabled: boolean | null
          quote_counter: number | null
          rating: number | null
          registration_data: Json | null
          registration_step: number | null
          reservation_counter: number | null
          service_description: string | null
          services_offered: string[] | null
          show_email: boolean | null
          show_phone: boolean | null
          siren: string | null
          siret: string | null
          status: Database["public"]["Enums"]["driver_status"]
          subscription_end_date: string | null
          subscription_paid: boolean | null
          subscription_status: string | null
          subscription_stripe_id: string | null
          total_rides: number | null
          tva_included: boolean
          tva_rate: number | null
          updated_at: string
          user_id: string
          validation_date: string | null
          vehicle_brand: string | null
          vehicle_color: string | null
          vehicle_equipment: string[] | null
          vehicle_model: string
          vehicle_photos: string[] | null
          vehicle_plate: string | null
          vehicle_year: number | null
          weekend_surcharge: number | null
          working_sectors: string[] | null
        }
        Insert: {
          base_fare?: number | null
          base_rate?: number | null
          bio?: string | null
          can_create_courses?: boolean | null
          can_manage_clients?: boolean | null
          card_photo_url?: string | null
          company_address?: string | null
          company_name?: string | null
          course_counter?: number | null
          created_at?: string
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          documents?: Json | null
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
          per_km_rate?: number | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          registration_data?: Json | null
          registration_step?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          siren?: string | null
          siret?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_rides?: number | null
          tva_included?: boolean
          tva_rate?: number | null
          updated_at?: string
          user_id: string
          validation_date?: string | null
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model: string
          vehicle_photos?: string[] | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
          weekend_surcharge?: number | null
          working_sectors?: string[] | null
        }
        Update: {
          base_fare?: number | null
          base_rate?: number | null
          bio?: string | null
          can_create_courses?: boolean | null
          can_manage_clients?: boolean | null
          card_photo_url?: string | null
          company_address?: string | null
          company_name?: string | null
          course_counter?: number | null
          created_at?: string
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          documents?: Json | null
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
          per_km_rate?: number | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          registration_data?: Json | null
          registration_step?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
          show_email?: boolean | null
          show_phone?: boolean | null
          siren?: string | null
          siret?: string | null
          status?: Database["public"]["Enums"]["driver_status"]
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_rides?: number | null
          tva_included?: boolean
          tva_rate?: number | null
          updated_at?: string
          user_id?: string
          validation_date?: string | null
          vehicle_brand?: string | null
          vehicle_color?: string | null
          vehicle_equipment?: string[] | null
          vehicle_model?: string
          vehicle_photos?: string[] | null
          vehicle_plate?: string | null
          vehicle_year?: number | null
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
      factures: {
        Row: {
          amount: number
          client_id: string
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
          client_id: string
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
          client_id?: string
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
            referencedRelation: "public_driver_profiles"
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
            referencedRelation: "public_driver_profiles"
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
          commission_percentage: number | null
          commission_type: string | null
          created_at: string
          driver_id: string
          fleet_manager_id: string
          id: string
          is_salaried: boolean | null
          joined_at: string
          last_payment_date: string | null
          payment_agreement_signed: boolean | null
          payment_agreement_signed_at: string | null
          payment_schedule: string | null
          status: string
          total_owed: number | null
        }
        Insert: {
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string
          driver_id: string
          fleet_manager_id: string
          id?: string
          is_salaried?: boolean | null
          joined_at?: string
          last_payment_date?: string | null
          payment_agreement_signed?: boolean | null
          payment_agreement_signed_at?: string | null
          payment_schedule?: string | null
          status?: string
          total_owed?: number | null
        }
        Update: {
          commission_percentage?: number | null
          commission_type?: string | null
          created_at?: string
          driver_id?: string
          fleet_manager_id?: string
          id?: string
          is_salaried?: boolean | null
          joined_at?: string
          last_payment_date?: string | null
          payment_agreement_signed?: boolean | null
          payment_agreement_signed_at?: string | null
          payment_schedule?: string | null
          status?: string
          total_owed?: number | null
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
          assignment_mode: string | null
          auto_validate_courses: boolean | null
          base_fare: number | null
          base_subscription_cost: number | null
          billing_history: Json | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          default_commission_percentage: number | null
          description: string | null
          documents: Json | null
          documents_deadline: string | null
          documents_status: string | null
          documents_submitted_at: string | null
          evening_surcharge: number | null
          extra_drivers_count: number | null
          favorite_driver_priority: boolean | null
          hourly_rate: number | null
          id: string
          logo_url: string | null
          max_free_drivers: number | null
          minimum_price: number | null
          monthly_extra_driver_cost: number | null
          next_billing_date: string | null
          per_km_rate: number | null
          qr_code_id: string | null
          show_address: boolean | null
          show_contact_name: boolean | null
          show_drivers_in_public_storefront: boolean | null
          show_email: boolean | null
          show_phone: boolean | null
          siren: string | null
          siret: string
          status: string
          stripe_customer_id: string | null
          subscription_end_date: string | null
          subscription_paid: boolean | null
          subscription_status: string | null
          subscription_stripe_id: string | null
          total_clients: number | null
          total_drivers: number | null
          tva_included: boolean | null
          tva_rate: number | null
          updated_at: string
          user_id: string
          weekend_surcharge: number | null
        }
        Insert: {
          address: string
          assignment_mode?: string | null
          auto_validate_courses?: boolean | null
          base_fare?: number | null
          base_subscription_cost?: number | null
          billing_history?: Json | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          default_commission_percentage?: number | null
          description?: string | null
          documents?: Json | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          evening_surcharge?: number | null
          extra_drivers_count?: number | null
          favorite_driver_priority?: boolean | null
          hourly_rate?: number | null
          id?: string
          logo_url?: string | null
          max_free_drivers?: number | null
          minimum_price?: number | null
          monthly_extra_driver_cost?: number | null
          next_billing_date?: string | null
          per_km_rate?: number | null
          qr_code_id?: string | null
          show_address?: boolean | null
          show_contact_name?: boolean | null
          show_drivers_in_public_storefront?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          siren?: string | null
          siret: string
          status?: string
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_clients?: number | null
          total_drivers?: number | null
          tva_included?: boolean | null
          tva_rate?: number | null
          updated_at?: string
          user_id: string
          weekend_surcharge?: number | null
        }
        Update: {
          address?: string
          assignment_mode?: string | null
          auto_validate_courses?: boolean | null
          base_fare?: number | null
          base_subscription_cost?: number | null
          billing_history?: Json | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          default_commission_percentage?: number | null
          description?: string | null
          documents?: Json | null
          documents_deadline?: string | null
          documents_status?: string | null
          documents_submitted_at?: string | null
          evening_surcharge?: number | null
          extra_drivers_count?: number | null
          favorite_driver_priority?: boolean | null
          hourly_rate?: number | null
          id?: string
          logo_url?: string | null
          max_free_drivers?: number | null
          minimum_price?: number | null
          monthly_extra_driver_cost?: number | null
          next_billing_date?: string | null
          per_km_rate?: number | null
          qr_code_id?: string | null
          show_address?: boolean | null
          show_contact_name?: boolean | null
          show_drivers_in_public_storefront?: boolean | null
          show_email?: boolean | null
          show_phone?: boolean | null
          siren?: string | null
          siret?: string
          status?: string
          stripe_customer_id?: string | null
          subscription_end_date?: string | null
          subscription_paid?: boolean | null
          subscription_status?: string | null
          subscription_stripe_id?: string | null
          total_clients?: number | null
          total_drivers?: number | null
          tva_included?: boolean | null
          tva_rate?: number | null
          updated_at?: string
          user_id?: string
          weekend_surcharge?: number | null
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
            referencedRelation: "drivers"
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
          profile_photo_url: string | null
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
          profile_photo_url?: string | null
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
          profile_photo_url?: string | null
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
            referencedRelation: "public_driver_profiles"
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
            referencedRelation: "public_driver_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      shared_courses: {
        Row: {
          client_message: string | null
          client_notified: boolean | null
          client_notified_at: string | null
          commission_amount: number
          commission_percentage: number
          completed_at: string | null
          course_amount: number
          course_id: string
          created_at: string | null
          id: string
          partnership_id: string
          receiver_driver_id: string
          sender_driver_id: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          client_message?: string | null
          client_notified?: boolean | null
          client_notified_at?: string | null
          commission_amount: number
          commission_percentage: number
          completed_at?: string | null
          course_amount: number
          course_id: string
          created_at?: string | null
          id?: string
          partnership_id: string
          receiver_driver_id: string
          sender_driver_id: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          client_message?: string | null
          client_notified?: boolean | null
          client_notified_at?: string | null
          commission_amount?: number
          commission_percentage?: number
          completed_at?: string | null
          course_amount?: number
          course_id?: string
          created_at?: string | null
          id?: string
          partnership_id?: string
          receiver_driver_id?: string
          sender_driver_id?: string
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
      auto_assign_fleet_driver: {
        Args: {
          p_duration_minutes?: number
          p_favorite_driver_id?: string
          p_fleet_manager_id: string
          p_scheduled_date: string
        }
        Returns: string
      }
      calculate_course_price:
        | {
            Args: {
              _distance_km: number
              _driver_id: string
              _duration_minutes: number
              _use_hourly_rate?: boolean
            }
            Returns: {
              base_price: number
              distance_price: number
              subtotal: number
              time_price: number
              total_price: number
              tva_amount: number
            }[]
          }
        | {
            Args: {
              _distance_km: number
              _driver_id: string
              _duration_minutes: number
              _scheduled_date?: string
              _use_hourly_rate?: boolean
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
      can_add_free_driver: {
        Args: { _fleet_manager_id: string }
        Returns: boolean
      }
      can_share_courses: { Args: { _driver_id: string }; Returns: boolean }
      check_driver_availability: {
        Args: {
          p_driver_id: string
          p_duration_minutes?: number
          p_scheduled_date: string
        }
        Returns: boolean
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
      get_client_id: { Args: { _user_id: string }; Returns: string }
      get_company_id: { Args: { _user_id: string }; Returns: string }
      get_driver_clients_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_courses_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_id: { Args: { _user_id: string }; Returns: string }
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
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_roles: { Args: { _user_id: string }; Returns: string[] }
      has_role:
        | {
            Args: {
              _role: Database["public"]["Enums"]["app_role"]
              _user_id: string
            }
            Returns: boolean
          }
        | { Args: { _role: string; _user_id: string }; Returns: boolean }
      refresh_driver_statistics: { Args: never; Returns: undefined }
      remove_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
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
