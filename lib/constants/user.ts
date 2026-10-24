export const USER_ROLES = ["TENANT", "OWNER", "TECHNICIAN", "ADMIN"] as const;

export type UserRole = (typeof USER_ROLES)[number];
