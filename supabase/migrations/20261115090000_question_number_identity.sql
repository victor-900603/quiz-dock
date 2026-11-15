-- Question identity by question_number, plus practice state resync.

do $$
declare
  v_null_count bigint;
  v_duplicates text;
begin
  select count(*)
  into v_null_count
  from public.questions
  where question_number is null;

  if v_null_count > 0 then
    raise exception
      'questions.question_number has % null rows; backfill them before applying this migration',
      v_null_count;
  end if;

  select string_agg(
           format('set %s question %s (%s rows)', set_id, question_number, total),
           '; '
         )
  into v_duplicates
  from (
    select set_id, question_number, count(*) as total
    from public.questions
    group by set_id, question_number
    having count(*) > 1
  ) duplicated;

  if v_duplicates is not null then
    raise exception
      'questions has duplicate question_number values; resolve them before applying this migration: %',
      v_duplicates;
  end if;
end;
$$;

alter table public.questions
  alter column question_number set not null;

alter table public.questions
  add constraint questions_set_number_key unique (set_id, question_number);

-- Rebuild the practice state of a set after its questions changed.
-- Keeps answered progress, appends new questions, drops removed ones, and
-- recalculates correctness because answer keys may have changed.
create or replace function public.sync_practice_session(p_set_id uuid)
returns public.practice_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.practice_sessions;
  v_order uuid[];
  v_answered integer;
  v_correct integer;
  v_index integer;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  select *
  into v_session
  from public.practice_sessions
  where user_id = v_user_id
    and set_id = p_set_id
  for update;

  if not found then
    return null;
  end if;

  select array_agg(ordered.question_id order by ordered.position)
  into v_order
  from (
    select current_question.question_id,
           current_question.position
    from unnest(v_session.question_order) with ordinality
           as current_question(question_id, position)
    where exists (
      select 1
      from public.questions q
      where q.id = current_question.question_id
        and q.set_id = p_set_id
    )

    union all

    select added.id,
           v_session.total_questions + row_number() over (order by added.sort_order, added.id)
    from public.questions added
    where added.set_id = p_set_id
      and not (added.id = any (v_session.question_order))
  ) ordered;

  if v_order is null then
    return v_session;
  end if;

  update public.attempts a
  set is_correct =
        (select array(select distinct x from unnest(a.selected) as s(x) order by 1))
        =
        (select array(select distinct y from unnest(q.correct_answers) as c(y) order by 1)),
      updated_at = now()
  from public.questions q
  where q.id = a.question_id
    and a.session_id = v_session.id;

  select count(*)::integer,
         (count(*) filter (where is_correct))::integer
  into v_answered, v_correct
  from public.attempts
  where session_id = v_session.id;

  select coalesce(min(positions.position) - 1, cardinality(v_order))
  into v_index
  from generate_subscripts(v_order, 1) as positions(position)
  where not exists (
    select 1
    from public.attempts a
    where a.session_id = v_session.id
      and a.question_id = v_order[positions.position]
  );

  v_status := case
    when v_answered >= cardinality(v_order) then 'completed'
    else 'in_progress'
  end;

  update public.practice_sessions
  set question_order = v_order,
      total_questions = cardinality(v_order),
      current_index = v_index,
      answered_count = v_answered,
      correct_count = v_correct,
      status = v_status,
      completed_at = case
        when v_status = 'completed' then coalesce(completed_at, now())
        else null
      end,
      updated_at = now()
  where id = v_session.id
  returning * into v_session;

  return v_session;
end;
$$;

grant execute on function public.sync_practice_session(uuid) to authenticated;
