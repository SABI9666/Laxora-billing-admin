"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken, clearSession, ApiError } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await api<{ token: string }>("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { email, password },
      });
      setToken(res.token);
      // Verify this account is actually a platform admin.
      const me = await api<{ user: { isPlatformAdmin: boolean } }>(
        "/api/auth/me"
      );
      if (!me.user.isPlatformAdmin) {
        clearSession();
        setError("This account is not a platform administrator.");
        return;
      }
      router.replace("/overview");
    } catch (err) {
      clearSession();
      setError(err instanceof ApiError ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-slate-50 to-white px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-2xl font-black text-white shadow-lg shadow-brand/20">
            L
          </div>
          <h1 className="bg-gradient-to-r from-brand-600 to-brand-500 bg-clip-text text-2xl font-extrabold text-transparent">
            Laxora Admin
          </h1>
          <p className="mt-1 text-sm text-slate-500">Platform administration</p>
        </div>
        <form onSubmit={onSubmit} className="card space-y-4 shadow-lg">
          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full" disabled={loading}>
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
