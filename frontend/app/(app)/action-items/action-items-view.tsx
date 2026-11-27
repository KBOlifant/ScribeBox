"use client";

import { AnimatePresence, motion } from "motion/react";
import { usePathname, useSearchParams } from "next/navigation";
import { useRef, useState } from "react";
import { Presence } from "@/components/motion";
import { announceActionItemsChanged } from "@/components/app-header";
import { ActionItemCard } from "@/components/ui/action-item-card";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, NO_OWNER, STATUS_FILTERS, type StatusFilter } from "@/components/ui/filter-bar";
import { useApiData } from "@/hooks/use-api-data";
import { useSafeMotion } from "@/hooks/use-reduced-motion";
import { actionItemBody, api, ApiRequestError, todayIso, toActionItem, type ActionItemRow } from "@/lib/api";
import { isOverdue, plural } from "@/lib/format";
import { motionTokens, springs } from "@/lib/motion-tokens";
import type { ActionItem } from "@/lib/types";
import { ListSkeleton } from "./list-skeleton";

type Props = {
  items: ActionItem[];
  meetingTitles: Record<string, string>;
  today: string;
};
type ItemPatch = Partial<Omit<ActionItem, "id" | "meetingId">>;

const STATUS_VALUES = STATUS_FILTERS.map(([value]) => value);

/** Cards past this index enter together, so a long list never waits on its stagger. */
const STAGGER_CAP = 8;

function readStatus(value: string | null): StatusFilter {
  return STATUS_VALUES.includes(value as StatusFilter) ? (value as StatusFilter) : "open";
}

/** Loads my action items from the API, then hands them to the list. */
export function ActionItemsView() {
  const { data, error, loading, reload, setData } = useApiData<{
    actionItems: ActionItemRow[];
  }>("/api/action-items");
  // Bumped per item on every change, so only the latest request for an item may roll it back
  const requests = useRef(new Map<string, number>());
  // Per item, the last row the server confirmed and the request that confirmed it (0 = as loaded).
  // A failed save rolls back to this, not to whatever the page showed when that click happened
  const confirmed = useRef(new Map<string, { request: number; row: ActionItemRow }>());
  const [saveError, setSaveError] = useState<string | null>(null);

  if (!data) {
    if (error && !loading) {
      return (
        <Alert
          tone="error"
          title="Couldn't load your action items"
          action={
            <Button size="sm" onClick={reload}>
              Try again
            </Button>
          }
        >
          {error.message}
        </Alert>
      );
    }
    return <ListSkeleton />;
  }

  const rows = data.actionItems;
  const items = rows.map(toActionItem);
  const meetingTitles: Record<string, string> = {};
  for (const row of rows) {
    if (row.meeting_title) meetingTitles[row.meeting_id] = row.meeting_title;
  }

  // Shows the change at once, saves it, and puts the item back if the save fails
  async function update(id: string, patch: ItemPatch) {
    const shown = rows.find((row) => row.id === id);
    if (!shown) return;
    // The first change to an item starts from the row as loaded: nothing is in flight for it yet
    if (!confirmed.current.has(id)) confirmed.current.set(id, { request: 0, row: shown });
    const request = (requests.current.get(id) ?? 0) + 1;
    requests.current.set(id, request);
    setSaveError(null);
    setData((current) => ({
      actionItems: (current?.actionItems ?? []).map((row) => (row.id === id ? applyPatch(row, patch) : row)),
    }));

    let saved: ActionItemRow;
    try {
      const { actionItem } = await api<{ actionItem: ActionItemRow }>("/api/action-items/" + encodeURIComponent(id), {
        method: "PATCH",
        body: actionItemBody(patch),
      });
      saved = actionItem;
    } catch (caught) {
      const last = confirmed.current.get(id);
      // A later change already saved, so this failure no longer matters
      if (last && last.request > request) return;
      if (requests.current.get(id) === request && last) {
        // The saved row lacks the meeting fields the list query adds, so keep those
        setData((current) => ({
          actionItems: (current?.actionItems ?? []).map((row) =>
            row.id === id ? { ...last.row, meeting_title: row.meeting_title, meeting_date: row.meeting_date } : row,
          ),
        }));
      }
      setSaveError(caught instanceof ApiRequestError ? caught.message : "Couldn't save that change. Try again.");
      return;
    }

    const last = confirmed.current.get(id);
    // Responses can arrive out of order: never let an older save replace a newer confirmed one
    if (!last || last.request < request) confirmed.current.set(id, { request, row: saved });
    announceActionItemsChanged();
    if (requests.current.get(id) !== request) return;
    setData((current) => ({
      actionItems: (current?.actionItems ?? []).map((row) =>
        row.id === id ? { ...row, ...saved, meeting_title: row.meeting_title, meeting_date: row.meeting_date } : row,
      ),
    }));
  }

  return (
    <div className="flex flex-col gap-4">
      {saveError && (
        <Alert
          tone="error"
          title="That change wasn't saved"
          action={
            <Button size="sm" variant="ghost" onClick={() => setSaveError(null)}>
              Dismiss
            </Button>
          }
        >
          {saveError}
        </Alert>
      )}
      <ActionItemList
        items={items}
        meetingTitles={meetingTitles}
        today={todayIso()}
        onUpdate={(id, patch) => void update(id, patch)}
      />
    </div>
  );
}

