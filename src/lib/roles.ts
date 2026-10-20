export type AppRole = "pending" | "admin" | "it" | "department" | "scanner";

export type AppArea = "scan" | "requests" | "department" | "users";

export type NavItem = {
  href: string;
  label: string;
  active?: boolean;
};

export const ROLE_LABELS: Record<AppRole, string> = {
  admin: "Admin",
  it: "ECS IT",
  department: "Department",
  scanner: "Scan team",
  pending: "No access yet",
};

/** Order shown in the admin role picker. */
export const ASSIGNABLE_ROLES: AppRole[] = ["admin", "it", "department", "scanner", "pending"];

const AREA_ROLES: Record<AppArea, AppRole[]> = {
  scan: ["admin", "scanner"],
  requests: ["admin", "it"],
  department: ["admin", "department"],
  users: ["admin"],
};

export function parseRole(value: unknown): AppRole {
  return typeof value === "string" && value in ROLE_LABELS ? (value as AppRole) : "pending";
}

export function canAccess(role: AppRole, area: AppArea): boolean {
  return AREA_ROLES[area].includes(role);
}

export function homePathForRole(role: AppRole): string {
  switch (role) {
    case "admin":
      return "/admin";
    case "scanner":
      return "/dashboard";
    case "it":
      return "/requests";
    case "department":
      return "/department";
    default:
      return "/no-access";
  }
}

export function navForRole(role: AppRole, activeHref: string): NavItem[] {
  const items: NavItem[] = [];
  if (canAccess(role, "users")) {
    items.push({ href: "/admin", label: "Overview" });
  }
  if (canAccess(role, "scan")) {
    items.push(
      { href: "/dashboard", label: "Scan queue" },
      { href: "/dashboard/room-submissions", label: "Room submissions" }
    );
  }
  if (canAccess(role, "requests")) {
    items.push({ href: "/requests", label: "Device requests" });
  }
  if (canAccess(role, "department")) {
    items.push({
      href: "/department",
      label: role === "department" ? "My department" : "Departments",
    });
  }
  if (canAccess(role, "users")) {
    items.push(
      { href: "/admin/users", label: "Users" },
      { href: "/admin/rooms", label: "Room mapping" }
    );
  }
  return items.map((item) => ({ ...item, active: item.href === activeHref }));
}
