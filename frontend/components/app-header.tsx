"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import { useState } from "react";
import { auth } from "@/app/configs/firebaseconfig";
import { cn } from "@/lib/cn";
import { useAuth } from "./auth-provider";
import { Button } from "./ui/button";

const NAV = [
  { href: "/meetings", label: "Meetings" },
  { href: "/action-items", label: "Action items" },
  { href: "/account", label: "Account" },
];

export function AppHeader({ openCount }: { openCount: number }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [signingOut, setSigningOut] = useState(false);

  async function onLogOut() {
    setSigningOut(true);
    try {
      await signOut(auth);
      router.push("/login");
    } catch {
      setSigningOut(false);
    }
  }

  return (
    <header className="relative z-10 bg-chrome text-on-chrome shadow-chrome">
      <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3 sm:px-6 sm:py-3.5">
        <Link href="/meetings" className="inline-flex items-center gap-2 rounded-sm text-[22px] leading-7 font-semibold tracking-[-0.03em] focus-ring">
          <span aria-hidden="true" className="size-2.5 rounded-full bg-lilac" />
          ScribeBox
        </Link>
        <nav aria-label="Main" className="order-3 flex w-full gap-1 overflow-x-auto sm:order-none sm:w-auto">
          {NAV.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-3.5 text-[16px] font-[550] transition-colors duration-120 ease-out focus-ring",
                  active ? "bg-chrome-raised text-chrome-accent shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]" : "text-on-chrome-muted hover:bg-chrome-raised hover:text-on-chrome",
                )}
              >
                {item.label}
                {item.href === "/action-items" && openCount > 0 && (
                  <span className="text-[15px] font-semibold text-lilac tabular-nums">{openCount}</span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-[15px] text-on-chrome-muted sm:inline">{user?.displayName ?? user?.email}</span>
          <Button variant="chrome" size="sm" icon="logout" loading={signingOut} onClick={onLogOut}>
            Log out
          </Button>
        </div>
      </div>
    </header>
  );
}
