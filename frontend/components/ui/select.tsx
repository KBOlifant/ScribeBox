import type { SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";
import { Icon } from "./icon";

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> & {
  /** sm (32px) for rows and toolbars, md (40px) beside text fields. */
  controlSize?: "sm" | "md";
};

export function Select({ className, controlSize = "sm", children, ...rest }: SelectProps) {
  return (
    <span className={cn("relative inline-flex", className)}>
      <select
        className={cn(
          "w-full cursor-pointer appearance-none rounded-md border border-line-strong bg-paper-raised pl-3 pr-8 text-ink focus-ring",
          controlSize === "sm" ? "h-8 text-label max-sm:h-10" : "h-10 text-body",
        )}
        {...rest}
      >
        {children}
      </select>
      <Icon name="chevronDown" size={14} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-ink-muted" />
    </span>
  );
}
