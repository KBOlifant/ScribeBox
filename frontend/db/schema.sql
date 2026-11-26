-- Database tables. Run with: npm run db:migrate

-- Users (the id is the Firebase user id)
create table if not exists users (
  id          text primary key,
  email       text not null,
  name        text,
  created_at  timestamptz not null default now()
);

-- Meetings
create table if not exists meetings (
  id              uuid primary key default gen_random_uuid(),
  user_id         text not null references users (id) on delete cascade,
  title           text not null check (char_length(title) between 1 and 120),
  meeting_date    date not null,
  source_kind     text not null default 'paste' check (source_kind in ('file', 'paste')),
  source_name     text,
  transcript      text not null,
  analysis_state  text not null default 'queued'
                  check (analysis_state in ('queued', 'working', 'done', 'failed', 'rate_limited', 'invalid')),
  summary         text,
  decisions       jsonb not null default '[]'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Makes loading a user's meetings faster
create index if not exists meetings_user_date_idx on meetings (user_id, meeting_date desc, created_at desc);
