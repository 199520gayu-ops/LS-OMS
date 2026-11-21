import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/kit";
import { api, inr, Order } from "../api";

const fmt = (d: Date) => d.toLocaleDateString("en-CA"); // YYYY-MM-DD
const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return fmt(d); };
const subOf = (o: Order) => o.subtotal ?? o.items.reduce((s, i) => s + i.qty * i.price, 0);
const sel = "h-9 rounded-md border bg-background px-3 text-sm";

function downloadCsv(orders: Order[], from: string, to: string) {
  const q = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const rows: (string | number)[][] = [["Date", "Time", "Order No", "Customer", "Phone", "Status", "Bill type", "Created by", "Category", "Brand", "Product", "Measurement", "Qty", "Rate", "Amount", "Order subtotal", "CD %", "CD amount", "GST", "Order total"]];
  orders.forEach((o) => {
    const d = new Date(o.createdAt);
    o.items.forEach((i, n) => rows.push([
      d.toLocaleDateString("en-IN"), d.toLocaleTimeString("en-IN"), o.orderNo, o.customer.name, o.customer.phone || "", o.status,
      o.billType === "gst" ? "GST" : "Non-GST", o.createdBy?.name || "", i.category || "", i.brand || "", i.name, i.measurement || "", i.qty, i.price, i.qty * i.price,
      ...(n === 0 ? [subOf(o), o.cdPercent || 0, o.cdAmount || 0, o.gstAmount || 0, o.total] : ["", "", "", "", ""]), // order totals once per order
    ]));
  });
  const csv = "\ufeff" + rows.map((r) => r.map(q).join(",")).join("\r\n");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = `orders_${from}_to_${to}.csv`; a.click(); URL.revokeObjectURL(a.href);
}

