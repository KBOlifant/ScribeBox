"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { api, ApiRequestError } from "@/lib/api";

type ApiData<T> = {
  data: T | null;
  error: ApiRequestError | null;
  loading: boolean;
  /** Fetches again, e.g. after a change or from a "Try again" button */
  reload: () => void;
  /** Replaces the data locally after a change the page already knows about */
  setData: (update: T | ((current: T | null) => T)) => void;
};

/**
 * Loads data from the API once the user is signed in. Pages render inside AuthGate before auth
 * finishes, so this waits for the Firebase user instead of firing a request without a token.
 * Pass null as the path to wait without fetching.
 */
export function useApiData<T>(path: string | null): ApiData<T> {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<ApiRequestError | null>(null);
  const [version, setVersion] = useState(0);
  // The request that last finished. Loading means the current request hasn't finished yet
  const [finishedKey, setFinishedKey] = useState<string | null>(null);
  // The user is part of the key, so after a sign-out and sign-in nobody sees the previous user's data
  const key = path && user ? `${user.uid}:${path}#${version}` : null;

  useEffect(() => {
    if (authLoading || !user || !path || !key) return;
    let cancelled = false;
    api<T>(path)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        setError(null);
      })
      .catch((caught: unknown) => {
        if (cancelled) return;
        setError(caught instanceof ApiRequestError ? caught : new ApiRequestError(0, "Something went wrong. Try again."));
      })
      .finally(() => {
        if (!cancelled) setFinishedKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [path, key, user, authLoading]);

  // Waiting for sign-in also counts as loading
  const loading = key === null ? Boolean(path) : finishedKey !== key;
  // Data from an earlier user is never shown while the new user's data loads
  const sameUser = finishedKey?.startsWith(`${user?.uid}:`) ?? false;

  const reload = useCallback(() => setVersion((current) => current + 1), []);
  const update = useCallback((next: T | ((current: T | null) => T)) => {
    setData((current) => (typeof next === "function" ? (next as (current: T | null) => T)(current) : next));
  }, []);

  return { data: sameUser ? data : null, error: sameUser ? error : null, loading, reload, setData: update };
}
