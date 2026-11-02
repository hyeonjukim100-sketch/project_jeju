-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run
-- 수업용: anon 키로 읽기·쓰기를 허용합니다. 실서비스 전에는 로그인 기반 정책으로 바꾸세요.

create table if not exists mood_logs (
  id bigint generated always as identity primary key,
  nickname text not null default '익명',
  mood text not null,          -- 예: tired / anxious / lonely / excited / calm
  note text,
  place_title text,            -- 코스 중 기록이면 장소 이름
  created_at timestamptz not null default now()
);

create table if not exists place_reviews (
  id bigint generated always as identity primary key,
  nickname text not null default '익명',
  place_id text not null,
  place_title text not null,
  body text not null,
  created_at timestamptz not null default now()
);

alter table mood_logs enable row level security;
alter table place_reviews enable row level security;

create policy "mood_logs anon read"   on mood_logs for select to anon using (true);
create policy "mood_logs anon insert" on mood_logs for insert to anon with check (true);
create policy "place_reviews anon read"   on place_reviews for select to anon using (true);
create policy "place_reviews anon insert" on place_reviews for insert to anon with check (true);
