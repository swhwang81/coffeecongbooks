-- book_categories/book_tags have RLS enabled but never got a policy at
-- all, so every anon/authenticated read returned zero rows (no permissive
-- policy = deny). Broke the public library's category filter and the
-- per-card category badge (Phase 9), since both join through these tables.
--
-- Readable when the parent book itself is publicly readable, or by an
-- admin — mirrors the `books` policy rather than a blanket `true`, so a
-- private book's category/tag membership isn't exposed even if someone
-- has its id.

create policy "Book category links follow book visibility" on public.book_categories
for select using (
  exists (
    select 1 from public.books b
    where b.id = book_categories.book_id
      and b.status = 'published'
      and b.visibility = 'public'
  )
  or public.current_admin_role() in ('super_admin', 'admin', 'editor')
);

create policy "Book tag links follow book visibility" on public.book_tags
for select using (
  exists (
    select 1 from public.books b
    where b.id = book_tags.book_id
      and b.status = 'published'
      and b.visibility = 'public'
  )
  or public.current_admin_role() in ('super_admin', 'admin', 'editor')
);
