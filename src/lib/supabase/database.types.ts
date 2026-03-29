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
