-- 11단계: 여행 기록에 "떠나기 전 / 다녀온 뒤" 기분 (이모지 이름만 저장, 점수는 저장하지 않음)
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 됩니다). 9·10단계 SQL 을 먼저 실행했어야 합니다.
-- 읽기·쓰기 권한은 trips 의 기존 정책(본인만)이 그대로 적용됩니다.
alter table trips add column if not exists mood_before text;
alter table trips add column if not exists mood_after text;
alter table trips drop constraint if exists trips_mood_before_name;
alter table trips drop constraint if exists trips_mood_after_name;
alter table trips add constraint trips_mood_before_name check (mood_before is null or mood_before in ('exhale','pensive','neutral','smile','grin'));
alter table trips add constraint trips_mood_after_name check (mood_after is null or mood_after in ('exhale','pensive','neutral','smile','grin'));
notify pgrst, 'reload schema';
