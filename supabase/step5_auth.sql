-- 5단계: 로그인한 본인만 자기 기록을 읽고 쓰도록 바꿉니다.
-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run (여러 번 실행해도 됩니다)

-- 1) 기록에 주인(user_id)을 붙입니다. 새 행은 로그인한 사용자의 id 가 자동으로 들어갑니다.
alter table mood_logs     add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();
alter table place_reviews add column if not exists user_id uuid references auth.users(id) on delete cascade default auth.uid();

-- 2) 수업용으로 열어 두었던 익명 정책을 없앱니다.
drop policy if exists "mood_logs anon read"        on mood_logs;
drop policy if exists "mood_logs anon insert"      on mood_logs;
drop policy if exists "place_reviews anon read"    on place_reviews;
drop policy if exists "place_reviews anon insert"  on place_reviews;

-- 3) 마음 기록(mood_logs): 본인 것만 보고, 쓰고, 지웁니다.
drop policy if exists "mood_logs own select" on mood_logs;
drop policy if exists "mood_logs own insert" on mood_logs;
drop policy if exists "mood_logs own delete" on mood_logs;
create policy "mood_logs own select" on mood_logs for select to authenticated using (user_id = auth.uid());
create policy "mood_logs own insert" on mood_logs for insert to authenticated with check (user_id = auth.uid());
create policy "mood_logs own delete" on mood_logs for delete to authenticated using (user_id = auth.uid());

-- 4) 장소 리뷰(place_reviews): 누구나 읽고, 로그인한 사람만 본인 이름으로 쓰고 지웁니다. (8단계에서 사용)
drop policy if exists "place_reviews public read" on place_reviews;
drop policy if exists "place_reviews own insert"  on place_reviews;
drop policy if exists "place_reviews own delete"  on place_reviews;
create policy "place_reviews public read" on place_reviews for select to anon, authenticated using (true);
create policy "place_reviews own insert"  on place_reviews for insert to authenticated with check (user_id = auth.uid());
create policy "place_reviews own delete"  on place_reviews for delete to authenticated using (user_id = auth.uid());

-- 5) (선택) 3단계 이전 연결 테스트로 남은, 주인이 없는 행은 이제 아무에게도 보이지 않습니다. 지우려면 아래 줄의 주석(--)을 풀고 실행하세요.
-- delete from mood_logs where user_id is null;
