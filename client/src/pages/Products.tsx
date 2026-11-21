import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, inr, Product } from "../api";

const parse = (s: string) => [...new Set(s.split(",").map((x) => x.trim()).filter(Boolean))];
const GENERAL_SIZES = ["500 ml", "1 ltr", "2 ltr", "3 ltr", "5 ltr", "10 ltr", "20 ltr", "220 ltr"];
const CATALOG: Record<string, { brands: string[]; names: string[]; sizes: string[] }> = {
  "Primer": { brands: ["LS", "Aruna", "Asignah"], names: ["Zinc Yellow", "Red Oxide", "Grey", "Wood"], sizes: ["500 ml", "1 ltr", "4 ltr", "20 ltr"] },
  "NC Thinner": { brands: ["GIO"], names: ["NC Thinner"], sizes: ["500 ml", "1 ltr", "5 ltr", "10 ltr", "20 ltr"] },
  // 800 ml / 900 ml / 950 ml / 1 ltr are the sub-categories of Turpentine Oil (they go in "Product name", not in "Category")
  "Turpentine Oil": { brands: ["LS", "GIO", "Elite"], names: ["Turpentine Oil 800 ml", "Turpentine Oil 900 ml", "Turpentine Oil 950 ml", "Turpentine Oil 1 ltr"], sizes: ["500 ml", "1 ltr", "2 ltr", "3 ltr", "5 ltr", "10 ltr", "20 ltr", "220 ltr"] },
};
const PRESETS = Object.entries(CATALOG).map(([category, c]) => ({ label: category, category, brands: c.brands.join(", "), names: c.names.join(", "), sizes: c.sizes.join(", ") }));
const selCls = "h-9 w-full rounded-md border bg-background px-3 text-sm disabled:opacity-50";
const withCurrent = (list: string[], cur: string) => (cur && !list.includes(cur) ? [...list, cur] : list);

function NumCell({ p, field, onSaved }: { p: Product; field: "price" | "stock" | "perBox"; onSaved: () => void }) {
  const [v, setV] = useState(String(p[field]));
  useEffect(() => setV(String(p[field])), [p, field]);
  async function save() {
    try { await api(`/products/${p._id}`, { method: "PATCH", body: JSON.stringify({ [field]: Number(v) }) }); toast.success(`${field === "price" ? "Price" : field === "stock" ? "Stock" : "Pieces per box"} updated`); onSaved(); }
    catch (e: any) { toast.error(e.message); }
  }
  return (
    <div className="flex justify-end gap-2">
      <Input className="h-8 w-24" type="number" min={0} step={field === "price" ? "0.01" : "1"} value={v} onChange={(e) => setV(e.target.value)} aria-label={`${field} for ${p.brand} ${p.name} ${p.measurement}`} />
      <Button size="sm" variant="outline" disabled={Number(v) === p[field]} onClick={save}>Save</Button>
    </div>
  );
}

