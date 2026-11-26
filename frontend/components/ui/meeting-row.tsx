import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { dateParts, formatRowDate } from "@/lib/format";
import type { Meeting } from "@/lib/types";
import { Icon } from "./icon";
import { ReviewFlag } from "./review-flag";

/** Where the analysis stands, as plain text with a glyph: no tag. */
function Meta({ tone = "neutral", children }: { tone?: "neutral" | "accent" | "danger"; children: ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap text-label",
        tone === "accent" ? "text-accent" : tone === "danger" ? "text-danger" : "text-ink-muted",
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
      <Meta tone="accent">
        <span aria-hidden="true" className="size-2 animate-pulse-dot rounded-full bg-accent" />
        Analysing
      </Meta>
    );
  } else if (state === "failed" || state === "invalid") {
    chips = (
      <Meta tone="danger">
        <Icon name="alert" size={16} />
        Analysis failed
      </Meta>
    );
  } else if (state === "rate_limited") {
    chips = (
      <Meta>
        <Icon name="clock" size={16} />
        Model busy, retry later
      </Meta>
    );
  } else {
    chips = (
      <>
        {reviewCount > 0 && <ReviewFlag>{reviewCount + " to review"}</ReviewFlag>}
        <Meta>
          <Icon name="list" size={16} />
          {openCount + " open"}
        </Meta>
      </>
    );
  }

  return (
    <Link
      href={"/meetings/" + meeting.id}
      className="group surface lift flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3.5 text-ink focus-ring sm:flex-nowrap sm:px-5"
    >
      <span aria-hidden="true" className="flex w-12 shrink-0 flex-col items-center rounded-md bg-lilac-soft py-1.5 text-lilac-ink">
        <span className="text-xl leading-6 font-semibold tabular-nums">{day}</span>
        <span className="text-[13px] leading-4 font-semibold tracking-[0.08em] uppercase">{month}</span>
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-heading">{meeting.title}</span>
        <span className="text-label font-normal text-ink-muted">{formatRowDate(meeting.date) + " · " + source}</span>
      </span>
      <span className="flex w-full flex-wrap items-center gap-2 pl-[68px] sm:w-auto sm:justify-end sm:gap-4 sm:pl-0">{chips}</span>
      <Icon name="chevronRight" className="hidden text-ink-muted transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-accent sm:block" />
    </Link>
  );
}
