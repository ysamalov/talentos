import { create } from "zustand";

interface User {
  id: string; email: string; full_name: string; role: string; company_id: string;
}
interface AuthState { user: User; }

export const useAuthStore = create<AuthState>()(() => ({
  user: { id: "1", email: "admin@talentos.ai", full_name: "Администратор", role: "recruiter", company_id: "1" },
}));