export default function Products() {
  const [items, setItems] = useState<Product[]>([]); const [editing, setEditing] = useState<Product | null>(null); const [q, setQ] = useState("");
  const [bulk, setBulk] = useState({ category: "", brands: "", names: "", sizes: "", price: "0", gstRate: "18", stock: "0", perBox: "0" });
  const empty = { category: "", brand: "", name: "", measurement: "" };
  const [pick, setPick] = useState(empty);
  useEffect(() => { setPick(editing ? { category: editing.category, brand: editing.brand, name: editing.name, measurement: editing.measurement } : empty); }, [editing]);
  const cat = CATALOG[pick.category];
  const pickCategory = (c: string) => { // keeps brand / product / size when they are also valid in the new category (handy when fixing old products)
    const k = CATALOG[c];
    setPick((p) => ({
      category: c,
      brand: k?.brands.includes(p.brand) ? p.brand : k?.brands.length === 1 ? k.brands[0] : "",
      name: k?.names.includes(p.name) ? p.name : k?.names.length === 1 ? k.names[0] : "",
      measurement: k && (k.sizes.includes(p.measurement) || GENERAL_SIZES.includes(p.measurement)) ? p.measurement : "",
    }));
  };
  const load = () => api<Product[]>("/products").then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { load(); }, []);
  const shown = items.filter((p) => `${p.category} ${p.brand} ${p.name} ${p.measurement}`.toLowerCase().includes(q.toLowerCase()));
  const noPrice = items.filter((p) => p.price === 0).length;
  const setB = (k: keyof typeof bulk, v: string) => setBulk((b) => ({ ...b, [k]: v }));

  async function addBulk(e: React.FormEvent) {
    e.preventDefault();
    const [brands, names, measurements] = [parse(bulk.brands), parse(bulk.names), parse(bulk.sizes)];
    if (!brands.length || !names.length || !measurements.length) return toast.error("Enter at least one brand, product name and measurement");
    try {
      const d = await api<{ created: number; skipped: number }>("/products/bulk", { method: "POST", body: JSON.stringify({ category: bulk.category.trim(), brands, names, measurements, price: Number(bulk.price), gstRate: Number(bulk.gstRate), stock: Number(bulk.stock), perBox: Number(bulk.perBox) }) });
      toast.success(`${d.created} products created${d.skipped ? `, ${d.skipped} already existed` : ""}. Now set each price below.`); load();
    } catch (err: any) { toast.error(err.message); }
  }
  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
    if (!pick.category || !pick.brand || !pick.name || !pick.measurement) return toast.error("Select category, brand, product name and measurement");
    const body = { ...pick, perBox: Number(f.get("perBox") || 0), price: Number(f.get("price")), gstRate: Number(f.get("gstRate")), stock: Number(f.get("stock") || 0) };
    try {
      await api(editing ? `/products/${editing._id}` : "/products", { method: editing ? "PATCH" : "POST", body: JSON.stringify(body) });
      toast.success(editing ? "Product updated" : "Product added");
      if (!editing) { form.reset(); setPick((p) => ({ ...p, measurement: "" })); } // keep category/brand/name to add the next size quickly
      setEditing(null); load();
    } catch (err: any) { toast.error(err.message.includes("duplicate") ? "This brand, product and measurement already exists" : err.message); }
  }
  async function remove(p: Product) {
    if (!confirm(`Delete ${p.brand} ${p.name} ${p.measurement}? Past orders are not affected.`)) return;
    try { await api(`/products/${p._id}`, { method: "DELETE" }); toast.success("Product deleted"); load(); } catch (e: any) { toast.error(e.message); }
  }
  const d = editing;
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Products</h1>

      <Card><CardHeader><CardTitle className="text-base">Bulk add (every brand × product × measurement)</CardTitle></CardHeader><CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 text-sm"><span className="text-muted-foreground">Quick fill:</span>
          {PRESETS.map((p) => <Button key={p.label} type="button" size="sm" variant="outline" onClick={() => setBulk((b) => ({ ...b, category: p.category, brands: p.brands, names: p.names, sizes: p.sizes }))}>{p.label}</Button>)}</div>
        <form onSubmit={addBulk} className="grid gap-3 sm:grid-cols-6 sm:items-end">
          <div className="space-y-2"><Label htmlFor="b-cat">Category</Label><Input id="b-cat" required value={bulk.category} onChange={(e) => setB("category", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="b-brands">Brands (comma separated)</Label><Input id="b-brands" required value={bulk.brands} onChange={(e) => setB("brands", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="b-names">Product names (comma separated)</Label><Input id="b-names" required value={bulk.names} onChange={(e) => setB("names", e.target.value)} /></div>
          <div className="space-y-2 sm:col-span-2"><Label htmlFor="b-sizes">Measurements (comma separated)</Label><Input id="b-sizes" required placeholder="e.g. 1 ltr, 5 ltr, 20 ltr" value={bulk.sizes} onChange={(e) => setB("sizes", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="b-price">Price (₹) for all</Label><Input id="b-price" type="number" min={0} step="0.01" value={bulk.price} onChange={(e) => setB("price", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="b-gst">GST %</Label><Input id="b-gst" type="number" min={0} max={100} step="0.5" value={bulk.gstRate} onChange={(e) => setB("gstRate", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="b-stock">Opening stock</Label><Input id="b-stock" type="number" min={0} value={bulk.stock} onChange={(e) => setB("stock", e.target.value)} /></div>
          <div className="space-y-2"><Label htmlFor="b-perbox">Pieces per box</Label><Input id="b-perbox" type="number" min={0} value={bulk.perBox} onChange={(e) => setB("perBox", e.target.value)} /></div>
          <Button className="sm:col-span-2 sm:w-fit">Create all combinations</Button>
        </form>
        <p className="text-xs text-muted-foreground">{parse(bulk.brands).length * parse(bulk.names).length * parse(bulk.sizes).length} products will be created. Ones that already exist are skipped. You can set each price in the table below.</p>
      </CardContent></Card>

      <Card><CardHeader><CardTitle className="text-base">{d ? `Edit: ${d.brand} ${d.name} ${d.measurement}` : "Add single product"}</CardTitle></CardHeader><CardContent>
        <form key={d?._id || "new"} onSubmit={save} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="space-y-2"><Label htmlFor="category">Category</Label>
            <select id="category" className={selCls} value={pick.category} onChange={(e) => pickCategory(e.target.value)}>
              <option value="">Select category</option>{withCurrent(Object.keys(CATALOG), pick.category).map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="brand">Brand</Label>
            <select id="brand" className={selCls} disabled={!pick.category} value={pick.brand} onChange={(e) => setPick({ ...pick, brand: e.target.value })}>
              <option value="">Select brand</option>{withCurrent(cat?.brands || [], pick.brand).map((b) => <option key={b}>{b}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="name">Product name</Label>
            <select id="name" className={selCls} disabled={!pick.category} value={pick.name} onChange={(e) => setPick({ ...pick, name: e.target.value })}>
              <option value="">Select product</option>{withCurrent(cat?.names || [], pick.name).map((n) => <option key={n}>{n}</option>)}</select></div>
          <div className="space-y-2"><Label htmlFor="perBox">Pieces per box</Label><Input id="perBox" name="perBox" type="number" min={0} step="1" defaultValue={d?.perBox ?? 0} placeholder="e.g. 30" /></div>
          <div className="space-y-2"><Label htmlFor="measurement">Measurement</Label>
            <select id="measurement" className={selCls} disabled={!pick.category} value={pick.measurement} onChange={(e) => setPick({ ...pick, measurement: e.target.value })}>
              <option value="">Select measurement</option>
              {cat && <optgroup label={`${pick.category} sizes`}>{withCurrent(cat.sizes, pick.measurement).map((m) => <option key={m}>{m}</option>)}</optgroup>}
              <optgroup label="Other sizes">{GENERAL_SIZES.filter((m) => !cat?.sizes.includes(m)).map((m) => <option key={m}>{m}</option>)}</optgroup></select></div>
          <div className="space-y-2"><Label htmlFor="price">Price (₹)</Label><Input id="price" name="price" type="number" min={0} step="0.01" required defaultValue={d?.price} /></div>
          <div className="space-y-2"><Label htmlFor="gstRate">GST %</Label><Input id="gstRate" name="gstRate" type="number" min={0} max={100} step="0.5" required defaultValue={d?.gstRate ?? 18} /></div>
          <div className="space-y-2"><Label htmlFor="stock">Stock</Label><Input id="stock" name="stock" type="number" min={0} step="1" defaultValue={d?.stock ?? 0} /></div>
          <div className="flex gap-2 sm:col-span-4"><Button>{d ? "Update product" : "Add product"}</Button>{d && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel edit</Button>}</div>
        </form></CardContent></Card>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{items.length} products{noPrice ? ` · ${noPrice} still have price ₹0` : ""}</p>
        <Input className="w-64" placeholder="Search category, brand, product" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search products" />
      </div>
      <Card className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Category</TableHead><TableHead>Brand</TableHead><TableHead>Product</TableHead><TableHead>Measurement</TableHead><TableHead className="text-right">Pcs / box</TableHead><TableHead className="text-right">Price</TableHead><TableHead className="text-right">GST</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>{shown.map((p) => (
          <TableRow key={p._id}><TableCell>{p.category}</TableCell><TableCell>{p.brand}</TableCell><TableCell className="font-medium">{p.name}</TableCell><TableCell>{p.measurement}</TableCell><TableCell><NumCell p={p} field="perBox" onSaved={load} /></TableCell>
            <TableCell><NumCell p={p} field="price" onSaved={load} /></TableCell><TableCell className="text-right">{p.gstRate}%</TableCell>
            <TableCell><NumCell p={p} field="stock" onSaved={load} /></TableCell>
            <TableCell className="space-x-2 text-right whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => { setEditing(p); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button><Button size="sm" variant="outline" onClick={() => remove(p)}>Delete</Button></TableCell></TableRow>))}</TableBody>
      </Table></Card>
    </div>
  );
}
