// Traces one full ScribeBox run and shows where the time goes:
//   1. user input   - signing in (Google keys + user upsert) and saving the meeting
//   2. analysis     - every runner tool, every Jev decision and every GPT call
//   3. display      - the requests the meeting page sends to show the result
// Every database query, database connection and model call is timed, and printed live as it runs.
// At the end it writes trace-output/trace-<time>.json and an HTML timeline next to it.
//
// Run from frontend/ (uses the real database and paid models, like the e2e test):
//   node --env-file=.env --experimental-transform-types --no-warnings --import ./tests/support/register.mjs scripts/trace-analysis.mjs [transcript file]
//
// The trace user and meeting are deleted afterwards.
import { randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { performance } from "node:perf_hooks";
import pg from "pg";

// ---------- the tracer ----------
const spans = [];
const t0 = performance.now();
const now = () => performance.now() - t0;
let phase = "setup";

function begin(lane, name, detail) {
  const span = { lane, name, phase, start: now(), end: null, detail: detail ?? null };
  spans.push(span);
  if (lane === "phase" || lane === "tool") console.log(`${fmt(span.start)}  ▶ ${lane === "phase" ? "PHASE" : "step "} ${name}`);
  return span;
}
function end(span, extra) {
  span.end = now();
  if (extra) span.detail = { ...(span.detail ?? {}), ...extra };
  const label = { phase: "PHASE", tool: "step ", db: "db   ", connect: "conn ", jev: "Jev  ", gpt: "GPT  ", net: "net  " }[span.lane];
  const mark = span.lane === "phase" || span.lane === "tool" ? "✔" : "·";
  console.log(`${fmt(span.end)}  ${mark} ${label} ${span.name}  ${ms(span.end - span.start)}`);
}
async function timed(lane, name, fn, detail) {
  const span = begin(lane, name, detail);
  try {
    return await fn();
  } finally {
    end(span);
  }
}
const fmt = (t) => `[${(t / 1000).toFixed(2).padStart(7)}s]`;
const ms = (d) => `${Math.round(d)}ms`;

// ---------- instrument the database ----------
// Pool.query = waiting for a free connection + (maybe) connecting + the round trip
const poolQuery = pg.Pool.prototype.query;
pg.Pool.prototype.query = function (sql, params, ...rest) {
  if (typeof sql !== "string") return poolQuery.call(this, sql, params, ...rest);
  const label = sql.replace(/\s+/g, " ").trim().slice(0, 70);
  const span = begin("db", label, { idle: this.idleCount, open: this.totalCount, queued: this.waitingCount });
  const result = poolQuery.call(this, sql, params, ...rest);
  return result.then(
    (value) => (end(span, { rows: value.rowCount }), value),
    (error) => (end(span, { error: error.message }), Promise.reject(error)),
  );
};
// Client.connect = a brand new TCP + TLS + Postgres handshake to the hosted database
const clientConnect = pg.Client.prototype.connect;
pg.Client.prototype.connect = function (callback) {
  const span = begin("connect", "new database connection (TCP + TLS + auth)");
  if (typeof callback === "function") {
    return clientConnect.call(this, (error) => {
      end(span, error ? { error: error.message } : undefined);
      callback(error);
    });
  }
  return clientConnect.call(this).then(
    (value) => (end(span), value),
    (error) => (end(span, { error: error.message }), Promise.reject(error)),
  );
};

// ---------- instrument outgoing HTTP (Jev, GPT, Google keys) ----------
const realFetch = globalThis.fetch;
globalThis.fetch = async function (input, init) {
  const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  let lane = "net";
  let name = url;
  let detail = null;
  if (url.includes("/alpha/decisions")) {
    lane = "jev";
    try {
      const body = JSON.parse(init?.body ?? "{}");
      name = `Jev: ${Object.keys(body.questions ?? {}).join(", ")}`;
      detail = { stateChars: body.state?.length ?? 0 };
    } catch {
      name = "Jev decision";
    }
  } else if (url.includes("/chat/completions")) {
    lane = "gpt";
    name = "GPT chat completion";
    try {
      const body = JSON.parse(typeof init?.body === "string" ? init.body : "{}");
      const system = String(body.messages?.[0]?.content ?? "");
      const kind = /summar/i.test(system) ? "summary" : /decision/i.test(system) ? "decisions" : /title|wording|rewr|reword/i.test(system) ? "item wording" : "chat";
      name = `GPT: ${kind}`;
      detail = { promptChars: (body.messages ?? []).reduce((n, m) => n + String(m.content).length, 0) };
    } catch {
      // keep the generic name
    }
  } else if (url.includes("googleapis.com")) {
    name = "Google sign-in keys (JWKS)";
  }
  const span = begin(lane, name, detail);
  try {
    const response = await realFetch(input, init);
    // OpenRouter sends its headers straight away and the answer later, so wait for the whole body
    const headersAt = now() - span.start;
    await response.clone().arrayBuffer();
    end(span, { status: response.status, headersMs: Math.round(headersAt) });
    return response;
  } catch (error) {
    end(span, { error: error.message });
    throw error;
  }
};

// ---------- load the app's server code (after patching, so it uses the patched pg and fetch) ----------
const { query } = await import("../lib/server/db.ts");
const { runDecision } = await import("../lib/server/decision/runner.ts");
const { decisionTools } = await import("../lib/server/decision/registry.ts");
const { MEETING_COLUMNS, SUMMARY_COLUMNS, DECISION_COLUMNS, ACTION_ITEM_COLUMNS } = await import("../lib/server/meetings.ts");

// Each runner tool becomes a span, so the timeline shows which step is running
for (const tool of decisionTools) {
  const execute = tool.execute.bind(tool);
  tool.execute = async (args, context) => {
    const extra = args?.state ? ` → ${args.state}` : args?.task ? ` (${args.task})` : "";
    return timed("tool", tool.name + extra, () => execute(args, context));
  };
}

const transcriptFile = process.argv[2] ?? "tests/fixtures/clean-transcript.txt";
const transcript = readFileSync(transcriptFile, "utf8");
const userId = `trace-${randomUUID()}`;
let meetingId = null;

// What every API request does before its own query (lib/server/auth.ts getUser)
const upsertUser = () =>
  query(
    `insert into users (id, email, name) values ($1, $2, $3)
     on conflict (id) do update set email = excluded.email, name = coalesce(users.name, excluded.name)
     returning id, email, name, created_at`,
    [userId, `${userId}@example.com`, "Trace"],
  );
const requireMeeting = () => query(`select id from meetings where id = $1 and user_id = $2`, [meetingId, userId]);

// One API request, running the same queries its route handler runs. A failure is recorded as a 500,
// like the route would send, instead of stopping the trace
const request = async (name, fn) => {
  const span = begin("tool", `HTTP ${name}`);
  try {
    await fn();
    end(span, { status: 200 });
  } catch (error) {
    span.name += " → 500";
    end(span, { status: 500, error: error.message });
  }
};

let trace = null;
try {
  // ---------- 0. baseline: how far away is the database? ----------
  phase = "baseline";
  const baseline = begin("phase", "Baseline: database distance");
  // Opens the first connection. The first one a process opens often stalls until the timeout,
  // and the app doesn't retry that error, so the trace records it and tries again
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await query("select 1");
      break;
    } catch (error) {
      console.log(`First connection attempt ${attempt} failed: ${error.message}`);
      if (attempt === 3) throw error;
    }
  }
  for (let i = 0; i < 3; i++) await query("select 1"); // warm round trips on an open connection
  end(baseline);

  // ---------- 1. user input ----------
  phase = "input";
  const input = begin("phase", "1. User input: sign in + save meeting");
  await request("sign-in key check (first request after a server start)", async () => {
    const response = await globalThis.fetch("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com");
    await response.json();
  });
  await request("POST /api/meetings", async () => {
    await upsertUser();
    const [row] = await query(
      "insert into meetings (user_id, title, meeting_date, transcript) values ($1, $2, $3, $4) returning id",
      [userId, "Trace meeting", "2026-11-20", transcript],
    );
    meetingId = row.id;
  });
  end(input);

  // ---------- 2. analysis ----------
  phase = "analysis";
  const analysis = begin("phase", "2. Analysis: POST /api/meetings/:id/analysis");
  await upsertUser(); // the analysis route signs the user in too
  await requireMeeting();
  trace = await runDecision({ userId, meetingId });
  end(analysis, { stoppedBecause: trace.stoppedBecause });

  // ---------- 3. display ----------
  // The meeting page asks for these at the same time, and the header asks for its counts
  phase = "display";
  const display = begin("phase", "3. Display: meeting page loads the result");
  await Promise.all([
    request("GET /api/meetings/:id", async () => {
      await upsertUser();
      await query(`select ${MEETING_COLUMNS} from meetings where id = $1 and user_id = $2`, [meetingId, userId]);
    }),
    request("GET /api/meetings/:id/decisions", async () => {
      await upsertUser();
      await requireMeeting();
      await query(`select ${DECISION_COLUMNS} from decisions d where d.meeting_id = $1 order by d.created_at, d.id`, [meetingId]);
    }),
    request("GET /api/meetings/:id/action-items", async () => {
      await upsertUser();
      await requireMeeting();
      await query(`select ${ACTION_ITEM_COLUMNS} from action_items a where a.meeting_id = $1 order by a.created_at, a.id`, [meetingId]);
    }),
    request("GET /api/meetings/:id/summaries", async () => {
      await upsertUser();
      await requireMeeting();
      await query(`select ${SUMMARY_COLUMNS} from summaries s where s.meeting_id = $1 order by s.created_at desc`, [meetingId]);
    }),
    request("GET /api/action-items (header count)", async () => {
      await upsertUser();
      await query(
        `select ${ACTION_ITEM_COLUMNS}, m.title as meeting_title, m.meeting_date::text as meeting_date
         from action_items a join meetings m on m.id = a.meeting_id
         where m.user_id = $1 and ($2::text is null or a.progress_state = $2)`,
        [userId, null],
      );
    }),
    request("GET /api/meetings (header count)", async () => {
      await upsertUser();
      await query(`select ${MEETING_COLUMNS} from meetings where user_id = $1`, [userId]);
    }),
  ]);
  end(display);
} catch (error) {
  console.log("Trace stopped by an error:", error);
} finally {
  phase = "cleanup";
  await query("delete from users where id = $1", [userId]).catch(() => {});
  await globalThis.pool?.end();
}

