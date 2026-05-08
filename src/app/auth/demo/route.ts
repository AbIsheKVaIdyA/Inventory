import { NextResponse } from "next/server";

import { DEMO_ACCESS_COOKIE, DEMO_ACCESS_VALUE } from "@/lib/demo-access";

/**
 * Temporary demo-only bypass into dashboard without Supabase auth.
 */
export async function POST(request: Request) {
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(DEMO_ACCESS_COOKIE, DEMO_ACCESS_VALUE, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });
  return response;
}

export async function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  response.cookies.set(DEMO_ACCESS_COOKIE, DEMO_ACCESS_VALUE, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 8,
  });
  return response;
}
