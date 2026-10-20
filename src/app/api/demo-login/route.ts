import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

import { INVITE_PASSWORD_SET_KEY } from "@/lib/auth-invite-metadata";
import { DEMO_ACCOUNTS, DEMO_LOGINS_ENABLED, type DemoAccount } from "@/lib/demo-accounts";
import { homePathForRole } from "@/lib/roles";
import { createSupabaseServerClient } from "@/lib/supabase/server-client";

/** Creates the demo user on first use; otherwise rotates its password. */
async function ensureDemoUser(
  admin: SupabaseClient,
  account: DemoAccount,
  password: string
): Promise<string> {
  const user_metadata = { full_name: account.fullName, [INVITE_PASSWORD_SET_KEY]: true };
  const created = await admin.auth.admin.createUser({
    email: account.email,
    password,
    email_confirm: true,
    user_metadata,
  });
  if (created.data.user) return created.data.user.id;
  if (created.error?.code !== "email_exists") {
    throw created.error ?? new Error("Could not create demo user.");
  }

  // auth.admin.listUsers fails on this project ("Database error finding users"); profiles carry the email.
  const { data: profile, error: profileError } = await admin
    .from("user_profiles")
    .select("user_id")
    .eq("email", account.email)
    .maybeSingle();
  if (profileError) throw new Error(profileError.message);
  if (!profile?.user_id) throw new Error(`Demo user ${account.email} exists but has no profile.`);

  const { error } = await admin.auth.admin.updateUserById(profile.user_id, {
    password,
    email_confirm: true,
    user_metadata,
  });
  if (error) throw error;
  return profile.user_id;
}

export async function POST(request: Request) {
  if (!DEMO_LOGINS_ENABLED) {
    return NextResponse.json({ error: "Demo sign-in is turned off." }, { status: 404 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json(
      { error: "Demo sign-in needs SUPABASE_SERVICE_ROLE_KEY on the server." },
      { status: 500 }
    );
  }

  let key = "";
  try {
    const body = (await request.json()) as { key?: unknown };
    key = typeof body.key === "string" ? body.key : "";
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  const account = DEMO_ACCOUNTS.find((a) => a.key === key);
  if (!account) {
    return NextResponse.json({ error: "Unknown demo account." }, { status: 400 });
  }

  const admin = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const password = `Demo-${randomBytes(18).toString("base64url")}9a!`;

  const { error: rolesCheckError } = await admin.from("user_profiles").select("user_id").limit(1);
  if (rolesCheckError) {
    const missing = rolesCheckError.code === "42P01" || rolesCheckError.code === "PGRST205";
    return NextResponse.json(
      {
        error: missing
          ? "Roles are not set up yet — run supabase/migrations/0010_roles_departments.sql in the Supabase SQL Editor first."
          : rolesCheckError.message,
      },
      { status: 500 }
    );
  }

  try {
    const userId = await ensureDemoUser(admin, account, password);

    const { error: profileError } = await admin.from("user_profiles").upsert(
      {
        user_id: userId,
        email: account.email,
        full_name: account.fullName,
        role: account.role,
        department_code: account.departmentCode,
      },
      { onConflict: "user_id" }
    );
    if (profileError) throw new Error(profileError.message);

    const supabase = await createSupabaseServerClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: account.email,
      password,
    });
    if (signInError) throw signInError;

    return NextResponse.json({ redirect: homePathForRole(account.role) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Demo sign-in failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
