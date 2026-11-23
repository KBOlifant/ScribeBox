# ScribeBox frontend

Next.js 16 (App Router) + React 19 + Tailwind CSS v4. The UI follows the ScribeBox design system: paper-and-ink colour tokens with light and dark themes, Instrument Sans for the interface, Source Serif 4 for words that came from the meeting, IBM Plex Mono for raw transcripts, and a highlighter-yellow flag for anything the AI couldn't confirm.

It currently runs on **mock data** (lib/mock-data.ts). No API calls are made yet.

## Run it

    npm install
    npm run dev

Open http://localhost:3000. Mock login: lerato@example.com with any password of 12+ characters.

## Pages

| Route | What it shows |
| --- | --- |
| /login, /register | Auth forms with inline validation, a generic login error and no double submission |
| /meetings | Meeting list with each meeting's analysis state and open/review counts |
| /meetings/new | Transcript intake: paste text or upload .txt / .vtt / .md, with title and date |
| /meetings/[id] | Analysis status and retry, editable summary and decisions, action items (add, edit, delete with undo, tick off), original transcript |
| /action-items | My open action items across meetings, filtered by status, owner and overdue (filters live in the URL) |
| /account | Profile and soft-delete account with password confirmation |

Mock meetings cover every analysis state: done (m-1, m-6), done with no action items (m-4), analysing (m-2), failed (m-3) and rate-limited (m-5).

## Structure

- app/(auth): login and register, centred card layout
- app/(app): signed-in pages with the app header
- components/ui: design-system components (Button, TextField, Alert, TranscriptDrop, AnalysisStatus, StatusPill, ReviewFlag, ActionItemCard, MeetingRow, FilterBar, EmptyState, ...)
- lib: types, formatting, client-side validation (to be mirrored on the server) and mock data
- app/globals.css: design tokens mapped to Tailwind utilities (bg-paper, text-ink, bg-accent, text-review-ink, text-display, ...)
