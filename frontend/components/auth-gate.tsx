"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-provider";

/**
 * Shows children only to a signed-in user and sends anyone else to the login page.
 * Children stay rendered (hidden) while auth resolves, so server rendering and Suspense streaming still work.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const ready = !loading && Boolean(user);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  return (
    <>
      {!ready && (
        <div role="status" className="flex min-h-dvh items-center justify-center text-ink-muted">
          Loading…
        </div>
      )}
      <div hidden={!ready}>{children}</div>
    </>
  );
}

/** For login and register: a signed-in user is sent straight to their meetings. */
export function GuestGate({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.replace("/meetings");
  }, [loading, user, router]);

  return <>{children}</>;
}
