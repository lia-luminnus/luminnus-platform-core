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
      profiles: {
        Row: {
          id: string
          email: string | null
          full_name: string | null
          avatar_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string | null
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tenants: {
        Row: {
          id: string
          name: string
          country: string | null
          timezone: string | null
          industry: string | null
          logo_url: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          country?: string | null
          timezone?: string | null
          industry?: string | null
          logo_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          country?: string | null
          timezone?: string | null
          industry?: string | null
          logo_url?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      tenant_members: {
        Row: {
          id: string
          tenant_id: string
          user_id: string
          role: "owner" | "admin" | "member"
          created_at: string | null
        }
        Insert: {
          id?: string
          tenant_id: string
          user_id: string
          role?: "owner" | "admin" | "member"
          created_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string
          user_id?: string
          role?: "owner" | "admin" | "member"
          created_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          tenant_id: string | null
          user_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          stripe_price_id: string | null
          plan_name: string
          payment_type: "annual_full" | "annual_12x" | "monthly"
          status: "active" | "past_due" | "canceled" | "incomplete" | "trialing"
          commitment_end_date: string | null
          commitment_months: number | null
          current_period_start: string | null
          current_period_end: string | null
          canceled_at: string | null
          cancel_at_period_end: boolean | null
          cancellation_reason: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tenant_id?: string | null
          user_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          plan_name: string
          payment_type: "annual_full" | "annual_12x" | "monthly"
          status?: "active" | "past_due" | "canceled" | "incomplete" | "trialing"
          commitment_end_date?: string | null
          commitment_months?: number | null
          current_period_start?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tenant_id?: string | null
          user_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          stripe_price_id?: string | null
          plan_name?: string
          payment_type?: "annual_full" | "annual_12x" | "monthly"
          status?: "active" | "past_due" | "canceled" | "incomplete" | "trialing"
          commitment_end_date?: string | null
          commitment_months?: number | null
          current_period_start?: string | null
          current_period_end?: string | null
          canceled_at?: string | null
          cancel_at_period_end?: boolean | null
          cancellation_reason?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
    }
  }
}
