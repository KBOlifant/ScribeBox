import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-3 inline-flex items-center gap-1 rounded-sm text-label text-ink-muted hover:text-ink focus-ring">
      <Icon name="arrowLeft" size={14} />
      {children}
    </Link>
  );
}

type PageHeaderProps = {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: ReactNode;
};

export function PageHeader({ title, description, actions, back }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {back}
        <h1 className="text-display text-balance">{title}</h1>
        {description && <p className="mt-1 text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
