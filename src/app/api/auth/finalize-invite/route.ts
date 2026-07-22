import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { INVITE_PASSWORD_SET_KEY } from "@/lib/auth-invite-metadata";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

const STRONG_PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z\d]).{12,}$/;

/**
 * Completes invite registration: sets password and confirms email.
 * Prefer service-role update so password login works after the invite session ends
 * (client-only updateUser can leave users unable to signInWithPassword).
 */
export async function POST(request: Request) {
  let password = "";
  try {
    const body = (await request.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (!STRONG_PASSWORD_REGEX.test(password)) {
    return NextResponse.json(
      {
        error:
          "Use at least 12 characters with 1 uppercase, 1 lowercase, 1 number, and 1 symbol.",
      },
      { status: 400 }
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anon) {
    return NextResponse.json({ error: "Server auth is not configured." }, { status: 500 });
  }

  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.id || !user.email) {
    return NextResponse.json(
      { error: "Invite session expired. Open a fresh invite link from your email." },
      { status: 401 }
    );
  }

  const email = user.email.trim().toLowerCase();
  const nextMetadata = {
    ...(typeof user.user_metadata === "object" && user.user_metadata
      ? user.user_metadata
      : {}),
    [INVITE_PASSWORD_SET_KEY]: true,
  };

  if (serviceKey) {
    const admin = createClient(url, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { error: adminError } = await admin.auth.admin.updateUserById(user.id, {
      password,
      email_confirm: true,
      user_metadata: nextMetadata,
    });
    if (adminError) {
      return NextResponse.json({ error: adminError.message }, { status: 400 });
    }
  } else {
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: nextMetadata,
    });
    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    ok: true,
    email,
    usedServiceRole: Boolean(serviceKey),
  });
}
