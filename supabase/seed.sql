insert into public.categories (name, slug)
values
  ('소설', 'novel'),
  ('에세이', 'essay'),
  ('비즈니스', 'business'),
  ('자기계발', 'self-development'),
  ('역사', 'history'),
  ('과학', 'science'),
  ('디자인', 'design'),
  ('기타', 'etc')
on conflict (slug) do nothing;

insert into public.tags (name, slug)
values
  ('신작', 'new'),
  ('추천', 'recommended'),
  ('공유가능', 'shareable')
on conflict (slug) do nothing;
