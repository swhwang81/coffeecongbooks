-- Phase 15 (공유 링크): `/share/[shareToken]` needs a way for the anon key
-- to look up exactly one `unlisted` book by its token, without ever being
-- able to list/enumerate unlisted books in general.
--
-- A broad RLS policy like `visibility = 'unlisted' and status = 'published'`
-- can't do this safely: RLS `USING` clauses see only the row being
-- evaluated, not the client's WHERE filter, so anyone with the (public)
-- anon key could query the REST API directly for every unlisted book,
-- token or not. A SECURITY DEFINER function that takes the token as an
-- argument and returns at most the one matching row closes that off — the
-- caller can only ever get a result back if they already have the exact
-- token (same pattern as `current_admin_role()` in migration 005, applied
-- here to close an enumeration hole instead of an RLS recursion).

create or replace function public.get_book_by_share_token(p_token text)
returns setof public.books
language sql
security definer
set search_path = public
stable
as $$
  select * from public.books
  where share_token = p_token
    and status = 'published'
    and visibility = 'unlisted'
  limit 1;
$$;

grant execute on function public.get_book_by_share_token(text) to anon, authenticated;
