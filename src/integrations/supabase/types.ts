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
      api_keys: {
        Row: {
          business_id: string | null
          created_at: string
          created_by: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          key_hash: string
          key_prefix: string
          last_used_at: string | null
          name: string
          rate_limit: number
          requests_today: number
          updated_at: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash: string
          key_prefix: string
          last_used_at?: string | null
          name: string
          rate_limit?: number
          requests_today?: number
          updated_at?: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          key_hash?: string
          key_prefix?: string
          last_used_at?: string | null
          name?: string
          rate_limit?: number
          requests_today?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "api_keys_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action_type: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      bank_api_credentials: {
        Row: {
          bank_id: string
          created_at: string
          created_by: string | null
          credential_type: string
          encrypted_value: string
          environment: string
          id: string
          is_active: boolean | null
          updated_at: string
        }
        Insert: {
          bank_id: string
          created_at?: string
          created_by?: string | null
          credential_type: string
          encrypted_value: string
          environment?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Update: {
          bank_id?: string
          created_at?: string
          created_by?: string | null
          credential_type?: string
          encrypted_value?: string
          environment?: string
          id?: string
          is_active?: boolean | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_api_credentials_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks_fintechs"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_integration_logs: {
        Row: {
          action: string
          bank_id: string | null
          business_id: string | null
          created_at: string
          endpoint: string | null
          error_message: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          request_method: string | null
          response_status: number | null
          response_time_ms: number | null
          user_id: string | null
        }
        Insert: {
          action: string
          bank_id?: string | null
          business_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          request_method?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Update: {
          action?: string
          bank_id?: string | null
          business_id?: string | null
          created_at?: string
          endpoint?: string | null
          error_message?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          request_method?: string | null
          response_status?: number | null
          response_time_ms?: number | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_integration_logs_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks_fintechs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_integration_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      banks_fintechs: {
        Row: {
          api_endpoint: string | null
          contact_email: string | null
          created_at: string
          description: string | null
          documentation_url: string | null
          id: string
          is_globally_enabled: boolean | null
          logo_url: string | null
          name: string
          provider_type: string
          slug: string
          status: Database["public"]["Enums"]["bank_status"]
          supported_countries: string[] | null
          supported_features: string[] | null
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_globally_enabled?: boolean | null
          logo_url?: string | null
          name: string
          provider_type?: string
          slug: string
          status?: Database["public"]["Enums"]["bank_status"]
          supported_countries?: string[] | null
          supported_features?: string[] | null
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          contact_email?: string | null
          created_at?: string
          description?: string | null
          documentation_url?: string | null
          id?: string
          is_globally_enabled?: boolean | null
          logo_url?: string | null
          name?: string
          provider_type?: string
          slug?: string
          status?: Database["public"]["Enums"]["bank_status"]
          supported_countries?: string[] | null
          supported_features?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      beneficiaries: {
        Row: {
          account_name: string | null
          account_number: string
          bank_code: string | null
          bank_name: string | null
          business_id: string
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          metadata: Json | null
          name: string
          phone: string | null
          provider_id: string | null
          updated_at: string
        }
        Insert: {
          account_name?: string | null
          account_number: string
          bank_code?: string | null
          bank_name?: string | null
          business_id: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          metadata?: Json | null
          name: string
          phone?: string | null
          provider_id?: string | null
          updated_at?: string
        }
        Update: {
          account_name?: string | null
          account_number?: string
          bank_code?: string | null
          bank_name?: string | null
          business_id?: string
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          metadata?: Json | null
          name?: string
          phone?: string | null
          provider_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "beneficiaries_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "beneficiaries_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      branch_inventory_assignments: {
        Row: {
          assigned_by: string
          assigned_quantity: number
          created_at: string
          id: string
          inventory_item_id: string
          is_active: boolean
          location_id: string
          updated_at: string
        }
        Insert: {
          assigned_by: string
          assigned_quantity?: number
          created_at?: string
          id?: string
          inventory_item_id: string
          is_active?: boolean
          location_id: string
          updated_at?: string
        }
        Update: {
          assigned_by?: string
          assigned_quantity?: number
          created_at?: string
          id?: string
          inventory_item_id?: string
          is_active?: boolean
          location_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branch_inventory_assignments_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_inventory_assignments_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_collections: {
        Row: {
          business_id: string
          collected_amount: number
          created_at: string
          description: string | null
          failed_count: number
          id: string
          name: string
          pending_count: number
          status: string
          success_count: number
          total_amount: number
          total_count: number
          updated_at: string
        }
        Insert: {
          business_id: string
          collected_amount?: number
          created_at?: string
          description?: string | null
          failed_count?: number
          id?: string
          name: string
          pending_count?: number
          status?: string
          success_count?: number
          total_amount?: number
          total_count?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          collected_amount?: number
          created_at?: string
          description?: string | null
          failed_count?: number
          id?: string
          name?: string
          pending_count?: number
          status?: string
          success_count?: number
          total_amount?: number
          total_count?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_collections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bulk_payouts: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          business_id: string
          created_at: string
          description: string | null
          disbursed_amount: number
          failed_count: number
          id: string
          name: string
          pending_count: number
          scheduled_for: string | null
          status: string
          success_count: number
          total_amount: number
          total_count: number
          total_fees: number
          updated_at: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          business_id: string
          created_at?: string
          description?: string | null
          disbursed_amount?: number
          failed_count?: number
          id?: string
          name: string
          pending_count?: number
          scheduled_for?: string | null
          status?: string
          success_count?: number
          total_amount?: number
          total_count?: number
          total_fees?: number
          updated_at?: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          business_id?: string
          created_at?: string
          description?: string | null
          disbursed_amount?: number
          failed_count?: number
          id?: string
          name?: string
          pending_count?: number
          scheduled_for?: string | null
          status?: string
          success_count?: number
          total_amount?: number
          total_count?: number
          total_fees?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_payouts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_bank_connections: {
        Row: {
          bank_id: string
          business_id: string
          connected_at: string | null
          consent_expires_at: string | null
          consent_given_at: string | null
          created_at: string
          disconnected_at: string | null
          id: string
          metadata: Json | null
          permissions: string[] | null
          status: Database["public"]["Enums"]["bank_connection_status"]
          updated_at: string
        }
        Insert: {
          bank_id: string
          business_id: string
          connected_at?: string | null
          consent_expires_at?: string | null
          consent_given_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          metadata?: Json | null
          permissions?: string[] | null
          status?: Database["public"]["Enums"]["bank_connection_status"]
          updated_at?: string
        }
        Update: {
          bank_id?: string
          business_id?: string
          connected_at?: string | null
          consent_expires_at?: string | null
          consent_given_at?: string | null
          created_at?: string
          disconnected_at?: string | null
          id?: string
          metadata?: Json | null
          permissions?: string[] | null
          status?: Database["public"]["Enums"]["bank_connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_bank_connections_bank_id_fkey"
            columns: ["bank_id"]
            isOneToOne: false
            referencedRelation: "banks_fintechs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_bank_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_credits: {
        Row: {
          business_id: string
          created_at: string
          email_credits: number
          id: string
          sms_credits: number
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          email_credits?: number
          id?: string
          sms_credits?: number
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          email_credits?: number
          id?: string
          sms_credits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_fraud_exemptions: {
        Row: {
          business_id: string
          created_at: string
          exempted_by: string
          expires_at: string | null
          fraud_rule_id: string
          id: string
          is_active: boolean
          reason: string
          updated_at: string
        }
        Insert: {
          business_id: string
          created_at?: string
          exempted_by: string
          expires_at?: string | null
          fraud_rule_id: string
          id?: string
          is_active?: boolean
          reason: string
          updated_at?: string
        }
        Update: {
          business_id?: string
          created_at?: string
          exempted_by?: string
          expires_at?: string | null
          fraud_rule_id?: string
          id?: string
          is_active?: boolean
          reason?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_fraud_exemptions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_fraud_exemptions_fraud_rule_id_fkey"
            columns: ["fraud_rule_id"]
            isOneToOne: false
            referencedRelation: "fraud_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      business_profiles: {
        Row: {
          address: string | null
          admin_pin: string | null
          banner_url: string | null
          business_email: string | null
          business_name: string
          business_phone: string | null
          closing_time: string | null
          created_at: string
          currency: string
          daily_sales_summary_enabled: boolean | null
          id: string
          industry: Database["public"]["Enums"]["industry_type"]
          is_suspended: boolean | null
          ismart_business_id: string | null
          logo_url: string | null
          opening_time: string | null
          plan_tier: string | null
          receipt_width: string | null
          settlement_account: string | null
          settlement_provider: string | null
          settlement_type: string | null
          tax_id: string | null
          tax_regime: string | null
          tin: string | null
          turnover_last_12_months: number | null
          updated_at: string
          user_id: string
          vat_registered: boolean | null
          website: string | null
        }
        Insert: {
          address?: string | null
          admin_pin?: string | null
          banner_url?: string | null
          business_email?: string | null
          business_name: string
          business_phone?: string | null
          closing_time?: string | null
          created_at?: string
          currency?: string
          daily_sales_summary_enabled?: boolean | null
          id?: string
          industry: Database["public"]["Enums"]["industry_type"]
          is_suspended?: boolean | null
          ismart_business_id?: string | null
          logo_url?: string | null
          opening_time?: string | null
          plan_tier?: string | null
          receipt_width?: string | null
          settlement_account?: string | null
          settlement_provider?: string | null
          settlement_type?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          tin?: string | null
          turnover_last_12_months?: number | null
          updated_at?: string
          user_id: string
          vat_registered?: boolean | null
          website?: string | null
        }
        Update: {
          address?: string | null
          admin_pin?: string | null
          banner_url?: string | null
          business_email?: string | null
          business_name?: string
          business_phone?: string | null
          closing_time?: string | null
          created_at?: string
          currency?: string
          daily_sales_summary_enabled?: boolean | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_type"]
          is_suspended?: boolean | null
          ismart_business_id?: string | null
          logo_url?: string | null
          opening_time?: string | null
          plan_tier?: string | null
          receipt_width?: string | null
          settlement_account?: string | null
          settlement_provider?: string | null
          settlement_type?: string | null
          tax_id?: string | null
          tax_regime?: string | null
          tin?: string | null
          turnover_last_12_months?: number | null
          updated_at?: string
          user_id?: string
          vat_registered?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      business_verifications: {
        Row: {
          address_verified: boolean | null
          bank_verified: boolean | null
          business_id: string
          business_license_verified: boolean
          business_license_verified_at: string | null
          business_registration_verified: boolean | null
          business_registration_verified_at: string | null
          certificate_of_incorporation_verified: boolean
          certificate_of_incorporation_verified_at: string | null
          created_at: string
          documents: Json | null
          email_verified: boolean
          email_verified_at: string | null
          ghana_card_back_verified: boolean
          ghana_card_back_verified_at: string | null
          ghana_card_front_verified: boolean
          ghana_card_front_verified_at: string | null
          id: string
          identity_verified: boolean | null
          operating_permit_verified: boolean
          operating_permit_verified_at: string | null
          phone_verified: boolean
          phone_verified_at: string | null
          proof_of_address_verified: boolean
          proof_of_address_verified_at: string | null
          rejection_reason: string | null
          status: string | null
          updated_at: string
          verification_level: number | null
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          address_verified?: boolean | null
          bank_verified?: boolean | null
          business_id: string
          business_license_verified?: boolean
          business_license_verified_at?: string | null
          business_registration_verified?: boolean | null
          business_registration_verified_at?: string | null
          certificate_of_incorporation_verified?: boolean
          certificate_of_incorporation_verified_at?: string | null
          created_at?: string
          documents?: Json | null
          email_verified?: boolean
          email_verified_at?: string | null
          ghana_card_back_verified?: boolean
          ghana_card_back_verified_at?: string | null
          ghana_card_front_verified?: boolean
          ghana_card_front_verified_at?: string | null
          id?: string
          identity_verified?: boolean | null
          operating_permit_verified?: boolean
          operating_permit_verified_at?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          proof_of_address_verified?: boolean
          proof_of_address_verified_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
          verification_level?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          address_verified?: boolean | null
          bank_verified?: boolean | null
          business_id?: string
          business_license_verified?: boolean
          business_license_verified_at?: string | null
          business_registration_verified?: boolean | null
          business_registration_verified_at?: string | null
          certificate_of_incorporation_verified?: boolean
          certificate_of_incorporation_verified_at?: string | null
          created_at?: string
          documents?: Json | null
          email_verified?: boolean
          email_verified_at?: string | null
          ghana_card_back_verified?: boolean
          ghana_card_back_verified_at?: string | null
          ghana_card_front_verified?: boolean
          ghana_card_front_verified_at?: string | null
          id?: string
          identity_verified?: boolean | null
          operating_permit_verified?: boolean
          operating_permit_verified_at?: string | null
          phone_verified?: boolean
          phone_verified_at?: string | null
          proof_of_address_verified?: boolean
          proof_of_address_verified_at?: string | null
          rejection_reason?: string | null
          status?: string | null
          updated_at?: string
          verification_level?: number | null
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_verifications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: true
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      business_wallets: {
        Row: {
          available_balance: number
          business_id: string
          created_at: string
          currency: string
          id: string
          is_active: boolean
          pending_balance: number
          total_collected: number
          total_disbursed: number
          updated_at: string
        }
        Insert: {
          available_balance?: number
          business_id: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          pending_balance?: number
          total_collected?: number
          total_disbursed?: number
          updated_at?: string
        }
        Update: {
          available_balance?: number
          business_id?: string
          created_at?: string
          currency?: string
          id?: string
          is_active?: boolean
          pending_balance?: number
          total_collected?: number
          total_disbursed?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "business_wallets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ab_recipients: {
        Row: {
          ab_test_id: string
          clicked_at: string | null
          converted_at: string | null
          created_at: string
          customer_id: string | null
          error_message: string | null
          id: string
          opened_at: string | null
          recipient: string
          sent_at: string | null
          status: string | null
          variant: string
        }
        Insert: {
          ab_test_id: string
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient: string
          sent_at?: string | null
          status?: string | null
          variant: string
        }
        Update: {
          ab_test_id?: string
          clicked_at?: string | null
          converted_at?: string | null
          created_at?: string
          customer_id?: string | null
          error_message?: string | null
          id?: string
          opened_at?: string | null
          recipient?: string
          sent_at?: string | null
          status?: string | null
          variant?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_ab_recipients_ab_test_id_fkey"
            columns: ["ab_test_id"]
            isOneToOne: false
            referencedRelation: "campaign_ab_tests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_ab_recipients_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_ab_tests: {
        Row: {
          campaign_type: string
          completed_at: string | null
          created_at: string
          id: string
          name: string
          split_percentage: number | null
          started_at: string | null
          status: string | null
          updated_at: string
          user_id: string
          variant_a_content: string
          variant_a_subject: string | null
          variant_b_content: string
          variant_b_subject: string | null
          winner_criteria: string | null
          winner_variant: string | null
        }
        Insert: {
          campaign_type: string
          completed_at?: string | null
          created_at?: string
          id?: string
          name: string
          split_percentage?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id: string
          variant_a_content: string
          variant_a_subject?: string | null
          variant_b_content: string
          variant_b_subject?: string | null
          winner_criteria?: string | null
          winner_variant?: string | null
        }
        Update: {
          campaign_type?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          name?: string
          split_percentage?: number | null
          started_at?: string | null
          status?: string | null
          updated_at?: string
          user_id?: string
          variant_a_content?: string
          variant_a_subject?: string | null
          variant_b_content?: string
          variant_b_subject?: string | null
          winner_criteria?: string | null
          winner_variant?: string | null
        }
        Relationships: []
      }
      campaign_automation_rules: {
        Row: {
          action_type: string
          created_at: string
          custom_message: string | null
          custom_subject: string | null
          id: string
          is_active: boolean | null
          last_triggered_at: string | null
          name: string
          template_id: string | null
          trigger_config: Json | null
          trigger_count: number | null
          trigger_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          custom_message?: string | null
          custom_subject?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name: string
          template_id?: string | null
          trigger_config?: Json | null
          trigger_count?: number | null
          trigger_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          custom_message?: string | null
          custom_subject?: string | null
          id?: string
          is_active?: boolean | null
          last_triggered_at?: string | null
          name?: string
          template_id?: string | null
          trigger_config?: Json | null
          trigger_count?: number | null
          trigger_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_automation_rules_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "communication_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_recipients: {
        Row: {
          campaign_id: string
          campaign_type: string
          created_at: string | null
          error_message: string | null
          id: string
          recipient: string
          sent_at: string | null
          status: string
        }
        Insert: {
          campaign_id: string
          campaign_type: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          campaign_id?: string
          campaign_type?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          recipient?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string | null
          display_order: number | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          display_order?: number | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          last_message_at: string | null
          participant_one: string
          participant_two: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_one: string
          participant_two: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_message_at?: string | null
          participant_one?: string
          participant_two?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          message: string
          recipient_id: string
          sender_id: string
        }
        Insert: {
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          recipient_id: string
          sender_id: string
        }
        Update: {
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          recipient_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      collections: {
        Row: {
          amount: number
          bulk_collection_id: string | null
          business_id: string
          collection_type: Database["public"]["Enums"]["collection_type"]
          completed_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          fee: number
          id: string
          invoice_id: string | null
          metadata: Json | null
          net_amount: number
          payer_email: string | null
          payer_name: string | null
          payer_phone: string | null
          payment_link_id: string | null
          provider_id: string | null
          provider_reference: string | null
          reference: string
          status: Database["public"]["Enums"]["transaction_status"]
          wallet_id: string | null
        }
        Insert: {
          amount: number
          bulk_collection_id?: string | null
          business_id: string
          collection_type: Database["public"]["Enums"]["collection_type"]
          completed_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          net_amount: number
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_link_id?: string | null
          provider_id?: string | null
          provider_reference?: string | null
          reference: string
          status?: Database["public"]["Enums"]["transaction_status"]
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          bulk_collection_id?: string | null
          business_id?: string
          collection_type?: Database["public"]["Enums"]["collection_type"]
          completed_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          invoice_id?: string | null
          metadata?: Json | null
          net_amount?: number
          payer_email?: string | null
          payer_name?: string | null
          payer_phone?: string | null
          payment_link_id?: string | null
          provider_id?: string | null
          provider_reference?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collections_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bulk_collection"
            columns: ["bulk_collection_id"]
            isOneToOne: false
            referencedRelation: "bulk_collections"
            referencedColumns: ["id"]
          },
        ]
      }
      commission_rules: {
        Row: {
          applies_to_staff_ids: string[] | null
          created_at: string
          id: string
          is_active: boolean | null
          min_order_amount: number | null
          name: string
          rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          applies_to_staff_ids?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          name: string
          rate: number
          updated_at?: string
          user_id: string
        }
        Update: {
          applies_to_staff_ids?: string[] | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          name?: string
          rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      communication_logs: {
        Row: {
          action_id: string | null
          channel: string
          content: string
          created_at: string
          error_message: string | null
          id: string
          metadata: Json | null
          recipient: string
          status: string
          subject: string | null
          user_id: string
        }
        Insert: {
          action_id?: string | null
          channel: string
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient: string
          status?: string
          subject?: string | null
          user_id: string
        }
        Update: {
          action_id?: string | null
          channel?: string
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          metadata?: Json | null
          recipient?: string
          status?: string
          subject?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communication_logs_action_id_fkey"
            columns: ["action_id"]
            isOneToOne: false
            referencedRelation: "pending_actions"
            referencedColumns: ["id"]
          },
        ]
      }
      communication_templates: {
        Row: {
          content: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          subject: string | null
          type: string
          updated_at: string
          user_id: string
          variables: Json | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          subject?: string | null
          type: string
          updated_at?: string
          user_id: string
          variables?: Json | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          subject?: string | null
          type?: string
          updated_at?: string
          user_id?: string
          variables?: Json | null
        }
        Relationships: []
      }
      credit_packages: {
        Row: {
          created_at: string
          credit_type: string
          credits_amount: number
          currency: string
          display_order: number | null
          id: string
          is_active: boolean
          name: string
          price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          credit_type: string
          credits_amount: number
          currency?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name: string
          price: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          credit_type?: string
          credits_amount?: number
          currency?: string
          display_order?: number | null
          id?: string
          is_active?: boolean
          name?: string
          price?: number
          updated_at?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          amount: number
          balance_after: number
          business_id: string
          created_at: string
          credit_type: string
          description: string | null
          id: string
          payment_reference: string | null
          transaction_type: string
        }
        Insert: {
          amount: number
          balance_after: number
          business_id: string
          created_at?: string
          credit_type: string
          description?: string | null
          id?: string
          payment_reference?: string | null
          transaction_type: string
        }
        Update: {
          amount?: number
          balance_after?: number
          business_id?: string
          created_at?: string
          credit_type?: string
          description?: string | null
          id?: string
          payment_reference?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_loyalty_points: {
        Row: {
          created_at: string
          current_tier_id: string | null
          customer_id: string
          id: string
          lifetime_points: number
          points_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          current_tier_id?: string | null
          customer_id: string
          id?: string
          lifetime_points?: number
          points_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          current_tier_id?: string | null
          customer_id?: string
          id?: string
          lifetime_points?: number
          points_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_loyalty_points_current_tier_id_fkey"
            columns: ["current_tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_loyalty_points_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_portal_sessions: {
        Row: {
          business_user_id: string
          created_at: string
          customer_id: string
          expires_at: string
          id: string
          session_token: string
        }
        Insert: {
          business_user_id: string
          created_at?: string
          customer_id: string
          expires_at: string
          id?: string
          session_token: string
        }
        Update: {
          business_user_id?: string
          created_at?: string
          customer_id?: string
          expires_at?: string
          id?: string
          session_token?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_portal_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      delivery_activity_logs: {
        Row: {
          action: string
          created_at: string
          delivery_order_id: string | null
          delivery_partner_id: string | null
          details: Json | null
          id: string
          ip_address: string | null
        }
        Insert: {
          action: string
          created_at?: string
          delivery_order_id?: string | null
          delivery_partner_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          delivery_order_id?: string | null
          delivery_partner_id?: string | null
          details?: Json | null
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "delivery_activity_logs_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_activity_logs_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_orders: {
        Row: {
          actual_delivery_time: string | null
          actual_pickup_time: string | null
          created_at: string
          delivery_address: string
          delivery_contact: string
          delivery_fee: number
          delivery_notes: string | null
          delivery_partner_id: string | null
          delivery_phone: string
          driver_name: string | null
          driver_phone: string | null
          estimated_delivery_time: string | null
          estimated_pickup_time: string | null
          external_delivery_id: string | null
          id: string
          metadata: Json | null
          order_id: string | null
          pickup_address: string
          pickup_contact: string | null
          pickup_phone: string | null
          status: string
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          created_at?: string
          delivery_address: string
          delivery_contact: string
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_partner_id?: string | null
          delivery_phone: string
          driver_name?: string | null
          driver_phone?: string | null
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          external_delivery_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          pickup_address: string
          pickup_contact?: string | null
          pickup_phone?: string | null
          status?: string
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_delivery_time?: string | null
          actual_pickup_time?: string | null
          created_at?: string
          delivery_address?: string
          delivery_contact?: string
          delivery_fee?: number
          delivery_notes?: string | null
          delivery_partner_id?: string | null
          delivery_phone?: string
          driver_name?: string | null
          driver_phone?: string | null
          estimated_delivery_time?: string | null
          estimated_pickup_time?: string | null
          external_delivery_id?: string | null
          id?: string
          metadata?: Json | null
          order_id?: string | null
          pickup_address?: string
          pickup_contact?: string | null
          pickup_phone?: string | null
          status?: string
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_orders_delivery_partner_id_fkey"
            columns: ["delivery_partner_id"]
            isOneToOne: false
            referencedRelation: "delivery_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "delivery_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      delivery_partners: {
        Row: {
          api_endpoint: string | null
          api_key_encrypted: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          logo_url: string | null
          min_order_amount: number | null
          name: string
          slug: string
          supported_regions: string[] | null
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          min_order_amount?: number | null
          name: string
          slug: string
          supported_regions?: string[] | null
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_key_encrypted?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          min_order_amount?: number | null
          name?: string
          slug?: string
          supported_regions?: string[] | null
          updated_at?: string
        }
        Relationships: []
      }
      delivery_status_history: {
        Row: {
          created_at: string
          delivery_order_id: string
          id: string
          location: string | null
          notes: string | null
          status: string
        }
        Insert: {
          created_at?: string
          delivery_order_id: string
          id?: string
          location?: string | null
          notes?: string | null
          status: string
        }
        Update: {
          created_at?: string
          delivery_order_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "delivery_status_history_delivery_order_id_fkey"
            columns: ["delivery_order_id"]
            isOneToOne: false
            referencedRelation: "delivery_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      disbursements: {
        Row: {
          amount: number
          beneficiary_id: string | null
          bulk_payout_id: string | null
          business_id: string
          completed_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          fee: number
          id: string
          metadata: Json | null
          narration: string | null
          processed_at: string | null
          provider_id: string | null
          provider_reference: string | null
          recipient_account: string
          recipient_bank_code: string | null
          recipient_bank_name: string | null
          recipient_name: string
          recipient_phone: string | null
          reference: string
          scheduled_for: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
          wallet_id: string | null
        }
        Insert: {
          amount: number
          beneficiary_id?: string | null
          bulk_payout_id?: string | null
          business_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          narration?: string | null
          processed_at?: string | null
          provider_id?: string | null
          provider_reference?: string | null
          recipient_account: string
          recipient_bank_code?: string | null
          recipient_bank_name?: string | null
          recipient_name: string
          recipient_phone?: string | null
          reference: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount: number
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          beneficiary_id?: string | null
          bulk_payout_id?: string | null
          business_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          narration?: string | null
          processed_at?: string | null
          provider_id?: string | null
          provider_reference?: string | null
          recipient_account?: string
          recipient_bank_code?: string | null
          recipient_bank_name?: string | null
          recipient_name?: string
          recipient_phone?: string | null
          reference?: string
          scheduled_for?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          total_amount?: number
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disbursements_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disbursements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bulk_payout"
            columns: ["bulk_payout_id"]
            isOneToOne: false
            referencedRelation: "bulk_payouts"
            referencedColumns: ["id"]
          },
        ]
      }
      dish_ingredients: {
        Row: {
          created_at: string
          id: string
          ingredient_id: string
          inventory_item_id: string
          quantity_required: number
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ingredient_id: string
          inventory_item_id: string
          quantity_required?: number
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ingredient_id?: string
          inventory_item_id?: string
          quantity_required?: number
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "dish_ingredients_ingredient_id_fkey"
            columns: ["ingredient_id"]
            isOneToOne: false
            referencedRelation: "ingredients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dish_ingredients_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      email_campaigns: {
        Row: {
          body: string
          created_at: string | null
          failed_count: number | null
          id: string
          name: string
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          subject: string
          success_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          name: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          success_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          failed_count?: number | null
          id?: string
          name?: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          success_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      employee_shifts: {
        Row: {
          break_minutes: number | null
          created_at: string
          end_time: string
          id: string
          location_id: string | null
          notes: string | null
          shift_date: string
          staff_id: string
          start_time: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          end_time: string
          id?: string
          location_id?: string | null
          notes?: string | null
          shift_date: string
          staff_id: string
          start_time: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          end_time?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          shift_date?: string
          staff_id?: string
          start_time?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_shifts_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      end_of_day_checklists: {
        Row: {
          actual_cash: number | null
          cash_difference: number | null
          checklist_items: Json | null
          completed_at: string | null
          completed_by_name: string | null
          completed_by_staff_id: string | null
          created_at: string
          expected_cash: number | null
          handover_notes: string | null
          id: string
          issues_reported: string | null
          location_id: string | null
          next_shift_tasks: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          shift_date: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          actual_cash?: number | null
          cash_difference?: number | null
          checklist_items?: Json | null
          completed_at?: string | null
          completed_by_name?: string | null
          completed_by_staff_id?: string | null
          created_at?: string
          expected_cash?: number | null
          handover_notes?: string | null
          id?: string
          issues_reported?: string | null
          location_id?: string | null
          next_shift_tasks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_date?: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          actual_cash?: number | null
          cash_difference?: number | null
          checklist_items?: Json | null
          completed_at?: string | null
          completed_by_name?: string | null
          completed_by_staff_id?: string | null
          created_at?: string
          expected_cash?: number | null
          handover_notes?: string | null
          id?: string
          issues_reported?: string | null
          location_id?: string | null
          next_shift_tasks?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          shift_date?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "end_of_day_checklists_completed_by_staff_id_fkey"
            columns: ["completed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "end_of_day_checklists_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          description: string
          expense_date: string
          id: string
          location_id: string | null
          notes: string | null
          receipt_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          description: string
          expense_date?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          description?: string
          expense_date?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_announcement_campaigns: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          failed_count: number | null
          id: string
          include_staff: boolean | null
          recipients_count: number | null
          sent_at: string | null
          success_count: number | null
          target_tiers: string[] | null
          title: string
        }
        Insert: {
          content: string
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          include_staff?: boolean | null
          recipients_count?: number | null
          sent_at?: string | null
          success_count?: number | null
          target_tiers?: string[] | null
          title: string
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          failed_count?: number | null
          id?: string
          include_staff?: boolean | null
          recipients_count?: number | null
          sent_at?: string | null
          success_count?: number | null
          target_tiers?: string[] | null
          title?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          created_at: string
          description: string | null
          enabled_for_tiers: string[]
          feature_key: string
          feature_name: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          enabled_for_tiers?: string[]
          feature_key: string
          feature_name: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          enabled_for_tiers?: string[]
          feature_key?: string
          feature_name?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      feature_settings: {
        Row: {
          accounting_enabled: boolean
          chat_enabled: boolean
          created_at: string
          customers_enabled: boolean
          id: string
          inventory_enabled: boolean
          kitchen_enabled: boolean
          reports_enabled: boolean
          reservations_enabled: boolean
          staff_enabled: boolean
          tables_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          accounting_enabled?: boolean
          chat_enabled?: boolean
          created_at?: string
          customers_enabled?: boolean
          id?: string
          inventory_enabled?: boolean
          kitchen_enabled?: boolean
          reports_enabled?: boolean
          reservations_enabled?: boolean
          staff_enabled?: boolean
          tables_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          accounting_enabled?: boolean
          chat_enabled?: boolean
          created_at?: string
          customers_enabled?: boolean
          id?: string
          inventory_enabled?: boolean
          kitchen_enabled?: boolean
          reports_enabled?: boolean
          reservations_enabled?: boolean
          staff_enabled?: boolean
          tables_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      fraud_alerts: {
        Row: {
          alert_type: string
          amount: number | null
          business_id: string | null
          created_at: string
          description: string
          device_info: string | null
          id: string
          ip_address: string | null
          metadata: Json | null
          order_id: string | null
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          status: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_type: string
          amount?: number | null
          business_id?: string | null
          created_at?: string
          description: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_type?: string
          amount?: number | null
          business_id?: string | null
          created_at?: string
          description?: string
          device_info?: string | null
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_id?: string | null
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          status?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_alerts_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      fraud_rules: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          parameters: Json
          rule_name: string
          rule_type: string
          severity: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parameters?: Json
          rule_name: string
          rule_type: string
          severity?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          parameters?: Json
          rule_name?: string
          rule_type?: string
          severity?: string
          updated_at?: string
        }
        Relationships: []
      }
      gift_card_otp_attempts: {
        Row: {
          attempt_code: string
          created_at: string
          gift_card_id: string
          id: string
          ip_address: string | null
          is_successful: boolean | null
          user_id: string
        }
        Insert: {
          attempt_code: string
          created_at?: string
          gift_card_id: string
          id?: string
          ip_address?: string | null
          is_successful?: boolean | null
          user_id: string
        }
        Update: {
          attempt_code?: string
          created_at?: string
          gift_card_id?: string
          id?: string
          ip_address?: string | null
          is_successful?: boolean | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_otp_attempts_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_card_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          created_at: string
          gift_card_id: string
          id: string
          notes: string | null
          order_id: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          created_at?: string
          gift_card_id: string
          id?: string
          notes?: string | null
          order_id?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          created_at?: string
          gift_card_id?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gift_card_transactions_gift_card_id_fkey"
            columns: ["gift_card_id"]
            isOneToOne: false
            referencedRelation: "gift_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "gift_card_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      gift_cards: {
        Row: {
          code: string
          created_at: string
          current_balance: number
          expiry_date: string | null
          id: string
          initial_balance: number
          issued_date: string
          issued_to_email: string | null
          issued_to_name: string | null
          issued_to_phone: string | null
          notes: string | null
          otp_code: string | null
          otp_expires_at: string | null
          otp_verified: boolean | null
          personal_message: string | null
          purchased_by_email: string | null
          purchased_by_name: string | null
          purchased_by_phone: string | null
          require_otp: boolean | null
          sent_at: string | null
          sent_via_email: boolean | null
          sent_via_sms: boolean | null
          source: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          current_balance: number
          expiry_date?: string | null
          id?: string
          initial_balance: number
          issued_date?: string
          issued_to_email?: string | null
          issued_to_name?: string | null
          issued_to_phone?: string | null
          notes?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean | null
          personal_message?: string | null
          purchased_by_email?: string | null
          purchased_by_name?: string | null
          purchased_by_phone?: string | null
          require_otp?: boolean | null
          sent_at?: string | null
          sent_via_email?: boolean | null
          sent_via_sms?: boolean | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          current_balance?: number
          expiry_date?: string | null
          id?: string
          initial_balance?: number
          issued_date?: string
          issued_to_email?: string | null
          issued_to_name?: string | null
          issued_to_phone?: string | null
          notes?: string | null
          otp_code?: string | null
          otp_expires_at?: string | null
          otp_verified?: boolean | null
          personal_message?: string | null
          purchased_by_email?: string | null
          purchased_by_name?: string | null
          purchased_by_phone?: string | null
          require_otp?: boolean | null
          sent_at?: string | null
          sent_via_email?: boolean | null
          sent_via_sms?: boolean | null
          source?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      impersonation_sessions: {
        Row: {
          admin_user_id: string
          created_at: string
          ended_at: string | null
          id: string
          ip_address: string | null
          is_active: boolean
          started_at: string
          target_user_email: string
          target_user_id: string
          user_agent: string | null
        }
        Insert: {
          admin_user_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          started_at?: string
          target_user_email: string
          target_user_id: string
          user_agent?: string | null
        }
        Update: {
          admin_user_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          ip_address?: string | null
          is_active?: boolean
          started_at?: string
          target_user_email?: string
          target_user_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      ingredients: {
        Row: {
          cost_per_unit: number | null
          created_at: string
          id: string
          is_active: boolean
          location_id: string | null
          low_stock_threshold: number | null
          name: string
          quantity: number
          supplier_id: string | null
          unit: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          name: string
          quantity?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cost_per_unit?: number | null
          created_at?: string
          id?: string
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          name?: string
          quantity?: number
          supplier_id?: string | null
          unit?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ingredients_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ingredients_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          inventory_item_id: string
          price_after: number | null
          price_before: number | null
          quantity_after: number | null
          quantity_before: number | null
          reason: string | null
          user_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          inventory_item_id: string
          price_after?: number | null
          price_before?: number | null
          quantity_after?: number | null
          quantity_before?: number | null
          reason?: string | null
          user_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          price_after?: number | null
          price_before?: number | null
          quantity_after?: number | null
          quantity_before?: number | null
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_history_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_items: {
        Row: {
          barcode: string | null
          bnpl_enabled: boolean
          category_id: string | null
          cost: number | null
          created_at: string
          description: string | null
          has_variants: boolean
          id: string
          image_url: string | null
          is_active: boolean
          location_id: string | null
          low_stock_threshold: number | null
          name: string
          price: number
          quantity: number
          show_on_storefront: boolean | null
          sku: string | null
          slug: string | null
          subcategory_id: string | null
          track_inventory: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          barcode?: string | null
          bnpl_enabled?: boolean
          category_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          name: string
          price?: number
          quantity?: number
          show_on_storefront?: boolean | null
          sku?: string | null
          slug?: string | null
          subcategory_id?: string | null
          track_inventory?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          barcode?: string | null
          bnpl_enabled?: boolean
          category_id?: string | null
          cost?: number | null
          created_at?: string
          description?: string | null
          has_variants?: boolean
          id?: string
          image_url?: string | null
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          name?: string
          price?: number
          quantity?: number
          show_on_storefront?: boolean | null
          sku?: string | null
          slug?: string | null
          subcategory_id?: string | null
          track_inventory?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_items_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_deposit_settings: {
        Row: {
          created_at: string
          deposit_amount: number
          deposit_type: string
          id: string
          require_deposit: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          deposit_amount?: number
          deposit_type?: string
          id?: string
          require_deposit?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          deposit_amount?: number
          deposit_type?: string
          id?: string
          require_deposit?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_installments: {
        Row: {
          amount: number
          created_at: string
          due_date: string
          id: string
          installment_number: number
          invoice_id: string
          paid_amount: number | null
          paid_at: string | null
          payment_plan_id: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          due_date: string
          id?: string
          installment_number: number
          invoice_id: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_plan_id: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          due_date?: string
          id?: string
          installment_number?: number
          invoice_id?: string
          paid_amount?: number | null
          paid_at?: string | null
          payment_plan_id?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_installments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_installments_payment_plan_id_fkey"
            columns: ["payment_plan_id"]
            isOneToOne: false
            referencedRelation: "invoice_payment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_late_fee_settings: {
        Row: {
          apply_automatically: boolean
          created_at: string
          enabled: boolean
          fee_amount: number
          fee_type: string
          grace_period_days: number
          id: string
          max_fee_amount: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          apply_automatically?: boolean
          created_at?: string
          enabled?: boolean
          fee_amount?: number
          fee_type?: string
          grace_period_days?: number
          id?: string
          max_fee_amount?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          apply_automatically?: boolean
          created_at?: string
          enabled?: boolean
          fee_amount?: number
          fee_type?: string
          grace_period_days?: number
          id?: string
          max_fee_amount?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_late_fees: {
        Row: {
          applied_at: string
          days_overdue: number
          fee_amount: number
          id: string
          invoice_id: string
          notes: string | null
          user_id: string
        }
        Insert: {
          applied_at?: string
          days_overdue: number
          fee_amount: number
          id?: string
          invoice_id: string
          notes?: string | null
          user_id: string
        }
        Update: {
          applied_at?: string
          days_overdue?: number
          fee_amount?: number
          id?: string
          invoice_id?: string
          notes?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_late_fees_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_payment_plans: {
        Row: {
          created_at: string
          first_payment_date: string
          frequency: string
          id: string
          invoice_id: string
          number_of_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          first_payment_date: string
          frequency: string
          id?: string
          invoice_id: string
          number_of_installments: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          first_payment_date?: string
          frequency?: string
          id?: string
          invoice_id?: string
          number_of_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_payment_plans_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_reminder_settings: {
        Row: {
          created_at: string
          days_after_due: number[]
          days_before_due: number
          enabled: boolean
          id: string
          send_email: boolean
          send_sms: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          days_after_due?: number[]
          days_before_due?: number
          enabled?: boolean
          id?: string
          send_email?: boolean
          send_sms?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          days_after_due?: number[]
          days_before_due?: number
          enabled?: boolean
          id?: string
          send_email?: boolean
          send_sms?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoice_reminders_log: {
        Row: {
          email_sent: boolean
          error_message: string | null
          id: string
          invoice_id: string
          reminder_type: string
          sent_at: string
          sms_sent: boolean
          status: string
        }
        Insert: {
          email_sent?: boolean
          error_message?: string | null
          id?: string
          invoice_id: string
          reminder_type: string
          sent_at?: string
          sms_sent?: boolean
          status?: string
        }
        Update: {
          email_sent?: boolean
          error_message?: string | null
          id?: string
          invoice_id?: string
          reminder_type?: string
          sent_at?: string
          sms_sent?: boolean
          status?: string
        }
        Relationships: []
      }
      invoice_templates: {
        Row: {
          accent_color: string | null
          bank_details: string | null
          created_at: string
          footer_text: string | null
          header_color: string | null
          id: string
          is_default: boolean
          logo_url: string | null
          name: string
          show_payment_instructions: boolean
          terms_and_conditions: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accent_color?: string | null
          bank_details?: string | null
          created_at?: string
          footer_text?: string | null
          header_color?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name: string
          show_payment_instructions?: boolean
          terms_and_conditions?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accent_color?: string | null
          bank_details?: string | null
          created_at?: string
          footer_text?: string | null
          header_color?: string | null
          id?: string
          is_default?: boolean
          logo_url?: string | null
          name?: string
          show_payment_instructions?: boolean
          terms_and_conditions?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          days_to_payment: number | null
          deposit_paid: number | null
          deposit_paid_at: string | null
          deposit_required: number | null
          due_date: string
          id: string
          invoice_number: string
          issue_date: string
          items: Json
          late_fees_applied: number | null
          notes: string | null
          original_due_date: string | null
          paid_amount: number | null
          payment_date: string | null
          payment_link: string | null
          payment_link_token: string | null
          payment_method: string | null
          recurring_invoice_id: string | null
          sent_at: string | null
          status: string
          subtotal: number
          tax: number
          template_id: string | null
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          days_to_payment?: number | null
          deposit_paid?: number | null
          deposit_paid_at?: string | null
          deposit_required?: number | null
          due_date: string
          id?: string
          invoice_number: string
          issue_date?: string
          items?: Json
          late_fees_applied?: number | null
          notes?: string | null
          original_due_date?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_link?: string | null
          payment_link_token?: string | null
          payment_method?: string | null
          recurring_invoice_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          template_id?: string | null
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          days_to_payment?: number | null
          deposit_paid?: number | null
          deposit_paid_at?: string | null
          deposit_required?: number | null
          due_date?: string
          id?: string
          invoice_number?: string
          issue_date?: string
          items?: Json
          late_fees_applied?: number | null
          notes?: string | null
          original_due_date?: string | null
          paid_amount?: number | null
          payment_date?: string | null
          payment_link?: string | null
          payment_link_token?: string | null
          payment_method?: string | null
          recurring_invoice_id?: string | null
          sent_at?: string | null
          status?: string
          subtotal?: number
          tax?: number
          template_id?: string | null
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "invoice_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      ismart_callbacks: {
        Row: {
          created_at: string
          id: string
          payload: Json
          reference: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          reference?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          reference?: string | null
        }
        Relationships: []
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          is_default: boolean
          name: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          is_default?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      low_stock_alerts: {
        Row: {
          alert_type: string
          created_at: string
          current_quantity: number
          email_sent: boolean | null
          id: string
          inventory_item_id: string
          is_resolved: boolean
          resolved_at: string | null
          threshold: number
          user_id: string
        }
        Insert: {
          alert_type?: string
          created_at?: string
          current_quantity: number
          email_sent?: boolean | null
          id?: string
          inventory_item_id: string
          is_resolved?: boolean
          resolved_at?: string | null
          threshold: number
          user_id: string
        }
        Update: {
          alert_type?: string
          created_at?: string
          current_quantity?: number
          email_sent?: boolean | null
          id?: string
          inventory_item_id?: string
          is_resolved?: boolean
          resolved_at?: string | null
          threshold?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "low_stock_alerts_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_redemptions: {
        Row: {
          created_at: string
          customer_id: string
          expires_at: string | null
          id: string
          notes: string | null
          points_spent: number
          redeemed_at: string
          reward_id: string
          status: string
          updated_at: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          points_spent: number
          redeemed_at?: string
          reward_id: string
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          expires_at?: string | null
          id?: string
          notes?: string | null
          points_spent?: number
          redeemed_at?: string
          reward_id?: string
          status?: string
          updated_at?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_redemptions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loyalty_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "loyalty_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_rewards: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          points_cost: number
          reward_type: string
          reward_value: Json | null
          stock_quantity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          points_cost: number
          reward_type: string
          reward_value?: Json | null
          stock_quantity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          points_cost?: number
          reward_type?: string
          reward_value?: Json | null
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_tiers: {
        Row: {
          benefits: Json | null
          color: string | null
          created_at: string
          discount_percentage: number | null
          display_order: number | null
          id: string
          max_points: number | null
          min_points: number
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          discount_percentage?: number | null
          display_order?: number | null
          id?: string
          max_points?: number | null
          min_points?: number
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          benefits?: Json | null
          color?: string | null
          created_at?: string
          discount_percentage?: number | null
          display_order?: number | null
          id?: string
          max_points?: number | null
          min_points?: number
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      loyalty_transactions: {
        Row: {
          balance_after: number
          created_at: string
          customer_id: string
          id: string
          notes: string | null
          points_amount: number
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          user_id: string
        }
        Insert: {
          balance_after: number
          created_at?: string
          customer_id: string
          id?: string
          notes?: string | null
          points_amount: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          user_id: string
        }
        Update: {
          balance_after?: number
          created_at?: string
          customer_id?: string
          id?: string
          notes?: string | null
          points_amount?: number
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_transactions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
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
          recipient_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          recipient_id?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          recipient_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string | null
          name: string
          notes: string | null
          order_id: string
          price: number
          quantity: number
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name: string
          notes?: string | null
          order_id: string
          price: number
          quantity: number
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string | null
          name?: string
          notes?: string | null
          order_id?: string
          price?: number
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      ordering_station_groups: {
        Row: {
          auto_assign_station: boolean | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          location_id: string | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_assign_station?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_assign_station?: boolean | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          location_id?: string | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordering_station_groups_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      ordering_stations: {
        Row: {
          created_at: string
          group_id: string | null
          id: string
          is_active: boolean | null
          qr_code_token: string
          station_name: string
          station_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_token?: string
          station_name: string
          station_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          group_id?: string | null
          id?: string
          is_active?: boolean | null
          qr_code_token?: string
          station_name?: string
          station_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ordering_stations_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "ordering_station_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          carrier: string | null
          created_at: string
          customer_id: string | null
          customer_name: string | null
          customer_phone: string | null
          delivered_at: string | null
          delivery_notes: string | null
          estimated_delivery: string | null
          id: string
          location_id: string | null
          order_number: string
          order_type: string | null
          payment_link: string | null
          payment_link_expires_at: string | null
          server: string | null
          shipping_address: string | null
          status: string
          table_number: number | null
          total: number
          tracking_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          carrier?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          estimated_delivery?: string | null
          id?: string
          location_id?: string | null
          order_number: string
          order_type?: string | null
          payment_link?: string | null
          payment_link_expires_at?: string | null
          server?: string | null
          shipping_address?: string | null
          status: string
          table_number?: number | null
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          carrier?: string | null
          created_at?: string
          customer_id?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          delivered_at?: string | null
          delivery_notes?: string | null
          estimated_delivery?: string | null
          id?: string
          location_id?: string | null
          order_number?: string
          order_type?: string | null
          payment_link?: string | null
          payment_link_expires_at?: string | null
          server?: string | null
          shipping_address?: string | null
          status?: string
          table_number?: number | null
          total?: number
          tracking_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_escalation_settings: {
        Row: {
          created_at: string
          enabled: boolean | null
          escalation_levels: Json | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean | null
          escalation_levels?: Json | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean | null
          escalation_levels?: Json | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_links: {
        Row: {
          amount: number | null
          business_id: string
          created_at: string
          currency: string
          current_uses: number
          description: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_fixed_amount: boolean
          max_amount: number | null
          max_uses: number | null
          metadata: Json | null
          min_amount: number | null
          redirect_url: string | null
          short_code: string
          title: string
          total_collected: number
          updated_at: string
        }
        Insert: {
          amount?: number | null
          business_id: string
          created_at?: string
          currency?: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_fixed_amount?: boolean
          max_amount?: number | null
          max_uses?: number | null
          metadata?: Json | null
          min_amount?: number | null
          redirect_url?: string | null
          short_code: string
          title: string
          total_collected?: number
          updated_at?: string
        }
        Update: {
          amount?: number | null
          business_id?: string
          created_at?: string
          currency?: string
          current_uses?: number
          description?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_fixed_amount?: boolean
          max_amount?: number | null
          max_uses?: number | null
          metadata?: Json | null
          min_amount?: number | null
          redirect_url?: string | null
          short_code?: string
          title?: string
          total_collected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_links_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_providers: {
        Row: {
          created_at: string
          fee_cap: number | null
          fee_type: string | null
          fee_value: number | null
          id: string
          is_active: boolean
          logo_url: string | null
          max_amount: number | null
          metadata: Json | null
          min_amount: number | null
          name: string
          provider_type: Database["public"]["Enums"]["payout_channel"]
          slug: string
          supports_collection: boolean
          supports_disbursement: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          fee_cap?: number | null
          fee_type?: string | null
          fee_value?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_amount?: number | null
          metadata?: Json | null
          min_amount?: number | null
          name: string
          provider_type: Database["public"]["Enums"]["payout_channel"]
          slug: string
          supports_collection?: boolean
          supports_disbursement?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          fee_cap?: number | null
          fee_type?: string | null
          fee_value?: number | null
          id?: string
          is_active?: boolean
          logo_url?: string | null
          max_amount?: number | null
          metadata?: Json | null
          min_amount?: number | null
          name?: string
          provider_type?: Database["public"]["Enums"]["payout_channel"]
          slug?: string
          supports_collection?: boolean
          supports_disbursement?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          business_id: string | null
          created_at: string
          currency: string
          external_transaction_id: string | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_reference: string
          status: string
          transaction_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          business_id?: string | null
          created_at?: string
          currency?: string
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_reference: string
          status?: string
          transaction_type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          business_id?: string | null
          created_at?: string
          currency?: string
          external_transaction_id?: string | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_reference?: string
          status?: string
          transaction_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      pending_actions: {
        Row: {
          action_type: Database["public"]["Enums"]["action_type"]
          created_at: string
          error_message: string | null
          executed_at: string | null
          executed_by: string | null
          id: string
          notes: string | null
          priority: string | null
          request_data: Json
          retry_count: number | null
          status: string
          user_id: string
        }
        Insert: {
          action_type: Database["public"]["Enums"]["action_type"]
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          request_data?: Json
          retry_count?: number | null
          status?: string
          user_id: string
        }
        Update: {
          action_type?: Database["public"]["Enums"]["action_type"]
          created_at?: string
          error_message?: string | null
          executed_at?: string | null
          executed_by?: string | null
          id?: string
          notes?: string | null
          priority?: string | null
          request_data?: Json
          retry_count?: number | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_announcements: {
        Row: {
          announcement_type: string
          content: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          priority: number
          starts_at: string
          target_tiers: string[]
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type: string
          content: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string
          target_tiers?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          content?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string
          target_tiers?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          content: string | null
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string | null
          helpful_count: number | null
          id: string
          inventory_item_id: string
          is_approved: boolean | null
          is_featured: boolean | null
          is_verified_purchase: boolean | null
          rating: number
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          helpful_count?: number | null
          id?: string
          inventory_item_id: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified_purchase?: boolean | null
          rating: number
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string | null
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string | null
          helpful_count?: number | null
          id?: string
          inventory_item_id?: string
          is_approved?: boolean | null
          is_featured?: boolean | null
          is_verified_purchase?: boolean | null
          rating?: number
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_reviews_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      product_variants: {
        Row: {
          attributes: Json | null
          created_at: string
          id: string
          inventory_item_id: string
          is_active: boolean
          location_id: string | null
          low_stock_threshold: number | null
          price_adjustment: number | null
          quantity: number
          sku: string | null
          updated_at: string
          user_id: string
          variant_name: string
        }
        Insert: {
          attributes?: Json | null
          created_at?: string
          id?: string
          inventory_item_id: string
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          price_adjustment?: number | null
          quantity?: number
          sku?: string | null
          updated_at?: string
          user_id: string
          variant_name: string
        }
        Update: {
          attributes?: Json | null
          created_at?: string
          id?: string
          inventory_item_id?: string
          is_active?: boolean
          location_id?: string | null
          low_stock_threshold?: number | null
          price_adjustment?: number | null
          quantity?: number
          sku?: string | null
          updated_at?: string
          user_id?: string
          variant_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number | null
          discount_type: string
          discount_value: number
          expires_at: string | null
          id: string
          is_active: boolean | null
          max_uses: number | null
          message: string | null
          min_order_amount: number | null
          show_on_storefront: boolean | null
          starts_at: string | null
          updated_at: string
          user_id: string
          variant: string | null
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          message?: string | null
          min_order_amount?: number | null
          show_on_storefront?: boolean | null
          starts_at?: string | null
          updated_at?: string
          user_id: string
          variant?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number | null
          discount_type?: string
          discount_value?: number
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          message?: string | null
          min_order_amount?: number | null
          show_on_storefront?: boolean | null
          starts_at?: string | null
          updated_at?: string
          user_id?: string
          variant?: string | null
        }
        Relationships: []
      }
      promotional_credits: {
        Row: {
          business_id: string | null
          created_at: string
          credit_amount: number
          credit_type: string
          expires_at: string | null
          granted_by: string | null
          id: string
          reason: string | null
          status: string
          updated_at: string
          used_amount: number
          user_id: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          credit_amount: number
          credit_type: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          used_amount?: number
          user_id: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          credit_amount?: number
          credit_type?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          reason?: string | null
          status?: string
          updated_at?: string
          used_amount?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotional_credits_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_executions: {
        Row: {
          amount: number
          collection_id: string | null
          error_message: string | null
          executed_at: string
          id: string
          schedule_id: string
          status: string
        }
        Insert: {
          amount: number
          collection_id?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          schedule_id: string
          status?: string
        }
        Update: {
          amount?: number
          collection_id?: string | null
          error_message?: string | null
          executed_at?: string
          id?: string
          schedule_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_executions_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_executions_schedule_id_fkey"
            columns: ["schedule_id"]
            isOneToOne: false
            referencedRelation: "recurring_schedules"
            referencedColumns: ["id"]
          },
        ]
      }
      recurring_invoices: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string | null
          end_date: string | null
          frequency: string
          id: string
          invoices_generated: number
          is_active: boolean
          items: Json
          last_generated_at: string | null
          next_invoice_date: string
          notes: string | null
          subtotal: number
          tax: number
          total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          invoices_generated?: number
          is_active?: boolean
          items?: Json
          last_generated_at?: string | null
          next_invoice_date: string
          notes?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string | null
          end_date?: string | null
          frequency?: string
          id?: string
          invoices_generated?: number
          is_active?: boolean
          items?: Json
          last_generated_at?: string | null
          next_invoice_date?: string
          notes?: string | null
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_schedules: {
        Row: {
          amount: number
          business_id: string
          created_at: string
          currency: string
          customer_email: string | null
          customer_id: string | null
          customer_phone: string | null
          description: string | null
          end_date: string | null
          failed_runs: number
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          last_run_status: string | null
          name: string
          next_run_date: string
          payment_link_id: string | null
          start_date: string
          successful_runs: number
          total_collected: number
          updated_at: string
        }
        Insert: {
          amount: number
          business_id: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          description?: string | null
          end_date?: string | null
          failed_runs?: number
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name: string
          next_run_date: string
          payment_link_id?: string | null
          start_date: string
          successful_runs?: number
          total_collected?: number
          updated_at?: string
        }
        Update: {
          amount?: number
          business_id?: string
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_phone?: string | null
          description?: string | null
          end_date?: string | null
          failed_runs?: number
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          last_run_status?: string | null
          name?: string
          next_run_date?: string
          payment_link_id?: string | null
          start_date?: string
          successful_runs?: number
          total_collected?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_schedules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_schedules_payment_link_id_fkey"
            columns: ["payment_link_id"]
            isOneToOne: false
            referencedRelation: "payment_links"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          customer_id: string
          id: string
          is_active: boolean | null
          max_uses: number | null
          user_id: string
          uses_count: number | null
        }
        Insert: {
          code: string
          created_at?: string
          customer_id: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          user_id: string
          uses_count?: number | null
        }
        Update: {
          code?: string
          created_at?: string
          customer_id?: string
          id?: string
          is_active?: boolean | null
          max_uses?: number | null
          user_id?: string
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_codes_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_programs: {
        Row: {
          created_at: string
          id: string
          is_active: boolean | null
          min_purchase_amount: number | null
          name: string
          referee_reward_type: string | null
          referee_reward_value: number | null
          referrer_reward_type: string | null
          referrer_reward_value: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_purchase_amount?: number | null
          name?: string
          referee_reward_type?: string | null
          referee_reward_value?: number | null
          referrer_reward_type?: string | null
          referrer_reward_value?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean | null
          min_purchase_amount?: number | null
          name?: string
          referee_reward_type?: string | null
          referee_reward_value?: number | null
          referrer_reward_type?: string | null
          referrer_reward_value?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_signups: {
        Row: {
          created_at: string
          id: string
          referral_code: string
          source_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          referral_code: string
          source_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          referral_code?: string
          source_url?: string | null
          user_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          order_id: string | null
          referee_id: string
          referee_reward_given: boolean | null
          referral_code_id: string
          referrer_id: string
          referrer_reward_given: boolean | null
          status: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          referee_id: string
          referee_reward_given?: boolean | null
          referral_code_id: string
          referrer_id: string
          referrer_reward_given?: boolean | null
          status?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          order_id?: string | null
          referee_id?: string
          referee_reward_given?: boolean | null
          referral_code_id?: string
          referrer_id?: string
          referrer_reward_given?: boolean | null
          status?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referee_id_fkey"
            columns: ["referee_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referral_code_id_fkey"
            columns: ["referral_code_id"]
            isOneToOne: false
            referencedRelation: "referral_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      refunds: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          order_id: string | null
          reason: string | null
          refund_amount: number
          refund_type: string
          status: string
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          refund_amount: number
          refund_type: string
          status?: string
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          order_id?: string | null
          reason?: string | null
          refund_amount?: number
          refund_type?: string
          status?: string
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refunds_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      reservations: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_id: string | null
          customer_name: string
          customer_phone: string | null
          deposit_amount: number | null
          deposit_paid_amount: number | null
          deposit_paid_at: string | null
          deposit_payment_link: string | null
          deposit_payment_link_expires_at: string | null
          deposit_payment_method: string | null
          deposit_percentage: number | null
          deposit_status: string | null
          deposit_type: string | null
          id: string
          location_id: string | null
          notes: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          status: string
          table_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name: string
          customer_phone?: string | null
          deposit_amount?: number | null
          deposit_paid_amount?: number | null
          deposit_paid_at?: string | null
          deposit_payment_link?: string | null
          deposit_payment_link_expires_at?: string | null
          deposit_payment_method?: string | null
          deposit_percentage?: number | null
          deposit_status?: string | null
          deposit_type?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          party_size: number
          reservation_date: string
          reservation_time: string
          status?: string
          table_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_id?: string | null
          customer_name?: string
          customer_phone?: string | null
          deposit_amount?: number | null
          deposit_paid_amount?: number | null
          deposit_paid_at?: string | null
          deposit_payment_link?: string | null
          deposit_payment_link_expires_at?: string | null
          deposit_payment_method?: string | null
          deposit_percentage?: number | null
          deposit_status?: string | null
          deposit_type?: string | null
          id?: string
          location_id?: string | null
          notes?: string | null
          party_size?: number
          reservation_date?: string
          reservation_time?: string
          status?: string
          table_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          capacity: number
          created_at: string
          current_order_id: string | null
          id: string
          location_id: string | null
          section: string | null
          status: string
          table_number: number
          updated_at: string
          user_id: string
        }
        Insert: {
          capacity: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          location_id?: string | null
          section?: string | null
          status?: string
          table_number: number
          updated_at?: string
          user_id: string
        }
        Update: {
          capacity?: number
          created_at?: string
          current_order_id?: string | null
          id?: string
          location_id?: string | null
          section?: string | null
          status?: string
          table_number?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_tables_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_reports: {
        Row: {
          created_at: string
          created_by: string
          filters: Json | null
          frequency: string
          id: string
          is_active: boolean
          last_run_at: string | null
          name: string
          next_run_at: string | null
          recipient_emails: string[] | null
          report_type: string
          table_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          filters?: Json | null
          frequency: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name: string
          next_run_at?: string | null
          recipient_emails?: string[] | null
          report_type: string
          table_name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          filters?: Json | null
          frequency?: string
          id?: string
          is_active?: boolean
          last_run_at?: string | null
          name?: string
          next_run_at?: string | null
          recipient_emails?: string[] | null
          report_type?: string
          table_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      self_serve_orders: {
        Row: {
          business_user_id: string
          created_at: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          station_id: string | null
          status: string
          subtotal: number
          tax: number
          total: number
          updated_at: string
        }
        Insert: {
          business_user_id: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number: string
          station_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Update: {
          business_user_id?: string
          created_at?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          station_id?: string | null
          status?: string
          subtotal?: number
          tax?: number
          total?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "self_serve_orders_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "ordering_stations"
            referencedColumns: ["id"]
          },
        ]
      }
      settlements: {
        Row: {
          amount: number
          business_id: string
          collections_count: number | null
          completed_at: string | null
          created_at: string
          currency: string | null
          destination_account: string | null
          destination_bank: string | null
          failure_reason: string | null
          fee: number | null
          id: string
          net_amount: number
          period_end: string | null
          period_start: string | null
          provider_reference: string | null
          reference: string
          settlement_type: string | null
          status: Database["public"]["Enums"]["transaction_status"] | null
          wallet_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          collections_count?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          destination_account?: string | null
          destination_bank?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          net_amount: number
          period_end?: string | null
          period_start?: string | null
          provider_reference?: string | null
          reference?: string
          settlement_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          collections_count?: number | null
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          destination_account?: string | null
          destination_bank?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          net_amount?: number
          period_end?: string | null
          period_start?: string | null
          provider_reference?: string | null
          reference?: string
          settlement_type?: string | null
          status?: Database["public"]["Enums"]["transaction_status"] | null
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "settlements_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "settlements_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      short_url_clicks: {
        Row: {
          clicked_at: string
          id: string
          ip_address: string | null
          referrer: string | null
          short_url_id: string
          user_agent: string | null
        }
        Insert: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          short_url_id: string
          user_agent?: string | null
        }
        Update: {
          clicked_at?: string
          id?: string
          ip_address?: string | null
          referrer?: string | null
          short_url_id?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_url_clicks_short_url_id_fkey"
            columns: ["short_url_id"]
            isOneToOne: false
            referencedRelation: "short_urls"
            referencedColumns: ["id"]
          },
        ]
      }
      short_urls: {
        Row: {
          business_id: string | null
          clicks: number | null
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean | null
          original_url: string
          short_code: string
          title: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_id?: string | null
          clicks?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          original_url: string
          short_code: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_id?: string | null
          clicks?: number | null
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean | null
          original_url?: string
          short_code?: string
          title?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "short_urls_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sla_configurations: {
        Row: {
          created_at: string
          first_response_hours: number
          id: string
          is_active: boolean | null
          priority: string
          resolution_hours: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          first_response_hours: number
          id?: string
          is_active?: boolean | null
          priority: string
          resolution_hours: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          first_response_hours?: number
          id?: string
          is_active?: boolean | null
          priority?: string
          resolution_hours?: number
          updated_at?: string
        }
        Relationships: []
      }
      sms_campaigns: {
        Row: {
          created_at: string | null
          failed_count: number | null
          id: string
          message: string
          name: string
          recipient_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          success_count: number | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          failed_count?: number | null
          id?: string
          message: string
          name: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          success_count?: number | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          failed_count?: number | null
          id?: string
          message?: string
          name?: string
          recipient_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          success_count?: number | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      social_media_orders: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          delivery_address: string | null
          id: string
          notes: string | null
          payment_method: string | null
          payment_status: string
          product_id: string
          quantity: number
          status: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name: string
          customer_phone: string
          delivery_address?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id: string
          quantity?: number
          status?: string
          total_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          delivery_address?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          payment_status?: string
          product_id?: string
          quantity?: number
          status?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_media_products: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          inventory_item_id: string | null
          is_active: boolean
          name: string
          price: number
          slug: string
          stock_quantity: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          inventory_item_id?: string | null
          is_active?: boolean
          name: string
          price: number
          slug: string
          stock_quantity?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          inventory_item_id?: string | null
          is_active?: boolean
          name?: string
          price?: number
          slug?: string
          stock_quantity?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      split_payment_recipients: {
        Row: {
          beneficiary_id: string | null
          created_at: string
          id: string
          is_remainder: boolean
          recipient_account: string
          recipient_bank_code: string | null
          recipient_name: string
          split_rule_id: string
          split_type: string
          split_value: number
        }
        Insert: {
          beneficiary_id?: string | null
          created_at?: string
          id?: string
          is_remainder?: boolean
          recipient_account: string
          recipient_bank_code?: string | null
          recipient_name: string
          split_rule_id: string
          split_type?: string
          split_value: number
        }
        Update: {
          beneficiary_id?: string | null
          created_at?: string
          id?: string
          is_remainder?: boolean
          recipient_account?: string
          recipient_bank_code?: string | null
          recipient_name?: string
          split_rule_id?: string
          split_type?: string
          split_value?: number
        }
        Relationships: [
          {
            foreignKeyName: "split_payment_recipients_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "split_payment_recipients_split_rule_id_fkey"
            columns: ["split_rule_id"]
            isOneToOne: false
            referencedRelation: "split_payment_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      split_payment_rules: {
        Row: {
          applies_to_all: boolean
          business_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          payment_link_ids: string[] | null
          updated_at: string
        }
        Insert: {
          applies_to_all?: boolean
          business_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          payment_link_ids?: string[] | null
          updated_at?: string
        }
        Update: {
          applies_to_all?: boolean
          business_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          payment_link_ids?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "split_payment_rules_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          access_status: string
          auth_user_id: string | null
          created_at: string
          email: string | null
          employee_id: string | null
          hourly_rate: number | null
          id: string
          invitation_accepted_at: string | null
          invitation_sent_at: string | null
          invitation_token: string | null
          is_active: boolean
          location_id: string | null
          name: string
          phone: string | null
          pin: string | null
          position: string | null
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_id: string | null
          suspended_at: string | null
          suspended_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_status?: string
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean
          location_id?: string | null
          name: string
          phone?: string | null
          pin?: string | null
          position?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string | null
          suspended_at?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_status?: string
          auth_user_id?: string | null
          created_at?: string
          email?: string | null
          employee_id?: string | null
          hourly_rate?: number | null
          id?: string
          invitation_accepted_at?: string | null
          invitation_sent_at?: string | null
          invitation_token?: string | null
          is_active?: boolean
          location_id?: string | null
          name?: string
          phone?: string | null
          pin?: string | null
          position?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string | null
          suspended_at?: string | null
          suspended_until?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_announcements: {
        Row: {
          content: string
          created_at: string
          expires_at: string | null
          id: string
          is_active: boolean
          priority: string
          title: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          priority?: string
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_business_assignments: {
        Row: {
          assigned_at: string
          business_user_id: string
          created_at: string
          id: string
          revoke_reason: string | null
          revoked_at: string | null
          revoked_by: string | null
          role_id: string | null
          staff_auth_user_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_at?: string
          business_user_id: string
          created_at?: string
          id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string | null
          staff_auth_user_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_at?: string
          business_user_id?: string
          created_at?: string
          id?: string
          revoke_reason?: string | null
          revoked_at?: string | null
          revoked_by?: string | null
          role_id?: string | null
          staff_auth_user_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_business_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "staff_roles"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_commissions: {
        Row: {
          commission_amount: number
          commission_rate: number
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          order_total: number
          paid_at: string | null
          staff_id: string
          status: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          commission_amount: number
          commission_rate: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_total: number
          paid_at?: string | null
          staff_id: string
          status?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          commission_amount?: number
          commission_rate?: number
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          order_total?: number
          paid_at?: string | null
          staff_id?: string
          status?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_commissions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_commissions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          permissions: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          permissions?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          permissions?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      staff_tips: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_id: string | null
          paid_at: string | null
          payment_method: string | null
          staff_id: string
          status: string | null
          tip_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          staff_id: string
          status?: string | null
          tip_amount: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_id?: string | null
          paid_at?: string | null
          payment_method?: string | null
          staff_id?: string
          status?: string | null
          tip_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_tips_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_tips_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipt_items: {
        Row: {
          created_at: string
          id: string
          inventory_item_id: string
          quantity_received: number
          stock_receipt_id: string
          unit_cost: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          inventory_item_id: string
          quantity_received: number
          stock_receipt_id: string
          unit_cost?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          inventory_item_id?: string
          quantity_received?: number
          stock_receipt_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipt_items_inventory_item_id_fkey"
            columns: ["inventory_item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_receipt_items_stock_receipt_id_fkey"
            columns: ["stock_receipt_id"]
            isOneToOne: false
            referencedRelation: "stock_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_receipts: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          receipt_number: string
          received_by: string | null
          received_date: string
          supplier_order_id: string | null
          total_cost: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          receipt_number: string
          received_by?: string | null
          received_date?: string
          supplier_order_id?: string | null
          total_cost?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          receipt_number?: string
          received_by?: string | null
          received_date?: string
          supplier_order_id?: string | null
          total_cost?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_receipts_supplier_order_id_fkey"
            columns: ["supplier_order_id"]
            isOneToOne: false
            referencedRelation: "supplier_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      storefront_visits: {
        Row: {
          business_user_id: string
          device_type: string | null
          id: string
          ip_address: string | null
          page_path: string
          referrer: string | null
          user_agent: string | null
          visited_at: string
          visitor_id: string
        }
        Insert: {
          business_user_id: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          page_path: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id: string
        }
        Update: {
          business_user_id?: string
          device_type?: string | null
          id?: string
          ip_address?: string | null
          page_path?: string
          referrer?: string | null
          user_agent?: string | null
          visited_at?: string
          visitor_id?: string
        }
        Relationships: []
      }
      subcategories: {
        Row: {
          category_id: string
          created_at: string
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string
          description: string | null
          display_order: number | null
          email_limit: number | null
          external_plan_code: string | null
          features: Json
          id: string
          is_active: boolean
          name: string
          price_monthly: number
          price_yearly: number | null
          sms_limit: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          email_limit?: number | null
          external_plan_code?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name: string
          price_monthly: number
          price_yearly?: number | null
          sms_limit?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number | null
          email_limit?: number | null
          external_plan_code?: string | null
          features?: Json
          id?: string
          is_active?: boolean
          name?: string
          price_monthly?: number
          price_yearly?: number | null
          sms_limit?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      super_admin_permissions: {
        Row: {
          created_at: string | null
          granted_by: string | null
          id: string
          permission_key: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission_key: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted_by?: string | null
          id?: string
          permission_key?: string
          user_id?: string
        }
        Relationships: []
      }
      supplier_orders: {
        Row: {
          created_at: string
          expected_delivery: string | null
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string
          supplier_id: string
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number: string
          status?: string
          supplier_id: string
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expected_delivery?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          supplier_id?: string
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          updated_at: string
          user_id: string
          website: string | null
        }
        Insert: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
          user_id: string
          website?: string | null
        }
        Update: {
          address?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          updated_at?: string
          user_id?: string
          website?: string | null
        }
        Relationships: []
      }
      support_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
          sender_type: string
          ticket_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
          sender_type?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_chat_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_ticket_messages: {
        Row: {
          attachments: string[] | null
          created_at: string
          id: string
          is_internal: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Insert: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message: string
          ticket_id: string
          user_id: string
        }
        Update: {
          attachments?: string[] | null
          created_at?: string
          id?: string
          is_internal?: boolean
          message?: string
          ticket_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_ticket_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_to: string | null
          business_id: string | null
          category: string
          created_at: string
          description: string
          first_response_at: string | null
          id: string
          priority: string
          resolution_due_at: string | null
          resolved_at: string | null
          response_due_at: string | null
          sla_breached_at: string | null
          sla_status: string | null
          status: string
          subject: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          business_id?: string | null
          category: string
          created_at?: string
          description: string
          first_response_at?: string | null
          id?: string
          priority?: string
          resolution_due_at?: string | null
          resolved_at?: string | null
          response_due_at?: string | null
          sla_breached_at?: string | null
          sla_status?: string | null
          status?: string
          subject: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          business_id?: string | null
          category?: string
          created_at?: string
          description?: string
          first_response_at?: string | null
          id?: string
          priority?: string
          resolution_due_at?: string | null
          resolved_at?: string | null
          response_due_at?: string | null
          sla_breached_at?: string | null
          sla_status?: string | null
          status?: string
          subject?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings: {
        Row: {
          created_at: string
          description: string | null
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      system_templates: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_active: boolean
          is_system: boolean
          name: string
          subject: string | null
          type: string
          updated_at: string
          variables: Json | null
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name: string
          subject?: string | null
          type: string
          updated_at?: string
          variables?: Json | null
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          name?: string
          subject?: string | null
          type?: string
          updated_at?: string
          variables?: Json | null
        }
        Relationships: []
      }
      tax_aggregation_summaries: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          total_getfund: number
          total_net_amount: number
          total_nhil: number
          total_sales: number
          total_tax: number
          total_transactions: number
          total_vat: number
          user_id: string
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type: string
          total_getfund?: number
          total_net_amount?: number
          total_nhil?: number
          total_sales?: number
          total_tax?: number
          total_transactions?: number
          total_vat?: number
          user_id: string
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          total_getfund?: number
          total_net_amount?: number
          total_nhil?: number
          total_sales?: number
          total_tax?: number
          total_transactions?: number
          total_vat?: number
          user_id?: string
        }
        Relationships: []
      }
      tax_audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          metadata: Json | null
          tax_components: Json
          tax_rule_version: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tax_components: Json
          tax_rule_version: string
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          metadata?: Json | null
          tax_components?: Json
          tax_rule_version?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_audit_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      tax_configurations: {
        Row: {
          abolished_levies: string[] | null
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          getfund_rate: number
          id: string
          is_active: boolean
          nhil_rate: number
          vat_rate: number
          version: string
        }
        Insert: {
          abolished_levies?: string[] | null
          created_at?: string
          created_by?: string | null
          effective_from: string
          effective_to?: string | null
          getfund_rate?: number
          id?: string
          is_active?: boolean
          nhil_rate?: number
          vat_rate?: number
          version: string
        }
        Update: {
          abolished_levies?: string[] | null
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          getfund_rate?: number
          id?: string
          is_active?: boolean
          nhil_rate?: number
          vat_rate?: number
          version?: string
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          break_minutes: number | null
          clock_in: string
          clock_out: string | null
          created_at: string
          id: string
          notes: string | null
          staff_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          staff_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          break_minutes?: number | null
          clock_in?: string
          clock_out?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          staff_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_tax_records: {
        Row: {
          computed_at: string
          created_at: string
          getfund_amount: number
          gross_amount: number
          id: string
          net_amount: number
          nhil_amount: number
          tax_rule_version: string
          total_tax: number
          transaction_id: string
          user_id: string
          vat_amount: number
          vat_registered_at_time: boolean
        }
        Insert: {
          computed_at?: string
          created_at?: string
          getfund_amount?: number
          gross_amount: number
          id?: string
          net_amount: number
          nhil_amount?: number
          tax_rule_version: string
          total_tax?: number
          transaction_id: string
          user_id: string
          vat_amount?: number
          vat_registered_at_time?: boolean
        }
        Update: {
          computed_at?: string
          created_at?: string
          getfund_amount?: number
          gross_amount?: number
          id?: string
          net_amount?: number
          nhil_amount?: number
          tax_rule_version?: string
          total_tax?: number
          transaction_id?: string
          user_id?: string
          vat_amount?: number
          vat_registered_at_time?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "transaction_tax_records_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          change_due: number | null
          created_at: string
          id: string
          location_id: string | null
          notes: string | null
          order_id: string | null
          payment_method: string
          staff_id: string | null
          status: string
          tendered_amount: number | null
          transaction_date: string
          transaction_number: string
          user_id: string
        }
        Insert: {
          amount: number
          change_due?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method: string
          staff_id?: string | null
          status?: string
          tendered_amount?: number | null
          transaction_date?: string
          transaction_number: string
          user_id: string
        }
        Update: {
          amount?: number
          change_due?: number | null
          created_at?: string
          id?: string
          location_id?: string | null
          notes?: string | null
          order_id?: string | null
          payment_method?: string
          staff_id?: string | null
          status?: string
          tendered_amount?: number | null
          transaction_date?: string
          transaction_number?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity_logs: {
        Row: {
          action: string
          business_id: string | null
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          resource_id: string | null
          resource_type: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          action: string
          business_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          action?: string
          business_id?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          resource_id?: string | null
          resource_type?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_logs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at_period_end: boolean
          created_at: string
          current_period_end: string
          current_period_start: string
          email_usage: number | null
          id: string
          is_trial: boolean | null
          plan_id: string
          referral_code: string | null
          sms_usage: number | null
          status: string
          stripe_subscription_id: string | null
          trial_services_used: Json | null
          trial_used_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          billing_cycle: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end: string
          current_period_start: string
          email_usage?: number | null
          id?: string
          is_trial?: boolean | null
          plan_id: string
          referral_code?: string | null
          sms_usage?: number | null
          status?: string
          stripe_subscription_id?: string | null
          trial_services_used?: Json | null
          trial_used_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          billing_cycle?: string
          cancel_at_period_end?: boolean
          created_at?: string
          current_period_end?: string
          current_period_start?: string
          email_usage?: number | null
          id?: string
          is_trial?: boolean | null
          plan_id?: string
          referral_code?: string | null
          sms_usage?: number | null
          status?: string
          stripe_subscription_id?: string | null
          trial_services_used?: Json | null
          trial_used_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_two_factor_auth: {
        Row: {
          backup_codes: string[] | null
          created_at: string | null
          id: string
          is_enabled: boolean | null
          totp_secret: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
        }
        Insert: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
        }
        Update: {
          backup_codes?: string[] | null
          created_at?: string | null
          id?: string
          is_enabled?: boolean | null
          totp_secret?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      utility_payments: {
        Row: {
          amount: number
          business_id: string
          completed_at: string | null
          created_at: string
          currency: string | null
          failure_reason: string | null
          fee: number | null
          id: string
          metadata: Json | null
          provider_id: string | null
          provider_reference: string | null
          recipient_name: string | null
          recipient_number: string
          reference: string
          status: Database["public"]["Enums"]["transaction_status"] | null
          utility_type: Database["public"]["Enums"]["utility_type"]
          wallet_id: string | null
        }
        Insert: {
          amount: number
          business_id: string
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          provider_reference?: string | null
          recipient_name?: string | null
          recipient_number: string
          reference?: string
          status?: Database["public"]["Enums"]["transaction_status"] | null
          utility_type: Database["public"]["Enums"]["utility_type"]
          wallet_id?: string | null
        }
        Update: {
          amount?: number
          business_id?: string
          completed_at?: string | null
          created_at?: string
          currency?: string | null
          failure_reason?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          provider_id?: string | null
          provider_reference?: string | null
          recipient_name?: string | null
          recipient_number?: string
          reference?: string
          status?: Database["public"]["Enums"]["transaction_status"] | null
          utility_type?: Database["public"]["Enums"]["utility_type"]
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "utility_payments_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "utility_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "utility_payments_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      utility_providers: {
        Row: {
          country: string | null
          created_at: string
          id: string
          is_active: boolean | null
          logo_url: string | null
          metadata: Json | null
          name: string
          slug: string
          updated_at: string
          utility_type: Database["public"]["Enums"]["utility_type"]
        }
        Insert: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name: string
          slug: string
          updated_at?: string
          utility_type: Database["public"]["Enums"]["utility_type"]
        }
        Update: {
          country?: string | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          logo_url?: string | null
          metadata?: Json | null
          name?: string
          slug?: string
          updated_at?: string
          utility_type?: Database["public"]["Enums"]["utility_type"]
        }
        Relationships: []
      }
      variant_history: {
        Row: {
          action: string
          changed_by: string | null
          created_at: string
          id: string
          price_after: number | null
          price_before: number | null
          quantity_after: number | null
          quantity_before: number | null
          reason: string | null
          user_id: string
          variant_id: string
        }
        Insert: {
          action: string
          changed_by?: string | null
          created_at?: string
          id?: string
          price_after?: number | null
          price_before?: number | null
          quantity_after?: number | null
          quantity_before?: number | null
          reason?: string | null
          user_id: string
          variant_id: string
        }
        Update: {
          action?: string
          changed_by?: string | null
          created_at?: string
          id?: string
          price_after?: number | null
          price_before?: number | null
          quantity_after?: number | null
          quantity_before?: number | null
          reason?: string | null
          user_id?: string
          variant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variant_history_variant_id_fkey"
            columns: ["variant_id"]
            isOneToOne: false
            referencedRelation: "product_variants"
            referencedColumns: ["id"]
          },
        ]
      }
      verification_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          destination: string
          expires_at: string
          id: string
          purpose: string
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          destination: string
          expires_at: string
          id?: string
          purpose: string
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          destination?: string
          expires_at?: string
          id?: string
          purpose?: string
          user_id?: string
        }
        Relationships: []
      }
      waitlist: {
        Row: {
          created_at: string
          customer_name: string
          customer_phone: string | null
          estimated_wait_time: number | null
          id: string
          notes: string | null
          party_size: number
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          customer_name: string
          customer_phone?: string | null
          estimated_wait_time?: number | null
          id?: string
          notes?: string | null
          party_size: number
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          customer_name?: string
          customer_phone?: string | null
          estimated_wait_time?: number | null
          id?: string
          notes?: string | null
          party_size?: number
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_topups: {
        Row: {
          amount: number
          completed_at: string | null
          created_at: string
          currency: string
          failure_reason: string | null
          fee: number
          id: string
          metadata: Json | null
          net_amount: number
          provider_id: string | null
          provider_reference: string | null
          reference: string
          source_account: string | null
          source_bank: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          wallet_id: string
        }
        Insert: {
          amount: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount: number
          provider_id?: string | null
          provider_reference?: string | null
          reference: string
          source_account?: string | null
          source_bank?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          wallet_id: string
        }
        Update: {
          amount?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          failure_reason?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          provider_id?: string | null
          provider_reference?: string | null
          reference?: string
          source_account?: string | null
          source_bank?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_topups_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_topups_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          balance_after: number
          balance_before: number
          completed_at: string | null
          created_at: string
          description: string | null
          external_reference: string | null
          fee: number | null
          id: string
          metadata: Json | null
          reference: string
          status: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          balance_after: number
          balance_before: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          external_reference?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          reference: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type: Database["public"]["Enums"]["transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          balance_after?: number
          balance_before?: number
          completed_at?: string | null
          created_at?: string
          description?: string | null
          external_reference?: string | null
          fee?: number | null
          id?: string
          metadata?: Json | null
          reference?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          transaction_type?: Database["public"]["Enums"]["transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_withdrawals: {
        Row: {
          amount: number
          beneficiary_id: string | null
          completed_at: string | null
          created_at: string
          currency: string
          destination_account: string
          destination_bank: string | null
          destination_name: string | null
          failure_reason: string | null
          fee: number
          id: string
          metadata: Json | null
          net_amount: number
          provider_id: string | null
          provider_reference: string | null
          reference: string
          status: Database["public"]["Enums"]["transaction_status"]
          wallet_id: string
        }
        Insert: {
          amount: number
          beneficiary_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          destination_account: string
          destination_bank?: string | null
          destination_name?: string | null
          failure_reason?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount: number
          provider_id?: string | null
          provider_reference?: string | null
          reference: string
          status?: Database["public"]["Enums"]["transaction_status"]
          wallet_id: string
        }
        Update: {
          amount?: number
          beneficiary_id?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          destination_account?: string
          destination_bank?: string | null
          destination_name?: string | null
          failure_reason?: string | null
          fee?: number
          id?: string
          metadata?: Json | null
          net_amount?: number
          provider_id?: string | null
          provider_reference?: string | null
          reference?: string
          status?: Database["public"]["Enums"]["transaction_status"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_withdrawals_beneficiary_id_fkey"
            columns: ["beneficiary_id"]
            isOneToOne: false
            referencedRelation: "beneficiaries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawals_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "payment_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_withdrawals_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "business_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_deliveries: {
        Row: {
          attempt_count: number
          completed_at: string | null
          created_at: string
          event_type: string
          id: string
          payload: Json
          response_body: string | null
          response_status: number | null
          status: string
          webhook_id: string
        }
        Insert: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          event_type: string
          id?: string
          payload: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_id: string
        }
        Update: {
          attempt_count?: number
          completed_at?: string | null
          created_at?: string
          event_type?: string
          id?: string
          payload?: Json
          response_body?: string | null
          response_status?: number | null
          status?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_deliveries_webhook_id_fkey"
            columns: ["webhook_id"]
            isOneToOne: false
            referencedRelation: "webhook_endpoints"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_endpoints: {
        Row: {
          business_id: string
          created_at: string
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          secret: string
          updated_at: string
          url: string
        }
        Insert: {
          business_id: string
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          secret?: string
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string
          created_at?: string
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret?: string
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhook_endpoints_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          business_id: string | null
          created_at: string
          created_by: string | null
          events: string[]
          failure_count: number
          id: string
          is_active: boolean
          last_triggered_at: string | null
          name: string
          secret_hash: string | null
          success_count: number
          updated_at: string
          url: string
        }
        Insert: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name: string
          secret_hash?: string | null
          success_count?: number
          updated_at?: string
          url: string
        }
        Update: {
          business_id?: string | null
          created_at?: string
          created_by?: string | null
          events?: string[]
          failure_count?: number
          id?: string
          is_active?: boolean
          last_triggered_at?: string | null
          name?: string
          secret_hash?: string | null
          success_count?: number
          updated_at?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "webhooks_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "business_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      trial_usage_summary: {
        Row: {
          business_name: string | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          email_usage: number | null
          id: string | null
          industry: Database["public"]["Enums"]["industry_type"] | null
          is_trial: boolean | null
          sms_usage: number | null
          status: string | null
          trial_services_used: Json | null
          trial_used_at: string | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      generate_gift_card_code: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      generate_order_number: { Args: never; Returns: string }
      generate_payment_link_code: { Args: never; Returns: string }
      generate_short_code: { Args: { length?: number }; Returns: string }
      generate_transaction_reference: {
        Args: { prefix?: string }
        Returns: string
      }
      has_2fa_enabled: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_super_admin_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      increment_trial_service_usage: {
        Args: { p_count?: number; p_service_type: string; p_user_id: string }
        Returns: undefined
      }
      is_business_owner: {
        Args: { _auth_user_id: string; _business_user_id: string }
        Returns: boolean
      }
      purge_business_data: { Args: { _user_id: string }; Returns: Json }
      staff_has_permission: {
        Args: { _auth_user_id: string; _permission: string }
        Returns: boolean
      }
      super_admin_requires_2fa: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      action_type:
        | "send_email"
        | "send_sms"
        | "send_invoice"
        | "send_payment_receipt"
        | "process_payment"
        | "send_reservation_confirmation"
        | "send_order_confirmation"
        | "send_order_status_update"
      app_role:
        | "admin"
        | "manager"
        | "cashier"
        | "kitchen_staff"
        | "inventory_manager"
        | "super_admin"
      bank_connection_status:
        | "connected"
        | "pending"
        | "disconnected"
        | "revoked"
      bank_status: "active" | "inactive" | "pending" | "suspended"
      collection_type: "payment_link" | "invoice" | "bulk" | "wallet_topup" | "hosted_checkout"
      industry_type:
        | "restaurant"
        | "retail"
        | "salon"
        | "gym"
        | "healthcare"
        | "services"
        | "bakery"
        | "bar_brewery"
        | "catering"
        | "coffee_shop"
        | "food_truck"
        | "franchise"
        | "full_service_restaurant"
        | "quick_service"
        | "clothing_retail"
        | "garden_retail"
        | "grocery"
        | "home_gift"
        | "wine_liquor"
        | "barbershop"
        | "beauty_salon"
        | "hair_salon"
        | "med_spa"
        | "nail_salon"
        | "tattoo_piercing"
        | "cbd"
        | "day_spa"
        | "fitness"
        | "cleaning"
        | "contractors"
        | "landscaping"
        | "automotive"
        | "nonprofit"
        | "pet_services"
        | "recreation"
        | "transportation"
      payout_channel: "bank_transfer" | "mobile_money"
      transaction_status:
        | "pending"
        | "processing"
        | "completed"
        | "failed"
        | "cancelled"
        | "reversed"
      transaction_type:
        | "collection"
        | "disbursement"
        | "wallet_credit"
        | "wallet_debit"
        | "transfer"
        | "fee"
      utility_type:
        | "airtime"
        | "data"
        | "electricity"
        | "water"
        | "tv"
        | "internet"
        | "insurance"
        | "other"
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
      action_type: [
        "send_email",
        "send_sms",
        "send_invoice",
        "send_payment_receipt",
        "process_payment",
        "send_reservation_confirmation",
        "send_order_confirmation",
        "send_order_status_update",
      ],
      app_role: [
        "admin",
        "manager",
        "cashier",
        "kitchen_staff",
        "inventory_manager",
        "super_admin",
      ],
      bank_connection_status: [
        "connected",
        "pending",
        "disconnected",
        "revoked",
      ],
      bank_status: ["active", "inactive", "pending", "suspended"],
      collection_type: ["payment_link", "invoice", "bulk", "wallet_topup", "hosted_checkout"],
      industry_type: [
        "restaurant",
        "retail",
        "salon",
        "gym",
        "healthcare",
        "services",
        "bakery",
        "bar_brewery",
        "catering",
        "coffee_shop",
        "food_truck",
        "franchise",
        "full_service_restaurant",
        "quick_service",
        "clothing_retail",
        "garden_retail",
        "grocery",
        "home_gift",
        "wine_liquor",
        "barbershop",
        "beauty_salon",
        "hair_salon",
        "med_spa",
        "nail_salon",
        "tattoo_piercing",
        "cbd",
        "day_spa",
        "fitness",
        "cleaning",
        "contractors",
        "landscaping",
        "automotive",
        "nonprofit",
        "pet_services",
        "recreation",
        "transportation",
      ],
      payout_channel: ["bank_transfer", "mobile_money"],
      transaction_status: [
        "pending",
        "processing",
        "completed",
        "failed",
        "cancelled",
        "reversed",
      ],
      transaction_type: [
        "collection",
        "disbursement",
        "wallet_credit",
        "wallet_debit",
        "transfer",
        "fee",
      ],
      utility_type: [
        "airtime",
        "data",
        "electricity",
        "water",
        "tv",
        "internet",
        "insurance",
        "other",
      ],
    },
  },
} as const
