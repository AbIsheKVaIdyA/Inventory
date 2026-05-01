import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/**
 * Invite / magic-link / OAuth redirect handling.
 * Add this URL under Supabase Auth → Redirect URLs: {SITE_URL}/auth/callback
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const otpType = searchParams.get("type");
  const next = searchParams.get("next")?.startsWith("/")
    ? searchParams.get("next")!
    : "/dashboard";
  const passwordSetupRedirect = `/set-password?next=${encodeURIComponent(next)}`;
  const validOtpTypes: EmailOtpType[] = [
    "email",
    "recovery",
    "invite",
    "email_change",
    "magiclink",
  ];

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return NextResponse.redirect(`${origin}/login?error=config`);
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(toSet) {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    if (otpType === "invite" || otpType === "recovery") {
      return NextResponse.redirect(`${origin}${passwordSetupRedirect}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  if (tokenHash && otpType) {
    if (!validOtpTypes.includes(otpType as EmailOtpType)) {
      return NextResponse.redirect(`${origin}/login?error=invalid_auth_link`);
    }

    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });

    if (error) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error.message)}`
      );
    }

    if (otpType === "invite" || otpType === "recovery") {
      return NextResponse.redirect(`${origin}${passwordSetupRedirect}`);
    }

    return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(`${origin}/login?error=invalid_auth_link`);
}
