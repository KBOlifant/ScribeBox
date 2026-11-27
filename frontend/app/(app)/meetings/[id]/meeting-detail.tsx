"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { announceActionItemsChanged } from "@/components/app-header";
import { Presence } from "@/components/motion";
import { ActionItemCard } from "@/components/ui/action-item-card";
import { Alert } from "@/components/ui/alert";
import { AnalysisStatus } from "@/components/ui/analysis-status";
import { Button, ButtonLink } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { useApiData } from "@/hooks/use-api-data";
import { useSafeMotion } from "@/hooks/use-reduced-motion";
import {
  actionItemBody,
  api,
  ApiRequestError,
  todayIso,
  toActionItem,
  toMeeting,
  type ActionItemRow,
  type DecisionRow,
  type MeetingRow,
  type SummaryRow,
} from "@/lib/api";
import { formatLongDate, plural } from "@/lib/format";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { needsReview, STATUS_LABELS, type ActionItem, type AnalysisState, type ItemStatus } from "@/lib/types";
import { actionItemErrors, hasErrors, type FieldErrors } from "@/lib/validation";
import { MeetingSkeleton } from "./meeting-skeleton";

type MeetingData = { meeting: MeetingRow };
type DecisionsData = { decisions: DecisionRow[] };
type ItemsData = { actionItems: ActionItemRow[] };
type SummariesData = { summaries: SummaryRow[] };

/** States from which analysing again needs a fresh run first (POST /summaries). */
const FINISHED_STATES: AnalysisState[] = ["done", "failed", "rate_limited"];

/** How often to check on an analysis started elsewhere (another tab, another device). */
const POLL_MS = 5000;

function messageOf(error: unknown): string {
  return error instanceof ApiRequestError ? error.message : "Something went wrong. Try again.";
}

/** "13 Nov at 10:42", in the user's own time zone. */
function formatFinishedAt(timestamp: string): string | undefined {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return undefined;
  const day = date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  return day + " at " + time;
}

/** Loads the meeting, its decisions, action items and analysis runs, then shows the page. */
export function MeetingDetail({ id }: { id: string }) {
  const base = "/api/meetings/" + encodeURIComponent(id);
  const meetingData = useApiData<MeetingData>(base);
  const decisionsData = useApiData<DecisionsData>(base + "/decisions");
  const itemsData = useApiData<ItemsData>(base + "/action-items");
  const summariesData = useApiData<SummariesData>(base + "/summaries");
  const sources = [meetingData, decisionsData, itemsData, summariesData];

  // An unknown id, or one owned by someone else, gets the same 404: never confirm it exists.
  if (meetingData.error?.status === 404) return <MeetingNotFound />;

  if (!meetingData.data || !decisionsData.data || !itemsData.data || !summariesData.data) {
    const failed = sources.find((source) => source.error && !source.loading && !source.data);
    if (failed?.error) {
      return (
        <div className="mx-auto flex max-w-[880px] flex-col gap-6">
          <BackLink href="/meetings">Meetings</BackLink>
          <Alert
            tone="error"
            title="This meeting didn’t load."
            action={
              <Button
                size="sm"
                icon="refresh"
                onClick={() => sources.forEach((source) => source.error && source.reload())}
              >
                Try again
              </Button>
            }
          >
            {failed.error.message}
          </Alert>
        </div>
      );
    }
    return <MeetingSkeleton />;
  }

  // Fetches all four again in one go, so the page never shows a half-updated meeting
  async function refresh() {
    const [meeting, decisions, items, summaries] = await Promise.all([
      api<MeetingData>(base),
      api<DecisionsData>(base + "/decisions"),
      api<ItemsData>(base + "/action-items"),
      api<SummariesData>(base + "/summaries"),
    ]);
    meetingData.setData(meeting);
    decisionsData.setData(decisions);
    itemsData.setData(items);
    summariesData.setData(summaries);
  }

  return (
    <MeetingView
      meetingRow={meetingData.data.meeting}
      decisionRows={decisionsData.data.decisions}
      itemRows={itemsData.data.actionItems}
      runs={summariesData.data.summaries}
      setMeetingRow={(row) => meetingData.setData({ meeting: row })}
      setDecisionRows={(rows) => decisionsData.setData({ decisions: rows })}
      setItemRows={(update) => itemsData.setData((current) => ({ actionItems: update(current?.actionItems ?? []) }))}
      setRuns={(rows) => summariesData.setData({ summaries: rows })}
      refresh={refresh}
    />
  );
}

