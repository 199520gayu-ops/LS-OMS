import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet, useNavigate } from "react-router-dom";
import { BarChart3, ClipboardList, LayoutDashboard, LogOut, MoreHorizontal, Package, Plus, UserCog, Users as UsersIcon, X, type LucideIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { BrandMark } from "@/components/kit";
import { getUser, Role } from "./api";
import Login from "./pages/Login";
import Orders from "./pages/Orders";
import NewOrder from "./pages/NewOrder";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Users from "./pages/Users";
import OrderDetail from "./pages/OrderDetail";
import Reports from "./pages/Reports";
import Customers from "./pages/Customers";
import "./index.css";

const NAV: { to: string; label: string; icon: LucideIcon; roles: Role[] }[] = [
  { to: "/", label: "Orders", icon: ClipboardList, roles: ["admin", "marketing", "sales"] },
  { to: "/orders/new", label: "New order", icon: Plus, roles: ["admin", "marketing"] },
  { to: "/customers", label: "Customers", icon: UsersIcon, roles: ["admin", "marketing", "sales"] },
  { to: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "marketing", "sales"] },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "sales"] },
  { to: "/products", label: "Products", icon: Package, roles: ["admin"] },
  { to: "/users", label: "Team", icon: UserCog, roles: ["admin"] },
];

function Layout() {
  const user = getUser(); const nav = useNavigate(); const [more, setMore] = useState(false);
  if (!user) return <Navigate to="/login" replace />;
  const items = NAV.filter((n) => n.roles.includes(user.role));
  const create = items.find((n) => n.to === "/orders/new");
  const others = items.filter((n) => n !== create);
  const slots = create ? [others[0], others[1], create, others[2]] : others.slice(0, 4); // phone tab bar: 4 tabs + More
  const rest = others.filter((n) => !slots.includes(n));
  const signOut = () => { localStorage.clear(); nav("/login"); };

  const tab = (n: (typeof NAV)[number]) => n === create ? (
    <NavLink key={n.to} to={n.to} className="-mt-6 flex flex-col items-center gap-1 text-[11px] font-medium text-primary">
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background"><Plus className="h-6 w-6" /></span>New order
    </NavLink>
  ) : (
    <NavLink key={n.to} to={n.to} end className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
      <n.icon className="h-5 w-5" />{n.label}
    </NavLink>
  );
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b bg-card/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <div className="flex items-center gap-2"><BrandMark /><span className="font-semibold tracking-tight">LS Distributors</span></div>
          <nav className="ml-4 hidden flex-1 gap-1 md:flex">
            {items.map((n) => (
              <NavLink key={n.to} to={n.to} end className={({ isActive }) => `flex items-center gap-2 rounded-md px-3 py-1.5 text-sm ${isActive ? "bg-primary/10 font-medium text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                <n.icon className="h-4 w-4" />{n.label}</NavLink>))}
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right text-xs leading-tight"><div className="font-medium">{user.name}</div><div className="capitalize text-muted-foreground">{user.role}</div></div>
            <Button size="sm" variant="outline" className="hidden md:inline-flex" onClick={signOut}>Sign out</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-5 pb-32 md:py-8 md:pb-10"><Outlet /></main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden print:hidden">
        <div className="grid grid-cols-5 items-end">
          {slots.map(tab)}
          <button type="button" onClick={() => setMore(true)} className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"><MoreHorizontal className="h-5 w-5" />More</button>
        </div>
      </nav>
      {more && (
        <div className="fixed inset-0 z-40 md:hidden print:hidden" onClick={() => setMore(false)}>
          <div className="absolute inset-0 bg-ink/40" />
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-card p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between">
              <div><div className="font-semibold">{user.name}</div><div className="text-xs capitalize text-muted-foreground">{user.role}</div></div>
              <button type="button" aria-label="Close menu" onClick={() => setMore(false)} className="rounded-full p-2 hover:bg-muted"><X className="h-5 w-5" /></button>
            </div>
            <div className="grid gap-1">
              {rest.map((n) => <NavLink key={n.to} to={n.to} onClick={() => setMore(false)} className="flex items-center gap-3 rounded-lg px-3 py-3 hover:bg-muted"><n.icon className="h-5 w-5 text-muted-foreground" />{n.label}</NavLink>)}
              <button type="button" onClick={signOut} className="flex items-center gap-3 rounded-lg px-3 py-3 text-left text-destructive hover:bg-muted"><LogOut className="h-5 w-5" />Sign out</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
const Guard = ({ roles, children }: { roles: Role[]; children: React.ReactElement }) =>
  roles.includes(getUser()!.role) ? children : <Navigate to="/" replace />;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode><BrowserRouter>
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Layout />}>
        <Route index element={<Orders />} />
        <Route path="orders/new" element={<Guard roles={["admin", "marketing"]}><NewOrder /></Guard>} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="orders/:id/edit" element={<Guard roles={["admin", "marketing"]}><NewOrder /></Guard>} />
        <Route path="customers" element={<Customers />} />
        <Route path="reports" element={<Reports />} />
        <Route path="dashboard" element={<Guard roles={["admin", "sales"]}><Dashboard /></Guard>} />
        <Route path="products" element={<Guard roles={["admin"]}><Products /></Guard>} />
        <Route path="users" element={<Guard roles={["admin"]}><Users /></Guard>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    <Toaster richColors position="top-center" />
  </BrowserRouter></React.StrictMode>
);