/** The row with an optimistic change applied, in the API's own field names. */
function applyPatch(row: ActionItemRow, patch: ItemPatch): ActionItemRow {
  const next = { ...row };
  if (patch.text !== undefined) next.title = patch.text;
  if (patch.owner !== undefined) next.owner = patch.owner;
  if (patch.ownerNote !== undefined) next.owner_note = patch.ownerNote ?? null;
  if (patch.due !== undefined) next.action_date = patch.due;
  if (patch.dueNote !== undefined) next.due_note = patch.dueNote ?? null;
  if (patch.status !== undefined) next.progress_state = patch.status;
  return next;
}

function ActionItemList({
  items,
  meetingTitles,
  today,
  onUpdate,
}: Props & { onUpdate: (id: string, patch: ItemPatch) => void }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const safe = useSafeMotion(motionTokens.distance.sm);

  const status = readStatus(params.get("status"));
  const owner = params.get("owner") ?? "";
  const overdueOnly = params.get("overdue") === "1";

  function setFilters(next: { status?: StatusFilter; owner?: string; overdue?: boolean }) {
    const query = new URLSearchParams(params.toString());
    const s = next.status ?? status;
    const o = next.owner ?? owner;
    const od = next.overdue ?? overdueOnly;
    if (s === "open") query.delete("status");
    else query.set("status", s);
    if (o) query.set("owner", o);
    else query.delete("owner");
    if (od) query.set("overdue", "1");
    else query.delete("overdue");
    replaceQuery(query.toString());
  }

  // The native History API updates useSearchParams without a server round trip, so filtering is instant.
  function replaceQuery(qs: string) {
    window.history.replaceState(null, "", qs ? pathname + "?" + qs : pathname);
  }

  const owners = [...new Set(items.map((item) => item.owner).filter((name): name is string => Boolean(name)))].sort();
  const counts = {
    open: items.filter((item) => item.status !== "done").length,
    todo: items.filter((item) => item.status === "todo").length,
    in_progress: items.filter((item) => item.status === "in_progress").length,
    done: items.filter((item) => item.status === "done").length,
    overdue: items.filter((item) => isOverdue(item.due, item.status, today)).length,
  };

  const visible = items
    .filter((item) => (status === "open" ? item.status !== "done" : item.status === status))
    .filter((item) => (owner === "" ? true : owner === NO_OWNER ? !item.owner : item.owner === owner))
    .filter((item) => !overdueOnly || isOverdue(item.due, item.status, today))
    .sort((a, b) => {
      const lateA = isOverdue(a.due, a.status, today) ? 0 : 1;
      const lateB = isOverdue(b.due, b.status, today) ? 0 : 1;
      if (lateA !== lateB) return lateA - lateB;
      if (a.due && b.due) return a.due.localeCompare(b.due);
      if (a.due) return -1;
      if (b.due) return 1;
      return a.text.localeCompare(b.text);
    });

  const filtered = status !== "open" || owner !== "" || overdueOnly;

  return (
    <div className="flex flex-col gap-6">
      <FilterBar
        status={status}
        onStatusChange={(value) => setFilters({ status: value })}
        owners={owners}
        owner={owner}
        onOwnerChange={(value) => setFilters({ owner: value })}
        overdueOnly={overdueOnly}
        onOverdueChange={(value) => setFilters({ overdue: value })}
        counts={counts}
      />
      <p className="text-label font-normal text-ink-muted" aria-live="polite">
        {"Showing " + plural(visible.length, "action item")}
      </p>
      <AnimatePresence mode="wait">
        {visible.length > 0 ? (
          <Presence key="list" className="relative flex flex-col gap-3">
            {/* popLayout takes leaving cards out of the flow at once, so the rest close the gap. */}
            <AnimatePresence mode="popLayout">
              {visible.map((item, index) => (
                <motion.div
                  key={item.id}
                  layout="position"
                  initial={safe.initial}
                  animate={{
                    ...safe.animate,
                    transition: {
                      ...springs.snappy,
                      delay: Math.min(index, STAGGER_CAP) * motionTokens.stagger.item,
                    },
                  }}
                  exit={{ ...safe.exit, transition: springs.snappy }}
                >
                  <ActionItemCard
                    item={item}
                    today={today}
                    meeting={{
                      title: meetingTitles[item.meetingId] ?? "Meeting",
                      href: "/meetings/" + item.meetingId,
                    }}
                    onToggle={(done) => onUpdate(item.id, { status: done ? "done" : "todo" })}
                    onStatusChange={(value) => onUpdate(item.id, { status: value })}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </Presence>
        ) : items.length === 0 ? (
          <Presence key="empty">
            <EmptyState icon="list" title="No action items yet">
              Action items appear here after you analyse a meeting transcript, or when you add one to a meeting by hand.
            </EmptyState>
          </Presence>
        ) : filtered ? (
          <Presence key="no-match">
            <EmptyState
              icon="list"
              title="Nothing matches these filters"
              action={<Button onClick={() => replaceQuery("")}>Clear filters</Button>}
            >
              Try another status or owner, or clear the filters to see everything open.
            </EmptyState>
          </Presence>
        ) : (
          <Presence key="none">
            <EmptyState icon="check" title="No open action items">
              Everything from your meetings is done. New items appear here after you analyse a transcript.
            </EmptyState>
          </Presence>
        )}
      </AnimatePresence>
    </div>
  );
}
