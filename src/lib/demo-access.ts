/**
 * Temporary demo bypass for presentations.
 * Remove this file and related references after demo usage.
 */
export const DEMO_ACCESS_COOKIE = "inventory_demo_access";
export const DEMO_ACCESS_VALUE = "1";

export function hasDemoAccessCookie(value: string | undefined): boolean {
  return value === DEMO_ACCESS_VALUE;
}
