
export type Role = "admin" | "marketing" | "sales";

export interface User {
  id: string;
  name: string;
  role: Role;
}

export interface Product {
  _id: string;
  category: string;
  brand: string;
  name: string;
  measurement: string;
  sku: string;
  price: number;
  unit: string;
  stock: number;
  gstRate: number;
  perBox: number;
}

export interface Customer {
  _id: string;
  name: string;
  phone?: string;
  address?: string;
  gstin?: string;
}

export interface OrderItem {
  product?: string;
  category?: string;
  brand?: string;
  name: string;
  measurement?: string;
  qty: number;
  boxes?: number;
  perBox?: number;
  price: number;
  gstRate?: number;
}

export interface Order {
  _id: string;
  orderNo: string;
  status: string;
  total: number;
  notes?: string;
  createdAt: string;
  billType?: string;
  cdPercent?: number;
  subtotal?: number;
  cdAmount?: number;
  gstAmount?: number;
  customer: {
    name: string;
    phone?: string;
    address?: string;
    gstin?: string;
  };
  items: OrderItem[];
  createdBy?: {
    name: string;
  };
  history?: {
    status: string;
    by: string;
    at: string;
  }[];
}

// Get logged-in user
export const getUser = (): User | null => {
  const user = localStorage.getItem("user");

  if (!user) return null;

  try {
    return JSON.parse(user) as User;
  } catch {
    return null;
  }
};

// Backend API URL from Vercel environment variable
const API_BASE_URL = import.meta.env.VITE_API_URL;

// Common API function
export async function api<T>(
  path: string,
  opts: RequestInit = {}
): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error("API URL is missing. Please configure VITE_API_URL in Vercel.");
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...opts.headers,
      Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 401 && path !== "/auth/login") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    location.href = "/login";
  }

  if (!res.ok) {
    throw new Error(data.message || `Request failed (${res.status})`);
  }

  return data as T;
}

// Indian Rupee currency formatter
export const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(n);
