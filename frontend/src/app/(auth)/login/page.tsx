"use client";
import { useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const form = new URLSearchParams();
      form.append("username", email);
      form.append("password", password);

      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: form.toString(),
      });

      if (!res.ok) {
        setError("Неверный email или пароль");
        return;
      }

      const { access_token } = await res.json();

      const meRes = await fetch("/api/v1/auth/me", {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      const user = await meRes.json();

      localStorage.setItem("token", access_token);
      localStorage.setItem("user", JSON.stringify(user));

      window.location.href = "/dashboard";
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: "16px" }}>
      <div style={{ width: "100%", maxWidth: "360px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "40px", height: "40px", borderRadius: "12px", background: "#6366f1", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
            <span style={{ color: "white", fontWeight: "bold", fontSize: "12px", fontFamily: "monospace" }}>HR</span>
          </div>
          <div style={{ fontWeight: 600, fontSize: "16px" }}>TalentRush</div>
          <div style={{ fontSize: "10px", color: "#6366f1", fontFamily: "monospace", letterSpacing: "2px" }}>AI РЕКРУТИНГ</div>
        </div>

        <div style={{ background: "white", border: "1px solid #e5e7eb", borderRadius: "16px", padding: "24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h1 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}>Добро пожаловать</h1>
          <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px" }}>Войдите в рабочее пространство</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Эл. почта</label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)} required
                placeholder="you@company.com"
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", fontWeight: 500, display: "block", marginBottom: "6px" }}>Пароль</label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)} required
                placeholder="••••••••"
                style={{ width: "100%", border: "1px solid #d1d5db", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", outline: "none", boxSizing: "border-box" }}
              />
            </div>

            {error && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "8px 12px", fontSize: "12px", color: "#dc2626", marginBottom: "12px" }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{ width: "100%", background: loading ? "#a5b4fc" : "#6366f1", color: "white", border: "none", borderRadius: "8px", padding: "12px", fontSize: "14px", fontWeight: 600, cursor: loading ? "not-allowed" : "pointer" }}
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>

          <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #f3f4f6" }}>
            <div style={{ fontSize: "10px", fontFamily: "monospace", color: "#9ca3af", textAlign: "center", marginBottom: "8px", letterSpacing: "2px", textTransform: "uppercase" }}>Демо-доступ</div>
            <button
              onClick={() => { setEmail("demo@talentos.ai"); setPassword("demo1234"); }}
              style={{ width: "100%", background: "transparent", border: "1px solid #c7d2fe", borderRadius: "8px", padding: "8px", fontSize: "12px", color: "#6366f1", cursor: "pointer", fontFamily: "monospace" }}
            >
              demo@talentos.ai / demo1234
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
