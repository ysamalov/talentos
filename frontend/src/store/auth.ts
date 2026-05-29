import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/lib/api";

interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  company_id: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        const res = await authApi.login(email, password);
        const { access_token } = res.data;
        localStorage.setItem("access_token", access_token);
        set({ token: access_token, isLoading: false });
        await get().fetchMe();
      },

      logout: () => {
        localStorage.removeItem("access_token");
        set({ user: null, token: null });
        window.location.href = "/login";
      },

      fetchMe: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data });
        } catch {
          set({ user: null, token: null });
        }
      },
    }),
    {
      name: "talentos-auth",
      partialize: (state) => ({ token: state.token }),
    }
  )
);
