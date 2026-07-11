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
      activity_reactions: {
        Row: {
          activity_id: string
          club_id: string | null
          created_at: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          activity_id: string
          club_id?: string | null
          created_at?: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          activity_id?: string
          club_id?: string | null
          created_at?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_reactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          club_id: string | null
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          announcement_id: string
          club_id?: string | null
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          announcement_id?: string
          club_id?: string | null
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "announcement_reads_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          club_id: string | null
          created_at: string
          created_by: string
          id: string
          message: string
          title: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          created_by: string
          id?: string
          message: string
          title: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          created_by?: string
          id?: string
          message?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          club_id: string | null
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          club_id?: string | null
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          club_id?: string | null
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "app_settings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_quotes: {
        Row: {
          book_id: string
          character_name: string | null
          club_id: string | null
          created_at: string
          id: string
          is_spoiler: boolean
          page_number: number | null
          quote_text: string
          user_id: string
        }
        Insert: {
          book_id: string
          character_name?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          is_spoiler?: boolean
          page_number?: number | null
          quote_text: string
          user_id: string
        }
        Update: {
          book_id?: string
          character_name?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          is_spoiler?: boolean
          page_number?: number | null
          quote_text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_quotes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_quotes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_ratings: {
        Row: {
          book_id: string
          club_id: string | null
          created_at: string
          id: string
          rating: number
          review: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          club_id?: string | null
          created_at?: string
          id?: string
          rating: number
          review?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          club_id?: string | null
          created_at?: string
          id?: string
          rating?: number
          review?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_ratings_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_ratings_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_recommendations: {
        Row: {
          author: string
          club_id: string | null
          created_at: string
          from_user_id: string
          id: string
          message: string | null
          read: boolean
          title: string
          to_user_id: string
        }
        Insert: {
          author: string
          club_id?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          message?: string | null
          read?: boolean
          title: string
          to_user_id: string
        }
        Update: {
          author?: string
          club_id?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string | null
          read?: boolean
          title?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_recommendations_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      book_votes: {
        Row: {
          book_id: string | null
          club_id: string | null
          created_at: string
          id: string
          suggestion_author: string
          suggestion_title: string
          user_id: string
        }
        Insert: {
          book_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          suggestion_author: string
          suggestion_title: string
          user_id: string
        }
        Update: {
          book_id?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          suggestion_author?: string
          suggestion_title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "book_votes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_votes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "book_votes_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      books: {
        Row: {
          author: string
          club_id: string | null
          cover_url: string | null
          created_at: string
          id: string
          meeting_date: string | null
          meeting_location: string | null
          meeting_rsvp_active: boolean
          pdf_url: string | null
          selected_date: string | null
          spine_art_url: string | null
          status: string
          title: string
          total_pages: number | null
        }
        Insert: {
          author: string
          club_id?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          meeting_date?: string | null
          meeting_location?: string | null
          meeting_rsvp_active?: boolean
          pdf_url?: string | null
          selected_date?: string | null
          spine_art_url?: string | null
          status?: string
          title: string
          total_pages?: number | null
        }
        Update: {
          author?: string
          club_id?: string | null
          cover_url?: string | null
          created_at?: string
          id?: string
          meeting_date?: string | null
          meeting_location?: string | null
          meeting_rsvp_active?: boolean
          pdf_url?: string | null
          selected_date?: string | null
          spine_art_url?: string | null
          status?: string
          title?: string
          total_pages?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "books_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      cheers: {
        Row: {
          book_id: string
          club_id: string | null
          created_at: string
          from_user_id: string
          id: string
          message: string
          preset_key: string
          to_user_id: string
        }
        Insert: {
          book_id: string
          club_id?: string | null
          created_at?: string
          from_user_id: string
          id?: string
          message: string
          preset_key: string
          to_user_id: string
        }
        Update: {
          book_id?: string
          club_id?: string | null
          created_at?: string
          from_user_id?: string
          id?: string
          message?: string
          preset_key?: string
          to_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cheers_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cheers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_invites: {
        Row: {
          club_id: string
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          revoked: boolean
        }
        Insert: {
          club_id: string
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          revoked?: boolean
        }
        Update: {
          club_id?: string
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          revoked?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "club_invites_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_join_requests: {
        Row: {
          club_id: string
          created_at: string
          id: string
          status: string
          user_id: string
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_join_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_members: {
        Row: {
          club_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["club_member_role"]
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["club_member_role"]
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["club_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          accent_color: string | null
          cover_image_url: string | null
          created_at: string
          description: string | null
          id: string
          join_policy: Database["public"]["Enums"]["club_join_policy"]
          member_cap: number | null
          name: string
          owner_id: string
          updated_at: string
          visibility: Database["public"]["Enums"]["club_visibility"]
        }
        Insert: {
          accent_color?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          join_policy?: Database["public"]["Enums"]["club_join_policy"]
          member_cap?: number | null
          name: string
          owner_id: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["club_visibility"]
        }
        Update: {
          accent_color?: string | null
          cover_image_url?: string | null
          created_at?: string
          description?: string | null
          id?: string
          join_policy?: Database["public"]["Enums"]["club_join_policy"]
          member_cap?: number | null
          name?: string
          owner_id?: string
          updated_at?: string
          visibility?: Database["public"]["Enums"]["club_visibility"]
        }
        Relationships: []
      }
      direct_messages: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          message: string
          read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          message: string
          read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "direct_messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      discussion_reactions: {
        Row: {
          club_id: string | null
          created_at: string
          discussion_id: string
          id: string
          reaction_type: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          discussion_id: string
          id?: string
          reaction_type: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          discussion_id?: string
          id?: string
          reaction_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussion_reactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussion_reactions_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
        ]
      }
      discussions: {
        Row: {
          book_id: string
          club_id: string | null
          created_at: string
          id: string
          image_url: string | null
          message: string
          parent_id: string | null
          user_id: string
        }
        Insert: {
          book_id: string
          club_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          message: string
          parent_id?: string | null
          user_id: string
        }
        Update: {
          book_id?: string
          club_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          message?: string
          parent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "discussions_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discussions_user_id_profiles_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      meeting_rsvps: {
        Row: {
          book_id: string
          club_id: string | null
          created_at: string
          id: string
          response: string
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          club_id?: string | null
          created_at?: string
          id?: string
          response: string
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          club_id?: string | null
          created_at?: string
          id?: string
          response?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "meeting_rsvps_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_rsvps_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          message: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          message: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          message?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          link: string | null
          message: string
          read: boolean
          title: string
          triggered_by: string | null
          type: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message: string
          read?: boolean
          title: string
          triggered_by?: string | null
          type: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          message?: string
          read?: boolean
          title?: string
          triggered_by?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      password_reset_requests: {
        Row: {
          club_id: string | null
          created_at: string
          display_name: string
          id: string
          resolved_at: string | null
          resolved_by: string | null
          status: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          display_name: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          display_name?: string
          id?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "password_reset_requests_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_book_completions: {
        Row: {
          book_id: string
          completed_at: string
          id: string
          user_id: string
        }
        Insert: {
          book_id: string
          completed_at?: string
          id?: string
          user_id: string
        }
        Update: {
          book_id?: string
          completed_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_books: {
        Row: {
          author: string
          created_at: string
          current_page: number
          finished_at: string | null
          id: string
          title: string
          total_pages: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          author: string
          created_at?: string
          current_page?: number
          finished_at?: string | null
          id?: string
          title: string
          total_pages?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          created_at?: string
          current_page?: number
          finished_at?: string | null
          id?: string
          title?: string
          total_pages?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      personal_notes: {
        Row: {
          book_id: string
          club_id: string | null
          created_at: string
          id: string
          note_text: string
          page_number: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          book_id: string
          club_id?: string | null
          created_at?: string
          id?: string
          note_text: string
          page_number?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          book_id?: string
          club_id?: string | null
          created_at?: string
          id?: string
          note_text?: string
          page_number?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_notes_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_notes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      point_transactions: {
        Row: {
          action_type: string
          amount: number
          club_id: string | null
          created_at: string
          description: string
          id: string
          user_id: string
        }
        Insert: {
          action_type: string
          amount: number
          club_id?: string | null
          created_at?: string
          description?: string
          id?: string
          user_id: string
        }
        Update: {
          action_type?: string
          amount?: number
          club_id?: string | null
          created_at?: string
          description?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "point_transactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      poll_votes: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "poll_votes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "polls"
            referencedColumns: ["id"]
          },
        ]
      }
      polls: {
        Row: {
          active: boolean
          club_id: string | null
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          multiple_choice: boolean
          options: Json
          question: string
        }
        Insert: {
          active?: boolean
          club_id?: string | null
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          multiple_choice?: boolean
          options?: Json
          question: string
        }
        Update: {
          active?: boolean
          club_id?: string | null
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          multiple_choice?: boolean
          options?: Json
          question?: string
        }
        Relationships: [
          {
            foreignKeyName: "polls_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          id: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: []
      }
      reading_progress: {
        Row: {
          book_id: string
          club_id: string | null
          current_page: number
          id: string
          last_updated: string
          user_id: string
        }
        Insert: {
          book_id: string
          club_id?: string | null
          current_page?: number
          id?: string
          last_updated?: string
          user_id: string
        }
        Update: {
          book_id?: string
          club_id?: string | null
          current_page?: number
          id?: string
          last_updated?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reading_progress_book_id_fkey"
            columns: ["book_id"]
            isOneToOne: false
            referencedRelation: "books"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reading_progress_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      shop_items: {
        Row: {
          active: boolean
          asset_data: Json
          category: string
          club_id: string | null
          created_at: string
          description: string
          id: string
          name: string
          price: number
        }
        Insert: {
          active?: boolean
          asset_data?: Json
          category: string
          club_id?: string | null
          created_at?: string
          description?: string
          id?: string
          name: string
          price: number
        }
        Update: {
          active?: boolean
          asset_data?: Json
          category?: string
          club_id?: string | null
          created_at?: string
          description?: string
          id?: string
          name?: string
          price?: number
        }
        Relationships: [
          {
            foreignKeyName: "shop_items_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      suggestion_comments: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          message: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          message: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          message?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "suggestion_comments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_comments_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "book_votes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "suggestion_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_key: string
          club_id: string | null
          id: string
          unlocked_at: string
          user_id: string
        }
        Insert: {
          achievement_key: string
          club_id?: string | null
          id?: string
          unlocked_at?: string
          user_id: string
        }
        Update: {
          achievement_key?: string
          club_id?: string | null
          id?: string
          unlocked_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_inventory: {
        Row: {
          club_id: string | null
          equipped: boolean
          id: string
          item_id: string
          purchased_at: string
          selected_variant: string | null
          user_id: string
        }
        Insert: {
          club_id?: string | null
          equipped?: boolean
          id?: string
          item_id: string
          purchased_at?: string
          selected_variant?: string | null
          user_id: string
        }
        Update: {
          club_id?: string | null
          equipped?: boolean
          id?: string
          item_id?: string
          purchased_at?: string
          selected_variant?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_inventory_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_inventory_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "shop_items"
            referencedColumns: ["id"]
          },
        ]
      }
      user_points: {
        Row: {
          club_id: string
          lifetime_points: number
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          club_id: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          club_id?: string
          lifetime_points?: number
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_points_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_streaks: {
        Row: {
          club_id: string | null
          current_streak: number
          id: string
          last_activity_date: string
          longest_streak: number
          streak_type: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          streak_type: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          current_streak?: number
          id?: string
          last_activity_date?: string
          longest_streak?: number
          streak_type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_streaks_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      vote_likes: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          suggestion_id: string
          user_id: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          suggestion_id: string
          user_id: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          suggestion_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vote_likes_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vote_likes_suggestion_id_fkey"
            columns: ["suggestion_id"]
            isOneToOne: false
            referencedRelation: "book_votes"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_grant_shop_item: {
        Args: { _club_id: string; _item_id: string; _target_user: string }
        Returns: boolean
      }
      admin_relock_shop_item: {
        Args: { _item_id: string; _target_user: string }
        Returns: boolean
      }
      award_points: {
        Args: {
          _action_type: string
          _amount: number
          _club_id?: string
          _description?: string
          _user_id: string
        }
        Returns: undefined
      }
      detect_point_spam: {
        Args: { _hours?: number; _threshold?: number }
        Returns: {
          display_name: string
          latest_action: string
          total_earned: number
          transaction_count: number
          user_id: string
        }[]
      }
      get_community_totals: {
        Args: never
        Returns: {
          total_books_finished: number
          total_clubs: number
          total_members: number
          total_pages_read: number
        }[]
      }
      get_popular_books: {
        Args: { _limit?: number }
        Returns: {
          author: string
          avg_rating: number
          rating_count: number
          recommendation_count: number
          title: string
        }[]
      }
      grant_achievement: {
        Args: { _key: string; _user_id: string }
        Returns: undefined
      }
      has_club_role: {
        Args: {
          _club_id: string
          _role: Database["public"]["Enums"]["club_member_role"]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_club_admin: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_club_member: {
        Args: { _club_id: string; _user_id: string }
        Returns: boolean
      }
      is_privileged: { Args: { _user_id: string }; Returns: boolean }
      purchase_shop_item: {
        Args: { _club_id: string; _item_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "member"
      club_join_policy: "instant" | "approval"
      club_member_role: "owner" | "admin" | "member"
      club_visibility: "public" | "private"
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
      app_role: ["admin", "moderator", "member"],
      club_join_policy: ["instant", "approval"],
      club_member_role: ["owner", "admin", "member"],
      club_visibility: ["public", "private"],
    },
  },
} as const
