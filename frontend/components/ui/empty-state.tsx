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
    <div className={cn("surface flex flex-col items-center gap-1.5 px-6 py-14 text-center text-ink-muted", className)}>
      <span className="mb-3 grid size-14 place-items-center rounded-full bg-lilac-soft text-lilac-ink">
        <Icon name={icon} size={24} />
      </span>
      <p className="text-heading text-ink">{title}</p>
      {children && <p className="max-w-[400px] text-[15px] leading-6">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
