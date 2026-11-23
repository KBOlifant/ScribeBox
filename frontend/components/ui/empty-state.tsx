import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

type EmptyStateProps = {
  title: string;
  children?: ReactNode;
  icon?: IconName;
  action?: ReactNode;
  className?: string;
};

/** Why a list is empty, and the next step. */
export function EmptyState({ title, children, icon = "inbox", action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-1 rounded-lg border-[1.5px] border-dashed border-line-strong px-6 py-12 text-center text-ink-muted", className)}>
      <span className="mb-2 grid size-11 place-items-center rounded-full bg-paper-sunk">
        <Icon name={icon} size={20} />
      </span>
      <p className="text-heading text-ink">{title}</p>
      {children && <p className="max-w-[380px] text-sm leading-5">{children}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
