import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

const TONES = {
  error: { box: "bg-danger-soft", icon: "text-danger", glyph: "alert" },
  info: { box: "bg-accent-soft", icon: "text-accent", glyph: "info" },
  success: { box: "bg-success-soft", icon: "text-success", glyph: "done" },
} as const;

type AlertProps = {
  tone?: keyof typeof TONES;
  title?: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

/** A form- or page-level message. Errors announce themselves (role="alert"). */
export function Alert({ tone = "info", title, children, action, className }: AlertProps) {
  const t = TONES[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-3 rounded-lg px-4 py-3.5 text-[15px] leading-6 text-ink", t.box, className)}
    >
      <Icon name={t.glyph} size={20} className={cn("mt-0.5", t.icon)} />
      <div className="min-w-0 flex-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={title ? "mt-0.5" : undefined}>{children}</div>}
      </div>
      {action && <div className="-my-1 shrink-0">{action}</div>}
    </div>
  );
}
