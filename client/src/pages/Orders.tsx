import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/kit";
import { api, getUser, inr, Order } from "../api";

const NEXT: Record<string, { to: string; label: string }[]> = {
  submitted: [{ to: "confirmed", label: "Confirm" }, { to: "cancelled", label: "Cancel" }],
  confirmed: [{ to: "dispatched", label: "Dispatch" }, { to: "cancelled", label: "Cancel" }],
  dispatched: [{ to: "delivered", label: "Delivered" }],
};
const FILTERS = ["", "submitted", "confirmed", "dispatched", "delivered", "cancelled"];

export default function Orders() {
  const user = getUser()!;
  const [orders, setOrders] = useState<Order[]>([]); const [q, setQ] = useState(""); const [status, setStatus] = useState(""); const [loading, setLoading] = useState(true);
  const load = useCallback(() => {
    api<Order[]>(`/orders?q=${encodeURIComponent(q)}&status=${status}`).then(setOrders).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
  }, [q, status]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  async function move(id: string, to: string) {
    try { await api(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status: to }) }); toast.success(`Order ${to}`); load(); }
    catch (e: any) { toast.error(e.message); }
  }
  const canAct = (s: string, to: string) => user.role !== "marketing" || (to === "cancelled" && s === "submitted");
  const actions = (o: Order, phone = false) => {
    const cls = phone ? "h-10 flex-1" : "";
    return (
      <>
        <Button size={phone ? "default" : "sm"} variant="outline" className={cls} asChild><Link to={`/orders/${o._id}`}>View</Link></Button>
        {o.status === "submitted" && user.role !== "sales" && <Button size={phone ? "default" : "sm"} variant="outline" className={cls} asChild><Link to={`/orders/${o._id}/edit`}>Edit</Link></Button>}
        {(NEXT[o.status] || []).filter((a) => canAct(o.status, a.to)).map((a) => (
          <Button key={a.to} size={phone ? "default" : "sm"} variant={a.to === "cancelled" ? "outline" : "default"} className={cls} onClick={() => move(o._id, a.to)}>{a.label}</Button>))}
      </>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h1 className="text-xl font-semibold">Orders</h1><p className="text-sm text-muted-foreground">{loading ? "Loading…" : `${orders.length} shown`}</p></div>
        <div className="relative w-full md:w-72"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="h-11 pl-9 md:h-9" placeholder="Search order no. or customer" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search orders" /></div>
      </div>
      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:mx-0 md:px-0">
        {FILTERS.map((f) => (
          <button key={f} type="button" onClick={() => setStatus(f)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm capitalize md:py-1.5 ${status === f ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground"}`}>{f || "All"}</button>))}
      </div>

      <div className="space-y-3 md:hidden">
        {!loading && orders.length === 0 && <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">No orders found. Try another filter or create a new order.</p>}
        {orders.map((o) => (
          <div key={o._id} className="rounded-xl border bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div><Link to={`/orders/${o._id}`} className="font-semibold">{o.orderNo}</Link>
                <div className="text-sm">{o.customer.name}</div>
                <div className="text-xs text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-IN")}, {o.items.length} {o.items.length === 1 ? "item" : "items"}, by {o.createdBy?.name}</div></div>
              <div className="text-right"><div className="font-semibold">{inr(o.total)}</div><div className="mt-1"><StatusBadge status={o.status} /></div></div>
            </div>
            <div className="mt-3 flex gap-2">{actions(o, true)}</div>
          </div>))}
      </div>

      <Card className="hidden overflow-x-auto md:block">
        <Table>
          <TableHeader><TableRow><TableHead>Order</TableHead><TableHead>Customer</TableHead><TableHead>Items</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>By</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
          <TableBody>
            {!loading && orders.length === 0 && <TableRow><TableCell colSpan={7} className="h-24 text-center text-muted-foreground">No orders found</TableCell></TableRow>}
            {orders.map((o) => (
              <TableRow key={o._id}>
                <TableCell className="font-medium"><Link className="hover:underline" to={`/orders/${o._id}`}>{o.orderNo}</Link><div className="text-xs font-normal text-muted-foreground">{new Date(o.createdAt).toLocaleDateString("en-IN")}</div></TableCell>
                <TableCell>{o.customer.name}<div className="text-xs text-muted-foreground">{o.customer.phone}</div></TableCell>
                <TableCell>{o.items.length}</TableCell>
                <TableCell className="text-right">{inr(o.total)}</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
                <TableCell>{o.createdBy?.name}</TableCell>
                <TableCell><div className="flex justify-end gap-2 whitespace-nowrap">{actions(o)}</div></TableCell>
              </TableRow>))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
