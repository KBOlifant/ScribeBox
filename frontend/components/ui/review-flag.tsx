import type { ReactNode } from "react";
import { Icon } from "./icon";

/**
 * Marks a value the AI could not confirm from the transcript ("Owner not stated").
 * The yellow highlighter stroke is decorative; the words carry the meaning.
 */
export function ReviewFlag({ children = "Needs review", title = "Not confirmed by the transcript. Check and edit." }: { children?: ReactNode; title?: string }) {
  return (
    <span
      title={title}
      className="inline-flex max-w-full items-center gap-1 rounded-sm bg-review-soft pt-0.5 pr-2 pb-[3px] pl-1.5 text-caption font-[550] text-review-ink shadow-[inset_0_-2px_0_var(--review)]"
    >
      <Icon name="highlighter" size={14} />
      <span className="min-w-0">{children}</span>
    </span>
  );
}
