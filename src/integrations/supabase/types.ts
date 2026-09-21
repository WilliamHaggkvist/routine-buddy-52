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
      daily_summary: {
        Row: {
          completed: boolean
          day: string
          id: string
          steps_done: number
          steps_total: number
          tasks_done: number
          tasks_total: number
          updated_at: string
          user_id: string
        }
        Insert: {
          completed?: boolean
          day: string
          id?: string
          steps_done?: number
          steps_total?: number
          tasks_done?: number
          tasks_total?: number
          updated_at?: string
          user_id?: string
        }
        Update: {
          completed?: boolean
          day?: string
          id?: string
          steps_done?: number
          steps_total?: number
          tasks_done?: number
          tasks_total?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lists: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          evening_enabled: boolean
          evening_time: string
          inapp_enabled: boolean
          missed_nudges: boolean
          morning_enabled: boolean
          morning_time: string
          push_enabled: boolean
          quiet_end: string
          quiet_start: string
          routine_reminders: boolean
          task_reminders: boolean
          tone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          evening_enabled?: boolean
          evening_time?: string
          inapp_enabled?: boolean
          missed_nudges?: boolean
          morning_enabled?: boolean
          morning_time?: string
          push_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          routine_reminders?: boolean
          task_reminders?: boolean
          tone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          evening_enabled?: boolean
          evening_time?: string
          inapp_enabled?: boolean
          missed_nudges?: boolean
          morning_enabled?: boolean
          morning_time?: string
          push_enabled?: boolean
          quiet_end?: string
          quiet_start?: string
          routine_reminders?: boolean
          task_reminders?: boolean
          tone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title: string
          user_id?: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          email: string | null
          id: string
          timezone: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          email?: string | null
          id: string
          timezone?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          email?: string | null
          id?: string
          timezone?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          label: string | null
          last_seen_at: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          label?: string | null
          last_seen_at?: string
          p256dh: string
          user_id?: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          label?: string | null
          last_seen_at?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reminder_sends: {
        Row: {
          day: string
          id: string
          kind: string
          sent_at: string
          user_id: string
        }
        Insert: {
          day: string
          id?: string
          kind: string
          sent_at?: string
          user_id?: string
        }
        Update: {
          day?: string
          id?: string
          kind?: string
          sent_at?: string
          user_id?: string
        }
        Relationships: []
      }
      routine_step_completions: {
        Row: {
          completed_at: string
          completed_on: string
          id: string
          routine_id: string
          step_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completed_on: string
          id?: string
          routine_id: string
          step_id: string
          user_id?: string
        }
        Update: {
          completed_at?: string
          completed_on?: string
          id?: string
          routine_id?: string
          step_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_step_completions_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_step_completions_step_id_fkey"
            columns: ["step_id"]
            isOneToOne: false
            referencedRelation: "routine_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      routine_steps: {
        Row: {
          created_at: string
          id: string
          routine_id: string
          sort_order: number
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          routine_id: string
          sort_order?: number
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          routine_id?: string
          sort_order?: number
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_steps_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string
          days: number[]
          emoji: string
          id: string
          is_active: boolean
          name: string
          sort_order: number
          user_id: string
          window_end: string
          window_start: string
        }
        Insert: {
          created_at?: string
          days?: number[]
          emoji?: string
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Update: {
          created_at?: string
          days?: number[]
          emoji?: string
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          user_id?: string
          window_end?: string
          window_start?: string
        }
        Relationships: []
      }
      task_completions: {
        Row: {
          completed_at: string
          completed_on: string
          id: string
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          completed_on: string
          id?: string
          task_id: string
          user_id?: string
        }
        Update: {
          completed_at?: string
          completed_on?: string
          id?: string
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_completions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          due_date: string | null
          due_time: string | null
          estimate_minutes: number | null
          id: string
          is_archived: boolean
          list_id: string | null
          notes: string | null
          parent_id: string | null
          priority: number | null
          recurrence: string
          recurrence_days: number[]
          sort_order: number
          time_band: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date?: string | null
          due_time?: string | null
          estimate_minutes?: number | null
          id?: string
          is_archived?: boolean
          list_id?: string | null
          notes?: string | null
          parent_id?: string | null
          priority?: number | null
          recurrence?: string
          recurrence_days?: number[]
          sort_order?: number
          time_band?: string | null
          title: string
          user_id?: string
        }
        Update: {
          created_at?: string
          due_date?: string | null
          due_time?: string | null
          estimate_minutes?: number | null
          id?: string
          is_archived?: boolean
          list_id?: string | null
          notes?: string | null
          parent_id?: string | null
          priority?: number | null
          recurrence?: string
          recurrence_days?: number[]
          sort_order?: number
          time_band?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_list_id_fkey"
            columns: ["list_id"]
            isOneToOne: false
            referencedRelation: "lists"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
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
    Enums: {},
  },
} as const
