"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import PageHeader from "@/components/PageHeader";

type Shop = { id: string; name: string; code?: string | null };
type Login = {
  userId: string;
  name: string;
  username?: string | null;
  email: string;
  role: string;
};

export default function ShopLoginsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [logins, setLogins] = useState<Login[]>([]);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    api<{ businesses: Shop[] }>("/api/admin/businesses").then((r) => {
      setShops(r.businesses);
      if (r.businesses[0]) setShopId(r.businesses[0].id);
    });
  }, []);

  async function loadLogins() {
    if (!shopId) return;
    const r = await api<{ logins: Login[] }>(`/api/admin/businesses/${shopId}/logins`);
    setLogins(r.logins);
  }
  useEffect(() => {
    loadLogins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api(`/api/admin/businesses/${shopId}/login`, {
        method: "POST",
        body: { ...form, username: form.username.toLowerCase().trim() },
      });
      setOk(`Login "${form.username.toLowerCase().trim()}" created. Share the username + password with the shop.`);
      setForm({ name: "", username: "", password: "" });
      await loadLogins();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create login");
    }
  }

  async function remove(l: Login) {
    if (!confirm(`Delete login "${l.username || l.email}"?`)) return;
    await api(`/api/admin/logins/${l.userId}`, { method: "DELETE" });
    await loadLogins();
  }

  async function resetPassword(l: Login) {
    const pw = prompt(`New password for "${l.username || l.email}" (min 6 chars):`);
    if (!pw) return;
    try {
      await api(`/api/admin/logins/${l.userId}/password`, {
        method: "POST",
        body: { password: pw },
      });
      alert("Password updated.");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed");
    }
  }

  const shopName = shops.find((s) => s.id === shopId)?.name ?? "";

  return (
    <div>
      <PageHeader
        title="Shop Logins"
        action={
          <select className="input w-64" value={shopId} onChange={(e) => setShopId(e.target.value)}>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.code ? ` (${s.code})` : ""}
              </option>
            ))}
          </select>
        }
      />

      <p className="mb-4 text-sm text-gray-500">
        Create <b>one login per shop</b>. Each login can manage only its own shop (POS,
        stock, invoices) — it cannot see other shops. The shop signs in with the{" "}
        <b>username</b> (e.g. <code>laxoraperavoor</code>) and password on the shop app.
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Create form */}
        <div className="card">
          <h2 className="mb-4 font-semibold">New login for {shopName}</h2>
          {error && <div className="mb-3 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
          {ok && <div className="mb-3 rounded bg-green-50 px-3 py-2 text-sm text-green-700">{ok}</div>}
          <form onSubmit={create} className="space-y-3">
            <div>
              <label className="label">Display name</label>
              <input
                className="input"
                placeholder="e.g. Peravoor Shop"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Username (login id)</label>
              <input
                className="input"
                placeholder="e.g. laxoraperavoor"
                value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="text"
                placeholder="min 6 characters"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button className="btn-primary w-full" type="submit">
              Create Login
            </button>
          </form>
        </div>

        {/* Existing logins */}
        <div className="card p-0">
          <div className="border-b px-5 py-3 font-semibold">Logins for {shopName}</div>
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Username</th>
                <th className="table-th">Name</th>
                <th className="table-th">Role</th>
                <th className="table-th"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logins.map((l) => (
                <tr key={l.userId}>
                  <td className="table-td font-medium">{l.username || l.email}</td>
                  <td className="table-td">{l.name}</td>
                  <td className="table-td">{l.role}</td>
                  <td className="table-td text-right">
                    <button onClick={() => resetPassword(l)} className="mr-3 text-brand hover:underline">
                      Reset PW
                    </button>
                    <button onClick={() => remove(l)} className="text-red-600 hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {logins.length === 0 && (
                <tr>
                  <td className="table-td text-gray-400" colSpan={4}>
                    No logins yet for this shop.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