export default function Reports() {
  const [from, setFrom] = useState(fmt(new Date())); const [to, setTo] = useState(fmt(new Date()));
  const [status, setStatus] = useState(""); const [orders, setOrders] = useState<Order[] | null>(null); const [loading, setLoading] = useState(false);

  async function load(f = from, t = to, s = status) {
    setLoading(true);
    try { setOrders(await api<Order[]>(`/reports/orders?from=${f}&to=${t}&status=${s}`)); }
    catch (e: any) { toast.error(e.message); } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  const preset = (f: string, t: string) => { setFrom(f); setTo(t); load(f, t); };

  const valid = (orders || []).filter((o) => o.status !== "cancelled");
  const sum = (fn: (o: Order) => number) => valid.reduce((s, o) => s + fn(o), 0);
  const days = useMemo(() => {
    const m = new Map<string, Order[]>();
    (orders || []).forEach((o) => { const k = fmt(new Date(o.createdAt)); m.set(k, [...(m.get(k) || []), o]); });
    return [...m.entries()];
  }, [orders]);
  const period = from === to ? new Date(from).toLocaleDateString("en-IN", { dateStyle: "long" }) : `${new Date(from).toLocaleDateString("en-IN")} to ${new Date(to).toLocaleDateString("en-IN")}`;

  return (
    <div className="space-y-4">
      <style>{"@media print{@page{size:A4 landscape;margin:10mm}}"}</style>
      <Card className="print:hidden"><CardContent className="space-y-4 pt-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-2"><Label htmlFor="from">From</Label><Input id="from" type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="to">To</Label><Input id="to" type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="status">Status</Label>
            <select id="status" className={sel} value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All</option>{["submitted", "confirmed", "dispatched", "delivered", "cancelled"].map((s) => <option key={s} value={s}>{s}</option>)}</select></div>
          <Button onClick={() => load()} disabled={loading}>{loading ? "Loading…" : "Show report"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => preset(daysAgo(0), daysAgo(0))}>Today</Button>
          <Button size="sm" variant="outline" onClick={() => preset(daysAgo(1), daysAgo(1))}>Yesterday</Button>
          <Button size="sm" variant="outline" onClick={() => preset(daysAgo(6), daysAgo(0))}>Last 7 days</Button>
          <Button size="sm" variant="outline" onClick={() => preset(fmt(new Date(new Date().getFullYear(), new Date().getMonth(), 1)), daysAgo(0))}>This month</Button>
          <span className="flex-1" />
          <Button size="sm" disabled={!orders?.length} onClick={() => window.print()}>Print / Save as PDF</Button>
          <Button size="sm" variant="secondary" disabled={!orders?.length} onClick={() => downloadCsv(orders!, from, to)}>Download Excel (CSV)</Button>
        </div>
      </CardContent></Card>

      <div><h1 className="text-xl font-semibold">LS Distributors · Order report</h1>
        <p className="text-sm text-muted-foreground">{period}{status && ` · ${status} only`} · generated {new Date().toLocaleString("en-IN")}</p></div>

      {orders && <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {[["Orders", String(orders.length)], ["Cancelled", String(orders.length - valid.length)], ["Subtotal", inr(sum(subOf))], ["CD discount", inr(sum((o) => o.cdAmount || 0))], ["GST", inr(sum((o) => o.gstAmount || 0))], ["Total", inr(sum((o) => o.total))]].map(([k, v]) => (
          <Card key={k}><CardContent className="pt-4"><div className="text-xs text-muted-foreground">{k}</div><div className="text-lg font-semibold">{v}</div></CardContent></Card>))}
      </div>}
      {orders && <p className="text-xs text-muted-foreground">Money totals exclude cancelled orders.</p>}
      {orders && orders.length === 0 && <p className="py-10 text-center text-muted-foreground">No orders in this period.</p>}

      {days.map(([day, list]) => {
        const live = list.filter((o) => o.status !== "cancelled");
        return (
          <section key={day} className="space-y-3">
            <div className="flex items-baseline justify-between border-b pb-1">
              <h2 className="font-semibold">{new Date(day).toLocaleDateString("en-IN", { weekday: "long", day: "2-digit", month: "long", year: "numeric" })}</h2>
              <span className="text-sm text-muted-foreground">{list.length} orders · day total {inr(live.reduce((s, o) => s + o.total, 0))}</span>
            </div>
            {list.map((o) => (
              <Card key={o._id} className="break-inside-avoid"><CardContent className="space-y-2 pt-4">
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold">{o.orderNo}</span>
                  <span className="text-muted-foreground">{new Date(o.createdAt).toLocaleTimeString("en-IN")}</span>
                  <StatusBadge status={o.status} /><Badge variant="outline">{o.billType === "gst" ? "GST" : "Non-GST"}</Badge>
                  <span className="ml-auto text-muted-foreground">by {o.createdBy?.name}</span>
                </div>
                <div className="text-sm"><b>{o.customer.name}</b>{o.customer.phone && ` · ${o.customer.phone}`}{o.customer.gstin && ` · GSTIN ${o.customer.gstin}`}{o.customer.address && ` · ${o.customer.address}`}</div>
                <Table>
                  <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Brand</TableHead><TableHead>Product</TableHead><TableHead>Measurement</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
                  <TableBody>{o.items.map((i, n) => <TableRow key={n}><TableCell>{i.category || "—"}</TableCell><TableCell>{i.brand || "—"}</TableCell><TableCell>{i.name}</TableCell><TableCell>{i.measurement || "—"}</TableCell><TableCell className="text-right">{i.qty}</TableCell><TableCell className="text-right">{inr(i.price)}</TableCell><TableCell className="text-right">{inr(i.qty * i.price)}</TableCell></TableRow>)}</TableBody>
                </Table>
                <div className="flex flex-wrap justify-end gap-x-6 gap-y-1 text-sm">
                  <span>Subtotal {inr(subOf(o))}</span><span>CD ({o.cdPercent || 0}%) − {inr(o.cdAmount || 0)}</span>
                  <span>GST {o.billType === "gst" ? `+ ${inr(o.gstAmount || 0)}` : "n/a"}</span><b>Total {inr(o.total)}</b>
                </div>
                {o.notes && <div className="text-xs text-muted-foreground">Notes: {o.notes}</div>}
              </CardContent></Card>
            ))}
          </section>
        );
      })}
    </div>
  );
}
