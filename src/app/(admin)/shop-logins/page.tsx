"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { getAdminShopId, setAdminShopId, onAdminShopChange } from "@/lib/adminShop";
import PageHeader from "@/components/PageHeader";

type Shop = { id: string; name: string; code?: string | null };
type Franchise = { id: string; name: string };
type Login = {
  userId: string;
  name: string;
  username?: string | null;
  email: string;
  role: string;
  // Total shops this login can access (1 = only this shop).
  shopCount?: number;
};

export default function ShopLoginsPage() {
  const [shops, setShops] = useState<Shop[]>([]);
  const [shopId, setShopId] = useState("");
  const [logins, setLogins] = useState<Login[]>([]);
  const [form, setForm] = useState({ name: "", username: "", password: "" });
  const [attachUsername, setAttachUsername] = useState("");
  const [shopForm, setShopForm] = useState({ name: "", code: "", franchiseId: "" });
  const [showShopForm, setShowShopForm] = useState(false);
  const [franchises, setFranchises] = useState<Franchise[]>([]);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [loading, setLoading] = useState(true);

  async function loadShops() {
    setLoading(true);
    try {
      const r = await api<{ businesses: Shop[] }>("/api/admin/businesses");
      setShops(r.businesses);
      // Follow the sidebar's globally selected shop; fall back to the first.
      const stored = getAdminShopId();
      const initial = r.businesses.find((b) => b.id === stored)?.id ?? r.businesses[0]?.id;
      setShopId((cur) => cur || initial || "");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    loadShops();
    // Franchises for the "Add a new shop" form — attaching the shop to a
    // franchise makes it visible as an external transfer target.
    api<{ franchises: Franchise[] }>("/api/admin/franchises")
      .then((r) => setFranchises(r.franchises))
      .catch(() => setFranchises([]));
    return onAdminShopChange(setShopId);
  }, []);

  async function loadLogins() {
    if (!shopId) {
      setLogins([]);
      return;
    }
    const r = await api<{ logins: Login[] }>(`/api/admin/businesses/${shopId}/logins`);
    setLogins(r.logins);
  }
  useEffect(() => {
    loadLogins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shopId]);

  async function createShop(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    try {
      const r = await api<{ business: Shop }>("/api/admin/businesses", {
        method: "POST",
        body: {
          name: shopForm.name.trim(),
          code: shopForm.code.trim() || undefined,
          franchiseId: shopForm.franchiseId || undefined,
        },
      });
      setShopForm({ name: "", code: "", franchiseId: "" });
      setShowShopForm(false);
      await loadShops();
      setShopId(r.business.id);
      setAdminShopId(r.business.id);
      setOk(`Shop "${r.business.name}" created. Now add its login below.`);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to create shop");
    }
  }

  async function createLogin(e: React.FormEvent) {
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

  // Give an EXISTING login (e.g. laxoraperavoor) access to the selected shop
  // too — same staff, same password, and they switch shops inside the app.
  async function attachLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      const uname = attachUsername.toLowerCase().trim();
      await api(`/api/admin/businesses/${shopId}/logins/attach`, {
        method: "POST",
        body: { username: uname },
      });
      setOk(
        `"${uname}" can now access ${shopName} too. After signing in, the staff pick the shop (or switch from the sidebar).`
      );
      setAttachUsername("");
      await loadLogins();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to attach login");
    }
  }

  async function remove(l: Login) {
    const shared = (l.shopCount ?? 1) > 1;
    const msg = shared
      ? `Remove "${l.username || l.email}" from ${shopName}? The login stays active for its other shops.`
      : `Remove "${l.username || l.email}"? This is its only shop, so the login will be deleted.`;
    if (!confirm(msg)) return;
    await api(`/api/admin/businesses/${shopId}/logins/${l.userId}`, { method: "DELETE" });
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
          shops.length > 0 ? (
            <div className="flex items-center gap-2">
              <select
                className="input w-56"
                value={shopId}
                onChange={(e) => {
                  setShopId(e.target.value);
                  setAdminShopId(e.target.value);
                }}
              >
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {s.code ? ` (${s.code})` : ""}
                  </option>
                ))}
              </select>
              <button className="btn-secondary" onClick={() => setShowShopForm((v) => !v)}>
                + New Shop
              </button>
            </div>
          ) : null
        }
      />

      <p className="mb-4 text-sm text-gray-500">
        Create a <b>login per shop</b>, or share <b>one login across several shops</b> when
        the same staff run them (e.g. give <code>laxoraperavoor</code> access to Laxora
        Decorative too). A shared login picks the shop after signing in and can switch
        shops from the sidebar; each shop&apos;s billing, stock and reports stay fully
        separate.
      </p>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>
      )}
      {ok && (
        <div className="mb-4 rounded-lg bg-green-50 px-4 py-2 text-sm text-green-700">{ok}</div>
      )}

      {loading ? (
        <p className="text-gray-400">Loading…</p>
      ) : shops.length === 0 ? (
        /* No shops yet — guide the admin to create the first one. */
        <div className="card mx-auto max-w-md text-center">
          <div className="mb-2 text-4xl">🏪</div>
          <h2 className="text-lg font-semibold">Create your first shop</h2>
          <p className="mb-4 mt-1 text-sm text-gray-500">
            You need a shop before you can add a login for it.
          </p>
          <form onSubmit={createShop} className="space-y-3 text-left">
            <div>
              <label className="label">Shop name</label>
              <input
                className="input"
                placeholder="e.g. Laxora Peravoor"
                value={shopForm.name}
                onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div>
              <label className="label">Short code (optional)</label>
              <input
                className="input"
                placeholder="e.g. PERAVOOR"
                value={shopForm.code}
                onChange={(e) => setShopForm({ ...shopForm, code: e.target.value })}
              />
            </div>
            {franchises.length > 0 && (
              <div>
                <label className="label">Franchise (for external transfers)</label>
                <select
                  className="input"
                  value={shopForm.franchiseId}
                  onChange={(e) =>
                    setShopForm({ ...shopForm, franchiseId: e.target.value })
                  }
                >
                  <option value="">Standalone (no franchise)</option>
                  {franchises.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button className="btn-primary w-full" type="submit">
              Create Shop
            </button>
          </form>
        </div>
      ) : (
        <>
          {showShopForm && (
            <div className="card mb-6">
              <h2 className="mb-3 font-semibold">Add a new shop</h2>
              <form onSubmit={createShop} className="flex flex-wrap items-end gap-3">
                <div className="flex-1">
                  <label className="label">Shop name</label>
                  <input
                    className="input"
                    placeholder="e.g. Laxora Chakkarakkal"
                    value={shopForm.name}
                    onChange={(e) => setShopForm({ ...shopForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="w-40">
                  <label className="label">Code</label>
                  <input
                    className="input"
                    placeholder="CHAKKARAKKAL"
                    value={shopForm.code}
                    onChange={(e) => setShopForm({ ...shopForm, code: e.target.value })}
                  />
                </div>
                {franchises.length > 0 && (
                  <div className="w-64">
                    <label className="label">Franchise (for external transfers)</label>
                    <select
                      className="input"
                      value={shopForm.franchiseId}
                      onChange={(e) =>
                        setShopForm({ ...shopForm, franchiseId: e.target.value })
                      }
                    >
                      <option value="">Standalone (no franchise)</option>
                      {franchises.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                <button className="btn-primary" type="submit">
                  Create Shop
                </button>
              </form>
            </div>
          )}

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Create login */}
            <div className="card">
              <h2 className="mb-4 font-semibold">New login for {shopName}</h2>
              <form onSubmit={createLogin} className="space-y-3">
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

              <div className="my-5 flex items-center gap-3 text-xs text-gray-400">
                <div className="h-px flex-1 bg-gray-200" />
                or
                <div className="h-px flex-1 bg-gray-200" />
              </div>

              <h2 className="mb-2 font-semibold">Give an existing login access</h2>
              <p className="mb-3 text-xs text-gray-500">
                Same staff running this shop too? Enter their current username — they keep
                one login and switch shops inside the app.
              </p>
              <form onSubmit={attachLogin} className="flex items-end gap-3">
                <div className="flex-1">
                  <label className="label">Existing username</label>
                  <input
                    className="input"
                    placeholder="e.g. laxoraperavoor"
                    value={attachUsername}
                    onChange={(e) => setAttachUsername(e.target.value)}
                    required
                  />
                </div>
                <button className="btn-secondary" type="submit">
                  Add to {shopName || "shop"}
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
                      <td className="table-td font-medium">
                        {l.username || l.email}
                        {(l.shopCount ?? 1) > 1 && (
                          <span
                            className="ml-2 rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-blue-600"
                            title={`This login can access ${l.shopCount} shops`}
                          >
                            {l.shopCount} shops
                          </span>
                        )}
                      </td>
                      <td className="table-td">{l.name}</td>
                      <td className="table-td">{l.role}</td>
                      <td className="table-td text-right">
                        <button
                          onClick={() => resetPassword(l)}
                          className="mr-3 text-brand hover:underline"
                        >
                          Reset PW
                        </button>
                        <button onClick={() => remove(l)} className="text-red-600 hover:underline">
                          Remove
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
        </>
      )}
    </div>
  );
}
