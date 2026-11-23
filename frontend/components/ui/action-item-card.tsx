import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { formatShortDate, isOverdue } from "@/lib/format";
import { STATUS_LABELS, type ActionItem, type ItemStatus } from "@/lib/types";
import { Icon } from "./icon";
import { ReviewFlag } from "./review-flag";
import { Select } from "./select";
import { StatusPill } from "./status-pill";

const CHECKBOX = cn(
  "mt-px grid size-5 shrink-0 cursor-pointer appearance-none place-content-center rounded-sm border-[1.5px] border-line-strong bg-paper-raised",
  "transition-colors duration-120 ease-out hover:border-success checked:border-success checked:bg-success focus-ring",
  "before:h-[5px] before:w-2.5 before:-translate-y-px before:-rotate-45 before:border-2 before:border-t-0 before:border-r-0 before:border-paper-raised before:opacity-0 before:content-[''] checked:before:opacity-100",
);

type ActionItemCardProps = {
  item: ActionItem;
  /** ISO date used to work out overdue items. */
  today: string;
  /** Shown in cross-meeting lists. */
  meeting?: { title: string; href: string };
  onToggle?: (done: boolean) => void;
  /** When set, the status pill becomes a select. */
  onStatusChange?: (status: ItemStatus) => void;
  /** Extra controls at the end of the row (edit, delete). */
  actions?: ReactNode;
};

/** One extracted task: what, who and when, its status, and the transcript line it came from. */
export function ActionItemCard({ item, today, meeting, onToggle, onStatusChange, actions }: ActionItemCardProps) {
  const done = item.status === "done";
  const late = isOverdue(item.due, item.status, today);

  let due: ReactNode;
  if (item.due) {
    due = (
      <span className={cn("inline-flex items-center gap-1", late ? "font-[550] text-danger" : "text-ink")}>
        <Icon name={late ? "alert" : "calendar"} size={14} />
        {late ? "Overdue · " + formatShortDate(item.due) : "Due " + formatShortDate(item.due)}
      </span>
    );
  } else if (item.dueNote) {
    due = <ReviewFlag>{item.dueNote}</ReviewFlag>;
  } else {
    due = (
      <span className="inline-flex items-center gap-1">
        <Icon name="calendar" size={14} />
        No date mentioned
      </span>
    );
  }

  return (
    <div className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 gap-y-3 rounded-lg border border-line bg-paper-raised p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:gap-y-0">
      <input
        type="checkbox"
        className={CHECKBOX}
        checked={done}
        readOnly={!onToggle}
        onChange={(event) => onToggle?.(event.target.checked)}
        aria-label={(done ? "Mark as not done: " : "Mark as done: ") + item.text}
      />
      <div className="flex min-w-0 flex-col gap-2">
        <p className={cn("text-heading", done ? "text-ink-muted line-through decoration-1" : "text-ink")}>{item.text}</p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-label font-normal text-ink-muted">
          {item.owner ? (
            <span className="inline-flex items-center gap-1 text-ink">
              <Icon name="user" size={14} />
              {item.owner}
            </span>
          ) : (
            <ReviewFlag>{item.ownerNote ?? "Owner not stated"}</ReviewFlag>
          )}
          {due}
          {meeting && (
            <Link href={meeting.href} className="inline-flex items-center gap-1 rounded-sm underline-offset-2 hover:text-ink hover:underline focus-ring">
              <Icon name="file" size={14} />
              {meeting.title}
            </Link>
          )}
        </div>
        {item.quote && (
          <p className="flex items-baseline gap-2 font-serif text-quote text-ink-muted italic">
            {item.timestamp && <span className="shrink-0 font-mono text-timestamp not-italic">{item.timestamp}</span>}
            <span>“{item.quote}”</span>
          </p>
        )}
      </div>
      <div className="col-start-2 flex items-center gap-1 sm:col-start-3 sm:self-start">
        {onStatusChange ? (
          <Select
            aria-label={"Status of: " + item.text}
            value={item.status}
            onChange={(event) => onStatusChange(event.target.value as ItemStatus)}
            className="mr-1"
          >
            {(Object.keys(STATUS_LABELS) as ItemStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </Select>
        ) : (
          <StatusPill status={item.status} />
        )}
        {actions}
      </div>
    </div>
  );
}
