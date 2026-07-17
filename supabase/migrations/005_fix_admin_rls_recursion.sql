-- Fixes "infinite recursion detected in policy for relation admin_profiles".
--
-- The original admin_profiles policy queried admin_profiles from within its
-- own USING clause to check the caller's role — evaluating that subquery
-- requires re-applying the same RLS policy to admin_profiles, which
-- recurses forever. Every other policy that checked admin status (books,
-- categories, tags) subqueried admin_profiles too, so they inherited the
-- same recursion — breaking anon-key reads of `books`, including the
-- public homepage/library (Phase 9), even though those only need the
-- public policy.
--
-- Fix: a SECURITY DEFINER function reads admin_profiles with the
-- privileges of its owner (bypassing RLS on that one lookup), so policies
-- can call it instead of subquerying admin_profiles directly.

create or replace function public.current_admin_role()
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.admin_profiles where user_id = auth.uid();
$$;

grant execute on function public.current_admin_role() to authenticated, anon;

drop policy if exists "Admins can manage admin profiles" on public.admin_profiles;
create policy "Admins can manage admin profiles" on public.admin_profiles
for all using (public.current_admin_role() in ('super_admin', 'admin'));

drop policy if exists "Admins can manage books" on public.books;
create policy "Admins can manage books" on public.books
for all using (public.current_admin_role() in ('super_admin', 'admin', 'editor'));

drop policy if exists "Admins can manage categories" on public.categories;
create policy "Admins can manage categories" on public.categories
for all using (public.current_admin_role() in ('super_admin', 'admin', 'editor'));

drop policy if exists "Admins can manage tags" on public.tags;
create policy "Admins can manage tags" on public.tags
for all using (public.current_admin_role() in ('super_admin', 'admin', 'editor'));
