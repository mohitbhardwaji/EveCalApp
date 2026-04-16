/** Supabase public schema typings — extend when the backend changes. */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      moods: {
        Row: {
          id: string;
          user_id: string;
          mood: string;
          created_at?: string | null;
        };
        Insert: {
          user_id: string;
          mood: string;
        };
        Update: Partial<Database['public']['Tables']['moods']['Row']>;
        Relationships: [];
      };
      mood_options: {
        Row: {
          id: string;
          is_active: boolean;
          type?: string | null;
          key?: string | null;
          label?: string | null;
          name?: string | null;
          title?: string | null;
          slug?: string | null;
          emoji?: string | null;
          sort_order?: number | null;
        };
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      tag_options: {
        Row: {
          id: string;
          is_active: boolean;
          label?: string | null;
          name?: string | null;
          title?: string | null;
          sort_order?: number | null;
        };
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
      entries: {
        Row: {
          id: string;
          user_id: string;
          mood_id: string;
          time_of_day: string;
          note: string;
          created_at: string;
        };
        Insert: {
          user_id: string;
          mood_id: string;
          time_of_day: string;
          note: string;
        };
        Update: Partial<
          Pick<
            Database['public']['Tables']['entries']['Row'],
            'mood_id' | 'time_of_day' | 'note'
          >
        >;
        Relationships: [];
      };
      entry_tags: {
        Row: {
          entry_id: string;
          tag_id: string;
        };
        Insert: {
          entry_id: string;
          tag_id: string;
        };
        Update: Partial<Database['public']['Tables']['entry_tags']['Row']>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          user_id?: string | null;
          name?: string | null;
        };
        Insert: {
          user_id: string;
          name: string;
        };
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
        Relationships: [];
      };
      missions: {
        Row: {
          id: string;
          user_id: string;
          date: string;
          created_at?: string | null;
        };
        Insert: {
          user_id: string;
          date: string;
        };
        Update: Partial<Database['public']['Tables']['missions']['Row']>;
        Relationships: [];
      };
      mission_tasks: {
        Row: {
          mission_id: string;
          task_id: string;
        };
        Insert: {
          mission_id: string;
          task_id: string;
        };
        Update: Partial<Database['public']['Tables']['mission_tasks']['Row']>;
        Relationships: [];
      };
      task_photos: {
        Row: {
          id: string;
          task_id: string;
          image_url: string;
          created_at?: string | null;
        };
        Insert: {
          task_id: string;
          image_url: string;
        };
        Update: Partial<Database['public']['Tables']['task_photos']['Row']>;
        Relationships: [];
      };
      tasks: {
        Row: {
          id: string;
          user_id: string;
          title?: string | null;
          name?: string | null;
          due_date?: string | null;
          is_completed?: boolean | null;
          completed_at?: string | null;
          notes?: string | null;
          description?: string | null;
          category_id?: string | null;
          created_at?: string | null;
        };
        Insert: {
          user_id: string;
          title?: string | null;
          category_id?: string | null;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Row']>;
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id?: string | null;
          title?: string | null;
          body?: string | null;
          message?: string | null;
          is_read: boolean;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          title?: string | null;
          body?: string | null;
          message?: string | null;
          is_read?: boolean;
          created_at?: string | null;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
        Relationships: [];
      };
      user_devices: {
        Row: {
          id?: string;
          user_id: string;
          push_token: string;
          platform?: string | null;
          created_at?: string | null;
        };
        Insert: {
          user_id: string;
          push_token: string;
          platform?: string | null;
        };
        Update: Partial<Database['public']['Tables']['user_devices']['Row']>;
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          [key: string]: Json | undefined;
        };
        Insert: Record<string, Json | undefined>;
        Update: Record<string, Json | undefined>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