function MeetingNotFound() {
  return (
    <div className="mx-auto flex max-w-[480px] flex-col gap-4 py-16">
      <p className="font-mono text-timestamp text-ink-muted">404</p>
      <h1 className="text-display">Meeting not found</h1>
      <p className="text-ink-muted">
        This meeting doesn’t exist, or it belongs to another account. Meetings are only visible to the person who added
        them.
      </p>
      <div>
        <ButtonLink href="/meetings" variant="primary">
          Back to meetings
        </ButtonLink>
      </div>
    </div>
  );
}

type ViewProps = {
  meetingRow: MeetingRow;
  decisionRows: DecisionRow[];
  itemRows: ActionItemRow[];
  runs: SummaryRow[];
  setMeetingRow: (row: MeetingRow) => void;
  setDecisionRows: (rows: DecisionRow[]) => void;
  setItemRows: (update: (rows: ActionItemRow[]) => ActionItemRow[]) => void;
  setRuns: (rows: SummaryRow[]) => void;
  refresh: () => Promise<void>;
};

function MeetingView({ meetingRow, decisionRows, itemRows, runs, setMeetingRow, setDecisionRows, setItemRows, setRuns, refresh }: ViewProps) {
  const meeting = toMeeting(meetingRow, decisionRows);
  const itemCount = itemRows.length;
  const today = todayIso();

  const [running, setRunning] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const analysis: AnalysisState = running ? "working" : meeting.analysis.state;

  const analysing = analysis === "working";
  const reviewCount = itemRows.map(toActionItem).filter((item) => item.status !== "done" && needsReview(item)).length;
  const source = meeting.source.kind === "file" ? meeting.source.name : "Pasted text";

  // An analysis started elsewhere: check back until it finishes
  const refreshRef = useRef(refresh);
  useEffect(() => {
    refreshRef.current = refresh;
  });
  const watching = meeting.analysis.state === "working" && !running;
  useEffect(() => {
    if (!watching) return;
    const timer = setInterval(() => {
      refreshRef.current().catch(() => {
        // A missed check is retried on the next tick
      });
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [watching]);

  // The new-meeting form sends people here with ?analyse=1 instead of starting the run itself, so
  // the page starts it the same way the button does and shows it from the first moment. The ref
  // keeps StrictMode's second effect run from starting it twice.
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const autoStart = searchParams.get("analyse") === "1";
  const autoStarted = useRef(false);
  const analyseRef = useRef<() => Promise<void>>(async () => {});
  useEffect(() => {
    analyseRef.current = analyse;
  });
  const startState = meetingRow.analysis_state;
  useEffect(() => {
    if (!autoStart || autoStarted.current) return;
    autoStarted.current = true;
    const rest = new URLSearchParams(searchParams.toString());
    rest.delete("analyse");
    const query = rest.toString();
    router.replace(query ? pathname + "?" + query : pathname, { scroll: false });
    // Already running or finished (another tab, a reload): nothing to start
    if (startState === "queued") void analyseRef.current();
  }, [autoStart, searchParams, router, pathname, startState]);

  async function analyse() {
    setAnalysisError(null);
    setRunning(true);
    try {
      if (FINISHED_STATES.includes(meeting.analysis.state)) {
        try {
          await api(`/api/meetings/${meeting.id}/summaries`, { method: "POST" });
        } catch (error) {
          // 409 here means a run is already waiting, which the analysis below can pick up
          if (!(error instanceof ApiRequestError && error.status === 409)) throw error;
        }
      }
      await api(`/api/meetings/${meeting.id}/analysis`, { method: "POST" });
    } catch (error) {
      setAnalysisError(analysisErrorMessage(error));
    }
    try {
      await refresh();
    } catch (error) {
      setAnalysisError((current) => current ?? "The analysis finished, but the page couldn’t update. " + messageOf(error));
    }
    // The run may have saved action items
    announceActionItemsChanged();
    setRunning(false);
  }

  // The newest run that finished, for "Analysed 13 Nov at 10:42", and how many tries since the last success
  const lastDone = runs.find((run) => run.analysis_state === "done");
  const finishedAt = lastDone ? formatFinishedAt(lastDone.updated_at) : undefined;
  const sinceDone = runs.findIndex((run) => run.analysis_state === "done");
  const attempts = sinceDone === -1 ? runs.length : sinceDone;

  const doneLine = [finishedAt ? "Analysed " + finishedAt : "Analysis complete", plural(itemCount, "action item"), reviewCount ? reviewCount + " need review" : null]
    .filter(Boolean)
    .join(" · ");

  // Nothing analyses a waiting meeting on its own, so the person starts it
  const queuedDetail = "Your transcript is saved. Start the analysis when you’re ready.";

  async function saveSummary(value: string) {
    // Edit the newest run that has a summary, else the newest run
    const target = runs.find((run) => run.summary_text) ?? runs[0];
    if (!target) throw new ApiRequestError(409, "There’s no analysis to edit yet. Run the analysis first.");
    const { summary } = await api<{ summary: SummaryRow }>(`/api/summaries/${target.id}`, { method: "PATCH", body: { summaryText: value } });
    setRuns(runs.map((run) => (run.id === summary.id ? summary : run)));
    setMeetingRow({ ...meetingRow, summary: summary.summary_text });
  }

  return (
    <div className="mx-auto flex max-w-[880px] flex-col gap-10">
      <div className="flex flex-col gap-6">
        <PageHeader
          back={<BackLink href="/meetings">Meetings</BackLink>}
          title={meeting.title}
          description={formatLongDate(meeting.date) + " · " + source}
        />
        {/* Keyed by state, so failed -> working -> done hands over one block at a time. */}
        <AnimatePresence mode="wait" initial={false}>
          <Presence key={analysis} className="flex flex-col gap-3">
            <AnalysisStatus
              state={analysis}
              retrying={running}
              // invalid is final on the server: analysing it again always fails, so no retry button
              onRetry={analysis === "invalid" ? undefined : analyse}
              detail={analysis === "done" ? doneLine : analysis === "queued" ? queuedDetail : undefined}
              meta={analysis === "failed" && attempts ? "Tried " + plural(attempts, "time") : undefined}
            />
            {analysis === "queued" && (
              <div>
                <Button variant="primary" size="sm" icon="refresh" loading={running} onClick={analyse}>
                  Start analysis
                </Button>
              </div>
            )}
          </Presence>
        </AnimatePresence>
        <AnimatePresence initial={false}>
          {analysisError && (
            <Presence key="analysis-error">
              <Alert
                tone="error"
                title="The analysis didn’t run."
                action={
                  <Button variant="ghost" size="sm" onClick={() => setAnalysisError(null)}>
                    Dismiss
                  </Button>
                }
              >
                {analysisError}
              </Alert>
            </Presence>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {analysing ? (
          <Presence key="skeleton">
            <ResultsSkeleton />
          </Presence>
        ) : meeting.summary !== null ? (
          <Presence key="results" className="flex flex-col gap-10">
            <SummarySection summary={meeting.summary} onSave={saveSummary} />
            <DecisionsSection meetingId={meeting.id} rows={decisionRows} onSaved={setDecisionRows} />
          </Presence>
        ) : (
          <Presence key="pending">
            <p className="surface p-6 text-ink-muted">
              The summary and decisions appear here once the analysis succeeds. Your transcript is saved below, and you can add
              action items by hand in the meantime.
            </p>
          </Presence>
        )}
      </AnimatePresence>

      <ActionItemsSection
        rows={itemRows}
        setItemRows={setItemRows}
        today={today}
        meetingId={meeting.id}
        analysing={analysing}
        analysed={meeting.summary !== null}
      />

      <TranscriptSection transcript={meeting.transcript} />
    </div>
  );
}

function analysisErrorMessage(error: unknown): string {
  if (!(error instanceof ApiRequestError)) return "Something went wrong. Try again.";
  if (error.status === 409) {
    return "The analysis can’t start right now. It may already be running, or this transcript can’t be analysed again. Wait a minute and reload the page.";
  }
  if (error.status === 503) return "Analysis isn’t set up on this server yet. You can still add action items by hand.";
  if (error.status === 404) return "This meeting no longer exists.";
  // Network failures and everything else already carry a plain message
  return error.message;
}

function ResultsSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <p className="text-title text-ink-muted">Summary</p>
        <div className="surface flex flex-col gap-3 p-6">
          <Skeleton className="h-3.5 w-full" />
          <Skeleton className="h-3.5 w-11/12" />
          <Skeleton className="h-3.5 w-4/5" />
          <Skeleton className="h-3.5 w-2/3" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        <p className="text-title text-ink-muted">Decisions</p>
        <div className="surface flex flex-col gap-3 p-6">
          <Skeleton className="h-3.5 w-3/4" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>
      </div>
    </div>
  );
}

function SummarySection({ summary, onSave }: { summary: string; onSave: (value: string) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    const value = draft.trim();
    if (!value) return setError("Write a summary, or cancel to keep the current one.");
    if (value.length > 4000) return setError("Keep the summary under 4,000 characters.");
    setSaving(true);
    setError(undefined);
    try {
      await onSave(value);
      setEdited(true);
      setEditing(false);
    } catch (caught) {
      setError(caught instanceof ApiRequestError && caught.fields?.summaryText ? caught.fields.summaryText : messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      id="summary"
      title="Summary"
      actions={
        !editing && (
          <Button
            variant="ghost"
            size="sm"
            icon="edit"
            onClick={() => {
              setDraft(summary);
              setEditing(true);
            }}
          >
            Edit
          </Button>
        )
      }
    >
      <div className="surface p-5 sm:p-7">
        <AnimatePresence mode="wait" initial={false}>
          {editing ? (
            <Presence key="edit" className="flex flex-col gap-4">
              <TextAreaField
                label="Summary"
                variant="prose"
                rows={6}
                value={draft}
                disabled={saving}
                onChange={(event) => setDraft(event.target.value)}
                error={error}
              />
              <div className="flex gap-3">
                <Button variant="primary" loading={saving} onClick={save}>
                  Save summary
                </Button>
                <Button
                  variant="ghost"
                  disabled={saving}
                  onClick={() => {
                    setEditing(false);
                    setError(undefined);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Presence>
          ) : (
            <Presence key="view">
              <p className="font-serif text-summary text-pretty">{summary}</p>
              <p className="mt-5 text-label font-normal text-lilac-ink">{edited ? "Edited by you." : "Drafted by the AI from the transcript. Edit anything it got wrong."}</p>
            </Presence>
          )}
        </AnimatePresence>
      </div>
    </Section>
  );
}

/** A decision being edited. id is null for one added in this edit. */
type DecisionDraft = { id: string | null; text: string };

const DECISION_MAX = 500;

function DecisionsSection({ meetingId, rows, onSaved }: { meetingId: string; rows: DecisionRow[]; onSaved: (rows: DecisionRow[]) => void }) {
  const decisions = rows.map((row) => row.decision_text);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<DecisionDraft[]>([]);
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  // Maps the edited list onto the API: delete what was removed or blanked, reword what changed,
  // add what's new. Each step updates `current`, so a failure part way keeps what did save.
  async function save() {
    const cleaned = draft.map((d) => ({ ...d, text: d.text.trim() }));
    const tooLong: Record<number, string> = {};
    cleaned.forEach((d, index) => {
      if (d.text.length > DECISION_MAX) tooLong[index] = "Keep each decision under " + DECISION_MAX + " characters.";
    });
    setErrors(tooLong);
    setFormError(undefined);
    if (Object.keys(tooLong).length) return;

    setSaving(true);
    let current = rows;
    const next = [...cleaned];
    let index = -1;
    try {
      for (const row of rows) {
        if (!cleaned.some((d) => d.id === row.id && d.text)) {
          await api(`/api/decisions/${row.id}`, { method: "DELETE" });
          current = current.filter((r) => r.id !== row.id);
        }
      }
      for (index = 0; index < next.length; index++) {
        const d = next[index];
        if (!d.text) continue;
        const existing = d.id ? current.find((r) => r.id === d.id) : undefined;
        if (existing) {
          if (existing.decision_text === d.text) continue;
          const { decision } = await api<{ decision: DecisionRow }>(`/api/decisions/${existing.id}`, {
            method: "PATCH",
            body: { decisionText: d.text },
          });
          current = current.map((r) => (r.id === decision.id ? decision : r));
        } else {
          const { decision } = await api<{ decision: DecisionRow }>(`/api/meetings/${meetingId}/decisions`, {
            method: "POST",
            body: { decisionText: d.text },
          });
          current = [...current, decision];
          next[index] = { id: decision.id, text: d.text };
        }
      }
      onSaved(current);
      setEditing(false);
    } catch (caught) {
      onSaved(current);
      setDraft(next);
      const fieldError = caught instanceof ApiRequestError ? caught.fields?.decisionText : undefined;
      if (fieldError && index >= 0) setErrors({ [index]: fieldError });
      else setFormError("Some changes didn’t save. " + messageOf(caught));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Section
      id="decisions"
      title="Decisions"
      count={decisions.length}
      actions={
        !editing && (
          <Button
            variant="ghost"
            size="sm"
            icon="edit"
            onClick={() => {
              setDraft(rows.length ? rows.map((row) => ({ id: row.id, text: row.decision_text })) : [{ id: null, text: "" }]);
              setErrors({});
              setFormError(undefined);
              setEditing(true);
            }}
          >
            {decisions.length ? "Edit" : "Add decision"}
          </Button>
        )
      }
    >
      <AnimatePresence mode="wait" initial={false}>
        {editing ? (
          <Presence key="edit" className="surface flex flex-col gap-4 p-5 sm:p-7">
            {formError && <Alert tone="error">{formError}</Alert>}
            {draft.map((decision, index) => (
              <div key={index} className="flex items-end gap-2">
                <TextField
                  className="flex-1"
                  label={"Decision " + (index + 1)}
                  value={decision.text}
                  disabled={saving}
                  error={errors[index]}
                  onChange={(event) => setDraft(draft.map((d, i) => (i === index ? { ...d, text: event.target.value } : d)))}
                />
                <Button
                  variant="ghost"
                  icon="trash"
                  aria-label={"Remove decision " + (index + 1)}
                  disabled={saving}
                  onClick={() => {
                    setDraft(draft.filter((_, i) => i !== index));
                    setErrors({});
                  }}
                />
              </div>
            ))}
            <div>
              <Button variant="ghost" size="sm" icon="plus" disabled={saving} onClick={() => setDraft([...draft, { id: null, text: "" }])}>
                Add another
              </Button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="primary" loading={saving} onClick={save}>
                Save decisions
              </Button>
              <Button variant="ghost" disabled={saving} onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </Presence>
        ) : (
          <Presence key="view">
            {decisions.length ? (
              <ol className="surface flex flex-col py-2">
                {decisions.map((decision, index) => (
                  <li key={rows[index].id} className="flex gap-4 px-5 py-4 sm:px-7 divide-y">
                    <span className="pt-1.5 font-mono text-timestamp text-lilac-ink">{String(index + 1).padStart(2, "0")}</span>
                    <p className="font-serif text-summary">{decision}</p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="surface px-5 py-5 text-ink-muted sm:px-7">No decisions were recorded in this meeting.</p>
            )}
          </Presence>
        )}
      </AnimatePresence>
    </Section>
  );
}

type ItemsSectionProps = {
  rows: ActionItemRow[];
  setItemRows: (update: (rows: ActionItemRow[]) => ActionItemRow[]) => void;
  today: string;
  meetingId: string;
  analysing: boolean;
  analysed: boolean;
};

function ActionItemsSection({ rows, setItemRows, today, meetingId, analysing, analysed }: ItemsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ row: ActionItemRow; index: number } | null>(null);
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [undoing, setUndoing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const itemMotion = useSafeMotion(motionTokens.distance.sm);
  const items = rows.map(toActionItem);

  function markPending(id: string, on: boolean) {
    setPending((current) => {
      const next = new Set(current);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function replaceRow(row: ActionItemRow) {
    setItemRows((current) => current.map((r) => (r.id === row.id ? row : r)));
  }

  // Status changes show at once and roll back if the API says no
  async function changeStatus(item: ActionItem, status: ItemStatus) {
    if (pending.has(item.id)) return;
    setSaveError(null);
    markPending(item.id, true);
    const previous = rows.find((r) => r.id === item.id);
    setItemRows((current) => current.map((r) => (r.id === item.id ? { ...r, progress_state: status } : r)));
    try {
      const { actionItem } = await api<{ actionItem: ActionItemRow }>(`/api/action-items/${item.id}`, {
        method: "PATCH",
        body: actionItemBody({ status }),
      });
      replaceRow(actionItem);
      announceActionItemsChanged();
    } catch (caught) {
      if (previous) replaceRow(previous);
      setSaveError("The status didn’t change. " + messageOf(caught));
    } finally {
      markPending(item.id, false);
    }
  }

  async function remove(item: ActionItem, index: number) {
    if (pending.has(item.id)) return;
    setSaveError(null);
    markPending(item.id, true);
    try {
      await api(`/api/action-items/${item.id}`, { method: "DELETE" });
      const removed = rows.find((r) => r.id === item.id);
      setItemRows((current) => current.filter((r) => r.id !== item.id));
      if (removed) setLastDeleted({ row: removed, index });
      announceActionItemsChanged();
    } catch (caught) {
      setSaveError("The action item wasn’t deleted. " + messageOf(caught));
    } finally {
      markPending(item.id, false);
    }
  }

  // The API has no restore, so undo adds the same item back (it gets a new id)
  async function undo() {
    if (!lastDeleted) return;
    const { row, index } = lastDeleted;
    const item = toActionItem(row);
    setUndoing(true);
    setSaveError(null);
    try {
      const { actionItem } = await api<{ actionItem: ActionItemRow }>(`/api/meetings/${meetingId}/action-items`, {
        method: "POST",
        body: actionItemBody({
          text: item.text,
          owner: item.owner,
          ownerNote: item.ownerNote,
          due: item.due,
          dueNote: item.dueNote,
          status: item.status,
          quote: item.quote,
          timestamp: item.timestamp,
        }),
      });
      setItemRows((current) => {
        const next = [...current];
        next.splice(Math.min(index, next.length), 0, actionItem);
        return next;
      });
      setLastDeleted(null);
      announceActionItemsChanged();
    } catch (caught) {
      setSaveError("The action item couldn’t be restored. " + messageOf(caught));
    } finally {
      setUndoing(false);
    }
  }

  async function save(values: EditorValues, existing: ActionItem | null) {
    const owner = values.owner || null;
    const due = values.due || null;
    const fields = actionItemBody({ text: values.text, owner, due, status: values.status });
    if (existing) {
      // A value a person typed resolves the AI's review flag (null clears it); a blank keeps it.
      const body = { ...fields, ...(owner ? { ownerNote: null } : {}), ...(due ? { dueNote: null } : {}) };
      const { actionItem } = await api<{ actionItem: ActionItemRow }>(`/api/action-items/${existing.id}`, { method: "PATCH", body });
      replaceRow(actionItem);
    } else {
      const { actionItem } = await api<{ actionItem: ActionItemRow }>(`/api/meetings/${meetingId}/action-items`, { method: "POST", body: fields });
      setItemRows((current) => [...current, actionItem]);
    }
    announceActionItemsChanged();
    setEditingId(null);
  }

  const adding = editingId === "new";

  return (
    <Section
      id="action-items"
      title="Action items"
      count={analysing ? undefined : items.length}
      actions={
        !adding &&
        !analysing && (
          <Button size="sm" icon="plus" onClick={() => setEditingId("new")}>
            Add action item
          </Button>
        )
      }
    >
      <AnimatePresence initial={false}>
        {saveError && (
          <Presence key="save-error">
            <Alert
              tone="error"
              action={
                <Button variant="ghost" size="sm" onClick={() => setSaveError(null)}>
                  Dismiss
                </Button>
              }
            >
              {saveError}
            </Alert>
          </Presence>
        )}
        {lastDeleted && (
          <Presence key="undo">
            <Alert
              tone="success"
              title="Action item deleted."
              action={
                <Button variant="ghost" size="sm" loading={undoing} onClick={undo}>
                  Undo
                </Button>
              }
            />
          </Presence>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait" initial={false}>
        {analysing && items.length === 0 ? (
          <Presence key="skeleton" aria-hidden="true" className="flex flex-col gap-3">
            {[0, 1].map((n) => (
              <div key={n} className="surface flex gap-3 p-4">
                <Skeleton className="size-5" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </Presence>
        ) : (
          <Presence key="list" className="relative flex flex-col gap-3">
            {/* popLayout takes a removed card out of the flow at once, so the cards below slide up while it fades. */}
            <AnimatePresence mode="popLayout" initial={false}>
              {items.map((item, index) => (
                <motion.div key={item.id} layout="position" {...itemMotion} transition={springs.snappy}>
                  <AnimatePresence mode="wait" initial={false}>
                    {editingId === item.id ? (
                      <Presence key="edit">
                        <ActionItemEditor initial={item} onSave={(values) => save(values, item)} onCancel={() => setEditingId(null)} />
                      </Presence>
                    ) : (
                      <Presence key="view">
                        <ActionItemCard
                          item={item}
                          today={today}
                          onToggle={(done) => changeStatus(item, done ? "done" : "todo")}
                          onStatusChange={(status) => changeStatus(item, status)}
                          actions={
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                icon="edit"
                                aria-label={"Edit: " + item.text}
                                disabled={pending.has(item.id)}
                                onClick={() => setEditingId(item.id)}
                              />
                              <Button
                                variant="ghost"
                                size="sm"
                                icon="trash"
                                aria-label={"Delete: " + item.text}
                                disabled={pending.has(item.id)}
                                onClick={() => remove(item, index)}
                              />
                            </>
                          }
                        />
                      </Presence>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
              {adding && (
                <motion.div key="new" layout="position" {...itemMotion} transition={springs.snappy}>
                  <ActionItemEditor initial={null} onSave={(values) => save(values, null)} onCancel={() => setEditingId(null)} />
                </motion.div>
              )}
              {items.length === 0 && !adding && (
                <motion.div key="empty" layout="position" {...itemMotion} transition={springs.snappy}>
                  <EmptyState
                    icon="list"
                    title={analysed ? "No action items in this meeting" : "No action items yet"}
                    action={
                      <Button icon="plus" onClick={() => setEditingId("new")}>
                        Add action item
                      </Button>
                    }
                  >
                    {analysed
                      ? "The transcript didn’t assign any tasks. You can still add one by hand."
                      : "Add one by hand, or try the analysis again."}
                  </EmptyState>
                </motion.div>
              )}
            </AnimatePresence>
          </Presence>
        )}
      </AnimatePresence>
    </Section>
  );
}

type EditorValues = { text: string; owner: string; due: string; status: ItemStatus };

/** API field names, as 422 responses key them, mapped onto the editor's error slots. */
const API_FIELDS: Record<string, "text" | "owner" | "due"> = { title: "text", owner: "owner", actionDate: "due" };

function ActionItemEditor({ initial, onSave, onCancel }: { initial: ActionItem | null; onSave: (values: EditorValues) => Promise<void>; onCancel: () => void }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [due, setDue] = useState(initial?.due ?? "");
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? "todo");
  const [errors, setErrors] = useState<FieldErrors<"text" | "owner" | "due">>({});
  const [formError, setFormError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const next = actionItemErrors({ text, owner, due });
    setErrors(next);
    setFormError(undefined);
    if (hasErrors(next)) return;
    setSaving(true);
    try {
      await onSave({ text: text.trim(), owner: owner.trim(), due, status });
    } catch (caught) {
      const fieldErrors: FieldErrors<"text" | "owner" | "due"> = {};
      const other: string[] = [];
      if (caught instanceof ApiRequestError && caught.fields) {
        for (const [key, message] of Object.entries(caught.fields)) {
          if (!message) continue;
          if (API_FIELDS[key]) fieldErrors[API_FIELDS[key]] = message;
          else other.push(message);
        }
      }
      setErrors(fieldErrors);
      if (other.length) setFormError(other.join(" "));
      else if (!hasErrors(fieldErrors)) setFormError(messageOf(caught));
      setSaving(false);
    }
  }

  return (
    <form noValidate onSubmit={submit} className="surface flex flex-col gap-4 p-5 shadow-[var(--elev-2),0_0_0_2px_var(--accent)]">
      <p className="text-heading">{initial ? "Edit action item" : "New action item"}</p>
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField label="What needs doing" value={text} disabled={saving} onChange={(event) => setText(event.target.value)} error={errors.text} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Owner"
          optional
          value={owner}
          disabled={saving}
          onChange={(event) => setOwner(event.target.value)}
          hint="Leave blank if the transcript doesn’t say."
          error={errors.owner}
        />
        <TextField label="Due date" optional type="date" value={due} disabled={saving} onChange={(event) => setDue(event.target.value)} error={errors.due} />
        <label className="flex flex-col gap-2">
          <span className="text-label">Status</span>
          <Select controlSize="md" className="w-full" value={status} disabled={saving} onChange={(event) => setStatus(event.target.value as ItemStatus)}>
            {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex gap-3">
        <Button type="submit" variant="primary" loading={saving}>
          {initial ? "Save action item" : "Add action item"}
        </Button>
        <Button variant="ghost" disabled={saving} onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function TranscriptSection({ transcript }: { transcript: string }) {
  const lines = transcript.split("\n").length;
  return (
    <Section id="transcript" title="Transcript">
      <details className="group surface">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-5 py-4 text-label focus-ring [&::-webkit-details-marker]:hidden">
          <span>
            Original transcript <span className="font-normal text-ink-muted">· {plural(lines, "line")} · stored exactly as uploaded</span>
          </span>
          <Icon name="chevronDown" className="text-ink-muted transition-transform duration-120 group-open:rotate-180" />
        </summary>
        <pre className="max-h-[480px] overflow-auto rounded-b-lg bg-paper-sunk p-5 font-mono shadow-inset text-transcript whitespace-pre-wrap text-ink">
          {transcript}
        </pre>
      </details>
    </Section>
  );
}
