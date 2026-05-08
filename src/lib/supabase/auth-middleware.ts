import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { DEMO_ACCESS_COOKIE, hasDemoAccessCookie } from "@/lib/demo-access";

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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const hasDemoAccess = hasDemoAccessCookie(request.cookies.get(DEMO_ACCESS_COOKIE)?.value);

  if ((path.startsWith("/dashboard") || path.startsWith("/set-password")) && !user && !hasDemoAccess) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", `${path}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (path === "/login" && (user || hasDemoAccess)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if ((path === "/" || path === "") && (user || hasDemoAccess)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  if ((path === "/" || path === "") && !user && !hasDemoAccess) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return response;
}
