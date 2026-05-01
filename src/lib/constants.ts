export const STORAGE_USER_KEY = "inventory_selected_user";

export const USERS = ["David", "Abhishek", "Swara", "Bhavya"] as const;

export type StoredUserName = (typeof USERS)[number];

export function isStoredUserName(value: unknown): value is StoredUserName {
  return typeof value === "string" && USERS.includes(value as StoredUserName);
}
