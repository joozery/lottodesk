import { api } from "./api";

export interface AuthUser { id: string; name: string; email: string; role: string }

export const fetchMe = () => api<AuthUser>("/auth/me", { noRedirect: true });
export const login = (email: string, password: string) => api<AuthUser>("/auth/login", { method: "POST", body: { email, password }, noRedirect: true });
export const logout = () => api<void>("/auth/logout", { method: "POST", noRedirect: true });
