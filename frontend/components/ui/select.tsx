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
          "w-full cursor-pointer appearance-none rounded-md bg-paper-raised pl-3.5 pr-9 text-ink shadow-1 transition-shadow duration-150 ease-out hover:shadow-2 focus-ring",
          controlSize === "sm" ? "h-9 text-label max-sm:h-11" : "h-11 text-body",
        )}
        {...rest}
      >
        {children}
      </select>
      <Icon name="chevronDown" size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted" />
    </span>
  );
}
