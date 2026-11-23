"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useState } from "react";
import { ActionItemCard } from "@/components/ui/action-item-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterBar, NO_OWNER, STATUS_FILTERS, type StatusFilter } from "@/components/ui/filter-bar";
import { isOverdue, plural } from "@/lib/format";
import type { ActionItem } from "@/lib/types";

type Props = { items: ActionItem[]; meetingTitles: Record<string, string>; today: string };

const STATUS_VALUES = STATUS_FILTERS.map(([value]) => value);

function readStatus(value: string | null): StatusFilter {
  return STATUS_VALUES.includes(value as StatusFilter) ? (value as StatusFilter) : "open";
}

export function ActionItemsView({ items: initialItems, meetingTitles, today }: Props) {
  const pathname = usePathname();
  const params = useSearchParams();
  const [items, setItems] = useState(initialItems);

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

  function update(id: string, patch: Partial<ActionItem>) {
    setItems(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
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
      {visible.length > 0 ? (
        <div className="flex flex-col gap-3">
          {visible.map((item) => (
            <ActionItemCard
              key={item.id}
              item={item}
              today={today}
              meeting={{ title: meetingTitles[item.meetingId] ?? "Meeting", href: "/meetings/" + item.meetingId }}
              onToggle={(done) => update(item.id, { status: done ? "done" : "todo" })}
              onStatusChange={(value) => update(item.id, { status: value })}
            />
          ))}
        </div>
      ) : filtered ? (
        <EmptyState
          icon="list"
          title="Nothing matches these filters"
          action={<Button onClick={() => replaceQuery("")}>Clear filters</Button>}
        >
          Try another status or owner, or clear the filters to see everything open.
        </EmptyState>
      ) : (
        <EmptyState icon="check" title="No open action items">
          Everything from your meetings is done. New items appear here after you analyse a transcript.
        </EmptyState>
      )}
    </div>
  );
}
