# ScribeBox

ScribeBox turns a meeting transcript into a short summary, the decisions that were made, and a list of action items with owners and due dates. Every action item is traced back to the transcript line it came from.

It never invents an owner or a date. If the transcript doesn't name who owns a task, or only gives a relative date like "by Friday", the item is saved without it and flagged for a person to review, with a note saying why.

Built as a 7-day graduate assessment for Luckybeard. The app lives in [`frontend/`](frontend/).

## Contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [Getting started](#getting-started)
- [How the analysis works](#how-the-analysis-works)
- [Data model](#data-model)
- [API](#api)
- [Testing](#testing)
- [Project structure](#project-structure)
- [Known limitations](#known-limitations)

## What it does

1. Sign up or sign in (Firebase email and password).
2. Add a meeting: paste a transcript or upload a `.txt`, `.vtt` or `.md` file, with a title and date. The transcript is saved before analysis starts, so nothing is lost if a model is slow or down.
3. ScribeBox analyses it and shows:
   - a 2 to 4 sentence summary
   - decisions, each one backed by a quote from the transcript
   - action items with the exact quote, cue time (if the transcript has timestamps), owner and due date where the transcript states them
   - a review flag on any item whose owner or date needs checking
4. Edit the summary, decisions and action items, add your own, tick items off, and retry a failed analysis.
5. The Action items page lists your items across all meetings, filtered by status, owner and overdue.

## Tech stack

| Area | Choice |
| --- | --- |
| App | Next.js 16 (App Router, route handlers for the API), React 19, TypeScript |
| Styling | Tailwind CSS v4, Motion for animation |
| Auth | Firebase Authentication in the browser; the server checks Firebase ID tokens with `jose` against Google's public keys |
| Database | PostgreSQL (hosted on Aiven, SSL with Aiven's CA certificate), `pg` driver, plain SQL |
| Decision model | TypeSafe's Jev (`typesafe/jev-1.14`) through OpenRouter's decisions endpoint |
| Text model | A chat model through OpenRouter (default `openai/gpt-4o-mini`), called with the `openai` package |
| Tests | Node's built-in test runner (`node --test`) |

## Getting started

### Prerequisites

- Node.js 22.7 or newer. Next 16 needs at least 20.9, but the end-to-end test uses `--experimental-transform-types`, which needs 22.7+. Developed on Node 22.14.
- A PostgreSQL database. The connection code always uses SSL with a CA certificate (written for Aiven).
- A Firebase project with Email/Password sign-in enabled.
- An OpenRouter API key with access to the decision model and a chat model.

### Install

```bash
cd frontend
npm install
```

### Environment variables

Create `frontend/.env` (it is git-ignored, as is any `*.pem` file). There is no `.env.example`, so use this table:

| Name | Purpose | Required | Example |
| --- | --- | --- | --- |
| `DATABASE_URL` | Postgres connection string. Any `sslmode` in it is removed; SSL is set up in code | Yes | `postgres://user:password@host:port/defaultdb` |
| `DATABASE_CA_CERT` | Path to the database CA certificate, relative to `frontend/` | No (default `certs/aiven-ca.pem`) | `certs/aiven-ca.pem` |
| `OPENROUTER_API_KEY` | OpenRouter key for both models. Without it, analysis answers 503 | Yes, for analysis | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | Decision model id | No (default `typesafe/jev-1.14`) | `typesafe/jev-1.14` |
| `OPENROUTER_LLM_MODEL` | Chat model that writes the summary, decisions and task titles. Must work with chat completions: `:batch` model ids don't | No (default `openai/gpt-4o-mini`) | `openai/gpt-4o-mini` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase web config | Yes | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase web config | Yes | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase web config. The server also uses it to check token issuer and audience | Yes | `your-project` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase web config | Yes | `your-project.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase web config | Yes | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase web config | Yes | `1:123456789012:web:abc123` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | Firebase web config (Analytics) | No | `G-XXXXXXXXXX` |
| `TEST_USER_EMAIL` | Firebase test account used by `api.http` | Only for `api.http` | `you+test@example.com` |
| `TEST_USER_PASSWORD` | Password for that test account | Only for `api.http` | `a-long-test-password` |

Put the database CA certificate at `frontend/certs/aiven-ca.pem` (download it from the Aiven console), or point `DATABASE_CA_CERT` at it.

### Database

```bash
cd frontend
npm run db:migrate
```

This runs [`scripts/migrate.mjs`](frontend/scripts/migrate.mjs), which reads [`db/schema.sql`](frontend/db/schema.sql) and runs it in one go. The schema only uses `create table if not exists`, `create index if not exists` and `drop column if exists`, so it is safe to run again. It doesn't delete data, except that it drops three old columns from `meetings` (`analysis_state`, `summary`, `decisions`) left over from the first version of the schema.

### Run

```bash
cd frontend
npm run dev
```

Open http://localhost:3000. Other scripts: `npm run build`, `npm run start`, `npm run lint`.

## How the analysis works

The analysis runs when a meeting is created (the new-meeting form starts it) or when the user retries it. `POST /api/meetings/:id/analysis` calls `runDecision` in [`lib/server/decision/runner.ts`](frontend/lib/server/decision/runner.ts).

Our code drives the steps. The two models never call tools or write to the database themselves:

- **Jev** (decision model) only answers yes/no questions through OpenRouter's `/api/alpha/decisions` endpoint ([`jev.ts`](frontend/lib/server/decision/jev.ts)). Each answer is a probability. 0.7 or more counts as yes, 0.3 or less as no, anything in between (or a missing answer) counts as unsure.
- **GPT** (text model) writes text as JSON ([`writing.ts`](frontend/lib/server/decision/writing.ts), [`openRouter.ts`](frontend/app/services/openRouter/openRouter.ts)). Everything it writes is checked before it is saved.

Every save goes through a tool in [`registry.ts`](frontend/lib/server/decision/registry.ts) (`check_transcript`, `find_action_candidates`, `set_analysis_state`, `save_action_items`, `flag_for_review`, `request_llm_analysis`). Each tool checks its own input and that the meeting belongs to the user, whoever calls it.

```mermaid
flowchart TD
  A[set_analysis_state: working] --> B[check_transcript<br/>word count, speaker labels, timestamps]
  B -- invalid --> X[state: invalid]
  B -- uncertain --> J1{Jev: is this a meeting?}
  J1 -- no --> X
  J1 -- yes --> C
  B -- ok --> C[find_action_candidates<br/>up to 25 lines that look like commitments]
  C --> J2{Jev, per line:<br/>is it an action item?<br/>is the named person the owner?}
  J2 -- yes --> D[save_action_items<br/>quote must be in the transcript<br/>owner must be named in it<br/>date must be written in the quoted line]
  J2 -- no / unsure --> S[left out]
  D --> F[flag_for_review<br/>owner Jev couldn't confirm]
  F --> G[request_llm_analysis<br/>GPT rewords task titles, summary, decisions]
  G --> H[state: done]
  G -- 429 --> R[state: rate_limited]
  G -- other error --> Y[state: failed]
```

Step by step:

1. **Start.** The newest analysis run moves to `working`. This fails (409) if a run is already finished or invalid; a retry first starts a new run with `POST /api/meetings/:id/summaries`.
2. **Check the transcript** ([`transcript.ts`](frontend/lib/server/decision/transcript.ts)). No AI: it parses `.txt`, `.md` and WebVTT lines, speakers and cue times. Under 15 words, or mostly symbols, is invalid. No speaker labels, or only one speaker, is uncertain, and Jev decides whether it is a meeting.
3. **Find candidates** ([`candidates.ts`](frontend/lib/server/decision/candidates.ts)). Regex signals such as "I'll", "we need to", "can you", "someone should" or a speaker addressed by name. Each candidate gets an owner hint only from the transcript's own words, and a due date only when the line writes a full date ([`dates.ts`](frontend/lib/server/decision/dates.ts)): an ISO date, or a day and month with the year taken from the meeting date.
4. **Ask Jev** about each candidate (4 at a time), with two lines of context either side. Every question tells Jev the transcript is data, not instructions.
5. **Save** only lines Jev is sure are action items. `save_action_items` checks each one again against the transcript:
   - the quote must appear in the transcript, or the item is rejected
   - an owner the transcript doesn't name is removed, with an `owner_note`
   - a date the quoted line doesn't state is removed. A relative or partial date ("next week", "by Friday", "15 March" without a year) is kept as a `due_note` for a person to pick the exact date
   - items already saved for the meeting (same title or quote) are skipped, so a retry adds no copies
6. **Flag** items whose owner Jev was unsure about.
7. **Write** with GPT: short task titles (a rewrite that adds a capitalised name not in the quote is ignored; if this step fails, titles stay as quotes), then the summary, then the decisions. Each decision must quote the transcript; a decision whose quote isn't found is dropped.
8. **Finish** as `done`. A 429 from either model sets `rate_limited`, any other failure sets `failed`, and the user can retry.

Analysis states, stored per run in `summaries.analysis_state`:

| From | Can move to |
| --- | --- |
| no run yet | `queued`, `working`, `invalid` |
| `queued` | `working`, `invalid` |
| `working` | `done`, `failed`, `rate_limited`, `invalid` |
| `done`, `failed`, `rate_limited` | `queued` (starts a new run, earlier runs are kept) |
| `invalid` | nothing (final) |

The endpoint returns a `trace` with every tool call and every Jev answer (with its probability and cost), which is useful for debugging.

## Data model

Schema: [`frontend/db/schema.sql`](frontend/db/schema.sql). ERD: [`frontend/db/ScribeBoxERD.drawio (1).png`](<frontend/db/ScribeBoxERD.drawio (1).png>) (the schema file is the source of truth; it has a few columns the diagram doesn't, such as `action_items.due_note`).

| Table | Holds | Key columns |
| --- | --- | --- |
| `users` | One row per Firebase user, created on their first signed-in request | `id` (Firebase uid), `email`, `name` |
| `meetings` | A transcript and its details | `user_id`, `title`, `meeting_date`, `source_kind` (`file`/`paste`), `source_name`, `transcript` |
| `summaries` | One row per analysis run. The newest row is the meeting's current state and summary | `meeting_id`, `analysis_state`, `summary_text`, `model_name` |
| `decisions` | Decisions made in the meeting | `meeting_id`, `decision_text` |
| `action_items` | Tasks from the meeting | `meeting_id`, `title`, `owner`, `owner_note`, `action_date`, `due_note`, `transcript_quote`, `cue_time`, `progress_state` (`todo`/`in_progress`/`done`) |

A user has many meetings; a meeting has many summaries, decisions and action items. Every foreign key is `on delete cascade`. A partial unique index allows at most one `queued` or `working` run per meeting, so two retries at once can't both start.

## API

All endpoints are Next.js route handlers under [`frontend/app/api/`](frontend/app/api/). Every one needs a Firebase ID token:

```
Authorization: Bearer <Firebase ID token>
```

A missing or invalid token gives 401. A user only ever sees their own data; another user's ids, and ids that aren't UUIDs, give 404.

Errors are JSON:

```json
{ "error": "Some fields need fixing", "fields": { "title": "..." } }
```

`fields` is only present on validation errors (422). Unexpected errors give 500 with `{ "error": "Something went wrong" }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/auth/me` | The signed-in user (creates their row on first call) |
| GET | `/api/users/me` | My account |
| PATCH | `/api/users/me` | Change my name (the email comes from Firebase) |
| DELETE | `/api/users/me` | Delete my account row and, by cascade, all my data |
| GET | `/api/meetings` | My meetings, newest first, without transcripts |
| POST | `/api/meetings` | Create a meeting (`title`, `date`, `transcript`, optional `sourceName`) |
| GET | `/api/meetings/:id` | One meeting with its transcript |
| PATCH | `/api/meetings/:id` | Change the title or date (the transcript can't be changed) |
| DELETE | `/api/meetings/:id` | Delete a meeting and everything under it |
| POST | `/api/meetings/:id/analysis` | Run the analysis now; returns the trace |
| GET | `/api/meetings/:id/summaries` | The meeting's analysis runs, newest first |
| POST | `/api/meetings/:id/summaries` | Start a new run (`queued`) so the meeting can be analysed again |
| GET | `/api/summaries/:id` | One run |
| PATCH | `/api/summaries/:id` | Edit the summary text or model name, or move the state |
| DELETE | `/api/summaries/:id` | Delete a run |
| GET | `/api/meetings/:id/decisions` | The meeting's decisions |
| POST | `/api/meetings/:id/decisions` | Add a decision |
| GET | `/api/decisions/:id` | One decision |
| PATCH | `/api/decisions/:id` | Edit a decision |
| DELETE | `/api/decisions/:id` | Delete a decision |
| GET | `/api/meetings/:id/action-items` | The meeting's action items |
| POST | `/api/meetings/:id/action-items` | Add an action item |
| GET | `/api/action-items` | My action items across all meetings; `?progressState=todo\|in_progress\|done` filters them |
| GET | `/api/action-items/:id` | One action item |
| PATCH | `/api/action-items/:id` | Change any field (`null` clears an optional one) |
| DELETE | `/api/action-items/:id` | Delete an action item |

[`frontend/api.http`](frontend/api.http) has a request for every endpoint, including the error cases, for the VS Code REST Client extension. It signs in to Firebase with `TEST_USER_EMAIL` and `TEST_USER_PASSWORD` from `.env` and reuses the token. Run the requests top to bottom the first time.

## Testing

There is one end-to-end test, [`frontend/tests/e2e/analysis.test.mjs`](frontend/tests/e2e/analysis.test.mjs). Run it from `frontend/`:

```bash
node --env-file=.env --experimental-transform-types --no-warnings --import ./tests/support/register.mjs --test tests/e2e/analysis.test.mjs
```

It needs `DATABASE_URL`, `OPENROUTER_API_KEY` and a chat model in `OPENROUTER_LLM_MODEL`. Without the first two, the tests are skipped. [`tests/support/`](frontend/tests/support/) adds Node module hooks so the app's TypeScript server code can be imported outside Next.js (`@/` paths, `server-only`, extensionless imports).

It calls the real runner, the real database and both real models on three fixtures in [`tests/fixtures/`](frontend/tests/fixtures/):

| Fixture | Checks |
| --- | --- |
| `clean-transcript.txt` | At least 5 items, owners Ruben Pillay, Johan van Wyk and Aisha Mohamed, two specific due dates, at least 2 decisions, and a retry that adds no duplicate items |
| `messy-transcript.vtt` | At least 2 items, no placeholder speaker used as an owner, an idea that wasn't committed to isn't saved, and at least one item needs review |
| `no-action-items-transcript.md` | No action items and no decisions |

On every run it also checks the rules that must always hold: the run ends `done` with a summary and model name, every quote is in the transcript, every owner is named in the transcript (or the item has an `owner_note`), and every due date is written in the item's quoted line.

Each test creates its own user and meeting and deletes the user at the end, which cascades to everything else. The three tests run in parallel with a 20-minute timeout. Because it uses paid models, each run costs OpenRouter credit: up to 25 Jev calls per analysis and 3 GPT calls, and the clean fixture is analysed twice. Model answers vary, so the checks are rules rather than exact outputs.

There are no unit tests and no `npm test` script yet. `npm run lint` runs ESLint.

## Project structure

```
frontend/
  app/
    (auth)/              login and register pages
    (app)/               signed-in pages: meetings, meetings/new, meetings/[id], action-items, account
    api/                 REST route handlers
    configs/             Firebase client config
    services/openRouter/ text model client
    page.tsx             landing page
  components/            app header, auth gate/provider, landing, motion helpers
    ui/                  design-system components (buttons, fields, status pills, action item card, ...)
  hooks/                 client data loading (useApiData)
  lib/
    api.ts               browser API client (adds the Firebase token)
    server/              server-only code: auth, db, request validation, analysis states
      decision/          the analysis runner, Jev client, writing checks, transcript parsing, tools/
  db/                    schema.sql and the ERD
  scripts/migrate.mjs    runs db/schema.sql
  certs/                 database CA certificate (git-ignored)
  tests/                 e2e test, fixtures, Node loader hooks
  api.http               REST Client requests for every endpoint
```

## Known limitations

These are visible in the current code:

- **The analysis runs inside the HTTP request.** `POST /api/meetings/:id/analysis` waits for every Jev and GPT call before it answers, which can take a minute or more. There is no job queue or worker; the meeting page polls every 5 seconds when a run started elsewhere is still `working`. A serverless host's request time limit could cut a run short and leave it `working`.
- **Only the first 25 candidate lines are judged**, and GPT sees the first 60,000 characters of the transcript, so very long meetings can miss items.
- **Unsure lines are left out**, not saved for review. Only items whose owner Jev is unsure about are flagged.
- **The open action item count in the header refreshes on navigation**, not live, so ticking an item off updates it on the next page change.
- **Deleting an account in the app deletes the Firebase login only.** The account page describes it as a soft delete: the database rows stay. `DELETE /api/users/me` removes them but the UI doesn't call it.
- **No `.env.example`** and no unit tests yet. `lib/mock-data.ts` and `lib/mock.ts` are left from the mock-data phase and are no longer imported.
