"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await authApi.login(email, password);
      const { access_token } = res.data;
      // Fetch user info
      const { default: axios } = await import("axios");
      const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
      const meRes = await axios.get(`${API_URL}/api/v1/auth/me`, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      setAuth(meRes.data, access_token);
      router.push("/dashboard");
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => {
    setEmail("demo@talentos.ai");
    setPassword("demo1234");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-9 h-9 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center">
            <span className="font-mono text-xs font-bold text-white">HR</span>
          </div>
          <div>
            <div className="font-semibold text-base tracking-tight">TalentRush</div>
            <div className="text-[9px] font-mono bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-1.5 py-0.5 rounded inline-block tracking-widest">AI РЕКРУТИНГ</div>
          </div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold mb-1">Добро пожаловать</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Войдите в рабочее пространство</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-[hsl(var(--foreground))] block mb-1.5">Эл. почта</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary))] transition-all"
                placeholder="you@company.com"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-[hsl(var(--foreground))] block mb-1.5">Пароль</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-[hsl(var(--primary)/0.3)] focus:border-[hsl(var(--primary))] transition-all"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}

            <button
              type="submit" disabled={loading}
              className="w-full bg-[hsl(var(--primary))] text-white rounded-lg py-2.5 text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-60"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <div className="mt-4 pt-4 border-t border-[hsl(var(--border))]">
            <div className="text-[10px] font-mono text-[hsl(var(--muted-foreground))] text-center mb-2 uppercase tracking-widest">Демо-доступ</div>
            <button onClick={fillDemo} className="w-full text-xs text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.3)] rounded-lg py-2 hover:bg-[hsl(var(--primary)/0.05)] transition-colors font-mono">
              demo@talentos.ai / demo1234
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
