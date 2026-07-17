-- categories/tags only had an admin-gated policy, so anon reads returned
-- zero rows under RLS (no permissive policy matched) — broke the public
-- category menu (Phase 9), which must be visible to every visitor.

create policy "Categories are publicly readable" on public.categories
for select using (true);

create policy "Tags are publicly readable" on public.tags
for select using (true);
