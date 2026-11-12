-- QuizDock core schema.

create table public.quiz_sets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(btrim(title)) > 0),
  description text,
  topic_labels jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  source_filename text,
  source_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.questions (
  id uuid primary key default gen_random_uuid(),
  set_id uuid not null references public.quiz_sets(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  question_number integer,
  topic text,
  question text not null check (char_length(btrim(question)) > 0),
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_answers text[] not null check (cardinality(correct_answers) >= 1),
  explanation text,
  content_hash text not null,
  sort_order integer not null,
  created_at timestamptz not null default now(),
  unique (set_id, content_hash)
);

create table public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  set_id uuid not null references public.quiz_sets(id) on delete cascade,
  mode text not null check (mode in ('sequential', 'random')),
  status text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  question_order uuid[] not null,
  current_index integer not null default 0 check (current_index >= 0),
  total_questions integer not null check (total_questions > 0),
  answered_count integer not null default 0 check (answered_count >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid not null references public.practice_sessions(id) on delete cascade,
  set_id uuid not null references public.quiz_sets(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  selected text[] not null default '{}'::text[],
  is_correct boolean not null,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  answered_at timestamptz not null default now(),
  unique (session_id, question_id)
);

create table public.question_marks (
  user_id uuid not null references auth.users(id) on delete cascade,
  question_id uuid not null references public.questions(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, question_id)
);

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger quiz_sets_touch_updated_at
before update on public.quiz_sets
for each row execute function public.touch_updated_at();

create trigger practice_sessions_touch_updated_at
before update on public.practice_sessions
for each row execute function public.touch_updated_at();

create index quiz_sets_owner_idx
  on public.quiz_sets(owner_id);

create index quiz_sets_source_hash_idx
  on public.quiz_sets(owner_id, source_hash);

create index questions_set_sort_idx
  on public.questions(set_id, sort_order);

create index questions_owner_idx
  on public.questions(owner_id);

create index sessions_user_status_idx
  on public.practice_sessions(user_id, status, updated_at desc);

create index sessions_set_idx
  on public.practice_sessions(set_id);

create index attempts_user_time_idx
  on public.attempts(user_id, answered_at desc);

create index attempts_user_set_idx
  on public.attempts(user_id, set_id);

create index attempts_session_idx
  on public.attempts(session_id);

create index marks_user_time_idx
  on public.question_marks(user_id, created_at desc);
