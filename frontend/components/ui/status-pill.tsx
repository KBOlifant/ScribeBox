import { cn } from "@/lib/cn";
import { STATUS_LABELS, type ItemStatus } from "@/lib/types";
import { Icon, type IconName } from "./icon";

const STYLES: Record<ItemStatus, { className: string; icon: IconName }> = {
  todo: { className: "text-ink-muted", icon: "todo" },
  in_progress: { className: "text-accent", icon: "progress" },
  done: { className: "text-success", icon: "done" },
};

/** Read-only status: a glyph and a word, no tag. Each status has its own glyph, so it reads without colour. */
export function StatusPill({ status }: { status: ItemStatus }) {
  const s = STYLES[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap text-label", s.className)}>
      <Icon name={s.icon} size={16} />
      {STATUS_LABELS[status]}
    </span>
  );
}
