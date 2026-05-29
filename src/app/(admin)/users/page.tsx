"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

type User = {
  id: string;
  name: string;
  email: string;
  isPlatformAdmin: boolean;
  createdAt: string;
  _count: { memberships: number };
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");

  async function load() {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    const r = await api<{ users: User[] }>(`/api/admin/users${q}`);
    setUsers(r.users);
  }
  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [search]);

  return (
    <div>
      <PageHeader title="Users" />
      <input
        className="input mb-4 max-w-sm"
        placeholder="Search by name or email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <div className="card p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Name</th>
                <th className="table-th">Email</th>
                <th className="table-th">Role</th>
                <th className="table-th text-right">Businesses</th>
                <th className="table-th">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map((u) => (
                <tr key={u.id}>
                  <td className="table-td font-medium">{u.name}</td>
                  <td className="table-td">{u.email}</td>
                  <td className="table-td">
                    {u.isPlatformAdmin ? (
                      <span className="rounded-full bg-brand-light px-2 py-0.5 text-xs font-medium text-brand">
                        Platform Admin
                      </span>
                    ) : (
                      <span className="text-gray-500">User</span>
                    )}
                  </td>
                  <td className="table-td text-right">{u._count.memberships}</td>
                  <td className="table-td">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td className="table-td text-gray-400" colSpan={5}>
                    No users found.
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
