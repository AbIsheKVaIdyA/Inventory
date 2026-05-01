import type { User } from "@supabase/supabase-js";

/** Set on first successful password save after invite; used to detect repeat invite links. */
export const INVITE_PASSWORD_SET_KEY = "invite_password_set" as const;

export function hasCompletedInvitePassword(user: User | null | undefined): boolean {
  return user?.user_metadata?.[INVITE_PASSWORD_SET_KEY] === true;
}
