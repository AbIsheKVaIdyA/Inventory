import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/auth-middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    "/",
    "/dashboard",
    "/dashboard/:path*",
    "/requests",
    "/department",
    "/admin/:path*",
    "/no-access",
    "/login",
    "/set-password",
    "/auth/:path*",
  ],
};
