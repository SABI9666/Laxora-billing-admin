"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, clearSession, getToken } from "@/lib/api";
import Sidebar from "@/components/Sidebar";

// Auth guard: requires a token AND platform-admin privileges.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    api<{ user: { isPlatformAdmin: boolean } }>("/api/auth/me")
      .then((me) => {
        if (me.user.isPlatformAdmin) {
          setReady(true);
        } else {
          clearSession();
          router.replace("/login");
        }
      })
      .catch(() => {
        clearSession();
        router.replace("/login");
      });
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-gray-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-x-hidden p-8">{children}</main>
    </div>
  );
}
