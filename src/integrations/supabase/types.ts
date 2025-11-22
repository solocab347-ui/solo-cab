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
            referencedRelation: "drivers"
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
            referencedRelation: "drivers"
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
            referencedRelation: "drivers"
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
          client_id: string
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
          id: string
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
          client_id: string
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
          id?: string
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
          client_id?: string
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
          id?: string
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
            referencedRelation: "drivers"
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
          id: string
          notes: string | null
          promo_code: string | null
          quote_number: string | null
          status: Database["public"]["Enums"]["devis_status"]
          time_price: number | null
          updated_at: string
          valid_until: string
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
          id?: string
          notes?: string | null
          promo_code?: string | null
          quote_number?: string | null
          status?: Database["public"]["Enums"]["devis_status"]
          time_price?: number | null
          updated_at?: string
          valid_until: string
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
          id?: string
          notes?: string | null
          promo_code?: string | null
          quote_number?: string | null
          status?: Database["public"]["Enums"]["devis_status"]
          time_price?: number | null
          updated_at?: string
          valid_until?: string
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
            referencedRelation: "drivers"
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
      drivers: {
        Row: {
          base_fare: number | null
          base_rate: number | null
          bio: string | null
          company_address: string | null
          company_name: string | null
          course_counter: number | null
          created_at: string
          display_company_name: boolean | null
          display_driver_name: boolean | null
          documents: Json | null
          free_access_end_date: string | null
          free_access_granted: boolean | null
          free_access_start_date: string | null
          free_access_type: string | null
          home_address: string | null
          home_latitude: number | null
          home_longitude: number | null
          hourly_rate: number | null
          id: string
          invoice_counter: number | null
          license_number: string
          max_passengers: number
          per_km_rate: number | null
          public_profile_enabled: boolean | null
          quote_counter: number | null
          rating: number | null
          reservation_counter: number | null
          service_description: string | null
          services_offered: string[] | null
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
          vehicle_plate: string | null
          vehicle_year: number | null
          working_sectors: string[] | null
        }
        Insert: {
          base_fare?: number | null
          base_rate?: number | null
          bio?: string | null
          company_address?: string | null
          company_name?: string | null
          course_counter?: number | null
          created_at?: string
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          documents?: Json | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          invoice_counter?: number | null
          license_number: string
          max_passengers?: number
          per_km_rate?: number | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
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
          vehicle_plate?: string | null
          vehicle_year?: number | null
          working_sectors?: string[] | null
        }
        Update: {
          base_fare?: number | null
          base_rate?: number | null
          bio?: string | null
          company_address?: string | null
          company_name?: string | null
          course_counter?: number | null
          created_at?: string
          display_company_name?: boolean | null
          display_driver_name?: boolean | null
          documents?: Json | null
          free_access_end_date?: string | null
          free_access_granted?: boolean | null
          free_access_start_date?: string | null
          free_access_type?: string | null
          home_address?: string | null
          home_latitude?: number | null
          home_longitude?: number | null
          hourly_rate?: number | null
          id?: string
          invoice_counter?: number | null
          license_number?: string
          max_passengers?: number
          per_km_rate?: number | null
          public_profile_enabled?: boolean | null
          quote_counter?: number | null
          rating?: number | null
          reservation_counter?: number | null
          service_description?: string | null
          services_offered?: string[] | null
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
          vehicle_plate?: string | null
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
            referencedRelation: "drivers"
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
            referencedRelation: "drivers"
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
            referencedRelation: "drivers"
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
    }
    Functions: {
      add_user_role: {
        Args: { _role: string; _user_id: string }
        Returns: undefined
      }
      calculate_course_price: {
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
      generate_course_number: { Args: { _driver_id: string }; Returns: string }
      generate_invoice_number: { Args: { _driver_id: string }; Returns: string }
      generate_quote_number: { Args: { _driver_id: string }; Returns: string }
      generate_reservation_number: {
        Args: { _driver_id: string }
        Returns: string
      }
      get_client_id: { Args: { _user_id: string }; Returns: string }
      get_driver_clients_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_courses_count: {
        Args: { _driver_id: string }
        Returns: number
      }
      get_driver_id: { Args: { _user_id: string }; Returns: string }
      get_or_create_conversation: {
        Args: { user1_id: string; user2_id: string }
        Returns: string
      }
      get_platform_stats: { Args: never; Returns: Json }
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
          base_rate: number
          bio: string
          distance_km: number
          full_name: string
          home_address: string
          id: string
          per_km_rate: number
          profile_photo_url: string
          rating: number
          service_description: string
          total_rides: number
          vehicle_color: string
          vehicle_model: string
          working_sectors: string[]
        }[]
      }
      search_public_drivers: {
        Args: { _search_term?: string; _sector?: string }
        Returns: {
          base_rate: number
          bio: string
          full_name: string
          id: string
          per_km_rate: number
          profile_photo_url: string
          rating: number
          service_description: string
          total_rides: number
          vehicle_model: string
          working_sectors: string[]
        }[]
      }
      verify_client_driver_association: {
        Args: { _client_id: string; _driver_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "driver" | "client"
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
      app_role: ["admin", "driver", "client"],
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
