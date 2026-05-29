"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/lib/api";
import {
  LayoutDashboard, Briefcase, Users, GitBranch,
  Bot, BarChart3, ClipboardList, TrendingUp,
  Bell, Settings, Menu, X, LogOut,
} from "lucide-react";

interface NavItem {
  href: string; icon: React.ElementType; label: string;
  badge?: string; badgeColor?: string;
}
interface NavSection { label: string; items: NavItem[]; }

const NAV: NavSection[] = [
  { label: "РАБОЧЕЕ ПРОСТРАНСТВО", items: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Главная" },
    { href: "/vacancies",  icon: Briefcase,       label: "Вакансии", badge: "30" },
    { href: "/candidates", icon: Users,            label: "Кандидаты", badge: "547" },
    { href: "/pipeline",   icon: GitBranch,        label: "Воронка" },
  ]},
  { label: "AI ИНСТРУМЕНТЫ", items: [
    { href: "/screening",  icon: Bot,      label: "AI Скрининг", badge: "Live", badgeColor: "green" },
    { href: "/analytics",  icon: BarChart3, label: "Аналитика" },
  ]},
  { label: "СИСТЕМА", items: [
    { href: "/settings", icon: Settings, label: "Настройки" },
  ]},
  { label: "HR ОПЕРАЦИИ", items: [
    { href: "/onboarding", icon: ClipboardList, label: "Онбординг" },
    { href: "/idp",        icon: TrendingUp,    label: "Планы развития" },
  ]},
];

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-[hsl(var(--border))]">
      <div className="px-5 py-4 border-b border-[hsl(var(--border))] flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center flex-shrink-0">
          <span className="font-mono text-xs font-bold text-white">HR</span>
        </div>
        <div>
          <div className="font-semibold text-sm text-[hsl(var(--foreground))] tracking-tight">TalentRush</div>
          <div className="text-[9px] font-mono bg-[hsl(var(--primary)/0.1)] text-[hsl(var(--primary))] px-1.5 py-0.5 rounded mt-0.5 inline-block tracking-widest">AI РЕКРУТИНГ</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2">
        {NAV.map((section) => (
          <div key={section.label} className="mb-1">
            <div className="text-[9px] font-mono text-[hsl(var(--muted-foreground))] tracking-widest px-3 py-1.5 mt-3 first:mt-0">{section.label}</div>
            {section.items.map((item) => {
              const active = pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} onClick={onNavClick}>
                  <div className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] cursor-pointer transition-all mb-0.5 select-none
                    ${active ? "bg-[hsl(var(--primary)/0.08)] text-[hsl(var(--primary))] font-medium"
                             : "text-[hsl(var(--secondary-foreground))] hover:bg-[hsl(var(--secondary))] hover:text-[hsl(var(--foreground))]"}`}>
                    <Icon size={15} className="flex-shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.badge && (
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full leading-none
                        ${item.badgeColor === "green" ? "bg-[hsl(var(--green-bg))] text-[hsl(var(--green))]"
                                                      : "bg-[hsl(var(--primary))] text-white"}`}>
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-[hsl(var(--border))]">
        <div className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[hsl(var(--secondary))]">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[hsl(var(--primary))] to-purple-500 flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0">
            {user?.full_name?.split(" ").map((n: string) => n[0]).join("").slice(0, 2) ?? "?"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium truncate text-[hsl(var(--foreground))]">{user?.full_name ?? "Гость"}</div>
            <div className="text-[10px] text-[hsl(var(--muted-foreground))] font-mono uppercase tracking-wider">{user?.role ?? ""}</div>
          </div>
          <button onClick={handleLogout} title="Выйти"
            className="w-6 h-6 flex items-center justify-center rounded text-[hsl(var(--muted-foreground))] hover:text-red-500 transition-colors flex-shrink-0">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { token, user, setAuth } = useAuthStore();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    const storedUser = localStorage.getItem("user");
    if (!storedToken) {
      router.replace("/login");
      return;
    }
    if (user) { setChecking(false); return; }
    // Try stored user first (fast path)
    const storedUserRaw = localStorage.getItem("user");
    if (storedUserRaw) {
      try {
        const storedUser = JSON.parse(storedUserRaw);
        setAuth(storedUser, storedToken);
        setChecking(false);
        return;
      } catch {}
    }
    // Validate token by fetching /me
    fetch("/api/v1/auth/me", { headers: { Authorization: `Bearer ${storedToken}` } })
      .then(r => { if (!r.ok) throw new Error("unauth"); return r.json(); })
      .then((userData) => {
        localStorage.setItem("user", JSON.stringify(userData));
        setAuth(userData, storedToken);
        setChecking(false);
      })
      .catch(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.replace("/login");
      });
  }, []);

  const currentLabel = NAV.flatMap((s) => s.items).find((i) => pathname.startsWith(i.href))?.label ?? "TalentRush";

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[hsl(var(--background))]">
        <div className="text-sm text-[hsl(var(--muted-foreground))] font-mono animate-pulse">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[hsl(var(--background))]">
      <aside className="hidden md:flex w-[220px] lg:w-[240px] flex-shrink-0 flex-col">
        <SidebarContent />
      </aside>

      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
            <motion.aside initial={{ x: -260 }} animate={{ x: 0 }} exit={{ x: -260 }}
              transition={{ type: "tween", duration: 0.22 }}
              className="fixed left-0 top-0 bottom-0 w-[240px] z-50 md:hidden shadow-xl">
              <div className="absolute top-3 right-3 z-10">
                <button onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-full bg-[hsl(var(--secondary))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                  <X size={14} />
                </button>
              </div>
              <SidebarContent onNavClick={() => setSidebarOpen(false)} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="h-14 border-b border-[hsl(var(--border))] flex items-center px-4 md:px-6 gap-3 bg-white flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)}
            className="md:hidden w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))]"
            aria-label="Открыть меню">
            <Menu size={15} />
          </button>
          <h1 className="text-sm font-semibold text-[hsl(var(--foreground))] tracking-tight truncate">{currentLabel}</h1>
          <div className="hidden sm:flex items-center gap-1.5 ml-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[hsl(var(--green))] ai-pulse flex-shrink-0" />
            <span className="text-[10px] font-mono text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)] bg-[hsl(var(--primary)/0.06)] px-2 py-0.5 rounded-full whitespace-nowrap">
              AI активен
            </span>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <button className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors" title="Уведомления">
              <Bell size={14} />
            </button>
            <button className="w-8 h-8 rounded-lg border border-[hsl(var(--border))] flex items-center justify-center text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--secondary))] transition-colors" title="Настройки">
              <Settings size={14} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}
