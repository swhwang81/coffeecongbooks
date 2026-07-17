export type BookStatus = "draft" | "published" | "archived";
export type BookVisibility = "public" | "unlisted" | "private";
export type AdminRole = "super_admin" | "admin" | "editor";

export interface Category {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  created_at?: string;
}

export interface Book {
  id: string;
  slug: string;
  title: string;
  author?: string | null;
  summary?: string | null;
  content_html?: string | null;
  content_json?: unknown;
  toc_json?: unknown;
  cover_url?: string | null;
  status: BookStatus;
  visibility: BookVisibility;
  share_token?: string | null;
  allow_share?: boolean;
  allow_download?: boolean;
  published_at?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  deleted_at?: string | null;
}

export interface BookCategory {
  id: string;
  book_id: string;
  category_id: string;
  created_at?: string;
}

export interface BookTag {
  id: string;
  book_id: string;
  tag_id: string;
  created_at?: string;
}

export interface AdminProfile {
  id: string;
  user_id: string;
  role: AdminRole;
  created_at?: string;
}

export interface ReadingProgress {
  id: string;
  book_id: string;
  user_id?: string | null;
  block_id?: string | null;
  character_offset?: number | null;
  font_size?: number | null;
  line_height?: number | null;
  theme?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface BookView {
  id: string;
  book_id: string;
  viewer_id?: string | null;
  session_id?: string | null;
  created_at?: string;
}

export interface Database {
  public: {
    Tables: {
      books: { Row: Book; Insert: Partial<Book>; Update: Partial<Book>; Relationships: [] };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category>; Relationships: [] };
      tags: { Row: Tag; Insert: Partial<Tag>; Update: Partial<Tag>; Relationships: [] };
      book_categories: { Row: BookCategory; Insert: Partial<BookCategory>; Update: Partial<BookCategory>; Relationships: [] };
      book_tags: { Row: BookTag; Insert: Partial<BookTag>; Update: Partial<BookTag>; Relationships: [] };
      admin_profiles: { Row: AdminProfile; Insert: Partial<AdminProfile>; Update: Partial<AdminProfile>; Relationships: [] };
      reading_progress: { Row: ReadingProgress; Insert: Partial<ReadingProgress>; Update: Partial<ReadingProgress>; Relationships: [] };
      book_views: { Row: BookView; Insert: Partial<BookView>; Update: Partial<BookView>; Relationships: [] };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
  };
}
