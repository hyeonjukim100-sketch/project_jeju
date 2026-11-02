-- 8단계: 장소 리뷰(감귤 별점·태그)와 하루 여행 기록
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 됩니다). 5단계 SQL 을 먼저 실행했어야 합니다.

-- 1) 리뷰: 별점(1~5), 태그, 글자 수 제한(300자), 한 사람이 한 장소에 하나
alter table place_reviews add column if not exists rating smallint check (rating between 1 and 5);
alter table place_reviews add column if not exists tags text[] not null default '{}';
alter table place_reviews drop constraint if exists place_reviews_body_len;
alter table place_reviews add constraint place_reviews_body_len check (char_length(body) <= 300);
alter table place_reviews drop constraint if exists place_reviews_tags_len;
alter table place_reviews add constraint place_reviews_tags_len check (cardinality(tags) <= 6);
create unique index if not exists place_reviews_one_per_user on place_reviews (user_id, place_id);

-- 본인 리뷰는 고칠 수 있게 (읽기·쓰기·지우기 정책은 5단계에서 만들었습니다)
drop policy if exists "place_reviews own update" on place_reviews;
create policy "place_reviews own update" on place_reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- 2) 하루 여행 기록: 그날의 동선과 이모지 기분. 본인만 보고 쓰고 지웁니다. (공유 기능은 아직 없습니다)
create table if not exists trips (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mood text not null,                                   -- 이모지 이름만 (점수는 저장하지 않음)
  note text check (char_length(note) <= 300),
  tags text[] not null default '{}' check (cardinality(tags) <= 6),
  stops jsonb not null,                                 -- [{title, kind, type, lat, lng}, ...]
  created_at timestamptz not null default now()
);

alter table trips enable row level security;
drop policy if exists "trips own select" on trips;
drop policy if exists "trips own insert" on trips;
drop policy if exists "trips own delete" on trips;
create policy "trips own select" on trips for select to authenticated using (user_id = auth.uid());
create policy "trips own insert" on trips for insert to authenticated with check (user_id = auth.uid());
create policy "trips own delete" on trips for delete to authenticated using (user_id = auth.uid());
