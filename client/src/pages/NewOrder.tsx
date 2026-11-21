import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, inr, Customer, Order, Product } from "../api";

interface Entry { boxes: number; perBox: number; qty: number }
const num = (v: string) => Math.max(0, Math.floor(Number(v) || 0));
const ml = (s: string) => { const m = s.match(/([\d.]+)\s*(ltr|litre|liter|l)\b/i); return m ? parseFloat(m[1]) * 1000 : parseFloat(s) || 0; };
const noEntry: Entry = { boxes: 0, perBox: 0, qty: 0 };

export default function NewOrder() {
  const { id } = useParams(); const nav = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", gstin: "" });
  const [customers, setCustomers] = useState<Customer[]>([]); const [showList, setShowList] = useState(false);
  const [category, setCategory] = useState(""); const [brand, setBrand] = useState(""); const [search, setSearch] = useState(""); // brand "" = all brands
  const [entries, setEntries] = useState<Record<string, Entry>>({}); // productId -> boxes / per box / order qty
  const [billType, setBillType] = useState<"gst" | "non-gst">("non-gst");
  const [cd, setCd] = useState(0); const [notes, setNotes] = useState(""); const [busy, setBusy] = useState(false);

  useEffect(() => { api<Product[]>("/products").then(setProducts).catch((e) => toast.error(e.message)); }, []);
  useEffect(() => { api<Customer[]>("/customers").then(setCustomers).catch(() => {}); }, []);
  const cats = useMemo(() => [...new Set(products.map((p) => p.category))].sort(), [products]);
  useEffect(() => { if (!category && !id && cats.length) setCategory(cats[0]); }, [cats]);
  const brands = useMemo(() => [...new Set(products.filter((p) => p.category === category).map((p) => p.brand))].sort(), [products, category]); // brands that exist in this category
  useEffect(() => { // edit mode: load the order into the form
    if (!id || !products.length) return;
    api<Order>(`/orders/${id}`).then((o) => {
      setCustomer({ name: o.customer.name, phone: o.customer.phone || "", address: o.customer.address || "", gstin: o.customer.gstin || "" });
      setBillType(o.billType === "gst" ? "gst" : "non-gst"); setCd(o.cdPercent || 0); setNotes(o.notes || "");
      const e: Record<string, Entry> = {};
      o.items.forEach((i) => { if (i.product) e[i.product] = { boxes: i.boxes || 0, perBox: i.perBox || 0, qty: i.qty }; });
      setEntries(e);
      setCategory(products.find((p) => p._id === o.items[0]?.product)?.category || cats[0] || "");
    }).catch((e) => toast.error(e.message));
  }, [id, products.length]);

  const rows = useMemo(() => {
    const t = search.trim().toLowerCase();
    return products
      .filter((p) => p.category === category && (!brand || p.brand === brand) && (!t || `${p.brand} ${p.name} ${p.measurement}`.toLowerCase().includes(t)))
      .sort((a, b) => a.brand.localeCompare(b.brand) || a.name.localeCompare(b.name) || ml(a.measurement) - ml(b.measurement));
  }, [products, category, brand, search]);
  const setEntry = (pid: string, patch: Partial<Entry>) => setEntries((prev) => {
    const next = { ...(prev[pid] || noEntry), ...patch };
    if ("boxes" in patch && !next.perBox) next.perBox = products.find((x) => x._id === pid)?.perBox || 0; // pieces per box come from the product
    if (("boxes" in patch || "perBox" in patch) && next.boxes > 0 && next.perBox > 0) next.qty = next.boxes * next.perBox; // boxes x per box = order qty
    return { ...prev, [pid]: next };
  });
  const chosen = products.flatMap((p) => { const e = entries[p._id]; return e && e.qty > 0 ? [{ p, e }] : []; });

  const subtotal = chosen.reduce((s, { p, e }) => s + e.qty * p.price, 0);
  const cdAmt = (subtotal * cd) / 100;
  const gst = billType === "gst" ? chosen.reduce((s, { p, e }) => s + e.qty * p.price * (1 - cd / 100) * (p.gstRate / 100), 0) : 0;
  const total = subtotal - cdAmt + gst;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen.length) return toast.error("Enter a quantity for at least one product");
    if (!id) for (const { p, e: en } of chosen) if (en.qty > p.stock) return toast.error(`Only ${p.stock} of ${p.brand} ${p.name} ${p.measurement} available`);
    setBusy(true);
    try {
      const items = chosen.map(({ p, e: en }) => ({ productId: p._id, qty: en.qty, boxes: en.boxes, perBox: en.perBox }));
      await api(id ? `/orders/${id}` : "/orders", { method: id ? "PUT" : "POST", body: JSON.stringify({ customer, items, notes, billType, cdPercent: cd }) });
      toast.success(id ? "Order updated" : "Order sent to sales team"); nav("/");
    } catch (err: any) { toast.error(err.message); } finally { setBusy(false); }
  }

  const typed = customer.name.trim().toLowerCase();
  const match = customers.find((c) => c.name.toLowerCase() === typed);
  const suggestions = typed ? customers.filter((c) => c.name.toLowerCase().includes(typed) || (c.phone || "").includes(typed)).slice(0, 8) : [];
  const pickCustomer = (c: Customer) => { setCustomer({ name: c.name, phone: c.phone || "", address: c.address || "", gstin: c.gstin || "" }); setShowList(false); };
  const onName = (v: string) => { // exact match fills every detail automatically
    const m = customers.find((c) => c.name.toLowerCase() === v.trim().toLowerCase());
    if (m) { setCustomer({ name: v, phone: m.phone || "", address: m.address || "", gstin: m.gstin || "" }); setShowList(false); }
    else setCustomer((prev) => ({ ...prev, name: v }));
  };
  const field = (k: keyof typeof customer, label: string) => (
    <div className="space-y-2"><Label htmlFor={k}>{label}</Label><Input id={k} value={customer[k]} onChange={(e) => setCustomer({ ...customer, [k]: e.target.value })} /></div>
  );
  const numIn = (p: Product, k: keyof Entry, e: Entry, disabled = false) => (
    <Input className="h-8 w-20" type="number" min={0} disabled={disabled} aria-label={`${k} for ${p.brand} ${p.name} ${p.measurement}`}
      value={e[k] || (k === "perBox" ? p.perBox : 0) || ""} onChange={(ev) => setEntry(p._id, { [k]: num(ev.target.value) })} />
  );

  return (
    <form onSubmit={submit} className="space-y-6">
      <h1 className="text-xl font-semibold">{id ? "Edit order" : "New order"}</h1>
      <Card><CardHeader><CardTitle className="text-base">Customer</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="relative space-y-2"><Label htmlFor="name">Customer name</Label>
            <Input id="name" required autoComplete="off" value={customer.name} onChange={(e) => onName(e.target.value)} onFocus={() => setShowList(true)} onBlur={() => setTimeout(() => setShowList(false), 150)} />
            {showList && !match && suggestions.length > 0 && (
              <ul className="absolute z-20 max-h-56 w-full overflow-auto rounded-md border bg-card shadow-md">
                {suggestions.map((c) => (
                  <li key={c._id}><button type="button" className="flex w-full flex-col px-3 py-2 text-left text-sm hover:bg-accent" onMouseDown={() => pickCustomer(c)}>
                    <span className="font-medium">{c.name}</span><span className="text-xs text-muted-foreground">{[c.phone, c.address].filter(Boolean).join(" · ")}</span></button></li>))}
              </ul>)}
            <p className="text-xs text-muted-foreground">{!typed ? "Type a name to search saved customers" : match ? "Existing customer – details filled in" : "New customer – will be saved automatically"}</p></div>
          {field("phone", "Phone")}{field("gstin", "GSTIN")}{field("address", "Address")}
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Items</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="space-y-2"><Label>Category</Label>
              <div className="flex flex-wrap gap-2">
                {cats.map((c) => { const n = chosen.filter(({ p }) => p.category === c).length; return (
                  <Button key={c} type="button" variant={c === category ? "default" : "outline"} onClick={() => { setCategory(c); setBrand(""); }}>{c}{n > 0 && <span className="ml-2 rounded-full bg-background/20 px-2 text-xs">{n}</span>}</Button>); })}
                {!cats.length && <span className="text-sm text-muted-foreground">No products yet. Ask admin to add products.</span>}
              </div></div>
            <div className="space-y-2"><Label>Brand</Label>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" variant={!brand ? "default" : "outline"} onClick={() => setBrand("")}>All brands</Button>
                {brands.map((b) => { const n = chosen.filter(({ p }) => p.category === category && p.brand === b).length; return (
                  <Button key={b} type="button" size="sm" variant={b === brand ? "default" : "outline"} onClick={() => setBrand(b)}>{b === "Generic" ? "No brand" : b}{n > 0 && <span className="ml-2 rounded-full bg-background/20 px-2 text-xs">{n}</span>}</Button>); })}
              </div></div>
              
            <div className="flex flex-wrap items-end gap-3">
              <div className="space-y-2"><Label htmlFor="f-search">Search product</Label>
                <Input id="f-search" className="w-64" placeholder="Name or size, e.g. zinc, 1 ltr" value={search} onChange={(e) => setSearch(e.target.value)} /></div>
              {(brand || search) && <Button type="button" variant="ghost" onClick={() => { setBrand(""); setSearch(""); }}>Clear filters</Button>}
              <span className="pb-2 text-xs text-muted-foreground">Showing {rows.length} of {products.filter((p) => p.category === category).length} products</span>
            </div>
            <p className="text-xs text-muted-foreground">Enter box qty × per box qty (order qty fills itself), or type the order qty directly. Leave a row empty to skip it.</p></div>
          <div className="overflow-x-auto rounded-md border"><Table>
            <TableHeader><TableRow><TableHead>Brand</TableHead><TableHead>Product name</TableHead><TableHead>Measurement</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Stock</TableHead><TableHead>Box qty</TableHead><TableHead>Per box qty</TableHead><TableHead>Order qty</TableHead><TableHead className="text-right">Amount</TableHead></TableRow></TableHeader>
            <TableBody>
              {rows.length === 0 && <TableRow><TableCell colSpan={9} className="h-20 text-center text-muted-foreground">No products match the filters</TableCell></TableRow>}
              {rows.map((p) => { const e = entries[p._id] || noEntry; const out = !id && p.stock < 1; const over = !id && e.qty > p.stock; return (
                <TableRow key={p._id} className={out ? "opacity-50" : ""}>
                  <TableCell>{p.brand === "Generic" ? "—" : p.brand}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.measurement}</TableCell>
                  <TableCell className="text-right">{inr(p.price)}</TableCell><TableCell className="text-right">{out ? "Out" : p.stock}</TableCell>
                  <TableCell>{numIn(p, "boxes", e, out)}</TableCell><TableCell>{numIn(p, "perBox", e, out)}</TableCell>
                  <TableCell><Input className={`h-8 w-24 ${over ? "border-destructive" : ""}`} type="number" min={0} disabled={out} aria-label={`Order qty for ${p.brand} ${p.name} ${p.measurement}`} value={e.qty || ""} onChange={(ev) => setEntry(p._id, { qty: num(ev.target.value) })} /></TableCell>
                  <TableCell className="text-right">{e.qty ? inr(e.qty * p.price) : ""}</TableCell>
                </TableRow>); })}
            </TableBody></Table></div>

          {chosen.length > 0 && (
            <div className="space-y-2"><Label>Selected items ({chosen.length})</Label>
              <div className="overflow-x-auto rounded-md border"><Table>
                <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Brand</TableHead><TableHead>Product</TableHead><TableHead>Measurement</TableHead><TableHead className="text-right">Boxes × per box</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Amount</TableHead><TableHead /></TableRow></TableHeader>
                <TableBody>{chosen.map(({ p, e }) => (
                  <TableRow key={p._id}><TableCell>{p.category}</TableCell><TableCell>{p.brand === "Generic" ? "—" : p.brand}</TableCell><TableCell>{p.name}</TableCell><TableCell>{p.measurement}</TableCell>
                    <TableCell className="text-right">{e.boxes && e.perBox ? `${e.boxes} × ${e.perBox}` : "—"}</TableCell><TableCell className="text-right">{e.qty}</TableCell><TableCell className="text-right">{inr(e.qty * p.price)}</TableCell>
                    <TableCell className="text-right"><Button type="button" size="sm" variant="outline" onClick={() => setEntries((prev) => ({ ...prev, [p._id]: noEntry }))}>Remove</Button></TableCell></TableRow>))}</TableBody></Table></div></div>)}
        </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">Billing</CardTitle></CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-2">
          <div className="space-y-2"><Label>Bill type</Label>
            <div className="flex gap-2">
              <Button type="button" variant={billType === "gst" ? "default" : "outline"} onClick={() => setBillType("gst")}>GST</Button>
              <Button type="button" variant={billType === "non-gst" ? "default" : "outline"} onClick={() => setBillType("non-gst")}>Non-GST</Button></div></div>
          <div className="space-y-2"><Label htmlFor="cd">CD discount (%)</Label>
            <div className="flex gap-2">
              <Input id="cd" className="w-28" type="number" min={0} max={100} step="0.5" value={cd} onChange={(e) => setCd(Math.min(100, Math.max(0, Number(e.target.value))))} />
              <Button type="button" variant={cd === 0 ? "default" : "outline"} onClick={() => setCd(0)}>0%</Button>
              <Button type="button" variant={cd === 2 ? "default" : "outline"} onClick={() => setCd(2)}>2%</Button></div></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="notes">Notes for sales team</Label><Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} /></div>
        </CardContent></Card>

      <Card><CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
        <div className="space-y-1 text-sm">
          <div>Subtotal: {inr(subtotal)}</div>
          <div>CD discount ({cd}%): − {inr(cdAmt)}</div>
          <div>GST: {billType === "gst" ? `+ ${inr(gst)}` : "not applied (non-GST)"}</div>
          <div className="text-lg font-semibold">Total: {inr(total)}</div></div>
        <Button disabled={busy}>{busy ? "Saving…" : id ? "Update order" : "Send to sales"}</Button>
      </CardContent></Card>
    </form>
  );
}