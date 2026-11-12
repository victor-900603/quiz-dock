-- Practice session RPCs.

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

  if p_restart then
    update public.practice_sessions
    set status = 'abandoned', updated_at = now()
    where user_id = v_user_id
      and set_id = p_set_id
      and status = 'in_progress';
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

  return v_session;
end;
$$;

create or replace function public.submit_answer(
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
  session_status text,
  current_index integer
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
  v_new_index integer;
  v_question_position integer;
  v_next_index integer;
  v_new_status text;
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

  select *
  into v_attempt
  from public.attempts
  where session_id = p_session_id and question_id = p_question_id;

  if found then
    return query
      select
        v_attempt.is_correct,
        v_question.correct_answers,
        v_question.explanation,
        true,
        v_session.status,
        v_session.current_index;
    return;
  end if;

  if v_session.status <> 'in_progress' then
    raise exception 'session not in progress';
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
  v_new_status := case
    when v_new_index >= v_session.total_questions then 'completed'
    else 'in_progress'
  end;

  update public.practice_sessions
  set current_index = v_new_index,
      answered_count = answered_count + 1,
      correct_count = correct_count + case when v_is_correct then 1 else 0 end,
      status = v_new_status,
      completed_at = case when v_new_status = 'completed' then now() else null end,
      updated_at = now()
  where id = p_session_id;

  return query
    select
      v_is_correct,
      v_question.correct_answers,
      v_question.explanation,
      false,
      v_new_status,
      v_new_index;
end;
$$;

grant execute on function public.start_practice_session(uuid, text, boolean) to authenticated;
grant execute on function public.submit_answer(uuid, uuid, text[], integer) to authenticated;
