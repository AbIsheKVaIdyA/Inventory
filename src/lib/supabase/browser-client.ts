import { createBrowserClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let anonClient: SupabaseClient | null = null;
let sessionRecovered = false;

function requireSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY"
    );
  }
  return { url, anon };
}

function isRefreshTokenError(error: { message?: string; code?: string } | null) {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "refresh_token_not_found" ||
    /invalid refresh token|refresh token not found/i.test(message)
  );
}

/** Clears a dead refresh token so the console stops looping AuthApiError. */
async function recoverFromInvalidRefreshToken(sb: SupabaseClient) {
  if (sessionRecovered || typeof window === "undefined") return;
  sessionRecovered = true;
  try {
    const { error } = await sb.auth.getUser();
    if (isRefreshTokenError(error)) {
      await sb.auth.signOut({ scope: "local" });
    }
  } catch (e: unknown) {
    const err = e as { message?: string; code?: string };
    if (isRefreshTokenError(err)) {
      await sb.auth.signOut({ scope: "local" });
    }
  }
}

export function getSupabaseBrowserClient() {
  const { url, anon } = requireSupabaseEnv();
  if (!client) {
    client = createBrowserClient(url, anon, {
      realtime: { params: { eventsPerSecond: 10 } },
    });
    void recoverFromInvalidRefreshToken(client);
  }
  return client;
}

/**
 * Public forms (e.g. /rooms): plain anon client — no cookie session / auto-refresh.
 * Avoids “Invalid Refresh Token” when leftover scan-login cookies exist.
 */
export function getSupabaseAnonBrowserClient() {
  const { url, anon } = requireSupabaseEnv();
  if (!anonClient) {
    anonClient = createClient(url, anon, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }
  return anonClient;
}

export function hasSupabaseConfig(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
