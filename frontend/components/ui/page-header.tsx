import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="group mb-4 inline-flex items-center gap-1.5 rounded-sm text-label text-ink-muted hover:text-accent focus-ring">
      <Icon name="arrowLeft" size={16} className="transition-transform duration-150 ease-out group-hover:-translate-x-0.5" />
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
        {description && <p className="mt-2 text-[17px] leading-6 text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap gap-3">{actions}</div>}
    </div>
  );
}
