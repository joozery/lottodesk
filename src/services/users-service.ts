// Service จัดการผู้ใช้/แอดมิน — เรียก API จริง (เฉพาะ role admin)
import type { Permission } from "@/lib/permissions";
import { api } from "./api";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "staff";
  permissions: Permission[];
  active: boolean;
  createdAt: string | null;
}

export interface NewUser { name: string; email: string; password: string; role: AdminUser["role"]; permissions: Permission[] }
export type UserChanges = Partial<Pick<AdminUser, "name" | "role" | "permissions" | "active">> & { password?: string };

export const fetchUsers = () => api<AdminUser[]>("/users");
export const createUser = (user: NewUser) => api<AdminUser>("/users", { method: "POST", body: user });
export const updateUser = (id: string, changes: UserChanges) => api<AdminUser>(`/users/${id}`, { method: "PATCH", body: changes });
export const deleteUser = (id: string) => api<void>(`/users/${id}`, { method: "DELETE" });
