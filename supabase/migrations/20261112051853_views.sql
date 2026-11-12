-- Statistics views. All views inherit RLS from the underlying tables.

create or replace view public.v_set_stats
with (security_invoker = true)
as
select
  a.user_id,
  a.set_id,
  count(*)::int as answered_count,
  count(*) filter (where a.is_correct)::int as correct_count,
  round(
    100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0),
    1
  ) as accuracy,
  max(a.answered_at) as last_answered_at
from public.attempts a
group by a.user_id, a.set_id;

create or replace view public.v_topic_stats
with (security_invoker = true)
as
select
  a.user_id,
  a.set_id,
  q.topic,
  count(*)::int as answered_count,
  count(*) filter (where a.is_correct)::int as correct_count,
  round(
    100.0 * count(*) filter (where a.is_correct) / nullif(count(*), 0),
    1
  ) as accuracy
from public.attempts a
join public.questions q on q.id = a.question_id
group by a.user_id, a.set_id, q.topic;

create or replace view public.v_daily_activity
with (security_invoker = true)
as
select
  a.user_id,
  (a.answered_at at time zone 'Asia/Taipei')::date as day,
  count(*)::int as answered_count,
  count(*) filter (where a.is_correct)::int as correct_count
from public.attempts a
group by a.user_id, day;

create or replace view public.v_session_summary
with (security_invoker = true)
as
select
  s.id,
  s.user_id,
  s.set_id,
  s.mode,
  s.status,
  s.total_questions,
  s.answered_count,
  s.correct_count,
  case
    when s.answered_count = 0 then 0
    else round(100.0 * s.correct_count / s.answered_count, 1)
  end as accuracy,
  s.started_at,
  s.updated_at,
  s.completed_at
from public.practice_sessions s;

grant select on public.v_set_stats to authenticated;
grant select on public.v_topic_stats to authenticated;
grant select on public.v_daily_activity to authenticated;
grant select on public.v_session_summary to authenticated;
