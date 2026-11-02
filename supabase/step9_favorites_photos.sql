-- 9단계: 찜, 사진이 있는 여행 기록
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 됩니다). 8단계 SQL 을 먼저 실행했어야 합니다.

-- 1) 찜: 본인만 보고 쓰고 지웁니다. 한 사람이 한 장소에 하나.
create table if not exists favorites (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  place_id text not null,
  place_title text not null,
  kind text,
  address text,
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  unique (user_id, place_id)
);
alter table favorites enable row level security;
drop policy if exists "favorites own select" on favorites;
drop policy if exists "favorites own insert" on favorites;
drop policy if exists "favorites own delete" on favorites;
create policy "favorites own select" on favorites for select to authenticated using (user_id = auth.uid());
create policy "favorites own insert" on favorites for insert to authenticated with check (user_id = auth.uid());
create policy "favorites own delete" on favorites for delete to authenticated using (user_id = auth.uid());

-- 2) 여행 기록: 날짜와 장소별 사진·글(entries). 기분·한 줄 메모는 더 쓰지 않으므로 비워 둘 수 있게 합니다.
alter table trips add column if not exists trip_date date not null default current_date;
alter table trips add column if not exists entries jsonb not null default '[]';   -- [{title, text, photo}]  text 300자 이하(앱에서 확인)
alter table trips alter column mood drop not null;

-- 3) 사진 보관함(비공개): 본인 폴더(<내 id>/...)에만 올리고 읽고 지울 수 있습니다. 사진 한 장 5MB 까지.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('trip-photos', 'trip-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;

drop policy if exists "trip photos own read" on storage.objects;
drop policy if exists "trip photos own insert" on storage.objects;
drop policy if exists "trip photos own delete" on storage.objects;
create policy "trip photos own read" on storage.objects for select to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "trip photos own insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "trip photos own delete" on storage.objects for delete to authenticated
  using (bucket_id = 'trip-photos' and (storage.foldername(name))[1] = auth.uid()::text);
