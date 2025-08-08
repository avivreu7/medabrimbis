export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          role: string;
          full_name: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          role: string;
          full_name?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: string;
          full_name?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };

      community_board_posts: {
        Row: {
          id: number;
          admin_id: string;
          title: string;
          post_type: 'message' | 'youtube' | 'drive';
          content: string | null;
          embed_url: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          admin_id: string;
          title: string;
          post_type?: 'message' | 'youtube' | 'drive';
          content?: string | null;
          embed_url?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          admin_id?: string;
          title?: string;
          post_type?: 'message' | 'youtube' | 'drive';
          content?: string | null;
          embed_url?: string | null;
          created_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'community_board_posts_admin_id_fkey';
            columns: ['admin_id'];
            referencedRelation: 'users'; // או 'profiles' אם זה השם האמיתי
            referencedColumns: ['id'];
          }
        ];
      };
    };

    Views: {};
    Functions: {};
    Enums: {
      post_type: 'message' | 'youtube' | 'drive';
    };
    CompositeTypes: {};
  };
}
