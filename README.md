# ScribeBox
[Demo Video](https://drive.google.com/file/d/1jCERvYBEnWCKHGlEUUl01G3biypE6S4f/view?usp=sharing)

ScribeBox turns a meeting transcript into a summary, the decisions made, and action items with owners and due dates, each traced back to the line it came from. It never invents an owner or a date: anything the transcript doesn't state is flagged for review instead.

![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)
![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Aiven-4169E1?logo=postgresql&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-Auth-FFCA28?logo=firebase&logoColor=black)
![OpenRouter](https://img.shields.io/badge/OpenRouter-Jev_%2B_GPT-6467F2)
![Electron](https://img.shields.io/badge/Electron-desktop-47848F?logo=electron&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-22.7%2B-339933?logo=nodedotjs&logoColor=white)

## Getting started

You need Node.js 22.7+, a PostgreSQL database (SSL with a CA certificate, written for Aiven), a Firebase project with Email/Password sign-in, and an OpenRouter API key.

```bash
cd frontend
npm install
npm run db:migrate   # creates the tables from db/schema.sql; safe to run again
npm run dev          # http://localhost:3000
```

Put the database CA certificate at `frontend/certs/aiven-ca.pem`.

### Environment variables

Create `frontend/.env`:

| Name | Required | Example |
| --- | --- | --- |
| `DATABASE_URL` | Yes | `postgres://user:password@host:port/defaultdb` |
| `DATABASE_CA_CERT` | No (default `certs/aiven-ca.pem`) | `certs/aiven-ca.pem` |
| `OPENROUTER_API_KEY` | Yes | `sk-or-v1-...` |
| `OPENROUTER_MODEL` | No (default `typesafe/jev-1.14`) | `typesafe/jev-1.14` |
| `OPENROUTER_LLM_MODEL` | No (default `openai/gpt-4o-mini`) | `openai/gpt-4o-mini` |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Yes | `AIza...` |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Yes | `your-project.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Yes | `your-project` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Yes | `your-project.firebasestorage.app` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Yes | `123456789012` |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Yes | `1:123456789012:web:abc123` |
| `NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID` | No | `G-XXXXXXXXXX` |
| `TEST_USER_EMAIL` | Only for `api.http` | `you+test@example.com` |
| `TEST_USER_PASSWORD` | Only for `api.http` | `a-long-test-password` |

## Desktop app

ScribeBox also builds as an Electron app for Windows. It runs the bundled Next.js server on `127.0.0.1:47823` (a fixed port, so Firebase keeps you signed in). With `--dev` it loads a running `next dev` at `localhost:3000` instead. From `frontend/`:

```bash
npm run electron:dev     # with `npm run dev` running in another terminal
npm run electron:pack    # unpacked app, faster
npm run electron:build   # installer in dist-electron/
```

The build copies the static assets, `public/`, `certs/` and `.env` into the bundle. The installer therefore contains your database and OpenRouter credentials, so only share it with people who may have them.

## How the analysis works

Our code runs the steps ([`runner.ts`](frontend/lib/server/decision/runner.ts)); the models only answer or write, and every save goes through a tool that checks it.

1. **Check** the transcript (no AI): too short or unreadable is marked invalid.
2. **Find** lines that look like commitments ("I'll…", "can you…", "someone should…").
3. **Decide** with Jev, a decisions model: is each line a real action item, and is the named person the owner?
4. **Save** the confirmed items. Owners and dates are kept only if the transcript states them; anything vague is flagged with a note.
5. **Write** with GPT: the summary, the decisions (each must quote the transcript) and short task titles.

A run ends `done`, `failed` or `rate_limited`, and a failed run can be retried.

## Data model

![ScribeBox ERD](frontend/db/ScribeBoxERD.drawio%20%281%29.png)

The schema is in [`frontend/db/schema.sql`](frontend/db/schema.sql).

## API

The API is a set of Next.js route handlers under [`frontend/app/api/`](frontend/app/api/), with CRUD for meetings, summaries, decisions and action items, plus `/api/users/me` and `POST /api/meetings/:id/analysis`. Every request needs a Firebase ID token:

```
Authorization: Bearer <Firebase ID token>
```

Users only see their own data. Errors look like `{ "error": "...", "fields": { ... } }`, with `fields` on validation errors (422).

[`frontend/api.http`](frontend/api.http) has a request for every endpoint, for the VS Code REST Client extension.

## Testing

The end-to-end test runs the real analysis (database, Jev and GPT) on three transcripts in [`frontend/tests/fixtures/`](frontend/tests/fixtures/) and checks that nothing is invented. From `frontend/`:

```bash
node --env-file=.env --experimental-transform-types --no-warnings --import ./tests/support/register.mjs --test tests/e2e/analysis.test.mjs
```

Each test creates its own user and deletes it afterwards. It uses paid models, so each run costs a little OpenRouter credit.