// ---------- summary ----------
const done = (s) => s.end !== null;
const sum = (lane, ph) => spans.filter((s) => s.lane === lane && s.phase === ph && done(s)).reduce((n, s) => n + (s.end - s.start), 0);
const count = (lane, ph) => spans.filter((s) => s.lane === lane && s.phase === ph).length;
const phaseSpan = (ph) => spans.find((s) => s.lane === "phase" && s.phase === ph);
const phaseMs = (ph) => {
  const span = phaseSpan(ph);
  return span?.end ? Math.round(span.end - span.start) : 0;
};
const warmPings = spans.filter((s) => s.lane === "db" && s.phase === "baseline").slice(1);
const rtt = warmPings.reduce((n, s) => n + (s.end - s.start), 0) / Math.max(1, warmPings.length);
const connects = spans.filter((s) => s.lane === "connect" && done(s));

const summary = {
  transcript: transcriptFile,
  stoppedBecause: trace?.stoppedBecause ?? "error",
  totalMs: Math.round(now()),
  databaseRoundTripMs: Math.round(rtt),
  newConnections: connects.length,
  avgConnectMs: Math.round(connects.reduce((n, s) => n + (s.end - s.start), 0) / Math.max(1, connects.length)),
  phases: spans.filter((s) => s.lane === "phase" && done(s)).map((p) => ({ name: p.name, ms: Math.round(p.end - p.start) })),
  analysis: {
    totalMs: phaseMs("analysis"),
    dbQueries: count("db", "analysis"),
    dbBusyMs: Math.round(sum("db", "analysis")),
    jevCalls: count("jev", "analysis"),
    jevBusyMs: Math.round(sum("jev", "analysis")),
    gptCalls: count("gpt", "analysis"),
    gptBusyMs: Math.round(sum("gpt", "analysis")),
  },
  display: { totalMs: phaseMs("display"), dbQueries: count("db", "display") },
};

