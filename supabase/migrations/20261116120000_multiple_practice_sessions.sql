-- Keep every finished practice session as history. Only one session per set
-- may stay in progress, and the start options decide its scope and size.

alter table public.practice_sessions
  drop constraint if exists practice_sessions_user_set_key;

alter table public.practice_sessions
  add column if not exists source_session_id uuid
    references public.practice_sessions (id) on delete set null;

create index if not exists practice_sessions_source_idx
  on public.practice_sessions (source_session_id);

create unique index if not exists practice_sessions_active_set_key
  on public.practice_sessions (user_id, set_id)
  where status = 'in_progress';

drop function if exists public.start_practice_session(uuid, text, boolean);

create or replace function public.start_practice_session(
  p_set_id uuid,
  p_mode text default 'sequential',
  p_limit integer default null,
  p_source_session_id uuid default null
)
returns public.practice_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.practice_sessions;
  v_question_ids uuid[];
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  if p_mode not in ('sequential', 'random') then
    raise exception 'invalid mode';
  end if;

  if p_limit is not null and p_limit < 1 then
    raise exception 'invalid limit';
  end if;

  select *
  into v_session
  from public.practice_sessions
  where user_id = v_user_id
    and set_id = p_set_id
    and status = 'in_progress'
  for update;

  if found then
    return v_session;
  end if;

  if not exists (
    select 1
    from public.quiz_sets s
    where s.id = p_set_id
      and (s.owner_id = v_user_id or s.is_public)
  ) then
    raise exception 'set not found';
  end if;

  if p_source_session_id is not null then
    if not exists (
      select 1
      from public.practice_sessions s
      where s.id = p_source_session_id
        and s.user_id = v_user_id
        and s.set_id = p_set_id
    ) then
      raise exception 'source session not found';
    end if;
  end if;

  if p_mode = 'random' then
    select array_agg(picked.id order by picked.random_order)
    into v_question_ids
    from (
      select q.id, random() as random_order
      from public.questions q
      where q.set_id = p_set_id
        and (
          p_source_session_id is null
          or exists (
            select 1
            from public.attempts a
            where a.session_id = p_source_session_id
              and a.question_id = q.id
              and a.is_correct = false
          )
        )
      order by random_order
      limit coalesce(p_limit, 2147483647)
    ) picked;
  else
    select array_agg(picked.id order by picked.sort_order, picked.id)
    into v_question_ids
    from (
      select q.id, q.sort_order
      from public.questions q
      where q.set_id = p_set_id
        and (
          p_source_session_id is null
          or exists (
            select 1
            from public.attempts a
            where a.session_id = p_source_session_id
              and a.question_id = q.id
              and a.is_correct = false
          )
        )
      order by q.sort_order, q.id
      limit coalesce(p_limit, 2147483647)
    ) picked;
  end if;

  if v_question_ids is null then
    if p_source_session_id is not null then
      raise exception 'source session has no wrong answers';
    end if;

    raise exception 'set has no questions';
  end if;

  insert into public.practice_sessions (
    user_id,
    set_id,
    mode,
    question_order,
    total_questions,
    source_session_id
  )
  values (
    v_user_id,
    p_set_id,
    p_mode,
    v_question_ids,
    cardinality(v_question_ids),
    p_source_session_id
  )
  returning * into v_session;

  return v_session;
end;
$$;

grant execute on function public.start_practice_session(uuid, text, integer, uuid) to authenticated;

-- Rebuild every practice session of a set after its questions changed.
-- Finished sessions stay finished so a manual finish is never undone.
create or replace function public.sync_practice_session(p_set_id uuid)
returns public.practice_sessions
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_session public.practice_sessions;
  v_result public.practice_sessions;
  v_order uuid[];
  v_answered integer;
  v_correct integer;
  v_index integer;
  v_status text;
begin
  if v_user_id is null then
    raise exception 'not authenticated';
  end if;

  for v_session in
    select *
    from public.practice_sessions
    where user_id = v_user_id
      and set_id = p_set_id
    for update
  loop
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
      continue;
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
      when v_session.status = 'completed' then 'completed'
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
    returning * into v_result;
  end loop;

  return v_result;
end;
$$;

grant execute on function public.sync_practice_session(uuid) to authenticated;
