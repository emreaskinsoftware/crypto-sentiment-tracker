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
    const token = await apiLogin(email, password);
    if (token) {
      setToken(token);
      setIsLoggedIn(true);
      setMessage({ type: "success", text: "Login successful! Watchlist and Alerts are now accessible." });
    } else {
      setMessage({ type: "error", text: "Invalid email or password." });
    }
    setLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    const ok = await apiRegister(email, password, fullName);
    if (ok) {
      setMessage({ type: "success", text: "Account created! You can now log in." });
      setMode("login");
    } else {
      setMessage({ type: "error", text: "Registration failed. Email may already be in use." });
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
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-sm text-text-secondary mt-1">Manage your account preferences</p>
      </div>

      {/* Account / Auth */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-text-primary">Account</h2>
        </div>

        {message && (
          <div
            className={`flex items-center gap-2 rounded-xl px-4 py-3 mb-4 text-sm font-medium ${
              message.type === "success"
                ? "bg-pastel-green text-primary"
                : "bg-pastel-red text-danger"
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
            <div className="flex items-center gap-3 rounded-xl bg-pastel-green border border-primary/10 p-4">
              <CheckCircle className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm font-bold text-text-primary">Logged in</p>
                <p className="text-xs text-text-secondary">Watchlist and Alerts features are active.</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 rounded-xl border border-black/10 bg-bg-light px-4 py-2.5 text-sm font-bold text-text-primary hover:bg-black/5 transition-colors"
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
                className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
                  mode === "login"
                    ? "bg-primary text-white"
                    : "bg-bg-light text-text-secondary hover:bg-black/5"
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setMode("register")}
                className={`flex-1 rounded-xl py-2 text-sm font-bold transition-colors ${
                  mode === "register"
                    ? "bg-primary text-white"
                    : "bg-bg-light text-text-secondary hover:bg-black/5"
                }`}
              >
                Register
              </button>
            </div>

            <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3">
              {mode === "register" && (
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    placeholder="Your Name"
                    className="w-full rounded-xl border-none bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  className="w-full rounded-xl border-none bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full rounded-xl border-none bg-bg-light py-3 px-4 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-bold text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4" />
                )}
                {mode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Bell className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-text-primary">Notifications</h2>
        </div>
        <div className="space-y-4">
          {[
            { label: "Price Alerts", desc: "Get notified when prices hit your targets" },
            { label: "Sentiment Alerts", desc: "Alerts when sentiment score changes drastically" },
            { label: "Weekly Report", desc: "Weekly summary of your portfolio sentiment" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-text-primary">{item.label}</p>
                <p className="text-xs text-text-secondary">{item.desc}</p>
              </div>
              <div className="h-6 w-11 rounded-full bg-primary opacity-80 relative cursor-pointer">
                <div className="absolute right-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="rounded-2xl bg-surface-light border border-black/5 p-6">
        <div className="flex items-center gap-3 mb-5">
          <Shield className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold text-text-primary">Security</h2>
        </div>
        <p className="text-sm text-text-secondary">
          Passwords are securely hashed with bcrypt. JWT tokens expire after 60 minutes.
        </p>
      </div>
    </div>
  );
}
