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
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Columns from the first version of meetings. The analysis state and summary now live in
-- summaries, and decisions in the decisions table
alter table meetings drop column if exists analysis_state;
alter table meetings drop column if exists summary;
alter table meetings drop column if exists decisions;

-- Makes loading a user's meetings faster
create index if not exists meetings_user_date_idx on meetings (user_id, meeting_date desc, created_at desc);

-- Summaries: one row per analysis run of a meeting.
-- The newest row holds the meeting's current analysis state and summary
create table if not exists summaries (
  id              uuid primary key default gen_random_uuid(),
  meeting_id      uuid not null references meetings (id) on delete cascade,
  model_name      text,
  analysis_state  text not null default 'queued'
                  check (analysis_state in ('queued', 'working', 'done', 'failed', 'rate_limited', 'invalid')),
  summary_text    text check (char_length(summary_text) between 1 and 4000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Makes finding a meeting's newest run faster
create index if not exists summaries_meeting_created_idx on summaries (meeting_id, created_at desc);

-- Decisions made in a meeting
create table if not exists decisions (
  id             uuid primary key default gen_random_uuid(),
  meeting_id     uuid not null references meetings (id) on delete cascade,
  decision_text  text not null check (char_length(decision_text) between 1 and 500),
  created_at     timestamptz not null default now()
);

-- Makes loading a meeting's decisions faster
create index if not exists decisions_meeting_idx on decisions (meeting_id, created_at);

-- Action items found in a meeting. owner and action_date are only ones the transcript states;
-- owner_note and due_note say why a person needs to check them
create table if not exists action_items (
  id                uuid primary key default gen_random_uuid(),
  meeting_id        uuid not null references meetings (id) on delete cascade,
  title             text not null check (char_length(title) between 1 and 300),
  owner             text check (char_length(owner) <= 80),
  owner_note        text check (char_length(owner_note) <= 200),
  action_date       date,
  due_note          text check (char_length(due_note) <= 200),
  transcript_quote  text check (char_length(transcript_quote) <= 300),
  cue_time          text check (char_length(cue_time) <= 12),
  progress_state    text not null default 'todo' check (progress_state in ('todo', 'in_progress', 'done')),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Makes loading a meeting's action items faster
create index if not exists action_items_meeting_idx on action_items (meeting_id, created_at);
