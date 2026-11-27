"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/motion-tokens";
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
      <div role="group" aria-label="Status" className="inline-flex flex-wrap gap-1 rounded-lg bg-paper-sunk p-1 shadow-inset">
        {STATUS_FILTERS.map(([value, label]) => {
          const on = status === value;
          return (
            <button
              key={value}
              type="button"
              aria-pressed={on}
              onClick={() => onStatusChange(value)}
              className={cn(
                "relative inline-flex h-9 cursor-pointer items-center rounded-md px-3.5 text-label transition-[background-color,box-shadow,color] duration-150 ease-out focus-ring max-sm:h-11",
                on ? "text-accent" : "text-ink-muted hover:bg-paper-raised/60 hover:text-ink",
              )}
            >
              {on && (
                <motion.span
                  layoutId="status-filter-active"
                  aria-hidden="true"
                  transition={springs.snappy}
                  className="absolute inset-0 rounded-md bg-paper-raised shadow-1"
                />
              )}
              <span className="relative z-10 inline-flex items-center gap-1.5">
                {label}
                {counts?.[value] != null && <span className={cn("font-semibold tabular-nums", on ? "text-lilac-ink" : "text-ink-muted")}>{counts[value]}</span>}
              </span>
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
          "inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md px-3.5 text-label transition-[background-color,box-shadow,color] duration-150 ease-out focus-ring max-sm:h-11",
          overdueOnly ? "bg-danger-soft text-danger shadow-[inset_0_0_0_1.5px_var(--danger)]" : "bg-paper-raised text-ink shadow-1 hover:shadow-2",
        )}
      >
        <Icon name="clock" size={16} />
        Overdue
        {counts?.overdue != null && <span className="font-semibold tabular-nums">{counts.overdue}</span>}
      </button>
    </div>
  );
}
