import type { ReactNode } from "react";

type SectionProps = {
  id: string;
  title: string;
  count?: number;
  actions?: ReactNode;
  children: ReactNode;
};

/** A titled block on the meeting page (Summary, Decisions, Action items, Transcript). */
export function Section({ id, title, count, actions, children }: SectionProps) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id={id} className="text-title">
          {title}
          {count != null && <span className="ml-2 font-semibold text-lilac-ink tabular-nums">{count}</span>}
        </h2>
        {actions && <div className="flex gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
