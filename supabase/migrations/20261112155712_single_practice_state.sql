-- P0: one practice state per user and quiz set, with editable answers.

alter table public.practice_sessions
  add constraint practice_sessions_user_set_key unique (user_id, set_id);

alter table public.attempts
  add column updated_at timestamptz not null default now();

create policy "attempts_update_own"
on public.attempts for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

grant update on table public.attempts to authenticated;

create or replace function public.start_practice_session(
  p_set_id uuid,
  p_mode text default 'sequential',
  p_restart boolean default false
)
returns public.practice_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_question_ids uuid[];
  v_session public.practice_sessions;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_mode not in ('sequential', 'random') then
    raise exception 'invalid mode';
  end if;

  if not exists (
    select 1
    from public.quiz_sets s
    where s.id = p_set_id
      and (s.owner_id = v_user_id or s.is_public)
  ) then
    raise exception 'set not found';
  end if;

  select *
  into v_session
  from public.practice_sessions
  where user_id = v_user_id
    and set_id = p_set_id
  for update;

  if found and not p_restart then
    return v_session;
  end if;

  select array_agg(
    q.id
    order by case
      when p_mode = 'random' then random()
      else q.sort_order
    end
  )
  into v_question_ids
  from public.questions q
  where q.set_id = p_set_id;

  if v_question_ids is null or cardinality(v_question_ids) = 0 then
    raise exception 'set has no questions';
  end if;

  if found then
    delete from public.attempts
    where session_id = v_session.id;

    update public.practice_sessions
    set mode = p_mode,
        status = 'in_progress',
        question_order = v_question_ids,
        current_index = 0,
        total_questions = cardinality(v_question_ids),
        answered_count = 0,
        correct_count = 0,
        started_at = now(),
        updated_at = now(),
        completed_at = null
    where id = v_session.id
    returning * into v_session;
  else
    insert into public.practice_sessions (
      user_id,
      set_id,
      mode,
      question_order,
      total_questions
    )
    values (
      v_user_id,
      p_set_id,
      p_mode,
      v_question_ids,
      cardinality(v_question_ids)
    )
    returning * into v_session;
  end if;

  return v_session;
end;
$$;

grant execute on function public.start_practice_session(uuid, text, boolean) to authenticated;

drop function if exists public.submit_answer(uuid, uuid, text[], integer);

create function public.submit_answer(
  p_session_id uuid,
  p_question_id uuid,
  p_selected text[],
  p_duration_ms integer default null
)
returns table (
  is_correct boolean,
  correct_answers text[],
  explanation text,
  already_answered boolean,
  was_updated boolean,
  session_status text,
  current_index integer,
  answered_count integer,
  correct_count integer
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.practice_sessions;
  v_question public.questions;
  v_attempt public.attempts;
  v_selected text[];
  v_correct text[];
  v_is_correct boolean;
  v_question_position integer;
  v_next_index integer;
  v_new_index integer;
  v_new_status text;
  v_answered_count integer;
  v_correct_count integer;
  v_had_attempt boolean := false;
  v_was_updated boolean := false;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_session
  from public.practice_sessions
  where id = p_session_id and user_id = v_user_id
  for update;

  if not found then
    raise exception 'session not found';
  end if;

  if v_session.status = 'abandoned' then
    raise exception 'session abandoned';
  end if;

  select *
  into v_question
  from public.questions
  where id = p_question_id and set_id = v_session.set_id;

  if not found then
    raise exception 'question not found';
  end if;

  select i
  into v_question_position
  from generate_subscripts(v_session.question_order, 1) as i
  where v_session.question_order[i] = p_question_id;

  if v_question_position is null then
    raise exception 'question not in session';
  end if;

  select array(
    select distinct x
    from unnest(coalesce(p_selected, '{}'::text[])) as t(x)
    order by 1
  )
  into v_selected;

  if coalesce(cardinality(v_selected), 0) = 0 then
    raise exception 'no selection';
  end if;

  select array(
    select distinct x
    from unnest(v_question.correct_answers) as t(x)
    order by 1
  )
  into v_correct;

  v_is_correct := v_selected = v_correct;

  select *
  into v_attempt
  from public.attempts
  where session_id = p_session_id and question_id = p_question_id
  for update;

  v_had_attempt := found;

  if v_had_attempt then
    v_was_updated :=
      (v_attempt.selected is distinct from v_selected)
      or (v_attempt.is_correct is distinct from v_is_correct);

    update public.attempts
    set selected = v_selected,
        is_correct = v_is_correct,
        duration_ms = coalesce(p_duration_ms, v_attempt.duration_ms),
        updated_at = now()
    where id = v_attempt.id;

    v_new_index := v_session.current_index;
  else
    insert into public.attempts (
      user_id,
      session_id,
      set_id,
      question_id,
      selected,
      is_correct,
      duration_ms
    )
    values (
      v_user_id,
      p_session_id,
      v_session.set_id,
      p_question_id,
      v_selected,
      v_is_correct,
      p_duration_ms
    );

    select candidate.i
    into v_next_index
    from generate_series(1, v_session.total_questions) as candidate(i)
    where not exists (
      select 1
      from public.attempts a
      where a.session_id = p_session_id
        and a.question_id = v_session.question_order[candidate.i]
    )
    order by mod(
      candidate.i - v_question_position + v_session.total_questions,
      v_session.total_questions
    )
    limit 1;

    v_new_index := coalesce(v_next_index - 1, v_session.total_questions);
  end if;

  select
    count(*)::integer,
    (count(*) filter (where is_correct))::integer
  into v_answered_count, v_correct_count
  from public.attempts
  where session_id = p_session_id;

  v_new_status := case
    when v_answered_count >= v_session.total_questions then 'completed'
    else 'in_progress'
  end;

  update public.practice_sessions
  set current_index = v_new_index,
      answered_count = v_answered_count,
      correct_count = v_correct_count,
      status = v_new_status,
      completed_at = case
        when v_new_status = 'completed' then coalesce(completed_at, now())
        else null
      end,
      updated_at = now()
  where id = p_session_id;

  return query
    select
      v_is_correct,
      v_question.correct_answers,
      v_question.explanation,
      v_had_attempt,
      v_was_updated,
      v_new_status,
      v_new_index,
      v_answered_count,
      v_correct_count;
end;
$$;

grant execute on function public.submit_answer(uuid, uuid, text[], integer) to authenticated;
