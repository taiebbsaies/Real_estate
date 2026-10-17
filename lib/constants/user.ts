export const USER_ROLES = ["TENANT", "OWNER", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];
