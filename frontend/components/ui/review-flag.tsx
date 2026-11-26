import type { ReactNode } from "react";
import { Icon } from "./icon";

/**
 * Marks a value the AI could not confirm from the transcript ("Owner not stated").
 * Plain text, not a tag: the highlighter glyph and a wavy underline in the review colour carry the signal,
 * and the words carry the meaning.
 */
export function ReviewFlag({ children = "Needs review", title = "Not confirmed by the transcript. Check and edit." }: { children?: ReactNode; title?: string }) {
  return (
    <span title={title} className="inline-flex max-w-full items-center gap-1.5 font-[550] text-review-ink">
      <Icon name="highlighter" size={16} className="shrink-0" />
      <span className="min-w-0 underline decoration-review decoration-wavy decoration-[1.5px] underline-offset-[5px]">{children}</span>
    </span>
  );
}
