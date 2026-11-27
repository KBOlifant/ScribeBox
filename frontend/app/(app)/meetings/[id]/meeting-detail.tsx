"use client";

import { useState, type FormEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Presence } from "@/components/motion";
import { ActionItemCard } from "@/components/ui/action-item-card";
import { Alert } from "@/components/ui/alert";
import { AnalysisStatus } from "@/components/ui/analysis-status";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { BackLink, PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { TextAreaField, TextField } from "@/components/ui/text-field";
import { useSafeMotion } from "@/hooks/use-reduced-motion";
import { formatLongDate, plural } from "@/lib/format";
import { wait } from "@/lib/mock";
import { motionTokens, springs } from "@/lib/motion-tokens";
import { needsReview, STATUS_LABELS, type ActionItem, type AnalysisState, type ItemStatus, type Meeting } from "@/lib/types";
import { actionItemErrors, hasErrors, type FieldErrors } from "@/lib/validation";

type Props = { meeting: Meeting; initialItems: ActionItem[]; today: string };

export function MeetingDetail({ meeting, initialItems, today }: Props) {
  const [analysis, setAnalysis] = useState<AnalysisState>(meeting.analysis.state);
  const [retrying, setRetrying] = useState(false);
  const [summary, setSummary] = useState(meeting.summary);
  const [decisions, setDecisions] = useState(meeting.decisions);
  const [items, setItems] = useState(initialItems);

  const analysing = analysis === "working" || analysis === "queued";
  const reviewCount = items.filter((item) => item.status !== "done" && needsReview(item)).length;
  const source = meeting.source.kind === "file" ? meeting.source.name : "Pasted text";

  async function retry() {
    setRetrying(true);
    await wait(900);
    setRetrying(false);
    setAnalysis("working");
  }

  const doneLine = [
    meeting.analysis.finishedAt ? "Analysed " + meeting.analysis.finishedAt : "Analysis complete",
    plural(items.length, "action item"),
    reviewCount ? reviewCount + " need review" : null,
  ]
    .filter(Boolean)
    .join(" · ");

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
          <Presence key={analysis}>
            <AnalysisStatus
              state={analysis}
              retrying={retrying}
              onRetry={retry}
              detail={analysis === "done" ? doneLine : undefined}
              meta={analysis === "failed" && meeting.analysis.attempts ? "Tried " + plural(meeting.analysis.attempts, "time") : undefined}
            />
          </Presence>
        </AnimatePresence>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {analysing ? (
          <Presence key="skeleton">
            <ResultsSkeleton />
          </Presence>
        ) : summary !== null ? (
          <Presence key="results" className="flex flex-col gap-10">
            <SummarySection summary={summary} onSave={setSummary} />
            <DecisionsSection decisions={decisions} onSave={setDecisions} />
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

      <ActionItemsSection items={items} onChange={setItems} today={today} meetingId={meeting.id} analysing={analysing} analysed={summary !== null} />

      <TranscriptSection transcript={meeting.transcript} />
    </div>
  );
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

function SummarySection({ summary, onSave }: { summary: string; onSave: (value: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(summary);
  const [edited, setEdited] = useState(false);
  const [error, setError] = useState<string>();

  function save() {
    const value = draft.trim();
    if (!value) return setError("Write a summary, or cancel to keep the current one.");
    if (value.length > 4000) return setError("Keep the summary under 4,000 characters.");
    onSave(value);
    setEdited(true);
    setEditing(false);
    setError(undefined);
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
              <TextAreaField label="Summary" variant="prose" rows={6} value={draft} onChange={(event) => setDraft(event.target.value)} error={error} />
              <div className="flex gap-3">
                <Button variant="primary" onClick={save}>
                  Save summary
                </Button>
                <Button
                  variant="ghost"
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

function DecisionsSection({ decisions, onSave }: { decisions: string[]; onSave: (value: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string[]>(decisions);

  function save() {
    onSave(draft.map((d) => d.trim()).filter(Boolean));
    setEditing(false);
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
              setDraft(decisions.length ? decisions : [""]);
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
            {draft.map((decision, index) => (
              <div key={index} className="flex items-end gap-2">
                <TextField
                  className="flex-1"
                  label={"Decision " + (index + 1)}
                  value={decision}
                  onChange={(event) => setDraft(draft.map((d, i) => (i === index ? event.target.value : d)))}
                />
                <Button
                  variant="ghost"
                  icon="trash"
                  aria-label={"Remove decision " + (index + 1)}
                  onClick={() => setDraft(draft.filter((_, i) => i !== index))}
                />
              </div>
            ))}
            <div>
              <Button variant="ghost" size="sm" icon="plus" onClick={() => setDraft([...draft, ""])}>
                Add another
              </Button>
            </div>
            <div className="flex gap-3 pt-2">
              <Button variant="primary" onClick={save}>
                Save decisions
              </Button>
              <Button variant="ghost" onClick={() => setEditing(false)}>
                Cancel
              </Button>
            </div>
          </Presence>
        ) : (
          <Presence key="view">
            {decisions.length ? (
              <ol className="surface flex flex-col py-2">
                {decisions.map((decision, index) => (
                  <li key={index} className="flex gap-4 px-5 py-4 sm:px-7 divide-y">
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
  items: ActionItem[];
  onChange: (items: ActionItem[]) => void;
  today: string;
  meetingId: string;
  analysing: boolean;
  analysed: boolean;
};

function ActionItemsSection({ items, onChange, today, meetingId, analysing, analysed }: ItemsSectionProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [lastDeleted, setLastDeleted] = useState<{ item: ActionItem; index: number } | null>(null);
  const itemMotion = useSafeMotion(motionTokens.distance.sm);

  function update(id: string, patch: Partial<ActionItem>) {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  }

  function remove(id: string) {
    const index = items.findIndex((item) => item.id === id);
    setLastDeleted({ item: items[index], index });
    onChange(items.filter((item) => item.id !== id));
  }

  function undo() {
    if (!lastDeleted) return;
    const next = [...items];
    next.splice(lastDeleted.index, 0, lastDeleted.item);
    onChange(next);
    setLastDeleted(null);
  }

  function save(values: EditorValues, existing: ActionItem | null) {
    const owner = values.owner || null;
    const due = values.due || null;
    if (existing) {
      update(existing.id, {
        text: values.text,
        owner,
        due,
        status: values.status,
        // A value a person typed resolves the AI's review flag; a blank keeps it.
        ownerNote: owner ? undefined : existing.ownerNote,
        dueNote: due ? undefined : existing.dueNote,
      });
    } else {
      onChange([...items, { id: crypto.randomUUID(), meetingId, text: values.text, owner, due, status: values.status }]);
    }
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
        {lastDeleted && (
          <Presence key="undo">
            <Alert
              tone="success"
              title="Action item deleted."
              action={
                <Button variant="ghost" size="sm" onClick={undo}>
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
              {items.map((item) => (
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
                          onToggle={(done) => update(item.id, { status: done ? "done" : "todo" })}
                          onStatusChange={(status) => update(item.id, { status })}
                          actions={
                            <>
                              <Button variant="ghost" size="sm" icon="edit" aria-label={"Edit: " + item.text} onClick={() => setEditingId(item.id)} />
                              <Button variant="ghost" size="sm" icon="trash" aria-label={"Delete: " + item.text} onClick={() => remove(item.id)} />
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

function ActionItemEditor({ initial, onSave, onCancel }: { initial: ActionItem | null; onSave: (values: EditorValues) => void; onCancel: () => void }) {
  const [text, setText] = useState(initial?.text ?? "");
  const [owner, setOwner] = useState(initial?.owner ?? "");
  const [due, setDue] = useState(initial?.due ?? "");
  const [status, setStatus] = useState<ItemStatus>(initial?.status ?? "todo");
  const [errors, setErrors] = useState<FieldErrors<"text" | "owner" | "due">>({});

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = actionItemErrors({ text, owner, due });
    setErrors(next);
    if (hasErrors(next)) return;
    onSave({ text: text.trim(), owner: owner.trim(), due, status });
  }

  return (
    <form noValidate onSubmit={submit} className="surface flex flex-col gap-4 p-5 shadow-[var(--elev-2),0_0_0_2px_var(--accent)]">
      <p className="text-heading">{initial ? "Edit action item" : "New action item"}</p>
      <TextField label="What needs doing" value={text} onChange={(event) => setText(event.target.value)} error={errors.text} />
      <div className="grid gap-4 sm:grid-cols-3">
        <TextField
          label="Owner"
          optional
          value={owner}
          onChange={(event) => setOwner(event.target.value)}
          hint="Leave blank if the transcript doesn’t say."
          error={errors.owner}
        />
        <TextField label="Due date" optional type="date" value={due} onChange={(event) => setDue(event.target.value)} error={errors.due} />
        <label className="flex flex-col gap-2">
          <span className="text-label">Status</span>
          <Select controlSize="md" className="w-full" value={status} onChange={(event) => setStatus(event.target.value as ItemStatus)}>
            {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <div className="flex gap-3">
        <Button type="submit" variant="primary">
          {initial ? "Save action item" : "Add action item"}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
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
