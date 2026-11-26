import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { AnalysisState } from "@/lib/types";
import { Button } from "./button";
import { Icon, type IconName } from "./icon";

const COPY: Record<Exclude<AnalysisState, "done">, { title: string; body: string; icon?: IconName; retry?: boolean }> = {
  queued: { icon: "clock", title: "Waiting to analyse", body: "Your transcript is saved. Analysis starts in a moment." },
  working: {
    title: "Reading the transcript",
    body: "Writing the summary, decisions and action items. This usually takes under a minute, and you can leave this page.",
  },
  failed: {
    icon: "alert",
    title: "Analysis didn’t finish",
    body: "The AI service didn’t respond. Your transcript is saved, so nothing is lost.",
    retry: true,
  },
  rate_limited: {
    icon: "clock",
    title: "The free model is busy",
    body: "It has hit its rate limit. Your transcript is saved. Try again in about a minute.",
    retry: true,
  },
  invalid: {
    icon: "alert",
    title: "The AI’s answer didn’t pass our checks",
    body: "It returned something that didn’t match the expected format, so nothing was saved over your work. Try again, or add the details by hand.",
    retry: true,
  },
};

const BOX: Record<Exclude<AnalysisState, "done">, string> = {
  queued: "surface",
  working: "bg-accent-soft",
  failed: "bg-danger-soft",
  invalid: "bg-danger-soft",
  rate_limited: "bg-lilac-soft",
};

const ICON_COLOR: Record<Exclude<AnalysisState, "done">, string> = {
  queued: "text-ink-muted",
  working: "text-accent",
  failed: "text-danger",
  invalid: "text-danger",
  rate_limited: "text-lilac-ink",
};

type AnalysisStatusProps = {
  state: AnalysisState;
  /** Overrides the default body copy; for "done", the one-line summary. */
  detail?: ReactNode;
  /** Caption under the body, e.g. attempt count. */
  meta?: ReactNode;
  onRetry?: () => void;
  retrying?: boolean;
  className?: string;
};

/** Where the AI analysis is, and what to do when it fails. Always says the transcript is safe. */
export function AnalysisStatus({ state, detail, meta, onRetry, retrying, className }: AnalysisStatusProps) {
  if (state === "done") {
    return (
      <div role="status" className={cn("surface flex items-center gap-3 py-2.5 pr-2.5 pl-5", className)}>
        <Icon name="done" size={20} className="text-success" />
        <p className="min-w-0 flex-1 text-label font-normal text-ink-muted">{detail ?? "Analysis complete"}</p>
        {onRetry && (
          <Button variant="ghost" size="sm" icon="refresh" loading={retrying} onClick={onRetry}>
            Re-analyse
          </Button>
        )}
      </div>
    );
  }

  const copy = COPY[state];
  return (
    <div role="status" aria-live="polite" className={cn("flex flex-wrap items-start gap-3 rounded-lg p-5", BOX[state], className)}>
      <span className={cn("mt-px flex w-5 shrink-0 justify-center", ICON_COLOR[state])}>
        {copy.icon ? (
          <Icon name={copy.icon} size={20} />
        ) : (
          <span aria-hidden="true" className="m-[5px] block size-2.5 animate-pulse-dot rounded-full bg-accent" />
        )}
      </span>
      <div className="min-w-0 flex-[1_1_260px]">
        <p className="font-semibold">{copy.title}</p>
        <p className="mt-0.5 text-[15px] leading-6 text-ink-muted">{detail ?? copy.body}</p>
        {meta && <p className="mt-2 text-label font-normal text-ink-muted">{meta}</p>}
      </div>
      {copy.retry && onRetry && (
        <div className="ml-auto shrink-0">
          <Button size="sm" icon="refresh" loading={retrying} onClick={onRetry}>
            Try again
          </Button>
        </div>
      )}
    </div>
  );
}
