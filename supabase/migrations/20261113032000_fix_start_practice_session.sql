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
  v_session_exists boolean;
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

  v_session_exists := found;

  if v_session_exists and not p_restart then
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

  if v_session_exists then
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
