-- RLS smoke test for the P0 schema.
--
-- This script is intended to be run manually in the Supabase SQL Editor.
-- 1. Create an owner account and a tester account in Authentication > Users.
-- 2. Replace OWNER_UUID and TESTER_UUID with the two auth.users.id values.
-- 3. Run the whole script. It ends with rollback, so no test data remains.
--
-- The script uses fixed UUIDs for test rows. Because everything runs inside a
-- transaction and is rolled back, those UUIDs do not collide with real data.

begin;

-- Owner session.
set local role authenticated;
set local request.jwt.claims = '{"sub":"OWNER_UUID","role":"authenticated"}';

insert into public.quiz_sets (id, owner_id, title, is_public)
values
  ('11111111-1111-1111-1111-111111111111', auth.uid(), 'RLS private set', false),
  ('22222222-2222-2222-2222-222222222222', auth.uid(), 'RLS public set', true);

insert into public.questions (
  id, set_id, owner_id, question, options, correct_answers, content_hash, sort_order
)
values
  (
    '33333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    auth.uid(),
    'Private question',
    '["A"]'::jsonb,
    array['A'],
    'rls-private-question',
    1
  ),
  (
    '44444444-4444-4444-4444-444444444444',
    '22222222-2222-2222-2222-222222222222',
    auth.uid(),
    'Public question',
    '["A"]'::jsonb,
    array['A'],
    'rls-public-question',
    1
  );

do $$
begin
  if (select count(*) from public.quiz_sets
      where id in (
        '11111111-1111-1111-1111-111111111111',
        '22222222-2222-2222-2222-222222222222'
      )) <> 2 then
    raise exception 'owner should see both sets';
  end if;

  if (select count(*) from public.questions
      where id in (
        '33333333-3333-3333-3333-333333333333',
        '44444444-4444-4444-4444-444444444444'
      )) <> 2 then
    raise exception 'owner should see both questions';
  end if;
end $$;

insert into public.practice_sessions (
  id, user_id, set_id, mode, question_order, total_questions
)
values (
  '55555555-5555-5555-5555-555555555555',
  auth.uid(),
  '11111111-1111-1111-1111-111111111111',
  'sequential',
  array['33333333-3333-3333-3333-333333333333']::uuid[],
  1
);

insert into public.attempts (
  id, user_id, session_id, set_id, question_id, selected, is_correct
)
values (
  '66666666-6666-6666-6666-666666666666',
  auth.uid(),
  '55555555-5555-5555-5555-555555555555',
  '11111111-1111-1111-1111-111111111111',
  '33333333-3333-3333-3333-333333333333',
  array['A'],
  true
);

insert into public.question_marks (user_id, question_id)
values (auth.uid(), '33333333-3333-3333-3333-333333333333');

-- Tester session: public rows only, no owner-owned sessions, attempts, or marks.
set local request.jwt.claims = '{"sub":"TESTER_UUID","role":"authenticated"}';

do $$
begin
  if exists (select 1 from public.quiz_sets
             where id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'tester saw private set';
  end if;

  if not exists (select 1 from public.quiz_sets
                 where id = '22222222-2222-2222-2222-222222222222') then
    raise exception 'tester cannot see public set';
  end if;

  if exists (select 1 from public.questions
             where id = '33333333-3333-3333-3333-333333333333') then
    raise exception 'tester saw private question';
  end if;

  if not exists (select 1 from public.questions
                 where id = '44444444-4444-4444-4444-444444444444') then
    raise exception 'tester cannot see public question';
  end if;

  if exists (select 1 from public.practice_sessions
             where id = '55555555-5555-5555-5555-555555555555') then
    raise exception 'tester saw owner session';
  end if;

  if exists (select 1 from public.attempts
             where id = '66666666-6666-6666-6666-666666666666') then
    raise exception 'tester saw owner attempt';
  end if;

  if exists (select 1 from public.question_marks
             where user_id = 'OWNER_UUID'
               and question_id = '33333333-3333-3333-3333-333333333333') then
    raise exception 'tester saw owner mark';
  end if;
end $$;

do $$
begin
  begin
    insert into public.questions (
      set_id, owner_id, question, options, correct_answers, content_hash, sort_order
    )
    values (
      '11111111-1111-1111-1111-111111111111',
      auth.uid(),
      'Injected question',
      '["A"]'::jsonb,
      array['A'],
      'rls-injected-question',
      2
    );
    raise exception 'tester inserted question into private set';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.attempts (
      user_id, session_id, set_id, question_id, selected, is_correct
    )
    values (
      auth.uid(),
      '55555555-5555-5555-5555-555555555555',
      '11111111-1111-1111-1111-111111111111',
      '33333333-3333-3333-3333-333333333333',
      array['A'],
      true
    );
    raise exception 'tester inserted attempt into owner session';
  exception when insufficient_privilege then
    null;
  end;

  begin
    insert into public.question_marks (user_id, question_id)
    values (auth.uid(), '33333333-3333-3333-3333-333333333333');
    raise exception 'tester marked private question';
  exception when insufficient_privilege then
    null;
  end;
end $$;

-- Tester may mark a question that belongs to a public set.
insert into public.question_marks (user_id, question_id)
values (auth.uid(), '44444444-4444-4444-4444-444444444444');

-- Anonymous visitors may read public rows only.
reset role;
set local role anon;
set local request.jwt.claims = '{"role":"anon"}';

do $$
begin
  if exists (select 1 from public.quiz_sets
             where id = '11111111-1111-1111-1111-111111111111') then
    raise exception 'anon saw private set';
  end if;

  if not exists (select 1 from public.quiz_sets
                 where id = '22222222-2222-2222-2222-222222222222') then
    raise exception 'anon cannot see public set';
  end if;

  if not exists (select 1 from public.questions
                 where id = '44444444-4444-4444-4444-444444444444') then
    raise exception 'anon cannot see public question';
  end if;
end $$;

rollback;
