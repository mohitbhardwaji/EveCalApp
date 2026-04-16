-- Fix: "new row violates row-level security policy ... for table moods"
-- Upsert needs both INSERT (WITH CHECK) and UPDATE (USING + WITH CHECK) for auth.uid() = user_id.
-- Apply in Supabase Dashboard → SQL Editor (or `supabase db push`).
--
-- If policies already exist under other names, drop them first or rename below.

alter table public.moods enable row level security;

drop policy if exists "evecal_moods_select" on public.moods;
drop policy if exists "evecal_moods_insert" on public.moods;
drop policy if exists "evecal_moods_update" on public.moods;
drop policy if exists "evecal_moods_delete" on public.moods;

create policy "evecal_moods_select"
  on public.moods
  for select
  to authenticated
  using ((select auth.uid()) = user_id);

create policy "evecal_moods_insert"
  on public.moods
  for insert
  to authenticated
  with check ((select auth.uid()) = user_id);

create policy "evecal_moods_update"
  on public.moods
  for update
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "evecal_moods_delete"
  on public.moods
  for delete
  to authenticated
  using ((select auth.uid()) = user_id);
