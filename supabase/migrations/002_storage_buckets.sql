-- Storage buckets referenced by spec §8. Buckets were created against the
-- live project via the Storage API (service role) during Phase 5; this
-- migration keeps a fresh environment reproducible via `supabase db push`.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'book-originals',
    'book-originals',
    false,
    20971520, -- 20MB
    array['application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  ),
  ('book-covers', 'book-covers', true, 5242880, null),
  ('book-assets', 'book-assets', false, 10485760, null)
on conflict (id) do nothing;
