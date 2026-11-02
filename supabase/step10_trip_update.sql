-- 10단계: 여행 기록 수정 (내 기록만 고칠 수 있다)
drop policy if exists "trips own update" on trips;
create policy "trips own update" on trips for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
notify pgrst, 'reload schema';
