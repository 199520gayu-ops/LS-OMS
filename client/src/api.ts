export type Role = "admin" | "marketing" | "sales";
export interface User { id: string; name: string; role: Role }
export interface Product { _id: string; category: string; brand: string; name: string; measurement: string; sku: string; price: number; unit: string; stock: number; gstRate: number; perBox: number }
export interface Customer { _id: string; name: string; phone?: string; address?: string; gstin?: string }
export interface OrderItem { product?: string; category?: string; brand?: string; name: string; measurement?: string; qty: number; boxes?: number; perBox?: number; price: number; gstRate?: number }
export interface Order {
  _id: string; orderNo: string; status: string; total: number; notes?: string; createdAt: string;
  billType?: string; cdPercent?: number; subtotal?: number; cdAmount?: number; gstAmount?: number;
  customer: { name: string; phone?: string; address?: string; gstin?: string };
  items: OrderItem[]; createdBy?: { name: string };
  history?: { status: string; by: string; at: string }[];
}
// Logged-in user saved by the login page
export const getUser = (): User | null => {
  try { return JSON.parse(localStorage.getItem("user") || "null") as User | null; } catch { return null; }
};

// Server address. On Vercel set VITE_API_URL to your Render address (with or without the trailing /api).
// When it is empty (local development or one-domain hosting) the app uses "/api" on the same domain.
const raw = ((import.meta.env.VITE_API_URL as string | undefined) || "").trim().replace(/\/+$/, "");
const API = raw ? (raw.endsWith("/api") ? raw : `${raw}/api`) : "/api";

export async function api<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...opts.headers, Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && path !== "/auth/login") { localStorage.removeItem("token"); localStorage.removeItem("user"); location.href = "/login"; }
  if (!res.ok) {
    if (!raw && (res.status === 404 || res.status === 405)) throw new Error("Cannot reach the server. In Vercel add VITE_API_URL (your Render address) and redeploy.");
    throw new Error(data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

// Indian Rupee formatter
export const inr = (n: number) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(n);