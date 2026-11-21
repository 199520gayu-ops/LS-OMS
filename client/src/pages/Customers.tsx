import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, getUser, Customer } from "../api";

export default function Customers() {
  const user = getUser()!; const canEdit = user.role !== "sales";
  const [items, setItems] = useState<Customer[]>([]); const [q, setQ] = useState(""); const [editing, setEditing] = useState<Customer | null>(null);
  const load = () => api<Customer[]>(`/customers?q=${encodeURIComponent(q)}`).then(setItems).catch((e) => toast.error(e.message));
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [q]);

  async function save(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); const form = e.currentTarget; const f = Object.fromEntries(new FormData(form));
    try {
      await api(editing ? `/customers/${editing._id}` : "/customers", { method: editing ? "PATCH" : "POST", body: JSON.stringify(f) });
      toast.success(editing ? "Customer updated" : "Customer added");
      if (!editing) form.reset();
      setEditing(null); load();
    } catch (err: any) { toast.error(err.message.includes("duplicate") ? "A customer with this name already exists" : err.message); }
  }
  async function remove(c: Customer) {
    if (!confirm(`Delete ${c.name}? Past orders are not affected.`)) return;
    try { await api(`/customers/${c._id}`, { method: "DELETE" }); toast.success("Customer deleted"); load(); } catch (e: any) { toast.error(e.message); }
  }
  async function importOld() {
    try { const d = await api<{ total: number }>("/customers/import", { method: "POST" }); toast.success(`Done. ${d.total} customers saved`); load(); } catch (e: any) { toast.error(e.message); }
  }
  const d = editing;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Customers</h1>
        <div className="flex gap-2">
          {user.role === "admin" && <Button variant="outline" onClick={importOld}>Import from past orders</Button>}
          <Input className="w-64" placeholder="Search name or phone" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search customers" />
        </div>
      </div>
      {canEdit && <Card><CardHeader><CardTitle className="text-base">{d ? `Edit: ${d.name}` : "Add customer"}</CardTitle></CardHeader><CardContent>
        <form key={d?._id || "new"} onSubmit={save} className="grid gap-3 sm:grid-cols-4 sm:items-end">
          <div className="space-y-2"><Label htmlFor="name">Customer name</Label><Input id="name" name="name" required minLength={2} defaultValue={d?.name} /></div>
          <div className="space-y-2"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" defaultValue={d?.phone} /></div>
          <div className="space-y-2"><Label htmlFor="gstin">GSTIN</Label><Input id="gstin" name="gstin" defaultValue={d?.gstin} /></div>
          <div className="space-y-2"><Label htmlFor="address">Address</Label><Input id="address" name="address" defaultValue={d?.address} /></div>
          <div className="flex gap-2 sm:col-span-4"><Button>{d ? "Update customer" : "Add customer"}</Button>{d && <Button type="button" variant="outline" onClick={() => setEditing(null)}>Cancel edit</Button>}</div>
        </form></CardContent></Card>}
      <Card className="overflow-x-auto"><Table>
        <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Phone</TableHead><TableHead>GSTIN</TableHead><TableHead>Address</TableHead>{canEdit && <TableHead className="text-right">Actions</TableHead>}</TableRow></TableHeader>
        <TableBody>
          {items.length === 0 && <TableRow><TableCell colSpan={5} className="h-24 text-center text-muted-foreground">No customers yet. They are saved automatically when you place an order.</TableCell></TableRow>}
          {items.map((c) => (
            <TableRow key={c._id}><TableCell className="font-medium">{c.name}</TableCell><TableCell>{c.phone}</TableCell><TableCell>{c.gstin}</TableCell><TableCell>{c.address}</TableCell>
              {canEdit && <TableCell className="space-x-2 text-right whitespace-nowrap"><Button size="sm" variant="outline" onClick={() => { setEditing(c); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</Button>
                {user.role === "admin" && <Button size="sm" variant="outline" onClick={() => remove(c)}>Delete</Button>}</TableCell>}</TableRow>))}
        </TableBody>
      </Table></Card>
    </div>
  );
}
