import { cn } from "@/lib/cn";
import type { ItemStatus } from "@/lib/types";
import { Icon } from "./icon";
import { Select } from "./select";

export type StatusFilter = "open" | ItemStatus;

export const STATUS_FILTERS: Array<[StatusFilter, string]> = [
  ["open", "All open"],
  ["todo", "To do"],
  ["in_progress", "In progress"],
  ["done", "Done"],
];

export const NO_OWNER = "__none";

type FilterBarProps = {
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  /** Owners that appear on the signed-in user's own items only. */
  owners: string[];
  /** "" for any owner, NO_OWNER for items without one. */
  owner: string;
  onOwnerChange: (owner: string) => void;
  overdueOnly: boolean;
  onOverdueChange: (on: boolean) => void;
  counts?: Partial<Record<StatusFilter | "overdue", number>>;
};

export function FilterBar({ status, onStatusChange, owners, owner, onOwnerChange, overdueOnly, onOverdueChange, counts }: FilterBarProps) {
  return (
    <div role="group" aria-label="Filter action items" className="flex flex-wrap items-center gap-3">
      <div role="group" aria-label="Status" className="inline-flex flex-wrap gap-0.5 rounded-md bg-paper-sunk p-[3px]">
        {STATUS_FILTERS.map(([value, label]) => {
          const on = status === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => onStatusChange(value)}
              className={cn(
                "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-3 text-label transition-colors duration-120 ease-out focus-ring max-sm:h-9",
                on ? "bg-paper-raised text-accent shadow-[inset_0_0_0_1px_var(--accent)]" : "text-ink-muted hover:text-ink",
              )}
            >
              {label}
              {counts?.[value] != null && <span className="font-normal tabular-nums">{counts[value]}</span>}
            </button>
          );
        })}
      </div>
      <Select aria-label="Owner" value={owner} onChange={(event) => onOwnerChange(event.target.value)}>
        <option value="">Any owner</option>
        {owners.map((name) => (
          <option key={name} value={name}>
            {name}
          </option>
        ))}
        <option value={NO_OWNER}>No owner (needs review)</option>
      </Select>
      <button
        type="button"
        aria-pressed={overdueOnly}
        onClick={() => onOverdueChange(!overdueOnly)}
        className={cn(
          "inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-md border px-3 text-label transition-colors duration-120 ease-out focus-ring max-sm:h-10",
          overdueOnly ? "border-danger bg-danger-soft text-danger" : "border-line-strong bg-paper-raised text-ink hover:bg-paper-sunk",
        )}
      >
        <Icon name="clock" size={14} />
        Overdue
        {counts?.overdue != null && <span className="font-normal tabular-nums">{counts.overdue}</span>}
      </button>
    </div>
  );
}
