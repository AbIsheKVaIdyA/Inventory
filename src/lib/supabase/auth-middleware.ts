import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/** Edge middleware budget — fail open to login redirect instead of 504. */
const AUTH_CHECK_TIMEOUT_MS = 8_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Supabase auth check timed out")), ms);
    }),
  ]);
}

function isRefreshTokenError(error: { message?: string; code?: string } | null | undefined) {
  if (!error) return false;
  const code = error.code ?? "";
  const message = error.message ?? "";
  return (
    code === "refresh_token_not_found" ||
    /invalid refresh token|refresh token not found/i.test(message)
  );
}

/** Drop leftover sb-* auth cookies so refresh is not retried forever. */
function clearSupabaseAuthCookies(request: NextRequest, response: NextResponse) {
  for (const cookie of request.cookies.getAll()) {
    if (
      cookie.name.startsWith("sb-") ||
      cookie.name.includes("auth-token")
    ) {
      response.cookies.set(cookie.name, "", {
        maxAge: 0,
        path: "/",
      });
    }
  }
}

/** Refreshes the session cookie and runs basic route guards for the App Router. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options)
        );
      },
    },
  });

  // Do not run code between createServerClient and getClaims() — session refresh depends on it.
  let isAuthenticated = false;

  try {
    const { data, error } = await withTimeout(
      supabase.auth.getClaims(),
      AUTH_CHECK_TIMEOUT_MS
    );
    if (error) {
      isAuthenticated = false;
      if (isRefreshTokenError(error)) {
        clearSupabaseAuthCookies(request, response);
      }
    } else {
      isAuthenticated = !!data?.claims?.sub;
    }
  } catch (e: unknown) {
    isAuthenticated = false;
    const err = e as { message?: string; code?: string };
    if (isRefreshTokenError(err)) {
      clearSupabaseAuthCookies(request, response);
    }
  }

  const path = request.nextUrl.pathname;

  if ((path.startsWith("/dashboard") || path.startsWith("/set-password")) && !isAuthenticated) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (path === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if ((path === "/" || path === "") && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if ((path === "/" || path === "") && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
