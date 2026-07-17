-- Phase 7 (Ebook 등록): track which admin created each book, per spec §7's
-- `created_by` field. Nullable since existing rows predate this column.
alter table public.books
  add column if not exists created_by uuid references auth.users(id) on delete set null;
