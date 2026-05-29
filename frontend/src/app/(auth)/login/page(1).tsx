"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { motion } from "framer-motion";
import { Loader2, Bot } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("demo@talentos.ai");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch {
      setError("Неверные данные. Попробуйте demo@talentos.ai / demo1234");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))] p-4">
      <motion.div initial={{ opacity:0, y:16 }} animate={{ opacity:1, y:0 }} className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-10 h-10 rounded-xl bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
            <span className="font-mono text-sm font-bold text-white">HR</span>
          </div>
          <div>
            <div className="font-semibold tracking-tight text-[hsl(var(--foreground))]">TalentOS</div>
            <div className="text-[10px] font-mono text-[hsl(var(--primary))] tracking-widest">AI РЕКРУТИНГ</div>
          </div>
        </div>

        <div className="bg-white border border-[hsl(var(--border))] rounded-2xl p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-1">Добро пожаловать</h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-6">Войдите в рабочее пространство</p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="text-xs font-mono text-[hsl(var(--muted-foreground))] block mb-1.5 uppercase tracking-widest">Эл. почта</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                className="w-full bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] transition-colors" />
            </div>
            <div>
              <label className="text-xs font-mono text-[hsl(var(--muted-foreground))] block mb-1.5 uppercase tracking-widest">Пароль</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                className="w-full bg-[hsl(var(--secondary)/0.5)] border border-[hsl(var(--border))] rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[hsl(var(--primary))] transition-colors" />
            </div>
            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</div>
            )}
            <button type="submit" disabled={loading}
              className="w-full bg-[hsl(var(--primary))] text-white rounded-lg py-2.5 text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <div className="mt-4 p-3 bg-[hsl(var(--secondary))] rounded-lg border border-[hsl(var(--border))]">
            <div className="flex items-center gap-1.5 text-[11px] text-[hsl(var(--muted-foreground))] mb-1">
              <Bot size={11} /> Демо-доступ
            </div>
            <div className="font-mono text-[11px] text-[hsl(var(--secondary-foreground))]">demo@talentos.ai / demo1234</div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
