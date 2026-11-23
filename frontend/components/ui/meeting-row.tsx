import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { dateParts, formatRowDate } from "@/lib/format";
import type { Meeting } from "@/lib/types";
import { Icon } from "./icon";
import { ReviewFlag } from "./review-flag";

function Chip({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "danger"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-sm px-2 text-caption font-[550]",
        tone === "accent" ? "bg-accent-soft text-accent" : tone === "danger" ? "bg-danger-soft text-danger" : "bg-paper-sunk text-ink",
      )}
    >
      {children}
    </span>
  );
}

type MeetingRowProps = { meeting: Meeting; openCount: number; reviewCount: number };

/** A row in the meetings list: date, title, source and where its analysis stands. */
export function MeetingRow({ meeting, openCount, reviewCount }: MeetingRowProps) {
  const { day, month } = dateParts(meeting.date);
  const source = meeting.source.kind === "file" ? meeting.source.name : "Pasted text";
  const state = meeting.analysis.state;

  let chips: ReactNode;
  if (state === "working" || state === "queued") {
    chips = (
      <Chip tone="accent">
        <span aria-hidden="true" className="size-2 animate-pulse-dot rounded-full bg-accent" />
        Analysing
      </Chip>
    );
  } else if (state === "failed" || state === "invalid") {
    chips = (
      <Chip tone="danger">
        <Icon name="alert" size={14} />
        Analysis failed
      </Chip>
    );
  } else if (state === "rate_limited") {
    chips = (
      <Chip>
        <Icon name="clock" size={14} />
        Model busy, retry later
      </Chip>
    );
  } else {
    chips = (
      <>
        {reviewCount > 0 && <ReviewFlag>{reviewCount + " to review"}</ReviewFlag>}
        <Chip>
          <Icon name="list" size={14} />
          {openCount + " open"}
        </Chip>
      </>
    );
  }

  return (
    <Link
      href={"/meetings/" + meeting.id}
      className="group flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-paper-raised px-4 py-3 text-ink transition-colors duration-120 ease-out last:border-b-0 hover:bg-paper-sunk focus-visible:shadow-[inset_0_0_0_2px_var(--accent)] focus-visible:outline-hidden sm:flex-nowrap"
    >
      <span aria-hidden="true" className="flex w-11 shrink-0 flex-col items-center rounded-md bg-paper-sunk py-1 group-hover:bg-paper-raised">
        <span className="text-lg leading-[22px] font-semibold tabular-nums">{day}</span>
        <span className="text-[11px] leading-[14px] font-[550] tracking-[0.06em] text-ink-muted uppercase">{month}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-heading">{meeting.title}</span>
        <span className="text-caption text-ink-muted">{formatRowDate(meeting.date) + " · " + source}</span>
      </span>
      <span className="flex w-full flex-wrap items-center gap-2 pl-[60px] sm:w-auto sm:justify-end sm:pl-0">{chips}</span>
      <Icon name="chevronRight" className="hidden text-ink-muted sm:block" />
    </Link>
  );
}
