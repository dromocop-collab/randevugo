export type MemberRole = "owner" | "admin" | "manager" | "staff";

export const MANAGER_ROLES: MemberRole[] = ["owner", "admin", "manager"];
export const OPERATOR_ROLES: MemberRole[] = [
  "owner",
  "admin",
  "manager",
  "staff",
];
