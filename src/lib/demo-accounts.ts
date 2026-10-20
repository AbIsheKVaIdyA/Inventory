import type { AppRole } from "@/lib/roles";

/** Shows one-click demo sign-in on /login. Turn off (unset) once roles are signed off. */
export const DEMO_LOGINS_ENABLED = process.env.NEXT_PUBLIC_DEMO_LOGINS === "1";

export type DemoAccount = {
  key: string;
  role: AppRole;
  label: string;
  description: string;
  /** Page the button lands on. */
  opens: string;
  email: string;
  fullName: string;
  departmentCode: string | null;
};

export const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    key: "admin",
    role: "admin",
    label: "Admin",
    description: "Everything + users & room mapping",
    opens: "Admin overview",
    email: "demo.admin@ecs-inventory.demo",
    fullName: "Demo Admin",
    departmentCode: null,
  },
  {
    key: "it",
    role: "it",
    label: "ECS IT",
    description: "Approve / reject device requests",
    opens: "Device requests",
    email: "demo.it@ecs-inventory.demo",
    fullName: "Demo ECS IT",
    departmentCode: null,
  },
  {
    key: "department",
    role: "department",
    label: "Department",
    description: "Computer Science systems + register",
    opens: "My department",
    email: "demo.cs@ecs-inventory.demo",
    fullName: "Demo Computer Science",
    departmentCode: "cs",
  },
  {
    key: "scanner",
    role: "scanner",
    label: "Scan team",
    description: "Scan queue & room submissions",
    opens: "Scan queue",
    email: "demo.scan@ecs-inventory.demo",
    fullName: "Demo Scan Team",
    departmentCode: null,
  },
  {
    key: "pending",
    role: "pending",
    label: "New account",
    description: "Invited, no role yet",
    opens: "Waiting for access",
    email: "demo.new@ecs-inventory.demo",
    fullName: "Demo New Account",
    departmentCode: null,
  },
];
