create extension if not exists pgcrypto;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  author text,
  summary text,
  content_html text,
  content_json jsonb,
  toc_json jsonb,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  visibility text not null default 'private' check (visibility in ('public','unlisted','private')),
  share_token text,
  allow_share boolean not null default true,
  allow_download boolean not null default true,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.book_categories (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, category_id)
);

create table if not exists public.book_tags (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  tag_id uuid not null references public.tags(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (book_id, tag_id)
);

create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  role text not null default 'editor' check (role in ('super_admin','admin','editor')),
  created_at timestamptz not null default now()
);

create table if not exists public.reading_progress (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  user_id uuid,
  block_id text,
  character_offset integer,
  font_size numeric,
  line_height numeric,
  theme text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.book_views (
  id uuid primary key default gen_random_uuid(),
  book_id uuid not null references public.books(id) on delete cascade,
  viewer_id uuid,
  session_id text,
  created_at timestamptz not null default now()
);

create index if not exists books_status_visibility_idx on public.books(status, visibility);
create index if not exists books_slug_idx on public.books(slug);
create index if not exists reading_progress_book_id_idx on public.reading_progress(book_id);
create index if not exists book_views_book_id_idx on public.book_views(book_id);

alter table public.categories enable row level security;
alter table public.tags enable row level security;
alter table public.books enable row level security;
alter table public.book_categories enable row level security;
alter table public.book_tags enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.reading_progress enable row level security;
alter table public.book_views enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'books'
      and policyname = 'Public books are readable'
  ) then
    create policy "Public books are readable" on public.books
    for select using (status = 'published' and visibility = 'public');
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'books'
      and policyname = 'Admins can manage books'
  ) then
    create policy "Admins can manage books" on public.books
    for all using (
      exists (
        select 1 from public.admin_profiles ap
        where ap.user_id = auth.uid()
          and ap.role in ('super_admin','admin','editor')
      )
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'categories'
      and policyname = 'Admins can manage categories'
  ) then
    create policy "Admins can manage categories" on public.categories
    for all using (
      exists (
        select 1 from public.admin_profiles ap
        where ap.user_id = auth.uid()
          and ap.role in ('super_admin','admin','editor')
      )
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'tags'
      and policyname = 'Admins can manage tags'
  ) then
    create policy "Admins can manage tags" on public.tags
    for all using (
      exists (
        select 1 from public.admin_profiles ap
        where ap.user_id = auth.uid()
          and ap.role in ('super_admin','admin','editor')
      )
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'admin_profiles'
      and policyname = 'Admins can manage admin profiles'
  ) then
    create policy "Admins can manage admin profiles" on public.admin_profiles
    for all using (
      exists (
        select 1 from public.admin_profiles ap
        where ap.user_id = auth.uid()
          and ap.role in ('super_admin','admin')
      )
    );
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reading_progress'
      and policyname = 'Users can manage their own progress'
  ) then
    create policy "Users can manage their own progress" on public.reading_progress
    for all using (user_id is null or user_id = auth.uid());
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'book_views'
      and policyname = 'Anyone can create book views'
  ) then
    create policy "Anyone can create book views" on public.book_views
    for insert with check (true);
  end if;
end
$$;
