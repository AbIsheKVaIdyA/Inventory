"use client";

import { useCallback, useEffect, useState } from "react";

import { isStoredUserName, STORAGE_USER_KEY, type StoredUserName } from "@/lib/constants";

export function useSelectedUser() {
  const [user, setUser] = useState<StoredUserName | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const raw = localStorage.getItem(STORAGE_USER_KEY);
      if (isStoredUserName(raw)) {
        setUser(raw);
      } else if (typeof raw === "string" && raw.length > 0) {
        localStorage.removeItem(STORAGE_USER_KEY);
      }
      setHydrated(true);
    });
  }, []);

  const setSelectedUser = useCallback((next: StoredUserName) => {
    localStorage.setItem(STORAGE_USER_KEY, next);
    setUser(next);
  }, []);

  const clearUser = useCallback(() => {
    localStorage.removeItem(STORAGE_USER_KEY);
    setUser(null);
  }, []);

  return {
    user,
    hydrated,
    setSelectedUser,
    clearUser,
  };
}
