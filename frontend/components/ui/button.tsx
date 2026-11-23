import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "md" | "sm";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "border-accent bg-accent text-on-accent hover:not-disabled:border-accent-hover hover:not-disabled:bg-accent-hover",
  secondary: "border-line-strong bg-paper-raised text-ink hover:not-disabled:bg-paper-sunk",
  ghost: "border-transparent bg-transparent text-accent hover:not-disabled:bg-accent-soft",
  danger: "border-danger bg-danger text-on-danger hover:not-disabled:shadow-[inset_0_0_0_40px_#0000001f]",
};

function sizeClasses(size: ButtonSize, variant: ButtonVariant, iconOnly: boolean): string {
  if (size === "md") return iconOnly ? "size-10" : "h-10 px-4 text-sm";
  if (iconOnly) return "size-8 max-sm:size-10";
  return cn("h-8 text-[13px] max-sm:h-10", variant === "ghost" ? "px-2" : "px-3");
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
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md border font-[550] leading-5",
    "transition-colors duration-120 ease-out focus-ring disabled:cursor-not-allowed disabled:opacity-50",
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
