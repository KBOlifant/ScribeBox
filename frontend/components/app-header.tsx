"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { ButtonLink } from "./ui/button";

const NAV = [
  { href: "/meetings", label: "Meetings" },
  { href: "/action-items", label: "Action items" },
  { href: "/account", label: "Account" },
];

export function AppHeader({ userName, openCount }: { userName: string; openCount: number }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-line bg-paper-raised">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6">
        <Link href="/meetings" className="rounded-sm text-xl font-semibold tracking-[-0.03em] focus-ring">
          ScribeBox
        </Link>
        <nav aria-label="Main" className="order-3 -mx-1 flex w-full gap-1 overflow-x-auto sm:order-none sm:mx-0 sm:w-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-[550] transition-colors duration-120 ease-out focus-ring",
                  active ? "bg-accent-soft text-accent" : "text-ink-muted hover:bg-paper-sunk hover:text-ink",
                )}
              >
                {item.label}
                {item.href === "/action-items" && openCount > 0 && (
                  <span className="rounded-full bg-paper-sunk px-1.5 text-caption text-ink tabular-nums">{openCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-label font-normal text-ink-muted sm:inline">{userName}</span>
          <ButtonLink href="/login" variant="ghost" size="sm" icon="logout">
            Log out
          </ButtonLink>
        </div>
      </div>
    </header>
  );
}