console.log("\n===== Summary =====");
console.log(JSON.stringify(summary, null, 2));

const outDir = "trace-output";
mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const jsonFile = path.join(outDir, `trace-${stamp}.json`);
const htmlFile = path.join(outDir, `trace-${stamp}.html`);
writeFileSync(jsonFile, JSON.stringify({ summary, spans }, null, 2));
writeFileSync(htmlFile, renderHtml(summary, spans));
console.log(`\nWrote ${jsonFile}\nWrote ${htmlFile}`);

// ---------- HTML timeline ----------
function renderHtml(summary, spans) {
  const total = Math.max(...spans.map((s) => s.end ?? s.start), 1);
  const lanes = [
    ["phase", "Phase"],
    ["tool", "Step / request"],
    ["connect", "DB connect"],
    ["db", "DB query"],
    ["jev", "Jev (decisions)"],
    ["gpt", "GPT-4o-mini"],
    ["net", "Other network"],
  ];
  // Overlapping spans in a lane go on separate rows
  const rows = [];
  for (const [lane, label] of lanes) {
    const laneSpans = spans.filter((s) => s.lane === lane && done(s)).sort((a, b) => a.start - b.start);
    const packed = [];
    for (const span of laneSpans) {
      let row = packed.find((r) => r.at(-1).end <= span.start);
      if (!row) packed.push((row = []));
      row.push(span);
    }
    packed.forEach((row, i) => rows.push({ lane, label: i === 0 ? label : "", spans: row }));
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const bars = rows
    .map((row) => {
      const inner = row.spans
        .map((s) => {
          const left = (s.start / total) * 100;
          const width = Math.max(((s.end - s.start) / total) * 100, 0.15);
          const tip = `${s.name}\n${ms(s.end - s.start)} (at ${(s.start / 1000).toFixed(2)}s)${s.detail ? "\n" + JSON.stringify(s.detail) : ""}`;
          return `<div class="bar ${row.lane}" style="left:${left}%;width:${width}%" title="${esc(tip)}">${width > 6 ? esc(s.name) : ""}</div>`;
        })
        .join("");
      return `<div class="row"><div class="label">${esc(row.label)}</div><div class="track">${inner}</div></div>`;
    })
    .join("");
  const a = summary.analysis;
  const sec = (n) => (n / 1000).toFixed(1) + "s";
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ScribeBox Trace</title><style>
:root{--bg:#fafafa;--fg:#1a1a1a;--muted:#666;--track:#ececec;--phase:#555;--tool:#7c6cf2;--connect:#e5484d;--db:#f59e0b;--jev:#0ea5e9;--gpt:#10b981;--net:#a1a1aa}
@media (prefers-color-scheme:dark){:root{--bg:#141317;--fg:#eee;--muted:#999;--track:#25232a}}
body{background:var(--bg);color:var(--fg);font:14px/1.4 system-ui,sans-serif;margin:0;padding:16px}
h1{font-size:20px;margin:0 0 4px}.muted{color:var(--muted)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:16px 0}
.card{background:var(--track);border-radius:8px;padding:10px}.card b{display:block;font-size:20px}
.row{display:flex;align-items:center;margin:2px 0}.label{width:120px;flex:none;font-size:12px;color:var(--muted)}
.track{position:relative;flex:1;height:20px;background:var(--track);border-radius:3px}
.bar{position:absolute;top:2px;bottom:2px;border-radius:2px;font-size:10px;color:#fff;overflow:hidden;white-space:nowrap;padding-left:3px;box-sizing:border-box}
.phase{background:var(--phase)}.tool{background:var(--tool)}.connect{background:var(--connect)}.db{background:var(--db)}.jev{background:var(--jev)}.gpt{background:var(--gpt)}.net{background:var(--net)}
table{border-collapse:collapse;margin-top:16px;font-size:12px}td,th{padding:3px 8px;text-align:left;border-bottom:1px solid var(--track)}
</style></head><body>
<h1>ScribeBox analysis trace</h1>
<div class="muted">${esc(summary.transcript)} · ${sec(summary.totalMs)} end to end · ended ${esc(summary.stoppedBecause)} · hover a bar for details</div>
<div class="cards">
<div class="card">DB round trip<b>${summary.databaseRoundTripMs}ms</b></div>
<div class="card">New DB connection<b>${summary.avgConnectMs}ms</b><span class="muted">${summary.newConnections} opened</span></div>
<div class="card">Analysis<b>${sec(a.totalMs)}</b></div>
<div class="card">DB in analysis<b>${a.dbQueries} queries</b><span class="muted">${sec(a.dbBusyMs)} total</span></div>
<div class="card">Jev<b>${a.jevCalls} calls</b><span class="muted">${sec(a.jevBusyMs)} total</span></div>
<div class="card">GPT<b>${a.gptCalls} calls</b><span class="muted">${sec(a.gptBusyMs)} total</span></div>
<div class="card">Page load<b>${sec(summary.display.totalMs)}</b><span class="muted">${summary.display.dbQueries} queries</span></div>
</div>
${bars}
<table><tr><th>Phase</th><th>Time</th></tr>${summary.phases.map((p) => `<tr><td>${esc(p.name)}</td><td>${sec(p.ms)}</td></tr>`).join("")}</table>
</body></html>`;
}
