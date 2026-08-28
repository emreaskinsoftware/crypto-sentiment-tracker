"use client";

import { useState, useEffect } from "react";
import { User, Bell, Shield, LogIn, LogOut, Loader2, CheckCircle, XCircle } from "lucide-react";
import { apiLogin, apiRegister, getToken, setToken, clearToken } from "@/lib/api";

export default function SettingsPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setIsLoggedIn(!!getToken());
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await apiLogin(email, password);
    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setToken(result.token);
      setIsLoggedIn(true);
      setMessage({ type: "success", text: "Login successful! Watchlist and Alerts are now accessible." });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const result = await apiRegister(email, password, fullName);
    if ("error" in result) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: "Account created! You can now log in." });
      setMode("login");
    }
    setLoading(false);
  };

  const handleLogout = () => {
    clearToken();
    setIsLoggedIn(false);
    setMessage({ type: "success", text: "Logged out successfully." });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="font-label text-[26px] font-700 uppercase leading-none tracking-[0.06em] text-ink">Ayarlar</h1>
        <p className="text-sm text-ink-soft mt-1">Hesap tercihleriniz</p>
      </div>

      {/* Account / Auth */}
      <div className="bg-paper border border-ink/20 p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="h-5 w-5 text-trace-alt" />
          <h2 className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Hesap</h2>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2  px-4 py-3 mb-4 text-sm font-medium ${
              message.type === "success"
                ? "bg-paper-deep text-trace-alt"
                : "bg-paper-deep text-trace"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle className="h-4 w-4 shrink-0" />
            ) : (
              <XCircle className="h-4 w-4 shrink-0" />
            )}
            {message.text}
          </div>
        )}

        {isLoggedIn ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 bg-paper-deep border border-trace-alt/10 p-4">
              <CheckCircle className="h-5 w-5 text-trace-alt" />
              <div>
                <p className="text-sm font-bold text-ink">Logged in</p>
                <p className="text-xs text-ink-soft">Watchlist and Alerts features are active.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 border border-ink/20 bg-paper px-4 py-2.5 text-sm font-bold text-ink hover:bg-ink/8 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Log Out
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Mode Toggle */}
            <div className="flex gap-2">
              <button
                onClick={() => setMode("login")}
                className={`flex-1 border border-ink py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] transition-colors ${
                  mode === "login"
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink-soft hover:bg-grid-fine/60"
                }`}
              >
                Giriş yap
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 border border-ink py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] transition-colors ${
                  mode === "register"
                    ? "bg-ink text-paper"
                    : "bg-paper text-ink-soft hover:bg-grid-fine/60"
                }`}
              >
                Kayıt ol
              </button>
            </div>

            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3">
              {mode === "register" && (
                <div>
                  <label className="text-sm font-medium text-ink-soft block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Your Name"
                    className="w-full border-none bg-paper py-3 px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-trace-alt/30"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-ink-soft block mb-1.5">E-posta</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full border-none bg-paper py-3 px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-trace-alt/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-ink-soft block mb-1.5">Şifre</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full border-none bg-paper py-3 px-4 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-trace-alt/30"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 border border-ink bg-ink px-4 py-2 font-label text-[11px] font-600 uppercase tracking-[0.16em] text-paper shadow-[3px_3px_0_var(--color-trace)] transition-all duration-150 hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-trace)] active:translate-y-0 active:shadow-[2px_2px_0_var(--color-trace)] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {mode === "login" ? "Giriş yap" : "Hesap oluştur"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-paper border border-ink/20 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Bell className="h-5 w-5 text-trace-alt" />
          <h2 className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Bildirimler</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: "Fiyat alarmları", desc: "Fiyat hedefe ulaştığında bildirim gönderilir" },
            { label: "Duygu alarmları", desc: "Duygu skoru sert değiştiğinde bildirim gönderilir" },
            { label: "Haftalık özet", desc: "Portföyünüzün duygu özeti haftada bir gönderilir" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-ink">{item.label}</p>
                <p className="text-xs text-ink-soft">{item.desc}</p>
              </div>
              <span className="relative h-5 w-10 shrink-0 border border-ink bg-ink" aria-hidden="true">
                <span className="absolute right-0.5 top-0.5 h-3.5 w-4 bg-paper" />
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="bg-paper border border-ink/20 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shield className="h-5 w-5 text-trace-alt" />
          <h2 className="font-label text-[13px] font-600 uppercase tracking-[0.14em] text-ink">Güvenlik</h2>
        </div>
        <p className="text-sm text-ink-soft">
          Şifreler bcrypt ile saklanır. Oturum anahtarı 60 dakikada bir yenilenir.
        </p>
      </div>
    </div>
  );
}
