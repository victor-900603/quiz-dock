-- Row level security policies.

alter table public.quiz_sets enable row level security;
alter table public.questions enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.attempts enable row level security;
alter table public.question_marks enable row level security;

create policy "sets_select_own_or_public"
on public.quiz_sets for select
to authenticated
using (owner_id = auth.uid() or is_public);

create policy "sets_select_public_anon"
on public.quiz_sets for select
to anon
using (is_public);

create policy "sets_insert_own"
on public.quiz_sets for insert
to authenticated
with check (owner_id = auth.uid());

create policy "sets_update_own"
on public.quiz_sets for update
to authenticated
using (owner_id = auth.uid())
with check (owner_id = auth.uid());

create policy "sets_delete_own"
on public.quiz_sets for delete
to authenticated
using (owner_id = auth.uid());

create policy "questions_select_own_or_public"
on public.questions for select
to authenticated
using (
  owner_id = auth.uid()
  or exists (
    select 1
    from public.quiz_sets s
    where s.id = questions.set_id and s.is_public
  )
);

create policy "questions_select_public_anon"
on public.questions for select
to anon
using (
  exists (
    select 1
    from public.quiz_sets s
    where s.id = questions.set_id and s.is_public
  )
);

create policy "questions_insert_own"
on public.questions for insert
to authenticated
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.quiz_sets s
    where s.id = set_id and s.owner_id = auth.uid()
  )
);

create policy "questions_update_own"
on public.questions for update
to authenticated
using (owner_id = auth.uid())
with check (
  owner_id = auth.uid()
  and exists (
    select 1
    from public.quiz_sets s
    where s.id = set_id and s.owner_id = auth.uid()
  )
);

create policy "questions_delete_own"
on public.questions for delete
to authenticated
using (owner_id = auth.uid());

create policy "sessions_select_own"
on public.practice_sessions for select
to authenticated
using (user_id = auth.uid());

create policy "sessions_insert_own"
on public.practice_sessions for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.quiz_sets s
    where s.id = set_id
      and (s.owner_id = auth.uid() or s.is_public)
  )
);

create policy "sessions_update_own"
on public.practice_sessions for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "sessions_delete_own"
on public.practice_sessions for delete
to authenticated
using (user_id = auth.uid());

create policy "attempts_select_own"
on public.attempts for select
to authenticated
using (user_id = auth.uid());

create policy "attempts_insert_own"
on public.attempts for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.practice_sessions s
    where s.id = session_id and s.user_id = auth.uid()
  )
);

create policy "marks_select_own"
on public.question_marks for select
to authenticated
using (user_id = auth.uid());

create policy "marks_insert_own"
on public.question_marks for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.questions q
    join public.quiz_sets s on s.id = q.set_id
    where q.id = question_id
      and (q.owner_id = auth.uid() or s.is_public)
  )
);

create policy "marks_delete_own"
on public.question_marks for delete
to authenticated
using (user_id = auth.uid());

-- Explicit table privileges. RLS still restricts every row operation.
grant usage on schema public to anon, authenticated;

grant select on table public.quiz_sets to anon;
grant select on table public.questions to anon;

grant select, insert, update, delete on table public.quiz_sets to authenticated;
grant select, insert, update, delete on table public.questions to authenticated;
grant select, insert, update, delete on table public.practice_sessions to authenticated;
grant select, insert on table public.attempts to authenticated;
grant select, insert, delete on table public.question_marks to authenticated;
