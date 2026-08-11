// The admin's globally selected shop (e.g. Laxora Peravoor vs Laxora
// Decorative — same team, different locations). Picked once in the sidebar
// dropdown; every shop-scoped page (Reports, Shop Details, Shop Logins)
// follows it, and changing a page-level dropdown updates it right back.

const KEY = "laxora_admin_shop_id";
const EVENT = "laxora-admin-shop-changed";

export function getAdminShopId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(KEY);
}

export function setAdminShopId(id: string) {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(KEY) === id) return;
  localStorage.setItem(KEY, id);
  window.dispatchEvent(new CustomEvent<string>(EVENT, { detail: id }));
}

// Subscribe to shop changes; returns an unsubscribe function for useEffect.
export function onAdminShopChange(cb: (id: string) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<string>).detail);
  window.addEventListener(EVENT, handler);
  return () => window.removeEventListener(EVENT, handler);
}
