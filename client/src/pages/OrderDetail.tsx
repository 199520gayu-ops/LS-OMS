import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/kit";
import { api, getUser, inr, Order } from "../api";

const NEXT: Record<string, { to: string; label: string }[]> = {
  submitted: [{ to: "confirmed", label: "Confirm" }, { to: "cancelled", label: "Cancel order" }],
  confirmed: [{ to: "dispatched", label: "Dispatch" }, { to: "cancelled", label: "Cancel order" }],
  dispatched: [{ to: "delivered", label: "Mark delivered" }],
};
export default function OrderDetail() {
  const { id } = useParams(); const user = getUser()!;
  const [o, setO] = useState<Order | null>(null);
  const load = useCallback(() => { api<Order>(`/orders/${id}`).then(setO).catch((e) => toast.error(e.message)); }, [id]);
  useEffect(load, [load]);
  async function move(status: string) {
    try { await api(`/orders/${id}/status`, { method: "PATCH", body: JSON.stringify({ status }) }); toast.success(`Order ${status}`); load(); }
    catch (e: any) { toast.error(e.message); }
  }
  if (!o) return <p className="text-muted-foreground">Loading…</p>;
  const subtotal = o.subtotal ?? o.items.reduce((s, i) => s + i.qty * i.price, 0);
  const canAct = (to: string) => user.role !== "marketing" || (to === "cancelled" && o.status === "submitted");
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Button variant="ghost" asChild><Link to="/">← Back to orders</Link></Button>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => window.print()}>Print</Button>
          {o.status === "submitted" && user.role !== "sales" && <Button variant="outline" asChild><Link to={`/orders/${o._id}/edit`}>Edit order</Link></Button>}
          {(NEXT[o.status] || []).filter((a) => canAct(a.to)).map((a) => <Button key={a.to} variant={a.to === "cancelled" ? "outline" : "default"} onClick={() => move(a.to)}>{a.label}</Button>)}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold">{o.orderNo}</h1>
        <StatusBadge status={o.status} />
        <Badge variant="outline">{o.billType === "gst" ? "GST bill" : "Non-GST"}</Badge>
        <span className="text-sm text-muted-foreground">{new Date(o.createdAt).toLocaleString("en-IN")} · by {o.createdBy?.name}</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card><CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
          <CardContent className="space-y-1 text-sm">
            <div className="font-medium">{o.customer.name}</div>
            {o.customer.phone && <div>Phone: {o.customer.phone}</div>}
            {o.customer.address && <div>Address: {o.customer.address}</div>}
            {o.customer.gstin && <div>GSTIN: {o.customer.gstin}</div>}
          </CardContent></Card>
        <Card><CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
          <CardContent className="text-sm">{o.notes || <span className="text-muted-foreground">No notes</span>}</CardContent></Card>
      </div>
      <div className="space-y-2 md:hidden">{o.items.map((i, n) => (
        <div key={n} className="flex justify-between gap-3 rounded-xl border bg-card p-3 text-sm">
          <div><div className="text-xs text-muted-foreground">{i.category}{i.brand ? `, ${i.brand}` : ""}</div><div className="font-medium">{i.name}</div><div className="text-muted-foreground">{i.measurement || "—"}</div></div>
          <div className="text-right"><div className="font-semibold">{inr(i.qty * i.price)}</div><div className="text-xs text-muted-foreground">{i.qty} × {inr(i.price)}</div></div>
        </div>))}</div>
      <Card className="hidden overflow-x-auto md:block"><Table>
        <TableHeader><TableRow><TableHead>#</TableHead><TableHead>Category</TableHead><TableHead>Brand</TableHead><TableHead>Product</TableHead><TableHead>Measurement</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
        <TableBody>{o.items.map((i, n) => (
          <TableRow key={n}><TableCell>{n + 1}</TableCell><TableCell>{i.category || "—"}</TableCell><TableCell>{i.brand || "—"}</TableCell><TableCell className="font-medium">{i.name}</TableCell><TableCell>{i.measurement || "—"}</TableCell>
            <TableCell className="text-right">{i.qty}</TableCell><TableCell className="text-right">{inr(i.price)}</TableCell><TableCell className="text-right">{inr(i.qty * i.price)}</TableCell></TableRow>))}</TableBody>
      </Table></Card>
      <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
        <div className="flex justify-between"><span>Subtotal</span><span>{inr(subtotal)}</span></div>
        <div className="flex justify-between"><span>CD discount ({o.cdPercent || 0}%)</span><span>− {inr(o.cdAmount || 0)}</span></div>
        <div className="flex justify-between"><span>GST</span><span>{o.billType === "gst" ? `+ ${inr(o.gstAmount || 0)}` : "Not applied"}</span></div>
        <div className="flex justify-between border-t pt-2 text-base font-semibold"><span>Total</span><span>{inr(o.total)}</span></div>
      </div>
      <Card className="print:hidden"><CardHeader><CardTitle className="text-base">History</CardTitle></CardHeader>
        <CardContent className="space-y-1 text-sm">{(o.history || []).map((h, n) => (
          <div key={n}><span className="capitalize font-medium">{h.status}</span> · {h.by} · <span className="text-muted-foreground">{new Date(h.at).toLocaleString("en-IN")}</span></div>))}</CardContent></Card>
    </div>
  );
}
