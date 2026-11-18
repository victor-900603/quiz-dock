-- Per-user preferences shared across devices.

create table public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  preferences jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create trigger user_settings_touch_updated_at
before update on public.user_settings
for each row execute function public.touch_updated_at();

alter table public.user_settings enable row level security;

create policy "settings_select_own"
on public.user_settings for select
to authenticated
using (user_id = auth.uid());

create policy "settings_insert_own"
on public.user_settings for insert
to authenticated
with check (user_id = auth.uid());

create policy "settings_update_own"
on public.user_settings for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant select, insert, update on table public.user_settings to authenticated;
