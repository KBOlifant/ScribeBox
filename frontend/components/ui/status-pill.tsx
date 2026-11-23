import { cn } from "@/lib/cn";
import { STATUS_LABELS, type ItemStatus } from "@/lib/types";
import { Icon, type IconName } from "./icon";

const STYLES: Record<ItemStatus, { className: string; icon: IconName }> = {
  todo: { className: "bg-paper-raised text-ink-muted shadow-[inset_0_0_0_1px_var(--line-strong)]", icon: "todo" },
  in_progress: { className: "bg-accent-soft text-accent", icon: "progress" },
  done: { className: "bg-success-soft text-success", icon: "done" },
};

/** Read-only status label. Each status has its own glyph, so it reads without colour. */
export function StatusPill({ status }: { status: ItemStatus }) {
  const s = STYLES[status];
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full pl-2 pr-2.5 text-caption font-[550]", s.className)}>
      <Icon name={s.icon} size={14} />
      {STATUS_LABELS[status]}
    </span>
  );
}
