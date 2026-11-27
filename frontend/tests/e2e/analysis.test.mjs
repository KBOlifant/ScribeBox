// End-to-end test of the meeting analysis: the real runner, database, decision model (Jev) and
// text model (GPT), on the transcripts in tests/fixtures. Each test makes its own user and meeting
// and deletes them afterwards (deleting the user cascades to everything else).
//
// Run from frontend/ (needs DATABASE_URL, OPENROUTER_API_KEY and a chat model in OPENROUTER_LLM_MODEL):
//   node --env-file=.env --experimental-transform-types --no-warnings --import ./tests/support/register.mjs --test tests/e2e/analysis.test.mjs
//
// Models don't answer exactly the same way every time, so the checks are the rules that must
// always hold (nothing invented) plus what each transcript clearly contains.
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { after, describe, test } from "node:test";

import { query } from "../../lib/server/db.ts";
import { textStatesDate } from "../../lib/server/decision/dates.ts";
import { runDecision } from "../../lib/server/decision/runner.ts";
import { normalizeText } from "../../lib/server/decision/transcript.ts";

const configured = Boolean(process.env.DATABASE_URL && process.env.OPENROUTER_API_KEY);
const userIds = [];

function fixture(name) {
  return readFileSync(new URL(`../fixtures/${name}`, import.meta.url), "utf8");
}

async function createMeeting(transcript, date) {
  const userId = `e2e-${randomUUID()}`;
  userIds.push(userId);
  await query("insert into users (id, email, name) values ($1, $2, $3)", [userId, `${userId}@example.com`, "E2E Test"]);
  const [meeting] = await query(
    "insert into meetings (user_id, title, meeting_date, transcript) values ($1, $2, $3, $4) returning id",
    [userId, "E2E test meeting", date, transcript],
  );
  return { userId, meetingId: meeting.id };
}

async function results(meetingId) {
  const [items, decisions, runs] = await Promise.all([
    query(
      `select id, title, owner, owner_note, action_date::text as action_date, due_note, transcript_quote, cue_time
       from action_items where meeting_id = $1 order by created_at`,
      [meetingId],
    ),
    query("select decision_text from decisions where meeting_id = $1", [meetingId]),
    query("select analysis_state, model_name, summary_text from summaries where meeting_id = $1 order by created_at desc, id desc", [
      meetingId,
    ]),
  ]);
  return { items, decisions, latest: runs[0] };
}

// The rules every analysis must follow, whatever the models said
function assertGrounded(transcript, { items, decisions, latest }) {
  const text = normalizeText(transcript);
  assert.equal(latest?.analysis_state, "done", "the newest run should be done");
  assert.ok(latest.summary_text?.length > 20, "the run should have a summary");
  assert.ok(latest.model_name, "the run should record the text model");

  for (const item of items) {
    assert.ok(item.transcript_quote && text.includes(normalizeText(item.transcript_quote)), `quote not in transcript: ${item.transcript_quote}`);
    if (item.owner) {
      assert.ok(text.includes(item.owner.toLowerCase()), `owner not named in transcript: ${item.owner}`);
    } else {
      assert.ok(item.owner_note, `an item without an owner must say why: ${item.title}`);
    }
    if (item.action_date) {
      assert.ok(textStatesDate(item.transcript_quote, item.action_date), `date ${item.action_date} not stated in: ${item.transcript_quote}`);
    }
  }
  for (const decision of decisions) {
    assert.ok(decision.decision_text.length <= 500);
  }
}

function report(name, trace, found) {
  console.log(`\n[${name}] ${trace.stoppedBecause}${trace.error ? ` (${trace.error})` : ""}`);
  for (const item of found.items) {
    console.log(`  item: ${item.title} | owner: ${item.owner ?? "-"} | date: ${item.action_date ?? "-"} | note: ${item.owner_note ?? item.due_note ?? "-"}`);
  }
  for (const decision of found.decisions) console.log(`  decision: ${decision.decision_text}`);
  console.log(`  summary: ${found.latest?.summary_text}`);
}

after(async () => {
  if (userIds.length) await query("delete from users where id = any($1)", [userIds]);
  // db.ts keeps one pool on globalThis; close it so the test process can exit
  await globalThis.pool?.end();
});

describe("meeting analysis, end to end", { skip: !configured && "needs DATABASE_URL and OPENROUTER_API_KEY", concurrency: false, timeout: 20 * 60_000 }, () => {
  test("clean planning transcript: owners, real dates, decisions, and no copies on retry", async () => {
    const transcript = fixture("clean-transcript.txt");
    const { userId, meetingId } = await createMeeting(transcript, "2026-11-18");

    const trace = await runDecision({ userId, meetingId });
    const found = await results(meetingId);
    report("clean", trace, found);
    assert.equal(trace.stoppedBecause, "done", trace.error);
    assertGrounded(transcript, found);

    assert.ok(found.items.length >= 5, `expected at least 5 action items, got ${found.items.length}`);
    const owners = new Set(found.items.map((item) => item.owner));
    for (const name of ["Ruben Pillay", "Johan van Wyk", "Aisha Mohamed"]) {
      assert.ok(owners.has(name), `expected an item owned by ${name}`);
    }
    assert.ok(
      found.items.some((item) => item.owner === "Ruben Pillay" && item.action_date === "2026-11-23"),
      "Ruben's rate limiting item should be due 2026-11-23",
    );
    assert.ok(found.items.some((item) => item.action_date === "2026-11-27"), "the CSV export UI should be due 2026-11-27");
    assert.ok(found.decisions.length >= 2, `expected the rate limiting and CSV-only decisions, got ${found.decisions.length}`);

    // Retry: start a new run and analyse again. Nothing already saved should be saved twice
    await query("insert into summaries (meeting_id) values ($1)", [meetingId]);
    const retry = await runDecision({ userId, meetingId });
    const again = await results(meetingId);
    assert.equal(retry.stoppedBecause, "done", retry.error);
    assert.equal(again.items.length, found.items.length, "retry should not duplicate action items");
    assert.ok(again.decisions.length <= found.decisions.length + 1, "retry should not duplicate decisions");
  });

  test("messy captions: vague owners are flagged, nothing is invented", async () => {
    const transcript = fixture("messy-transcript.vtt");
    const { userId, meetingId } = await createMeeting(transcript, "2026-11-20");

    const trace = await runDecision({ userId, meetingId });
    const found = await results(meetingId);
    report("messy", trace, found);
    assert.equal(trace.stoppedBecause, "done", trace.error);
    assertGrounded(transcript, found);

    assert.ok(found.items.length >= 2, `expected at least 2 action items, got ${found.items.length}`);
    for (const item of found.items) {
      assert.ok(!["Unknown", "Speaker 1"].includes(item.owner), `placeholder speaker used as owner: ${item.owner}`);
      assert.ok(!/training/i.test(item.transcript_quote), "the training idea was explicitly not committed to");
    }
    assert.ok(
      found.items.some((item) => !item.owner || item.owner_note || item.due_note),
      "at least one item (vague owner or relative date) should need review",
    );
  });

  test("knowledge share with no tasks: no action items", async () => {
    const transcript = fixture("no-action-items-transcript.md");
    const { userId, meetingId } = await createMeeting(transcript, "2026-11-19");

    const trace = await runDecision({ userId, meetingId });
    const found = await results(meetingId);
    report("no-action-items", trace, found);
    assert.equal(trace.stoppedBecause, "done", trace.error);
    assertGrounded(transcript, found);
    assert.equal(found.items.length, 0, "nobody signed up for anything");
    assert.equal(found.decisions.length, 0, "the presenter said there were no decisions");
  });
});
