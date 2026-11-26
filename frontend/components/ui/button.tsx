import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "chrome";
export type ButtonSize = "md" | "sm";

// No borders: primary and danger are filled with a coloured shadow, secondary is a raised surface,
// ghost is flat until hovered, chrome sits on the dark header bar.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-on-accent shadow-accent hover:not-disabled:bg-accent-hover",
  secondary: "bg-paper-raised text-ink shadow-1 hover:not-disabled:shadow-2",
  ghost: "bg-transparent text-accent hover:not-disabled:bg-accent-soft",
  danger: "bg-danger text-on-danger shadow-1 hover:not-disabled:shadow-[inset_0_0_0_40px_#0000001f,var(--elev-2)]",
  chrome: "bg-transparent text-on-chrome-muted hover:not-disabled:bg-chrome-raised hover:not-disabled:text-on-chrome",
};

function sizeClasses(size: ButtonSize, variant: ButtonVariant, iconOnly: boolean): string {
  if (size === "md") return iconOnly ? "size-11" : "h-11 px-5 text-[15px]";
  if (iconOnly) return "size-9 max-sm:size-11";
  return cn("h-9 text-label max-sm:h-11", variant === "ghost" || variant === "chrome" ? "px-2.5" : "px-3.5");
}

export function buttonClasses(options: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  iconOnly?: boolean;
  className?: string;
}): string {
  const { variant = "secondary", size = "md", loading = false, iconOnly = false, className } = options;
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md font-[550] leading-5",
    "transition-[background-color,box-shadow,color,transform] duration-150 ease-out focus-ring active:not-disabled:translate-y-px active:not-disabled:scale-[0.98]",
    "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
    VARIANTS[variant],
    sizeClasses(size, variant, iconOnly),
    loading && "disabled:cursor-progress disabled:opacity-100",
    className,
  );
}

function Spinner() {
  return <span aria-hidden="true" className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent" />;
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner, keeps the label and disables the button so it can't submit twice. */
  loading?: boolean;
  icon?: IconName;
};

export function Button({ variant, size, loading = false, icon, className, children, type = "button", disabled, ...rest }: ButtonProps) {
  const iconOnly = children == null && Boolean(icon);
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, loading, iconOnly, className })}
      {...rest}
    >
      {loading ? <Spinner /> : icon ? <Icon name={icon} /> : null}
      {children}
    </button>
  );
}

type ButtonLinkProps = {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  className?: string;
  children: ReactNode;
};

export function ButtonLink({ href, variant, size, icon, className, children }: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses({ variant, size, className })}>
      {icon ? <Icon name={icon} /> : null}
      {children}
    </Link>
  );
}
